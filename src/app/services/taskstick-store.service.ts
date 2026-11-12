// src/app/services/taskstick-store.service.ts
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { TaskstickDbService } from './taskstick-db.service';
import { StorageMigrationAdapter } from './storage-migration.adapter';
import { StorageService } from './storage.service';
import { WorkflowLayoutService, TaskNode, TaskEdge, TaskGroup, computeNodeDimensions } from './workflow-layout.service';
import {
  ADHDPostItNote,
  PostItEdge,
  RelationType,
  NoteCluster,
  WhiteboardZone,
  IdeationWallFilter,
  PostItStatus,
  PostItColor,
  PostItNature,
  PostItComplexity,
  CognitiveLoad,
  GraphStats,
  IdeationWallSnapshot
} from '../models/taskstick-graph.model';

export function getTodayDateKey(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

@Injectable({ providedIn: 'root' })
export class TaskstickStoreService {
  private db = inject(TaskstickDbService);
  private migrationAdapter = inject(StorageMigrationAdapter);
  private storage = inject(StorageService);
  private workflowLayout = inject(WorkflowLayoutService);

  // --- CORE STATE SIGNALS ---
  readonly notes = signal<ADHDPostItNote[]>([]);
  readonly edges = signal<PostItEdge[]>([]);
  readonly clusters = signal<NoteCluster[]>([]);
  readonly zones = signal<WhiteboardZone[]>([]);
  readonly activeFilter = signal<IdeationWallFilter>({
    selectedColor: 'all',
    selectedZone: 'all',
    selectedTag: 'all',
    searchQuery: ''
  });
  readonly selectedDateKey = signal<string>(getTodayDateKey());
  readonly availableDates = signal<string[]>([]);
  readonly isInitialized = signal<boolean>(false);
  readonly activeFocusNote = signal<ADHDPostItNote | null>(null);
  readonly activeWorkspaceZone = signal<'wall' | 'tasks' | 'dashboard' | 'legacy_studio'>('wall');
  readonly spotlightBottlenecksOnly = signal<boolean>(false);

  // --- UNDO / REDO STATE ---
  readonly canUndo = signal<boolean>(false);
  readonly canRedo = signal<boolean>(false);
  private undoStack: Array<{ notes: ADHDPostItNote[]; edges: PostItEdge[]; clusters: NoteCluster[]; zones: WhiteboardZone[] }> = [];
  private redoStack: Array<{ notes: ADHDPostItNote[]; edges: PostItEdge[]; clusters: NoteCluster[]; zones: WhiteboardZone[] }> = [];

  // --- COMPUTED SIGNALS (DAG & FILTERS) ---

  /** Checks if a note is in a completed state */
  isNoteCompleted(note: ADHDPostItNote): boolean {
    return note.status === 'done_check' || note.status === 'done_cross';
  }

  /** Checks if a note is currently open / pending / active */
  isNoteOpen(note: ADHDPostItNote): boolean {
    return !this.isNoteCompleted(note);
  }

  /** Helper to identify if a note acts as a parent Thema (container only, exempt from DAG blocking, never plannable) */
  isThemaNote(note: ADHDPostItNote): boolean {
    if (note.nature === 'theme') return true;
    if (note.nature === 'action' || note.nature === 'pivot') return false;
    if (note.isThema) return true;
    const tags = note.tags || [];
    if (tags.includes('sous-tâche') || tags.includes('subtask')) return false;
    return tags.includes('thème') || tags.includes('theme');
  }

  /** Helper to identify if a note acts as a Pivot / Milestone (logical gate, not a plannable work item) */
  isPivotNote(note: ADHDPostItNote): boolean {
    if (note.nature === 'pivot') return true;
    if (note.nature === 'theme' || note.nature === 'action') return false;
    const tags = note.tags || [];
    return tags.includes('pivot') || tags.includes('milestone') || tags.includes('jalon');
  }

  /**
   * Helper to identify if a note is a concrete executable action eligible for scheduling.
   * Thèmes (containers) and Pivots (milestones) are strictly excluded.
   */
  isPlannableTask(note: ADHDPostItNote): boolean {
    const isThema = this.isThemaNote(note);
    const isPivot = this.isPivotNote(note);
    return !isThema && !isPivot && this.isNoteOpen(note);
  }

  /** Notes with open status having at least one open prerequisite (depends_on) or manually blocked. Themas are NEVER blocked (UC7). */
  readonly blockedNotes = computed(() => {
    const allNotes = this.notes();
    const allEdges = this.edges();
    const uncompletedNoteIds = new Set(allNotes.filter(n => this.isNoteOpen(n)).map(n => n.id));

    // A note is blocked if it has an incoming 'depends_on' edge from an uncompleted note
    const blockedIds = new Set<string>();
    for (const edge of allEdges) {
      if (edge.type === 'depends_on' && uncompletedNoteIds.has(edge.sourceId)) {
        blockedIds.add(edge.targetId);
      }
    }

    return allNotes.filter(n => this.isNoteOpen(n) && !this.isThemaNote(n) && (blockedIds.has(n.id) || n.status === 'blocked'));
  });

  /** Actionable root tasks: open and not blocked by any pending dependency. Themas and Pivots are excluded from action backlog. */
  readonly rootActionableNotes = computed(() => {
    const allNotes = this.notes();
    const allEdges = this.edges();
    const uncompletedNoteIds = new Set(allNotes.filter(n => this.isNoteOpen(n)).map(n => n.id));

    const blockedIds = new Set<string>();
    for (const edge of allEdges) {
      if (edge.type === 'depends_on' && uncompletedNoteIds.has(edge.sourceId)) {
        blockedIds.add(edge.targetId);
      }
    }

    return allNotes.filter(n => 
      this.isNoteOpen(n) && 
      n.status !== 'blocked' && 
      n.status !== 'on_hold' && 
      !this.isThemaNote(n) && 
      !this.isPivotNote(n) && 
      !blockedIds.has(n.id)
    );
  });

  /**
   * Transitive bottleneck weight: computes how many downstream uncompleted nodes each task unlocks.
   */
  readonly transitiveUnlockMap = computed<Map<string, number>>(() => {
    const allNotes = this.notes();
    const allEdges = this.edges();
    const uncompletedNotes = allNotes.filter(n => this.isNoteOpen(n));
    const uncompletedIds = new Set(uncompletedNotes.map(n => n.id));

    // Build downstream adjacency for depends_on edges
    const downstream = new Map<string, string[]>();
    for (const edge of allEdges) {
      if (edge.type === 'depends_on' && uncompletedIds.has(edge.targetId)) {
        if (!downstream.has(edge.sourceId)) downstream.set(edge.sourceId, []);
        downstream.get(edge.sourceId)!.push(edge.targetId);
      }
    }

    const unlockMap = new Map<string, number>();

    for (const note of uncompletedNotes) {
      const visited = new Set<string>();
      const queue = [note.id];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const targets = downstream.get(curr) || [];
        for (const tid of targets) {
          if (!visited.has(tid) && tid !== note.id) {
            visited.add(tid);
            queue.push(tid);
          }
        }
      }
      unlockMap.set(note.id, visited.size);
    }

    return unlockMap;
  });

  /**
   * Keystone entry points: actionable root tasks ranked by liberation-to-effort ratio.
   */
  readonly keystoneEntryPoints = computed<ADHDPostItNote[]>(() => {
    const roots = this.rootActionableNotes();
    const unlockMap = this.transitiveUnlockMap();

    return [...roots].sort((a, b) => {
      const unlockA = unlockMap.get(a.id) || 0;
      const unlockB = unlockMap.get(b.id) || 0;
      const effortA = Math.max(5, a.estimatedMinutes || 15);
      const effortB = Math.max(5, b.estimatedMinutes || 15);

      const ratioA = unlockA / effortA;
      const ratioB = unlockB / effortB;

      if (ratioB !== ratioA) {
        return ratioB - ratioA; // Higher liberation ratio first
      }
      return unlockB - unlockA;
    });
  });

  /**
   * Top starting point: single highest-leverage task for ADHD momentum initiation.
   */
  readonly topStartingPoint = computed<ADHDPostItNote | null>(() => {
    const keystones = this.keystoneEntryPoints();
    return keystones.length > 0 ? keystones[0] : (this.rootActionableNotes()[0] || null);
  });

  /**
   * Real-time cognitive load metrics: working-memory pressure (0-100%) and WIP penalty.
   */
  readonly cognitiveLoadMetrics = computed(() => {
    const allNotes = this.notes();
    const openNotes = allNotes.filter(n => this.isNoteOpen(n));
    const inProgressNotes = allNotes.filter(n => n.status === 'in_progress');

    let totalLoadPoints = 0;
    for (const n of openNotes) {
      if (n.cognitiveLoad === 'high') totalLoadPoints += 3;
      else if (n.cognitiveLoad === 'medium') totalLoadPoints += 2;
      else totalLoadPoints += 1;
    }

    // WIP penalty: more than 1 in_progress task adds exponential cognitive strain
    const wipCount = inProgressNotes.length;
    const wipPenalty = wipCount > 1 ? (wipCount - 1) * 15 : 0;

    // Working memory saturation index bounded between 0 and 100
    const rawIndex = (totalLoadPoints * 4) + wipPenalty;
    const saturationPercentage = Math.min(100, Math.max(0, Math.round(rawIndex)));

    return {
      totalOpenTasks: openNotes.length,
      inProgressCount: wipCount,
      wipPenalty,
      saturationPercentage,
      level: saturationPercentage >= 80 ? 'overload' : saturationPercentage >= 50 ? 'moderate' : 'optimal'
    };
  });

  /** Plannable notes for the weekly schedule backlog (open, unscheduled, and all predecessors are completed or scheduled) */
  readonly plannableNotes = computed(() => {
    return this.notes().filter(n => this.isTaskPlannable(n));
  });

  /**
   * Helper that sorts tasks along their dependency chain (T1 -> T2 -> ... -> Tn)
   * and extracts strictly the first undone concrete action (excluding Themas and Pivots).
   */
  getFirstUndoneTaskInChain(tasks: ADHDPostItNote[]): ADHDPostItNote | null {
    if (!tasks || tasks.length === 0) return null;
    const concreteTasks = tasks.filter(t => !this.isThemaNote(t) && !this.isPivotNote(t));
    const sorted = this.sortTasksTopologically(concreteTasks);
    return sorted.find(t => this.isNoteOpen(t)) || null;
  }

  /**
   * Checks whether a predecessor in the DAG is satisfied.
   * - A normal action is satisfied if it is completed (done_check/done_cross) OR scheduled (scheduledSlot !== undefined).
   * - A Pivot is a logical gate/milestone: it is satisfied if it is completed OR all its own upstream prerequisites are satisfied.
   *   Pivots never require a scheduledSlot.
   */
  isPredecessorSatisfied(pred: ADHDPostItNote, noteMap: Map<string, ADHDPostItNote>, visitedPivots: Set<string> = new Set()): boolean {
    if (this.isNoteCompleted(pred)) return true;
    if (this.isThemaNote(pred)) return true; // Themas act as umbrella, not strict blockers

    if (this.isPivotNote(pred)) {
      if (pred.status === 'blocked' || pred.status === 'on_hold') return false;
      if (visitedPivots.has(pred.id)) return true; // Cycle guard
      visitedPivots.add(pred.id);

      // Check all incoming depends_on edges to this pivot
      const incomingEdges = this.edges().filter(e => e.targetId === pred.id && e.type === 'depends_on');
      if (incomingEdges.length === 0) {
        // Pivot with no incoming dependencies is satisfied
        return true;
      }
      for (const edge of incomingEdges) {
        const upstream = noteMap.get(edge.sourceId);
        if (!upstream) continue;
        if (!this.isPredecessorSatisfied(upstream, noteMap, visitedPivots)) {
          return false;
        }
      }
      return true;
    }

    // Regular action note: satisfied if completed or scheduled
    return pred.scheduledSlot !== undefined;
  }

  /**
   * Checks whether a task T is plannable in the weekly calendar backlog:
   * - T is open and a concrete action (not a Thema, not a Pivot)
   * - T is not blocked or on_hold
   * - T is not yet scheduled in calendar
   * - Every immediate predecessor P (P -> T with depends_on):
   *     is satisfied (completed or scheduled, or if P is a Pivot, P's own prerequisites are satisfied).
   */
  isTaskPlannable(task: ADHDPostItNote): boolean {
    if (!this.isPlannableTask(task)) return false;
    if (task.status === 'blocked' || task.status === 'on_hold') return false;
    if (task.scheduledSlot !== undefined) return false;

    const allNotes = this.notes();
    const noteMap = new Map(allNotes.map(n => [n.id, n]));
    const incomingEdges = this.edges().filter(e => e.targetId === task.id && e.type === 'depends_on');

    for (const edge of incomingEdges) {
      const pred = noteMap.get(edge.sourceId);
      if (!pred) continue;
      if (!this.isPredecessorSatisfied(pred, noteMap)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper or computed selector to retrieve the single next plannable task for a chain / group of tasks.
   * Traverses topological order and finds the first task satisfying isTaskPlannable.
   * Can accept either a Thema/Chain root ID or an array of ADHDPostItNote tasks.
   * Excludes Themas and Pivots to strictly return concrete plannable actions.
   */
  getNextPlannableTaskForChain(themaOrChainIdOrTasks: string | ADHDPostItNote[]): ADHDPostItNote | null {
    let tasks: ADHDPostItNote[] = [];
    if (typeof themaOrChainIdOrTasks === 'string') {
      const allNotes = this.notes();
      const allEdges = this.edges();
      const rootId = themaOrChainIdOrTasks;
      const targetNote = allNotes.find(n => n.id === rootId);
      const childIds = new Set<string>();
      if (targetNote && !this.isThemaNote(targetNote) && !this.isPivotNote(targetNote)) {
        childIds.add(targetNote.id);
      }
      const queue = [rootId];
      const visited = new Set<string>([rootId]);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const edge of allEdges) {
          if (edge.sourceId === curr && edge.type === 'depends_on' && !visited.has(edge.targetId)) {
            visited.add(edge.targetId);
            childIds.add(edge.targetId);
            queue.push(edge.targetId);
          }
        }
      }
      if (targetNote?.clusterId) {
        for (const n of allNotes) {
          if (n.clusterId === targetNote.clusterId && n.id !== rootId && !this.isThemaNote(n) && !this.isPivotNote(n)) {
            childIds.add(n.id);
          }
        }
      }
      tasks = allNotes.filter(n => childIds.has(n.id) && !this.isThemaNote(n) && !this.isPivotNote(n));
    } else {
      tasks = themaOrChainIdOrTasks.filter(n => !this.isThemaNote(n) && !this.isPivotNote(n));
    }

    if (!tasks || tasks.length === 0) return null;
    const sorted = this.sortTasksTopologically(tasks);
    return sorted.find(t => this.isTaskPlannable(t)) || null;
  }

  /**
   * Retrieves all descendant notes (subtasks/actions/milestones) of a given node in the DAG
   * traversed via outgoing 'depends_on' edges or within the same cluster.
   */
  getChainActionDescendants(nodeId: string): ADHDPostItNote[] {
    const allNotes = this.notes();
    const allEdges = this.edges();
    const targetNote = allNotes.find(n => n.id === nodeId);
    const childIds = new Set<string>();

    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const edge of allEdges) {
        if (edge.sourceId === curr && edge.type === 'depends_on' && !visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          childIds.add(edge.targetId);
          queue.push(edge.targetId);
        }
      }
    }

    if (targetNote?.clusterId) {
      for (const n of allNotes) {
        if (n.clusterId === targetNote.clusterId && n.id !== nodeId) {
          childIds.add(n.id);
        }
      }
    }

    return allNotes.filter(n => childIds.has(n.id));
  }

  /**
   * Formats duration in minutes to user-friendly string:
   * e.g. 45 -> "45m", 60 -> "1h00", 75 -> "1h15", 120 -> "2h00", 0 -> "0m"
   */
  formatDurationMinutes(totalMinutes: number): string {
    if (totalMinutes <= 0) return '0m';
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h${minutes < 10 ? '0' + minutes : minutes}` : `${hours}h00`;
  }

  /**
   * Calculates the cumulative estimated duration of all concrete actions in the chain
   * under a Theme or downstream of a node.
   * Excludes Themas and Pivots themselves from the summation.
   * Also computes remaining minutes (only tasks with status === 'open').
   */
  getChainCumulativeDuration(nodeId: string): {
    totalMinutes: number;
    formatted: string;
    remainingMinutes: number;
    remainingFormatted: string;
  } {
    const descendantNotes = this.getChainActionDescendants(nodeId);

    const actionNotes = descendantNotes.filter(n => !this.isThemaNote(n) && !this.isPivotNote(n));

    const totalMinutes = actionNotes.reduce((sum, n) => sum + (n.estimatedMinutes || 0), 0);

    const remainingMinutes = actionNotes
      .filter(n => n.status === 'open')
      .reduce((sum, n) => sum + (n.estimatedMinutes || 0), 0);

    return {
      totalMinutes,
      formatted: this.formatDurationMinutes(totalMinutes),
      remainingMinutes,
      remainingFormatted: this.formatDurationMinutes(remainingMinutes)
    };
  }

  /**
   * Retrieves all upstream ancestor notes (prerequisites) leading to a given node in the DAG
   * traversed backwards via incoming 'depends_on' edges.
   */
  getChainActionAncestors(nodeId: string): ADHDPostItNote[] {
    const allNotes = this.notes();
    const allEdges = this.edges();
    const ancestorIds = new Set<string>();

    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const edge of allEdges) {
        // If an edge targets curr with 'depends_on', then edge.sourceId is an upstream prerequisite
        if (edge.targetId === curr && edge.type === 'depends_on' && !visited.has(edge.sourceId)) {
          visited.add(edge.sourceId);
          ancestorIds.add(edge.sourceId);
          queue.push(edge.sourceId);
        }
      }
    }

    return allNotes.filter(n => ancestorIds.has(n.id));
  }

  /**
   * Calculates the cumulative lead time required to reach a Pivot milestone,
   * by summing estimatedMinutes of all concrete actions upstream of the pivot.
   */
  getPivotUpstreamDuration(nodeId: string): {
    totalMinutes: number;
    formatted: string;
    remainingMinutes: number;
    remainingFormatted: string;
  } {
    const ancestorNotes = this.getChainActionAncestors(nodeId);

    const actionNotes = ancestorNotes.filter(n => !this.isThemaNote(n) && !this.isPivotNote(n));

    const totalMinutes = actionNotes.reduce((sum, n) => sum + (n.estimatedMinutes || 0), 0);

    const remainingMinutes = actionNotes
      .filter(n => n.status === 'open')
      .reduce((sum, n) => sum + (n.estimatedMinutes || 0), 0);

    return {
      totalMinutes,
      formatted: this.formatDurationMinutes(totalMinutes),
      remainingMinutes,
      remainingFormatted: this.formatDurationMinutes(remainingMinutes)
    };
  }

  /**
   * Unschedules a task from the calendar.
   * If downstream dependent tasks were scheduled, rolls them back to prevent temporal paradoxes.
   */
  async unscheduleTaskWithCascade(taskId: string): Promise<string[]> {
    this.recordSnapshot();
    const allNotes = this.notes();
    const allEdges = this.edges();
    const target = allNotes.find(n => n.id === taskId);
    if (!target) return [];

    // Find all downstream dependents connected through depends_on
    const queue = [taskId];
    const visited = new Set<string>([taskId]);
    const downstreamScheduledIds: string[] = [];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const edge of allEdges) {
        if (edge.sourceId === curr && edge.type === 'depends_on' && !visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          queue.push(edge.targetId);
          const child = allNotes.find(n => n.id === edge.targetId);
          if (child && child.scheduledSlot !== undefined) {
            downstreamScheduledIds.push(child.id);
          }
        }
      }
    }

    const idsToUnschedule = [taskId, ...downstreamScheduledIds];
    const updatedNotes = allNotes.map(n => {
      if (idsToUnschedule.includes(n.id)) {
        return {
          ...n,
          scheduledSlot: undefined,
          updatedAt: Date.now()
        };
      }
      return n;
    });

    await this.db.notes.bulkPut(updatedNotes.filter(n => idsToUnschedule.includes(n.id)));
    this.notes.set(this.recalculateBlockedFlags(updatedNotes, allEdges));
    return downstreamScheduledIds;
  }

  /**
   * Topologically orders a list of tasks respecting depends_on edges.
   */
  sortTasksTopologically(tasks: ADHDPostItNote[]): ADHDPostItNote[] {
    if (tasks.length <= 1) return [...tasks];

    const taskIds = new Set(tasks.map(t => t.id));
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();

    for (const id of taskIds) {
      inDegree.set(id, 0);
      outgoing.set(id, []);
    }

    const relevantEdges = this.edges().filter(
      e => e.type === 'depends_on' && taskIds.has(e.sourceId) && taskIds.has(e.targetId)
    );

    for (const edge of relevantEdges) {
      outgoing.get(edge.sourceId)!.push(edge.targetId);
      inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
    }

    // Queue with tasks having 0 in-degree among this subset
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const result: ADHDPostItNote[] = [];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      const note = taskMap.get(currId);
      if (note) result.push(note);

      for (const nextId of outgoing.get(currId) || []) {
        const newDeg = (inDegree.get(nextId) || 1) - 1;
        inDegree.set(nextId, newDeg);
        if (newDeg === 0) {
          queue.push(nextId);
        }
      }
    }

    // In case of any unvisited tasks (disconnected or cycle fallback), append them
    for (const task of tasks) {
      if (!result.some(r => r.id === task.id)) {
        result.push(task);
      }
    }

    return result;
  }

  /** Filtered notes matching active color, tag, zone and search text */
  readonly filteredNotes = computed(() => {
    const filter = this.activeFilter();
    const q = (filter.searchQuery ?? '').toLowerCase().trim();

    return this.notes().filter(note => {
      if (filter.selectedColor && filter.selectedColor !== 'all' && note.color !== filter.selectedColor) {
        return false;
      }
      if (filter.selectedZone && filter.selectedZone !== 'all' && note.zoneId !== filter.selectedZone) {
        return false;
      }
      if (filter.selectedTag && filter.selectedTag !== 'all' && !note.tags.includes(filter.selectedTag)) {
        return false;
      }
      if (q) {
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesContent = note.content ? note.content.toLowerCase().includes(q) : false;
        const matchesTags = note.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  });

  /** Overall graph analytics & progress stats */
  readonly graphStats = computed<GraphStats>(() => {
    const all = this.notes();
    const totalNotes = all.length;
    let openCount = 0;
    let doneCrossCount = 0;
    let doneCheckCount = 0;

    const byColor: Record<PostItColor, number> = {
      yellow: 0,
      pink: 0,
      blue: 0,
      green: 0,
      purple: 0,
      orange: 0
    };

    for (const note of all) {
      if (note.status === 'open') openCount++;
      else if (note.status === 'done_cross') doneCrossCount++;
      else if (note.status === 'done_check') doneCheckCount++;

      if (byColor[note.color] !== undefined) {
        byColor[note.color]++;
      }
    }

    const totalDone = doneCrossCount + doneCheckCount;
    const completionPercentage = totalNotes > 0 ? Math.round((totalDone / totalNotes) * 100) : 0;
    const blockedCount = this.blockedNotes().length;

    return {
      totalNotes,
      openCount,
      doneCrossCount,
      doneCheckCount,
      blockedCount,
      completionPercentage,
      byColor
    };
  });

  constructor() {
    this.initStore();

    // Auto-save & sync effect on notes change
    effect(() => {
      const currentNotes = this.notes();
      const dateKey = this.selectedDateKey();

      if (this.isInitialized() && currentNotes.length > 0) {
        // Persist to Dexie and sync back to legacy localStorage
        this.migrationAdapter.syncGraphToLegacyLocalStorage(dateKey, currentNotes).catch(err => {
          console.error('[TaskstickStore] Auto-sync failed:', err);
        });
      }
    });
  }

  // --- ACTIONS & MUTATIONS ---

  /** Initialize store by loading from IndexedDB / LocalStorage for selected date */
  async initStore(): Promise<void> {
    try {
      const todayKey = this.getTodayKey();
      this.selectedDateKey.set(todayKey);

      let loadedNotes = await this.db.notes.where('zoneId').equals(todayKey).toArray();

      if (loadedNotes.length === 0) {
        console.info(`[TaskstickStore] Nouvel espace pour aujourd'hui (${todayKey}) initialisé.`);
        loadedNotes = [];
      }

      const loadedEdges = await this.db.edges.toArray();
      const loadedClusters = await this.db.clusters.toArray();
      const loadedZones = await this.db.zones.toArray();

      this.notes.set(this.recalculateBlockedFlags(loadedNotes, loadedEdges));
      this.edges.set(loadedEdges);
      this.clusters.set(loadedClusters);
      this.zones.set(loadedZones);
      this.isInitialized.set(true);
      await this.refreshAvailableDates();
    } catch (err) {
      console.error('[TaskstickStore] Failed to initialize store:', err);
    }
  }

  /** Switch active date and load the corresponding board from IndexedDB / LocalStorage */
  async switchDate(dateKey: string): Promise<void> {
    try {
      this.selectedDateKey.set(dateKey);
      let loadedNotes = await this.db.notes.where('zoneId').equals(dateKey).toArray();

      if (loadedNotes.length === 0) {
        const raw = localStorage.getItem(`journal-${dateKey}`);
        if (raw) {
          await this.migrationAdapter.migrateLegacyLocalStorage();
          loadedNotes = await this.db.notes.where('zoneId').equals(dateKey).toArray();
        }
      }

      const loadedEdges = await this.db.edges.toArray();
      this.notes.set(this.recalculateBlockedFlags(loadedNotes, loadedEdges));
      console.info(`[TaskstickStore] Switched to date ${dateKey}: ${loadedNotes.length} notes loaded.`);
    } catch (err) {
      console.error(`[TaskstickStore] Failed to switch to date ${dateKey}:`, err);
    }
  }

  /** Load newly parsed notes (e.g. from file upload or import) into the active board */
  async loadParsedNotes(newNotes: ADHDPostItNote[]): Promise<void> {
    this.recordSnapshot();
    if (newNotes.length > 0) {
      await this.db.notes.bulkPut(newNotes);
      this.notes.set(this.recalculateBlockedFlags(newNotes, this.edges()));
    }
  }

  /** Add a new Post-it note to the active board */
  async addNote(partial: Partial<ADHDPostItNote>): Promise<ADHDPostItNote> {
    this.recordSnapshot();
    const id = partial.id ?? `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newNote: ADHDPostItNote = {
      id,
      title: partial.title ?? 'Nouvelle Idée',
      content: partial.content ?? '',
      color: partial.color ?? 'yellow',
      status: partial.status ?? 'open',
      tags: partial.tags ?? [],
      position: partial.position ?? { x: 100, y: 120 },
      zIndex: this.notes().length + 1,
      zoneId: partial.zoneId ?? this.selectedDateKey(),
      clusterId: partial.clusterId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cognitiveLoad: partial.cognitiveLoad ?? 'medium',
      estimatedMinutes: partial.estimatedMinutes ?? 20,
      isBlocked: false,
      translations: partial.translations ?? {}
    };

    await this.db.notes.put(newNote);
    this.notes.update(notes => [...notes, newNote]);
    return newNote;
  }

  /** Update an existing note */
  async updateNote(id: string, patch: Partial<ADHDPostItNote>): Promise<void> {
    const existing = this.notes().find(n => n.id === id);
    if (!existing) return;

    // A Thema or Pivot never possesses an individual estimatedMinutes or a scheduledSlot
    const isThemaOrPivot = this.isThemaNote(existing) || this.isPivotNote(existing) || patch.nature === 'theme' || patch.nature === 'pivot';
    if (isThemaOrPivot) {
      if (patch.estimatedMinutes !== undefined) {
        patch.estimatedMinutes = 0;
      }
      if (patch.scheduledSlot !== undefined) {
        patch.scheduledSlot = undefined;
      }
    }

    this.recordSnapshot();
    const updated: ADHDPostItNote = {
      ...existing,
      ...patch,
      updatedAt: Date.now()
    };

    await this.db.notes.put(updated);
    this.notes.update(notes => {
      const updatedList = notes.map(n => (n.id === id ? updated : n));
      return this.recalculateBlockedFlags(updatedList, this.edges());
    });
  }

  /** Cycle note completion status: open (⭕) -> done_cross (❌) -> done_check (✓) -> open */
  async toggleNoteStatus(id: string): Promise<PostItStatus> {
    const target = this.notes().find(n => n.id === id);
    if (!target) return 'open';

    let nextStatus: PostItStatus = 'open';
    if (target.status === 'open') {
      nextStatus = 'done_cross';
    } else if (target.status === 'done_cross') {
      nextStatus = 'done_check';
    } else {
      nextStatus = 'open';
    }

    await this.updateNote(id, { status: nextStatus });
    return nextStatus;
  }

  /** Delete a note and remove all incident edges */
  async deleteNote(id: string): Promise<void> {
    this.recordSnapshot();
    await this.db.notes.delete(id);
    const incidentEdges = this.edges().filter(e => e.sourceId === id || e.targetId === id);
    for (const e of incidentEdges) {
      await this.db.edges.delete(e.id);
    }

    this.edges.update(edges => edges.filter(e => e.sourceId !== id && e.targetId !== id));
    this.notes.update(notes => {
      const remaining = notes.filter(n => n.id !== id);
      return this.recalculateBlockedFlags(remaining, this.edges());
    });
  }

  /** Move a note (and its entire cluster if attached) */
  async moveNoteWithCluster(noteId: string, newX: number, newY: number): Promise<void> {
    const target = this.notes().find(n => n.id === noteId);
    if (!target) return;

    const dx = newX - target.position.x;
    const dy = newY - target.position.y;

    if (target.clusterId) {
      // Move all connected notes in cluster by (dx, dy)
      const clusterNotes = this.notes().filter(n => n.clusterId === target.clusterId);
      const updatedCluster = clusterNotes.map(n => ({
        ...n,
        position: { x: n.position.x + dx, y: n.position.y + dy },
        updatedAt: Date.now()
      }));

      await this.db.notes.bulkPut(updatedCluster);
      const clusterMap = new Map(updatedCluster.map(n => [n.id, n]));
      this.notes.update(notes => notes.map(n => clusterMap.get(n.id) ?? n));
    } else {
      await this.updateNote(noteId, { position: { x: newX, y: newY } });
    }
  }

  /**
   * Magnetizes borders and attaches two notes together into a NoteCluster
   * when brought within snapRadius (default 30px).
   */
  async evaluateSticking(movedNoteId: string, snapRadius = 30): Promise<boolean> {
    const allNotes = this.notes();
    const moved = allNotes.find(n => n.id === movedNoteId);
    if (!moved) return false;

    for (const target of allNotes) {
      if (target.id === movedNoteId) continue;

      const dist = Math.hypot(
        moved.position.x - target.position.x,
        moved.position.y - target.position.y
      );

      // If in magnetic snap proximity
      if (dist <= snapRadius) {
        const clusterId = target.clusterId || `cluster_${Date.now()}`;
        const snappedX = target.position.x + 190; // Standard Post-it width with margin
        const snappedY = target.position.y;

        await this.updateNote(target.id, { clusterId });
        await this.updateNote(moved.id, {
          clusterId,
          position: { x: snappedX, y: snappedY }
        });

        // Register cluster record
        await this.db.clusters.put({
          id: clusterId,
          noteIds: [target.id, moved.id],
          relativeOffsets: {
            [target.id]: { x: 0, y: 0 },
            [moved.id]: { x: 190, y: 0 }
          }
        });

        return true;
      }
    }

    return false;
  }

  /** Unsticks a note from its composite cluster */
  async unstickNote(noteId: string): Promise<void> {
    await this.updateNote(noteId, { clusterId: undefined });
  }

  // Dans src/app/services/taskstick-store.service.ts
  async autoOrganizeByThemes(): Promise<void> {
    this.recordSnapshot();
    const allNotes = [...this.notes()];
    const allEdges = this.edges();

    // 1. Nettoyage des préfixes résiduels [ ] (color)
    for (const n of allNotes) {
      n.title = n.title.replace(/(\[\s*\]\s*\([a-z]+\)\s*)+/gi, '').trim();
    }

    // 2. Détection des racines Thèmes (notes marquées thème ou avec in-degree = 0)
    const themeRoots = allNotes.filter(n => this.isThemaNote(n));
    const assigned = new Set<string>();
    const buckets: Array<{ theme: ADHDPostItNote; items: ADHDPostItNote[] }> = [];

    for (const theme of themeRoots) {
      const family = this.getChainActionDescendants(theme.id);
      const familyIds = new Set(family.map(f => f.id));
      familyIds.add(theme.id);
      
      buckets.push({
        theme,
        items: allNotes.filter(n => familyIds.has(n.id))
      });
      familyIds.forEach(id => assigned.add(id));
    }

    // Ramassage des orphelins restants dans un bac général
    const unassigned = allNotes.filter(n => !assigned.has(n.id));
    if (unassigned.length > 0) {
      buckets.push({
        theme: { id: 'temp-inbox', title: 'À classer / Inbox', color: 'orange' } as any,
        items: unassigned
      });
    }

    // 3. Disposition verticale étagée des blocs thématiques (Left-to-Right par bloc)
    let currentY = 80;
    const newZones: WhiteboardZone[] = [];

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      const themeName = bucket.theme.title.split('\n')[0].substring(0, 28);
      const zoneId = `zone-theme-${i}-${Date.now()}`;
      const zoneColor = bucket.theme.color === 'yellow' ? '#f59e0b' :
                        bucket.theme.color === 'blue' ? '#3b82f6' :
                        bucket.theme.color === 'pink' ? '#ec4899' :
                        bucket.theme.color === 'green' ? '#10b981' : '#a855f7';

      // Disposer les sous-tâches du thème en arborescence horizontale
      let colX = 120;
      let maxSubY = currentY + 60;

      bucket.items.forEach((item, idx) => {
        item.position = { x: colX, y: currentY + 60 + (idx % 3) * 220 };
        item.zoneId = this.selectedDateKey();
        if ((idx + 1) % 3 === 0) colX += 280;
      });

      const zoneWidth = Math.max(900, colX + 320);
      const zoneHeight = Math.max(340, (Math.min(bucket.items.length, 3)) * 230 + 100);

      newZones.push({
        id: zoneId,
        label: `Dossier: ${themeName}`,
        colorCode: zoneColor,
        bounds: { x: 60, y: currentY, width: zoneWidth, height: zoneHeight }
      });

      currentY += zoneHeight + 90;
    }

    await this.db.notes.bulkPut(allNotes);
    await this.db.zones.clear();
    await this.db.zones.bulkPut(newZones);

    this.zones.set(newZones);
    this.notes.set(this.recalculateBlockedFlags(allNotes, allEdges));
    await this.optimizeSpatialLayout();
  }

  /** Add an edge with DAG cycle detection (accepts either a PostItEdge or sourceId, targetId, relationType) */
  async addEdge(
    edgeOrSourceId: PostItEdge | string,
    targetId?: string,
    type: RelationType = 'depends_on'
  ): Promise<boolean> {
    let newEdge: PostItEdge;
    if (typeof edgeOrSourceId === 'string') {
      if (!targetId) return false;
      newEdge = {
        id: `edge_${edgeOrSourceId}_${targetId}_${Date.now()}`,
        sourceId: edgeOrSourceId,
        targetId,
        type
      };
    } else {
      newEdge = edgeOrSourceId;
    }

    if (this.detectCycle(newEdge)) {
      console.warn('[TaskstickStore] Cycle detected! Edge rejected:', newEdge);
      return false;
    }

    this.recordSnapshot();
    await this.db.edges.put(newEdge);
    this.edges.update(edges => [...edges, newEdge]);
    this.notes.update(notes => this.recalculateBlockedFlags(notes, this.edges()));
    return true;
  }

  /** Delete an edge */
  async deleteEdge(edgeId: string): Promise<void> {
    this.recordSnapshot();
    await this.db.edges.delete(edgeId);
    this.edges.update(edges => edges.filter(e => e.id !== edgeId));
    this.notes.update(notes => this.recalculateBlockedFlags(notes, this.edges()));
  }

  /**
   * Deterministic cycle detector: checks if adding (sourceId -> targetId)
   * creates a directed cycle using Depth-First Search (DFS).
   */
  detectCycle(newEdge: PostItEdge): boolean {
    if (newEdge.sourceId === newEdge.targetId) return true;

    const adjacency = new Map<string, string[]>();
    for (const e of this.edges()) {
      if (!adjacency.has(e.sourceId)) adjacency.set(e.sourceId, []);
      adjacency.get(e.sourceId)!.push(e.targetId);
    }

    // Add candidate edge
    if (!adjacency.has(newEdge.sourceId)) adjacency.set(newEdge.sourceId, []);
    adjacency.get(newEdge.sourceId)!.push(newEdge.targetId);

    // Run DFS from targetId looking for path back to sourceId
    const visited = new Set<string>();
    const stack = [newEdge.targetId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === newEdge.sourceId) return true;

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adjacency.get(current) ?? [];
        for (const n of neighbors) {
          if (!visited.has(n)) stack.push(n);
        }
      }
    }

    return false;
  }

  /** Auto-organize notes into neat columns grouped by color */
  async autoGroupByColor(): Promise<void> {
    this.recordSnapshot();
    const colors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
    const notesByColor: Record<PostItColor, ADHDPostItNote[]> = {
      yellow: [],
      pink: [],
      blue: [],
      green: [],
      purple: [],
      orange: []
    };

    for (const n of this.notes()) {
      if (notesByColor[n.color]) notesByColor[n.color].push(n);
    }

    const updated: ADHDPostItNote[] = [];
    let colX = 50;

    for (const color of colors) {
      const list = notesByColor[color];
      if (list.length === 0) continue;

      let rowY = 80;
      for (const n of list) {
        updated.push({
          ...n,
          position: { x: colX, y: rowY },
          updatedAt: Date.now()
        });
        rowY += 210;
      }
      colX += 220;
    }

    await this.db.notes.bulkPut(updated);
    const updatedMap = new Map(updated.map(n => [n.id, n]));
    this.notes.update(notes => notes.map(n => updatedMap.get(n.id) ?? n));
  }

  /**
   * Optimizes the 2D spatial layout of notes and whiteboard zones using
   * the hierarchical Sugiyama-style compound DAG auto-layout engine (WorkflowLayoutService).
   * - Left-to-Right topological rank ordering (X-axis)
   * - Top-to-Down Barycentric slot ordering (Y-axis)
   * - Strict compound group containment with auto-fitted bounding boxes
   */
  async optimizeSpatialLayout(): Promise<void> {
    const allNotes = this.notes();
    if (allNotes.length === 0) return;

    this.recordSnapshot();

    const allEdges = this.edges();
    const currentZones = this.zones();

    // 1. Identify which notes currently belong to which zones based on geometry
    const noteZoneMapping = new Map<string, string>();
    for (const note of allNotes) {
      // Find enclosing zone if any
      const enclosingZone = currentZones.find(z =>
        note.position.x >= z.bounds.x &&
        note.position.x <= z.bounds.x + z.bounds.width &&
        note.position.y >= z.bounds.y &&
        note.position.y <= z.bounds.y + z.bounds.height
      );
      if (enclosingZone) {
        noteZoneMapping.set(note.id, enclosingZone.id);
      }
    }

    // 2. Prepare TaskNode models with dynamic sizing formula & enforced minimum dimensions
    const taskNodes: TaskNode[] = allNotes.map(n => ({
      id: n.id,
      width: n.size?.width || 240,
      height: n.size?.height || 180, // Utilise la taille sauvegardée dans le JSON
      groupId: noteZoneMapping.get(n.id),
      x: n.position.x,
      y: n.position.y
    }));

    // 3. Prepare TaskEdge models
    const taskEdges: TaskEdge[] = allEdges.map(e => ({
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId
    }));

    // 4. Prepare TaskGroup models from whiteboard zones
    const taskGroups: TaskGroup[] = currentZones.map(z => ({
      id: z.id,
      label: z.label,
      x: z.bounds.x,
      y: z.bounds.y,
      width: z.bounds.width,
      height: z.bounds.height
    }));

    // 5. Run the hierarchical compound DAG layout algorithm (explicit gaps, zero sticking)
    const layoutResult = this.workflowLayout.optimizeLayout(
      taskNodes,
      taskEdges,
      taskGroups,
      {
        nodeGapX: 100,
        nodeGapY: 50,
        groupPadding: 50,
        groupGapX: 140,
        groupGapY: 100
      }
    );

    // 6. Apply calculated positions back to notes (detaching clusterId to eliminate magnetic sticking artifacts)
    const layoutNodeMap = new Map(layoutResult.nodes.map(n => [n.id, n]));
    const updatedNotes: ADHDPostItNote[] = allNotes.map(note => {
      const positioned = layoutNodeMap.get(note.id);
      if (positioned && positioned.x !== undefined && positioned.y !== undefined) {
        return {
          ...note,
          clusterId: undefined, // Suppress magnetic cluster gluing during auto-layout
          position: {
            x: Math.round(positioned.x / 10) * 10,
            y: Math.round(positioned.y / 10) * 10
          },
          updatedAt: Date.now()
        };
      }
      return note;
    });

    // 7. Apply calculated boundaries back to zones
    const layoutGroupMap = new Map(layoutResult.groups.map(g => [g.id, g]));
    const updatedZones: WhiteboardZone[] = currentZones.map(zone => {
      const positioned = layoutGroupMap.get(zone.id);
      if (positioned && positioned.x !== undefined && positioned.y !== undefined) {
        return {
          ...zone,
          bounds: {
            x: Math.round(positioned.x / 10) * 10,
            y: Math.round(positioned.y / 10) * 10,
            width: Math.round((positioned.width || zone.bounds.width) / 10) * 10,
            height: Math.round((positioned.height || zone.bounds.height) / 10) * 10
          }
        };
      }
      return zone;
    });

    // 8. Persist to Dexie and update signals
    await this.db.notes.bulkPut(updatedNotes);
    if (updatedZones.length > 0) {
      await this.db.zones.bulkPut(updatedZones);
    }

    this.zones.set(updatedZones);
    this.notes.set(this.recalculateBlockedFlags(updatedNotes, allEdges));
  }

  /**
   * Sets the nature of a note (theme, pivot, action) and synchronizes tags
   */
  async setNoteNature(noteId: string, nature: PostItNature): Promise<void> {
    const note = this.notes().find(n => n.id === noteId);
    if (!note) return;
    let tags = (note.tags || []).filter(t => t !== 'thème' && t !== 'theme' && t !== 'sous-tâche' && t !== 'subtask' && t !== 'pivot' && t !== 'milestone' && t !== 'jalon');
    if (nature === 'theme') {
      tags.push('thème');
    } else if (nature === 'action') {
      tags.push('sous-tâche');
    } else if (nature === 'pivot') {
      tags.push('pivot');
    }
    const patch: Partial<ADHDPostItNote> = { nature, tags };
    if (nature === 'theme' || nature === 'pivot') {
      patch.scheduledSlot = undefined;
      patch.estimatedMinutes = 0;
    }
    await this.updateNote(noteId, patch);
  }

  /**
   * Sets the complexity of a note (simple, medium, complex, epic) and aligns cognitiveLoad
   */
  async setNoteComplexity(noteId: string, complexity: PostItComplexity): Promise<void> {
    const loadMap: Record<PostItComplexity, CognitiveLoad> = {
      simple: 'low',
      medium: 'medium',
      complex: 'high',
      epic: 'high'
    };
    await this.updateNote(noteId, {
      complexity,
      cognitiveLoad: loadMap[complexity]
    });
  }

  /**
   * Duplicates a note with an offset position
   */
  async duplicateNote(noteId: string): Promise<ADHDPostItNote | null> {
    const note = this.notes().find(n => n.id === noteId);
    if (!note) return null;
    const duplicated: ADHDPostItNote = {
      ...note,
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: `${note.title} (copie)`,
      position: {
        x: note.position.x + 30,
        y: note.position.y + 30
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await this.addNote(duplicated);
    return duplicated;
  }

  // --- INTERNAL HELPERS ---

  private recalculateBlockedFlags(notes: ADHDPostItNote[], edges: PostItEdge[]): ADHDPostItNote[] {
    const uncompletedNoteIds = new Set(notes.filter(n => this.isNoteOpen(n)).map(n => n.id));
    const blockedIds = new Set<string>();

    for (const edge of edges) {
      if (edge.type === 'depends_on' && uncompletedNoteIds.has(edge.sourceId)) {
        blockedIds.add(edge.targetId);
      }
    }

    return notes.map(n => ({
      ...n,
      // UC7: A Thema is an umbrella/container and is NEVER marked as isBlocked
      isBlocked: this.isThemaNote(n) ? false : (blockedIds.has(n.id) || n.status === 'blocked')
    }));
  }

  /**
   * UC7: Launches instant focus spotlight on a note and navigates to Dashboard/Focus view
   */
  setActiveFocusNote(note: ADHDPostItNote | null, navigateToDashboard = true): void {
    this.activeFocusNote.set(note);
    if (note && navigateToDashboard) {
      this.activeWorkspaceZone.set('dashboard');
    }
  }

  /**
   * UC8: Cumulative Completion & Cascade Done
   * When a terminal action in a chain is marked done (or user triggers "Complete All"),
   * transitions all upstream connected subtask notes to status = 'done_cross'
   * and transitions the parent Thema note to status = 'done_check'.
   */
  async completeTaskCascade(actionNoteId: string): Promise<void> {
    const allNotes = this.notes();
    const allEdges = this.edges();
    const actionNote = allNotes.find(n => n.id === actionNoteId);
    if (!actionNote) return;

    this.recordSnapshot();

    // Traverse upstream along depends_on edges to collect all ancestor/sibling subtasks and parent Thema
    const upstreamIds = new Set<string>([actionNoteId]);
    const queue = [actionNoteId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      // Find notes that this note depends on (incoming sourceIds where targetId == currentId)
      const incomingEdges = allEdges.filter(e => e.targetId === currentId && e.type === 'depends_on');
      for (const edge of incomingEdges) {
        if (!upstreamIds.has(edge.sourceId)) {
          upstreamIds.add(edge.sourceId);
          queue.push(edge.sourceId);
        }
      }
    }

    // Also include any notes belonging to the same cluster
    if (actionNote.clusterId) {
      const clusterNotes = allNotes.filter(n => n.clusterId === actionNote.clusterId);
      for (const cn of clusterNotes) {
        upstreamIds.add(cn.id);
      }
    }

    const updatedNotes: ADHDPostItNote[] = [];
    const now = Date.now();

    for (const n of allNotes) {
      if (upstreamIds.has(n.id)) {
        const isThema = this.isThemaNote(n);
        // Parent Thema transitions to verified 'done_check' (✓), while action subtasks transition to 'done_cross' (❌)
        const newStatus = isThema ? 'done_check' : 'done_cross';
        updatedNotes.push({
          ...n,
          status: newStatus,
          isBlocked: false,
          updatedAt: now
        });
      } else {
        updatedNotes.push(n);
      }
    }

    await this.db.notes.bulkPut(updatedNotes);
    this.notes.set(this.recalculateBlockedFlags(updatedNotes, allEdges));
  }

  // --- ZONE / REGION CRUD (UC4) ---
  async addZone(partial: Partial<WhiteboardZone>): Promise<WhiteboardZone> {
    this.recordSnapshot();
    const id = partial.id ?? `zone-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newZone: WhiteboardZone = {
      id,
      label: partial.label ?? 'Nouvelle Région',
      colorCode: partial.colorCode ?? '#ff7700',
      bounds: partial.bounds ?? { x: 100, y: 100, width: 450, height: 350 }
    };
    await this.db.zones.put(newZone);
    this.zones.update(zones => [...zones, newZone]);
    return newZone;
  }

  async updateZone(id: string, patch: Partial<WhiteboardZone>): Promise<void> {
    const existing = this.zones().find(z => z.id === id);
    if (!existing) return;
    this.recordSnapshot();
    const updated: WhiteboardZone = {
      ...existing,
      ...patch,
      bounds: patch.bounds ? { ...existing.bounds, ...patch.bounds } : existing.bounds
    };
    await this.db.zones.put(updated);
    this.zones.update(zones => zones.map(z => z.id === id ? updated : z));
  }

  async deleteZone(id: string): Promise<void> {
    this.recordSnapshot();
    await this.db.zones.delete(id);
    this.zones.update(zones => zones.filter(z => z.id !== id));
  }

  // --- UNDO / REDO OPERATIONS ---

  /** Records state snapshot before a mutating action */
  recordSnapshot(): void {
    if (!this.isInitialized()) return;
    const snapshot = {
      notes: JSON.parse(JSON.stringify(this.notes())),
      edges: JSON.parse(JSON.stringify(this.edges())),
      clusters: JSON.parse(JSON.stringify(this.clusters())),
      zones: JSON.parse(JSON.stringify(this.zones()))
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.canUndo.set(true);
    this.canRedo.set(false);
  }

  /** Reverts to the previous recorded state */
  async undo(): Promise<boolean> {
    if (this.undoStack.length === 0) return false;

    // Save current state into redoStack
    const currentState = {
      notes: JSON.parse(JSON.stringify(this.notes())),
      edges: JSON.parse(JSON.stringify(this.edges())),
      clusters: JSON.parse(JSON.stringify(this.clusters())),
      zones: JSON.parse(JSON.stringify(this.zones()))
    };
    this.redoStack.push(currentState);

    const previous = this.undoStack.pop()!;
    await this.applySnapshot(previous);

    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(true);
    return true;
  }

  /** Re-applies the undone state */
  async redo(): Promise<boolean> {
    if (this.redoStack.length === 0) return false;

    // Save current state into undoStack
    const currentState = {
      notes: JSON.parse(JSON.stringify(this.notes())),
      edges: JSON.parse(JSON.stringify(this.edges())),
      clusters: JSON.parse(JSON.stringify(this.clusters())),
      zones: JSON.parse(JSON.stringify(this.zones()))
    };
    this.undoStack.push(currentState);

    const next = this.redoStack.pop()!;
    await this.applySnapshot(next);

    this.canUndo.set(true);
    this.canRedo.set(this.redoStack.length > 0);
    return true;
  }

  private async applySnapshot(snapshot: { notes: ADHDPostItNote[]; edges: PostItEdge[]; clusters: NoteCluster[]; zones: WhiteboardZone[] }): Promise<void> {
    await this.db.notes.clear();
    if (snapshot.notes.length > 0) {
      await this.db.notes.bulkPut(snapshot.notes);
    }

    await this.db.edges.clear();
    if (snapshot.edges.length > 0) {
      await this.db.edges.bulkPut(snapshot.edges);
    }

    await this.db.clusters.clear();
    if (snapshot.clusters.length > 0) {
      await this.db.clusters.bulkPut(snapshot.clusters);
    }

    await this.db.zones.clear();
    if (snapshot.zones && snapshot.zones.length > 0) {
      await this.db.zones.bulkPut(snapshot.zones);
    }

    this.edges.set(snapshot.edges);
    this.clusters.set(snapshot.clusters);
    this.zones.set(snapshot.zones || []);
    this.notes.set(this.recalculateBlockedFlags(snapshot.notes, snapshot.edges));
  }

  /**
   * Export the complete wall state as a portable JSON snapshot
   * (preserves all notes, coordinates, colors, sizes, links, clusters, and regions).
   */
  exportWallSnapshot(): IdeationWallSnapshot {
    return {
      version: 1,
      app: 'Taskstick',
      exportedAt: Date.now(),
      dateKey: this.selectedDateKey(),
      notes: JSON.parse(JSON.stringify(this.notes())),
      edges: JSON.parse(JSON.stringify(this.edges())),
      clusters: JSON.parse(JSON.stringify(this.clusters())),
      zones: JSON.parse(JSON.stringify(this.zones()))
    };
  }

  /**
   * Restores a full wall state from a JSON snapshot, populating Dexie DB
   * and all reactive signals (notes, edges, clusters, zones).
   */
  async restoreWallSnapshot(snapshot: IdeationWallSnapshot): Promise<void> {
    this.recordSnapshot();

    const dateKey = snapshot.dateKey || this.selectedDateKey();
    this.selectedDateKey.set(dateKey);

    const notesToLoad = (snapshot.notes || []).map(n => ({
      ...n,
      zoneId: n.zoneId || dateKey
    }));
    const edgesToLoad = snapshot.edges || [];
    const clustersToLoad = snapshot.clusters || [];
    const zonesToLoad = snapshot.zones || [];

    // 1. Persist to Dexie tables
    if (notesToLoad.length > 0) {
      await this.db.notes.bulkPut(notesToLoad);
    }
    if (edgesToLoad.length > 0) {
      await this.db.edges.bulkPut(edgesToLoad);
    }
    if (clustersToLoad.length > 0) {
      await this.db.clusters.bulkPut(clustersToLoad);
    }
    if (zonesToLoad.length > 0) {
      await this.db.zones.bulkPut(zonesToLoad);
    }

    // 2. Update reactive state signals
    this.edges.set(edgesToLoad);
    this.clusters.set(clustersToLoad);
    this.zones.set(zonesToLoad);
    this.notes.set(this.recalculateBlockedFlags(notesToLoad, edgesToLoad));

    // 3. Keep fallback legacy journal in sync
    await this.migrationAdapter.syncGraphToLegacyLocalStorage(dateKey, notesToLoad);
    await this.refreshAvailableDates();
  }

  /**
   * Scans all IndexedDB notes, IndexedDB journals, and localStorage
   * to compute and emit the complete, deduplicated list of available historical dates.
   */
  async refreshAvailableDates(): Promise<string[]> {
    try {
      const dateSet = new Set<string>();
      const isDate = (k: string) => /^\d{8}$/.test(k) || /^\d{4}-\d{2}-\d{2}$/.test(k);

      // 1. Scan LocalStorage
      for (const d of this.storage.listDates()) {
        if (isDate(d)) dateSet.add(d);
      }

      // 2. Scan IndexedDB journals table
      const journals = await this.db.journals.toArray();
      for (const j of journals) {
        if (j.dateKey && isDate(j.dateKey)) dateSet.add(j.dateKey);
      }

      // 3. Scan IndexedDB notes table zoneId
      const notes = await this.db.notes.toArray();
      for (const n of notes) {
        if (n.zoneId && isDate(n.zoneId)) dateSet.add(n.zoneId);
      }

      // 4. Always ensure today is present
      dateSet.add(this.getTodayKey());

      const sortedDates = Array.from(dateSet).sort().reverse();
      this.availableDates.set(sortedDates);
      return sortedDates;
    } catch (err) {
      console.warn('[TaskstickStore] Could not refresh available dates:', err);
      return [this.getTodayKey()];
    }
  }

  private getTodayKey(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }

  /**
   * Automatically calculates a clean, non-overlapping Left-to-Right cognitive tree
   * for all notes on the canvas, aligning child forks to parent centers.
   */
  async autoAlignCognitiveTree(): Promise<void> {
    const currentNotes = this.notes();
    const currentEdges = this.edges();
    const currentZones = this.zones();

    if (currentNotes.length === 0) return;

    // Snapshot before modifying coordinates for undo support
    this.recordSnapshot();

    const taskNodes: TaskNode[] = currentNotes.map(n => ({
      id: n.id,
      width: n.size?.width || (this.isThemaNote(n) ? 260 : 210),
      height: n.size?.height || (this.isThemaNote(n) ? 180 : 160),
      groupId: n.zoneId || undefined,
      x: n.position.x,
      y: n.position.y
    }));

    const taskEdges: TaskEdge[] = currentEdges.map(e => ({
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId
    }));

    const taskGroups: TaskGroup[] = currentZones.map(z => ({
      id: z.id,
      label: z.label,
      x: z.bounds.x,
      y: z.bounds.y,
      width: z.bounds.width,
      height: z.bounds.height
    }));

    const result = this.workflowLayout.optimizeLayout(taskNodes, taskEdges, taskGroups, {
      nodeGapX: 120,
      nodeGapY: 50,
      originX: 100,
      originY: 100
    });

    // Re-map computed coordinates back to ADHDPostItNote signals
    const positionMap = new Map(result.nodes.map(n => [n.id, { x: n.x || 0, y: n.y || 0 }]));
    const updatedNotes = currentNotes.map(note => {
      const newPos = positionMap.get(note.id);
      return newPos ? { ...note, position: { x: Math.round(newPos.x), y: Math.round(newPos.y) }, updatedAt: Date.now() } : note;
    });

    const updatedZones = currentZones.map(zone => {
      const groupPos = result.groups.find(g => g.id === zone.id);
      return groupPos ? {
        ...zone,
        bounds: {
          x: Math.round(groupPos.x || 0),
          y: Math.round(groupPos.y || 0),
          width: Math.round(groupPos.width || 280),
          height: Math.round(groupPos.height || 200)
        }
      } : zone;
    });

    await this.db.notes.bulkPut(updatedNotes);
    if (updatedZones.length > 0) {
      await this.db.zones.bulkPut(updatedZones);
    }

    this.notes.set(this.recalculateBlockedFlags(updatedNotes, currentEdges));
    this.zones.set(updatedZones);
  }


// Inside src/app/services/taskstick-store.service.ts

/**
 * 1. CLEAR BOARD: Clears the active board (all notes, edges, and regions for the current date).
 * Saves an Undo snapshot first so a single tap on ↩️ restores everything.
 */
async clearActiveBoard(onlyCompleted = false): Promise<number> {
  const currentNotes = this.notes();
  if (currentNotes.length === 0) return 0;

  this.recordSnapshot();
  const dateKey = this.selectedDateKey();

  const notesToDelete = onlyCompleted
    ? currentNotes.filter(n => this.isNoteCompleted(n))
    : currentNotes;

  const deleteIds = new Set(notesToDelete.map(n => n.id));
  const remainingNotes = currentNotes.filter(n => !deleteIds.has(n.id));

  // Delete target notes from IndexedDB
  await this.db.notes.bulkDelete(Array.from(deleteIds));

  // Delete incident edges connected to removed notes
  const currentEdges = this.edges();
  const edgesToDelete = currentEdges.filter(
    e => deleteIds.has(e.sourceId) || deleteIds.has(e.targetId)
  );
  await this.db.edges.bulkDelete(edgesToDelete.map(e => e.id));

  const remainingEdges = currentEdges.filter(
    e => !deleteIds.has(e.sourceId) && !deleteIds.has(e.targetId)
  );

  // If clearing the whole board, also clear visual zones and legacy localStorage for this date
  if (!onlyCompleted) {
    const zoneIds = this.zones().map(z => z.id);
    if (zoneIds.length > 0) {
      await this.db.zones.bulkDelete(zoneIds);
    }
    this.zones.set([]);
    localStorage.removeItem(`journal-${dateKey}`);
  } else {
    await this.migrationAdapter.syncGraphToLegacyLocalStorage(dateKey, remainingNotes);
  }

  this.edges.set(remainingEdges);
  this.notes.set(this.recalculateBlockedFlags(remainingNotes, remainingEdges));
  return deleteIds.size;
}

/**
 * Helper: Loads notes & internal edges for any historical dateKey from IndexedDB or legacy storage.
 */
private async fetchBoardDataByDate(dateKey: string): Promise<{
  notes: ADHDPostItNote[];
  edges: PostItEdge[];
}> {
  let sourceNotes = await this.db.notes.where('zoneId').equals(dateKey).toArray();

  if (sourceNotes.length === 0) {
    const raw = localStorage.getItem(`journal-${dateKey}`);
    if (raw) {
      sourceNotes = this.migrationAdapter.parseMmdToNotes(raw, dateKey);
    }
  }

  const noteIdSet = new Set(sourceNotes.map(n => n.id));
  const allEdges = await this.db.edges.toArray();
  const sourceEdges = allEdges.filter(
    e => noteIdSet.has(e.sourceId) && noteIdSet.has(e.targetId)
  );

  return { notes: sourceNotes, edges: sourceEdges };
}

/**
 * 2. RELOAD A PREVIOUS DAY BOARD:
 * - 'switch': Navigate directly to that date's board.
 * - 'replace_today': Replace today's board with a fresh copy of the previous day's board.
 * - 'carry_over_open': Reload only unfinished (open/blocked/in_progress) tasks & their dependencies into today.
 */
async reloadPreviousBoard(
  sourceDateKey: string,
  mode: 'switch' | 'replace_today' | 'carry_over_open' = 'carry_over_open'
): Promise<number> {
  if (!sourceDateKey) return 0;

  if (mode === 'switch') {
    await this.switchDate(sourceDateKey);
    return this.notes().length;
  }

  const todayKey = this.getTodayKey();
  const { notes: rawSourceNotes, edges: rawSourceEdges } = await this.fetchBoardDataByDate(sourceDateKey);
  if (rawSourceNotes.length === 0) return 0;

  this.recordSnapshot();

  // Filter if carrying over only unfinished tasks (keep parent Themas/Pivots for context)
  const filteredSourceNotes = mode === 'carry_over_open'
    ? rawSourceNotes.filter(n => this.isNoteOpen(n) || this.isThemaNote(n) || this.isPivotNote(n))
    : rawSourceNotes;

  if (mode === 'replace_today') {
    await this.clearActiveBoard(false);
  }

  this.selectedDateKey.set(todayKey);
  return this.mergeNotesAndEdgesIntoActiveBoard(filteredSourceNotes, rawSourceEdges, {
    deduplicateByTitle: true,
    autoLayout: false
  });
}

/**
 * 3. MERGE TWO BOARDS TOGETHER:
 * Merges another date's board OR an external IdeationWallSnapshot (.json) into the active board.
 * - Remaps IDs so historical records in Dexie are never corrupted.
 * - Deduplicates identical note titles (re-linking incoming edges to existing notes).
 * - Shifts merged notes to the right of existing notes so nothing overlaps.
 */
async mergeWithBoard(
  source: string | IdeationWallSnapshot,
  options: { onlyOpenTasks?: boolean; autoLayout?: boolean } = {}
): Promise<number> {
  this.recordSnapshot();

  let incomingNotes: ADHDPostItNote[] = [];
  let incomingEdges: PostItEdge[] = [];

  if (typeof source === 'string') {
    const data = await this.fetchBoardDataByDate(source);
    incomingNotes = data.notes;
    incomingEdges = data.edges;
  } else {
    incomingNotes = source.notes || [];
    incomingEdges = source.edges || [];
  }

  if (options.onlyOpenTasks) {
    incomingNotes = incomingNotes.filter(
      n => this.isNoteOpen(n) || this.isThemaNote(n) || this.isPivotNote(n)
    );
  }

  if (incomingNotes.length === 0) return 0;

  return this.mergeNotesAndEdgesIntoActiveBoard(incomingNotes, incomingEdges, {
    deduplicateByTitle: true,
    autoLayout: options.autoLayout ?? true
  });
}

/**
 * Core Graph Merger: Remaps IDs, resolves title collisions, offsets 2D coordinates,
 * and splices dependency edges without creating cycles.
 */
private async mergeNotesAndEdgesIntoActiveBoard(
  incomingNotes: ADHDPostItNote[],
  incomingEdges: PostItEdge[],
  config: { deduplicateByTitle: boolean; autoLayout: boolean }
): Promise<number> {
  const activeDateKey = this.selectedDateKey();
  const existingNotes = this.notes();
  const existingEdges = this.edges();

  // Compute horizontal bounding box offset so merged board lands cleanly to the right
  const maxExistingX = existingNotes.reduce(
    (max, n) => Math.max(max, n.position.x + (n.size?.width || 210)),
    60
  );
  const minIncomingX = incomingNotes.reduce(
    (min, n) => Math.min(min, n.position.x),
    Infinity
  );
  const offsetX = existingNotes.length > 0
    ? (maxExistingX + 140) - (Number.isFinite(minIncomingX) ? minIncomingX : 0)
    : 0;

  // Map oldNoteId -> targetNoteId (either an existing note with same title, or a newly minted ID)
  const idRemap = new Map<string, string>();
  const existingByTitle = new Map<string, ADHDPostItNote>(
    existingNotes.map(n => [n.title.trim().toLowerCase(), n])
  );

  const notesToInsert: ADHDPostItNote[] = [];
  const now = Date.now();

  for (const srcNote of incomingNotes) {
    const normTitle = srcNote.title.trim().toLowerCase();
    const match = config.deduplicateByTitle ? existingByTitle.get(normTitle) : undefined;

    if (match) {
      // Reuse existing note ID so incoming edges wire directly into the existing note
      idRemap.set(srcNote.id, match.id);
    } else {
      const newId = `note-${now}-${Math.random().toString(36).substring(2, 7)}`;
      idRemap.set(srcNote.id, newId);

      const clonedNote: ADHDPostItNote = {
        ...srcNote,
        id: newId,
        zoneId: activeDateKey,
        clusterId: undefined,
        position: {
          x: Math.round((srcNote.position.x + offsetX) / 10) * 10,
          y: Math.round(srcNote.position.y / 10) * 10
        },
        createdAt: now,
        updatedAt: now
      };
      notesToInsert.push(clonedNote);
      existingByTitle.set(normTitle, clonedNote);
    }
  }

  // Remap edges and prevent duplicates
  const existingEdgeKeys = new Set(
    existingEdges.map(e => `${e.sourceId}->${e.targetId}:${e.type}`)
  );
  const edgesToInsert: PostItEdge[] = [];

  for (const srcEdge of incomingEdges) {
    const newSourceId = idRemap.get(srcEdge.sourceId);
    const newTargetId = idRemap.get(srcEdge.targetId);

    if (!newSourceId || !newTargetId || newSourceId === newTargetId) continue;

    const edgeKey = `${newSourceId}->${newTargetId}:${srcEdge.type}`;
    if (!existingEdgeKeys.has(edgeKey)) {
      existingEdgeKeys.add(edgeKey);
      edgesToInsert.push({
        id: `edge_${newSourceId}_${newTargetId}_${now}`,
        sourceId: newSourceId,
        targetId: newTargetId,
        type: srcEdge.type,
        label: srcEdge.label
      });
    }
  }

  // Persist to Dexie & update reactive signals
  if (notesToInsert.length > 0) {
    await this.db.notes.bulkPut(notesToInsert);
  }
  if (edgesToInsert.length > 0) {
    await this.db.edges.bulkPut(edgesToInsert);
  }

  const combinedNotes = [...existingNotes, ...notesToInsert];
  const combinedEdges = [...existingEdges, ...edgesToInsert];

  this.edges.set(combinedEdges);
  this.notes.set(this.recalculateBlockedFlags(combinedNotes, combinedEdges));
  await this.migrationAdapter.syncGraphToLegacyLocalStorage(activeDateKey, combinedNotes);
  await this.refreshAvailableDates();

  if (config.autoLayout && notesToInsert.length > 0) {
    await this.optimizeSpatialLayout();
  }

  return notesToInsert.length;
}


}


