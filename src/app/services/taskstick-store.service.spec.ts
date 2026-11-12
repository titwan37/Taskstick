// src/app/services/taskstick-store.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { TaskstickStoreService } from './taskstick-store.service';
import { TaskstickDbService } from './taskstick-db.service';
import { StorageMigrationAdapter } from './storage-migration.adapter';
import { ADHDPostItNote, PostItEdge } from '../models/taskstick-graph.model';
import { computeNodeDimensions } from './workflow-layout.service';

describe('TaskstickStoreService - UC7 & UC8 Features', () => {
  let store: TaskstickStoreService;
  let mockDb: any;
  let mockMigration: any;

  beforeEach(() => {
    mockDb = {
      notes: {
        put: jasmine.createSpy('put').and.returnValue(Promise.resolve()),
        bulkPut: jasmine.createSpy('bulkPut').and.returnValue(Promise.resolve()),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
        clear: jasmine.createSpy('clear').and.returnValue(Promise.resolve()),
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
        where: jasmine.createSpy('where').and.returnValue({
          equals: () => ({ toArray: () => Promise.resolve([]) })
        })
      },
      edges: {
        put: jasmine.createSpy('put').and.returnValue(Promise.resolve()),
        bulkPut: jasmine.createSpy('bulkPut').and.returnValue(Promise.resolve()),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
        clear: jasmine.createSpy('clear').and.returnValue(Promise.resolve()),
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([]))
      },
      clusters: {
        bulkPut: jasmine.createSpy('bulkPut').and.returnValue(Promise.resolve()),
        clear: jasmine.createSpy('clear').and.returnValue(Promise.resolve()),
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([]))
      },
      zones: {
        put: jasmine.createSpy('put').and.returnValue(Promise.resolve()),
        bulkPut: jasmine.createSpy('bulkPut').and.returnValue(Promise.resolve()),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
        clear: jasmine.createSpy('clear').and.returnValue(Promise.resolve()),
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([]))
      }
    };

    mockMigration = {
      syncGraphToLegacyLocalStorage: jasmine.createSpy('sync').and.returnValue(Promise.resolve()),
      migrateLegacyLocalStorage: jasmine.createSpy('migrate').and.returnValue(Promise.resolve())
    };

    TestBed.configureTestingModule({
      providers: [
        TaskstickStoreService,
        { provide: TaskstickDbService, useValue: mockDb },
        { provide: StorageMigrationAdapter, useValue: mockMigration }
      ]
    });

    store = TestBed.inject(TaskstickStoreService);
  });

  describe('UC7: Thema Non-Blocking DAG Solver', () => {
    it('should identify thema notes correctly', () => {
      const themaNote: ADHDPostItNote = {
        id: 'thema-1',
        title: 'Refonte Architecture',
        color: 'yellow',
        status: 'open',
        tags: ['thème'],
        position: { x: 10, y: 10 },
        zIndex: 1,
        cognitiveLoad: 'high',
        estimatedMinutes: 30,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const subtaskNote: ADHDPostItNote = {
        id: 'subtask-1',
        title: 'Ouvrir le repo',
        color: 'yellow',
        status: 'open',
        tags: ['thème', 'sous-tâche'],
        position: { x: 10, y: 50 },
        zIndex: 2,
        cognitiveLoad: 'low',
        estimatedMinutes: 10,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(store.isThemaNote(themaNote)).toBeTrue();
      expect(store.isThemaNote(subtaskNote)).toBeFalse();
    });

    it('should NEVER mark a Thema as isBlocked even if it has open prerequisites', () => {
      const prereqNote: ADHDPostItNote = {
        id: 'prereq-1',
        title: 'Préalable requis',
        color: 'blue',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 10,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const themaNote: ADHDPostItNote = {
        id: 'thema-1',
        title: 'Grand Thème',
        color: 'yellow',
        status: 'open',
        tags: ['thème'],
        position: { x: 100, y: 100 },
        zIndex: 2,
        cognitiveLoad: 'high',
        estimatedMinutes: 60,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const edge: PostItEdge = {
        id: 'edge-1',
        sourceId: 'prereq-1',
        targetId: 'thema-1',
        type: 'depends_on'
      };

      store.notes.set([prereqNote, themaNote]);
      store.edges.set([edge]);

      // Trigger re-computation
      expect(store.blockedNotes()).not.toContain(jasmine.objectContaining({ id: 'thema-1' }));
    });
  });

  describe('UC8: Cumulative Completion & Cascade Done', () => {
    it('should transition upstream subtasks to done_cross and parent Thema to done_check', async () => {
      const themaNote: ADHDPostItNote = {
        id: 'thema-root',
        title: 'Projet Alpha',
        color: 'purple',
        status: 'open',
        tags: ['thème'],
        position: { x: 10, y: 10 },
        zIndex: 1,
        cognitiveLoad: 'high',
        estimatedMinutes: 45,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const subtask1: ADHDPostItNote = {
        id: 'sub-1',
        title: 'Étape 1',
        color: 'purple',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 150 },
        zIndex: 2,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const subtask2: ADHDPostItNote = {
        id: 'sub-2',
        title: 'Étape 2 finale',
        color: 'purple',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 300 },
        zIndex: 3,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const edges: PostItEdge[] = [
        { id: 'e1', sourceId: 'thema-root', targetId: 'sub-1', type: 'depends_on' },
        { id: 'e2', sourceId: 'sub-1', targetId: 'sub-2', type: 'depends_on' }
      ];

      store.notes.set([themaNote, subtask1, subtask2]);
      store.edges.set(edges);

      await store.completeTaskCascade('sub-2');

      const updatedThema = store.notes().find(n => n.id === 'thema-root');
      const updatedSub1 = store.notes().find(n => n.id === 'sub-1');
      const updatedSub2 = store.notes().find(n => n.id === 'sub-2');

      expect(updatedThema?.status).toBe('done_check');
      expect(updatedSub1?.status).toBe('done_cross');
      expect(updatedSub2?.status).toBe('done_cross');
    });
  });

  describe('Sequential Chain & First Undone Task Ordering', () => {
    it('should strictly block downstream tasks (A -> B -> C) until predecessors are completed', async () => {
      const taskA: ADHDPostItNote = {
        id: 'task-A',
        title: 'Étape A (Préalable)',
        color: 'yellow',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 10 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 10,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const taskB: ADHDPostItNote = {
        id: 'task-B',
        title: 'Étape B (Intermédiaire)',
        color: 'yellow',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 100 },
        zIndex: 2,
        cognitiveLoad: 'medium',
        estimatedMinutes: 20,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const taskC: ADHDPostItNote = {
        id: 'task-C',
        title: 'Étape C (Finale)',
        color: 'yellow',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 200 },
        zIndex: 3,
        cognitiveLoad: 'high',
        estimatedMinutes: 30,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Dependencies: A -> B -> C
      const edges: PostItEdge[] = [
        { id: 'edge-ab', sourceId: 'task-A', targetId: 'task-B', type: 'depends_on' },
        { id: 'edge-bc', sourceId: 'task-B', targetId: 'task-C', type: 'depends_on' }
      ];

      // 1. Initial State: All tasks open
      const initialNotes = [taskA, taskB, taskC];
      store.notes.set(initialNotes);
      store.edges.set(edges);

      // Verify root actionable: Only taskA is actionable
      const root1 = store.rootActionableNotes();
      expect(root1.map(n => n.id)).toEqual(['task-A']);

      // Verify first undone task along the chain
      const firstUndone1 = store.getFirstUndoneTaskInChain([taskA, taskB, taskC]);
      expect(firstUndone1?.id).toBe('task-A');

      // Verify blocked tasks: taskB and taskC are blocked
      const blocked1 = store.blockedNotes();
      expect(blocked1.map(n => n.id).sort()).toEqual(['task-B', 'task-C']);

      // 2. Complete task A (A is done)
      await store.toggleNoteStatus('task-A'); // transitions to done_cross
      
      const root2 = store.rootActionableNotes();
      expect(root2.map(n => n.id)).toEqual(['task-B']);

      const firstUndone2 = store.getFirstUndoneTaskInChain(store.notes());
      expect(firstUndone2?.id).toBe('task-B');

      const blocked2 = store.blockedNotes();
      expect(blocked2.map(n => n.id)).toEqual(['task-C']);

      // 3. Complete task B (B is done)
      await store.toggleNoteStatus('task-B');

      const root3 = store.rootActionableNotes();
      expect(root3.map(n => n.id)).toEqual(['task-C']);

      const firstUndone3 = store.getFirstUndoneTaskInChain(store.notes());
      expect(firstUndone3?.id).toBe('task-C');

      const blocked3 = store.blockedNotes();
      expect(blocked3.length).toBe(0);
    });
  });

  describe('Progressive Chain Scheduling & Cascading Unlocking (WeeklyPlanner DAG)', () => {
    it('should progressively unlock plannable tasks (A -> B -> C) as predecessors are scheduled on calendar', async () => {
      const taskA: ADHDPostItNote = {
        id: 'task-A',
        title: 'Étape A (Départ)',
        color: 'yellow',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 10 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const taskB: ADHDPostItNote = {
        id: 'task-B',
        title: 'Étape B (Milieu)',
        color: 'yellow',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 100 },
        zIndex: 2,
        cognitiveLoad: 'medium',
        estimatedMinutes: 25,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const taskC: ADHDPostItNote = {
        id: 'task-C',
        title: 'Étape C (Arrivée)',
        color: 'yellow',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 10, y: 200 },
        zIndex: 3,
        cognitiveLoad: 'high',
        estimatedMinutes: 30,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Chain: A -> B -> C
      const edges: PostItEdge[] = [
        { id: 'e-ab', sourceId: 'task-A', targetId: 'task-B', type: 'depends_on' },
        { id: 'e-bc', sourceId: 'task-B', targetId: 'task-C', type: 'depends_on' }
      ];

      store.notes.set([taskA, taskB, taskC]);
      store.edges.set(edges);

      // 1. Initial State: Only task A is plannable
      expect(store.isTaskPlannable(taskA)).toBeTrue();
      expect(store.isTaskPlannable(taskB)).toBeFalse();
      expect(store.isTaskPlannable(taskC)).toBeFalse();

      const next1 = store.getNextPlannableTaskForChain([taskA, taskB, taskC]);
      expect(next1?.id).toBe('task-A');
      expect(store.getNextPlannableTaskForChain('task-A')?.id).toBe('task-A');

      // 2. Step 1: Schedule A on Tuesday (dayOfWeek = 2)
      await store.updateNote('task-A', {
        scheduledSlot: { dayOfWeek: 2, startHour: 9, durationMinutes: 15 }
      });

      // Now A is scheduled: isTaskPlannable(A) is false because it's already on the calendar
      const updatedA = store.notes().find(n => n.id === 'task-A')!;
      const updatedB = store.notes().find(n => n.id === 'task-B')!;
      const updatedC = store.notes().find(n => n.id === 'task-C')!;

      expect(store.isTaskPlannable(updatedA)).toBeFalse();
      // B's predecessor A is scheduled: B immediately pops up as plannable!
      expect(store.isTaskPlannable(updatedB)).toBeTrue();
      expect(store.isTaskPlannable(updatedC)).toBeFalse();

      const next2 = store.getNextPlannableTaskForChain(store.notes());
      expect(next2?.id).toBe('task-B');

      // 3. Step 2: Schedule B on Thursday (dayOfWeek = 4)
      await store.updateNote('task-B', {
        scheduledSlot: { dayOfWeek: 4, startHour: 10, durationMinutes: 25 }
      });

      const updatedA2 = store.notes().find(n => n.id === 'task-A')!;
      const updatedB2 = store.notes().find(n => n.id === 'task-B')!;
      const updatedC2 = store.notes().find(n => n.id === 'task-C')!;

      expect(store.isTaskPlannable(updatedA2)).toBeFalse();
      expect(store.isTaskPlannable(updatedB2)).toBeFalse();
      // C's predecessor B is scheduled: C pops up as plannable!
      expect(store.isTaskPlannable(updatedC2)).toBeTrue();

      const next3 = store.getNextPlannableTaskForChain(store.notes());
      expect(next3?.id).toBe('task-C');

      // 4. Step 3: Schedule C on Friday (dayOfWeek = 5)
      await store.updateNote('task-C', {
        scheduledSlot: { dayOfWeek: 5, startHour: 14, durationMinutes: 30 }
      });

      // Now all tasks are scheduled: no next plannable task remains
      const next4 = store.getNextPlannableTaskForChain(store.notes());
      expect(next4).toBeNull();

      // 5. Rollback: Unschedule A -> B and C must cascade back to unscheduled
      const rolledBackIds = await store.unscheduleTaskWithCascade('task-A');
      expect(rolledBackIds).toEqual(['task-B', 'task-C']);

      const rolledA = store.notes().find(n => n.id === 'task-A')!;
      const rolledB = store.notes().find(n => n.id === 'task-B')!;
      const rolledC = store.notes().find(n => n.id === 'task-C')!;

      expect(rolledA.scheduledSlot).toBeUndefined();
      expect(rolledB.scheduledSlot).toBeUndefined();
      expect(rolledC.scheduledSlot).toBeUndefined();

      // Reverts back to initial state: only A is plannable
      expect(store.isTaskPlannable(rolledA)).toBeTrue();
      expect(store.isTaskPlannable(rolledB)).toBeFalse();
      expect(store.isTaskPlannable(rolledC)).toBeFalse();
      expect(store.getNextPlannableTaskForChain(store.notes())?.id).toBe('task-A');
    });
  });

  describe('Post-It Context Menu Properties: Nature, Status & Complexity', () => {
    it('should set nature (theme, pivot, action) and synchronize helper flags', async () => {
      const testNote: ADHDPostItNote = {
        id: 'note-props',
        title: 'Tester les propriétés',
        color: 'blue',
        status: 'open',
        tags: [],
        position: { x: 50, y: 50 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 25,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.notes.set([testNote]);

      // 1. Set nature to 'theme'
      await store.setNoteNature('note-props', 'theme');
      let note = store.notes().find(n => n.id === 'note-props')!;
      expect(note.nature).toBe('theme');
      expect(note.tags).toContain('thème');
      expect(store.isThemaNote(note)).toBeTrue();
      expect(store.isPivotNote(note)).toBeFalse();

      // 2. Set nature to 'pivot'
      await store.setNoteNature('note-props', 'pivot');
      note = store.notes().find(n => n.id === 'note-props')!;
      expect(note.nature).toBe('pivot');
      expect(note.tags).toContain('pivot');
      expect(note.tags).not.toContain('thème');
      expect(store.isPivotNote(note)).toBeTrue();
      expect(store.isThemaNote(note)).toBeFalse();

      // 3. Set nature to 'action'
      await store.setNoteNature('note-props', 'action');
      note = store.notes().find(n => n.id === 'note-props')!;
      expect(note.nature).toBe('action');
      expect(note.tags).toContain('sous-tâche');
      expect(store.isThemaNote(note)).toBeFalse();
      expect(store.isPivotNote(note)).toBeFalse();
    });

    it('should set complexity and align cognitiveLoad accordingly', async () => {
      const testNote: ADHDPostItNote = {
        id: 'note-comp',
        title: 'Analyse complexe',
        color: 'pink',
        status: 'open',
        tags: [],
        position: { x: 50, y: 50 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 10,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.notes.set([testNote]);

      // Set to simple
      await store.setNoteComplexity('note-comp', 'simple');
      let note = store.notes().find(n => n.id === 'note-comp')!;
      expect(note.complexity).toBe('simple');
      expect(note.cognitiveLoad).toBe('low');

      // Set to epic
      await store.setNoteComplexity('note-comp', 'epic');
      note = store.notes().find(n => n.id === 'note-comp')!;
      expect(note.complexity).toBe('epic');
      expect(note.cognitiveLoad).toBe('high');
    });

    it('should respect extended statuses (in_progress, on_hold, blocked) in plannable and blocked queries', async () => {
      const noteA: ADHDPostItNote = {
        id: 'note-a',
        title: 'Tâche A',
        color: 'yellow',
        status: 'open',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 20,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.notes.set([noteA]);

      // When open: plannable
      expect(store.isTaskPlannable(noteA)).toBeTrue();

      // When on_hold: not plannable and excluded from rootActionableNotes
      await store.updateNote('note-a', { status: 'on_hold' });
      let updated = store.notes().find(n => n.id === 'note-a')!;
      expect(store.isTaskPlannable(updated)).toBeFalse();
      expect(store.rootActionableNotes().map(n => n.id)).not.toContain('note-a');

      // When blocked: marked blocked and not plannable
      await store.updateNote('note-a', { status: 'blocked' });
      updated = store.notes().find(n => n.id === 'note-a')!;
      expect(store.isTaskPlannable(updated)).toBeFalse();
      expect(store.blockedNotes().map(n => n.id)).toContain('note-a');
    });

    it('should duplicate a note with offset coordinates', async () => {
      const original: ADHDPostItNote = {
        id: 'orig-1',
        title: 'Original Note',
        color: 'green',
        status: 'open',
        nature: 'action',
        complexity: 'medium',
        tags: ['sous-tâche'],
        position: { x: 100, y: 150 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 25,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.notes.set([original]);

      const duplicated = await store.duplicateNote('orig-1');
      expect(duplicated).not.toBeNull();
      expect(duplicated?.title).toBe('Original Note (copie)');
      expect(duplicated?.position).toEqual({ x: 130, y: 180 });
      expect(duplicated?.color).toBe('green');
      expect(duplicated?.nature).toBe('action');
    });

    it('should strictly exclude Thèmes and Pivots from isPlannableTask and isTaskPlannable', () => {
      const themaNote: ADHDPostItNote = {
        id: 't-theme',
        title: 'Theme Conteneur',
        color: 'yellow',
        status: 'open',
        nature: 'theme',
        tags: ['thème'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 0,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const pivotNote: ADHDPostItNote = {
        id: 'p-pivot',
        title: 'Jalon Recette',
        color: 'purple',
        status: 'open',
        nature: 'pivot',
        tags: ['pivot', 'milestone'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 0,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const actionNote: ADHDPostItNote = {
        id: 'a-action',
        title: 'Action Concrète',
        color: 'green',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 25,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.notes.set([themaNote, pivotNote, actionNote]);

      expect(store.isPlannableTask(themaNote)).toBeFalse();
      expect(store.isPlannableTask(pivotNote)).toBeFalse();
      expect(store.isPlannableTask(actionNote)).toBeTrue();

      expect(store.isTaskPlannable(themaNote)).toBeFalse();
      expect(store.isTaskPlannable(pivotNote)).toBeFalse();
      expect(store.isTaskPlannable(actionNote)).toBeTrue();
    });

    it('should unlock Action 3 when Action 2 is scheduled in Action 1 -> Action 2 -> [PIVOT] -> Action 3 without Pivot needing scheduledSlot', async () => {
      const act1: ADHDPostItNote = {
        id: 'act-1',
        title: 'Action 1 : Spécifications',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 25,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const act2: ADHDPostItNote = {
        id: 'act-2',
        title: 'Action 2 : Implémentation',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'high',
        estimatedMinutes: 45,
        isBlocked: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const pivot: ADHDPostItNote = {
        id: 'pivot-gate',
        title: 'Jalon : Recette & Revue',
        color: 'purple',
        status: 'open',
        nature: 'pivot',
        tags: ['pivot'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 0,
        isBlocked: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const act3: ADHDPostItNote = {
        id: 'act-3',
        title: 'Action 3 : Déploiement Prod',
        color: 'green',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 15,
        isBlocked: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const edges: PostItEdge[] = [
        { id: 'e1', sourceId: 'act-1', targetId: 'act-2', type: 'depends_on' },
        { id: 'e2', sourceId: 'act-2', targetId: 'pivot-gate', type: 'depends_on' },
        { id: 'e3', sourceId: 'pivot-gate', targetId: 'act-3', type: 'depends_on' }
      ];

      store.notes.set([act1, act2, pivot, act3]);
      store.edges.set(edges);

      // Phase 1: Only Action 1 is plannable
      expect(store.isTaskPlannable(act1)).toBeTrue();
      expect(store.isTaskPlannable(act2)).toBeFalse();
      expect(store.isTaskPlannable(pivot)).toBeFalse();
      expect(store.isTaskPlannable(act3)).toBeFalse();
      expect(store.getNextPlannableTaskForChain([act1, act2, pivot, act3])?.id).toBe('act-1');

      // Phase 2: Action 1 is scheduled -> Action 2 becomes plannable
      await store.updateNote('act-1', {
        scheduledSlot: { dayOfWeek: 1, startHour: 9, durationMinutes: 25 }
      });
      const updatedAct2 = store.notes().find(n => n.id === 'act-2')!;
      const updatedAct3 = store.notes().find(n => n.id === 'act-3')!;
      expect(store.isTaskPlannable(updatedAct2)).toBeTrue();
      expect(store.isTaskPlannable(pivot)).toBeFalse();
      expect(store.isTaskPlannable(updatedAct3)).toBeFalse();
      expect(store.getNextPlannableTaskForChain(store.notes())?.id).toBe('act-2');

      // Phase 3: Action 2 is scheduled -> Pivot is satisfied and Action 3 becomes plannable!
      await store.updateNote('act-2', {
        scheduledSlot: { dayOfWeek: 2, startHour: 10, durationMinutes: 45 }
      });
      const noteMap = new Map(store.notes().map(n => [n.id, n]));
      const updatedPivot = noteMap.get('pivot-gate')!;
      const afterAct3 = noteMap.get('act-3')!;

      // Pivot does NOT have scheduledSlot, but is satisfied via its upstream Action 2
      expect(updatedPivot.scheduledSlot).toBeUndefined();
      expect(store.isPredecessorSatisfied(updatedPivot, noteMap)).toBeTrue();
      expect(store.isTaskPlannable(updatedPivot)).toBeFalse(); // Pivot is never plannable in backlog
      expect(store.isTaskPlannable(afterAct3)).toBeTrue(); // Action 3 is now plannable!
      expect(store.getNextPlannableTaskForChain(store.notes())?.id).toBe('act-3');
    });

    it('should correctly calculate getChainCumulativeDuration excluding Thèmes and Pivots', async () => {
      const thema: ADHDPostItNote = {
        id: 'th-1',
        title: 'Thème Refactoring',
        color: 'yellow',
        status: 'open',
        nature: 'theme',
        tags: ['thème'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'high',
        estimatedMinutes: 0,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const act1: ADHDPostItNote = {
        id: 'act-a',
        title: 'Action A : Audit',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const act2: ADHDPostItNote = {
        id: 'act-b',
        title: 'Action B : Tests',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 25,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const pivot: ADHDPostItNote = {
        id: 'piv-1',
        title: 'Jalon Validation QA',
        color: 'purple',
        status: 'open',
        nature: 'pivot',
        tags: ['pivot'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 0,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const act3: ADHDPostItNote = {
        id: 'act-c',
        title: 'Action C : Release',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'high',
        estimatedMinutes: 35,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const edges: PostItEdge[] = [
        { id: 'e0', sourceId: 'th-1', targetId: 'act-a', type: 'depends_on' },
        { id: 'e1', sourceId: 'act-a', targetId: 'act-b', type: 'depends_on' },
        { id: 'e2', sourceId: 'act-b', targetId: 'piv-1', type: 'depends_on' },
        { id: 'e3', sourceId: 'piv-1', targetId: 'act-c', type: 'depends_on' }
      ];

      store.notes.set([thema, act1, act2, pivot, act3]);
      store.edges.set(edges);

      // Total chain under thema = 15 + 25 + 35 = 75 minutes => "1h15"
      const themaDuration = store.getChainCumulativeDuration('th-1');
      expect(themaDuration.totalMinutes).toBe(75);
      expect(themaDuration.formatted).toBe('1h15');
      expect(themaDuration.remainingMinutes).toBe(75);
      expect(themaDuration.remainingFormatted).toBe('1h15');

      // Upstream lead time to reach pivot piv-1 = 15 + 25 = 40 minutes => "40m"
      const pivotLeadTime = store.getPivotUpstreamDuration('piv-1');
      expect(pivotLeadTime.totalMinutes).toBe(40);
      expect(pivotLeadTime.formatted).toBe('40m');
      expect(pivotLeadTime.remainingMinutes).toBe(40);

      // Total chain downstream from pivot = 35 minutes => "35m"
      const pivotDuration = store.getChainCumulativeDuration('piv-1');
      expect(pivotDuration.totalMinutes).toBe(35);
      expect(pivotDuration.formatted).toBe('35m');

      // Marking act-a as done reduces remaining duration
      await store.updateNote('act-a', { status: 'done_check' });
      const updatedThemaDuration = store.getChainCumulativeDuration('th-1');
      expect(updatedThemaDuration.totalMinutes).toBe(75);
      expect(updatedThemaDuration.remainingMinutes).toBe(60);
      expect(updatedThemaDuration.remainingFormatted).toBe('1h00');

      // Setting nature to theme or pivot automatically enforces estimatedMinutes = 0
      await store.updateNote('act-c', { estimatedMinutes: 50 });
      let updatedC = store.notes().find(n => n.id === 'act-c')!;
      expect(updatedC.estimatedMinutes).toBe(50);

      await store.setNoteNature('act-c', 'pivot');
      updatedC = store.notes().find(n => n.id === 'act-c')!;
      expect(updatedC.estimatedMinutes).toBe(0);

      // Attempting to update estimatedMinutes on a pivot or theme resets to 0
      await store.updateNote('act-c', { estimatedMinutes: 45 });
      updatedC = store.notes().find(n => n.id === 'act-c')!;
      expect(updatedC.estimatedMinutes).toBe(0);
    });

    it('should accurately calculate chain duration for 3 subtasks (10m, 20m, 15m -> 45m) and reactively update to 1h00 when a task increases to 25m', async () => {
      const themeNote: ADHDPostItNote = {
        id: 'th-parent',
        title: 'Thème Refonte Graphique',
        color: 'yellow',
        status: 'open',
        nature: 'theme',
        tags: ['thème'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 0,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const task1: ADHDPostItNote = {
        id: 'st-1',
        title: 'Tâche 1 : Wireframes',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 10,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const task2: ADHDPostItNote = {
        id: 'st-2',
        title: 'Tâche 2 : Maquettes UI',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 20,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const task3: ADHDPostItNote = {
        id: 'st-3',
        title: 'Tâche 3 : Prototype',
        color: 'yellow',
        status: 'open',
        nature: 'action',
        tags: ['sous-tâche'],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const edges: PostItEdge[] = [
        { id: 'te-1', sourceId: 'th-parent', targetId: 'st-1', type: 'depends_on' },
        { id: 'te-2', sourceId: 'st-1', targetId: 'st-2', type: 'depends_on' },
        { id: 'te-3', sourceId: 'st-2', targetId: 'st-3', type: 'depends_on' }
      ];

      store.notes.set([themeNote, task1, task2, task3]);
      store.edges.set(edges);

      // 1. Initial total: 10 + 20 + 15 = 45m
      const initial = store.getChainCumulativeDuration('th-parent');
      expect(initial.totalMinutes).toBe(45);
      expect(initial.formatted).toBe('45m');

      // 2. Modifying task1 from 10m to 25m => total becomes 25 + 20 + 15 = 60m => "1h00"
      await store.updateNote('st-1', { estimatedMinutes: 25 });
      const updated = store.getChainCumulativeDuration('th-parent');
      expect(updated.totalMinutes).toBe(60);
      expect(updated.formatted).toBe('1h00');
    });
  });

  describe('optimizeSpatialLayout with WorkflowLayoutService', () => {
    it('should arrange sequential dependency chain from left to right', async () => {
      const nodeA: ADHDPostItNote = {
        id: 'node-a',
        title: 'Step 1',
        color: 'yellow',
        status: 'open',
        tags: [],
        position: { x: 500, y: 500 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const nodeB: ADHDPostItNote = {
        id: 'node-b',
        title: 'Step 2',
        color: 'blue',
        status: 'open',
        tags: [],
        position: { x: 100, y: 100 },
        zIndex: 1,
        cognitiveLoad: 'medium',
        estimatedMinutes: 30,
        isBlocked: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const edges: PostItEdge[] = [
        { id: 'edge-ab', sourceId: 'node-a', targetId: 'node-b', type: 'depends_on' }
      ];

      store.notes.set([nodeA, nodeB]);
      store.edges.set(edges);

      await store.optimizeSpatialLayout();

      const notes = store.notes();
      const updatedA = notes.find(n => n.id === 'node-a')!;
      const updatedB = notes.find(n => n.id === 'node-b')!;

      // In left-to-right topological layout, prerequisite A must be positioned to the left of dependent B
      expect(updatedA.position.x).toBeLessThan(updatedB.position.x);
    });

    it('should maintain notes inside their enclosing whiteboard zone and auto-fit zone boundaries', async () => {
      const zone1 = {
        id: 'zone-1',
        label: 'Sprint A',
        colorCode: '#ff7700',
        bounds: { x: 50, y: 50, width: 400, height: 300 }
      };

      const noteInZone: ADHDPostItNote = {
        id: 'note-z',
        title: 'Inner Task',
        color: 'green',
        status: 'open',
        tags: [],
        position: { x: 100, y: 100 }, // Geometry inside zone1
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.zones.set([zone1]);
      store.notes.set([noteInZone]);
      store.edges.set([]);

      await store.optimizeSpatialLayout();

      const updatedZone = store.zones()[0];
      const updatedNote = store.notes()[0];

      // Note must be strictly positioned inside the updated zone boundaries
      expect(updatedNote.position.x).toBeGreaterThanOrEqual(updatedZone.bounds.x);
      expect(updatedNote.position.x).toBeLessThanOrEqual(updatedZone.bounds.x + updatedZone.bounds.width);
      expect(updatedNote.position.y).toBeGreaterThanOrEqual(updatedZone.bounds.y);
      expect(updatedNote.position.y).toBeLessThanOrEqual(updatedZone.bounds.y + updatedZone.bounds.height);
    });

    it('should place parallel fork branches at the same column X with distinct non-overlapping vertical slots Y', async () => {
      const rootNode: ADHDPostItNote = {
        id: 'fork-root',
        title: 'Root Epic',
        color: 'yellow',
        status: 'open',
        tags: [],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const branch1: ADHDPostItNote = {
        id: 'fork-branch-1',
        title: 'Parallel Branch 1',
        color: 'pink',
        status: 'open',
        tags: [],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const branch2: ADHDPostItNote = {
        id: 'fork-branch-2',
        title: 'Parallel Branch 2',
        color: 'blue',
        status: 'open',
        tags: [],
        position: { x: 0, y: 0 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const edges: PostItEdge[] = [
        { id: 'e-1', sourceId: 'fork-root', targetId: 'fork-branch-1', type: 'depends_on' },
        { id: 'e-2', sourceId: 'fork-root', targetId: 'fork-branch-2', type: 'depends_on' }
      ];

      store.notes.set([rootNode, branch1, branch2]);
      store.edges.set(edges);
      store.zones.set([]);

      await store.optimizeSpatialLayout();

      const b1 = store.notes().find(n => n.id === 'fork-branch-1')!;
      const b2 = store.notes().find(n => n.id === 'fork-branch-2')!;
      const root = store.notes().find(n => n.id === 'fork-root')!;

      // Branches must share identical X column level (Level 2)
      expect(b1.position.x).toBe(b2.position.x);
      expect(b1.position.x).toBeGreaterThan(root.position.x);

      // Branches must have distinct vertical slots with at least nodeGapY distance
      expect(Math.abs(b1.position.y - b2.position.y)).toBeGreaterThanOrEqual(160); // 120px height + gap
    });

    it('should clear clusterId and enforce zero-sticking buffer between notes', async () => {
      const nodeA: ADHDPostItNote = {
        id: 'stuck-1',
        title: 'Task 1',
        color: 'yellow',
        status: 'open',
        tags: [],
        clusterId: 'cluster-old',
        position: { x: 100, y: 100 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const nodeB: ADHDPostItNote = {
        id: 'stuck-2',
        title: 'Task 2',
        color: 'yellow',
        status: 'open',
        tags: [],
        clusterId: 'cluster-old',
        position: { x: 290, y: 100 },
        zIndex: 1,
        cognitiveLoad: 'low',
        estimatedMinutes: 15,
        isBlocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.notes.set([nodeA, nodeB]);
      store.edges.set([]);
      store.zones.set([]);

      await store.optimizeSpatialLayout();

      const updated = store.notes();
      expect(updated[0].clusterId).toBeUndefined();
      expect(updated[1].clusterId).toBeUndefined();
    });

    it('should compute node dimensions respecting 192px/210px width and 160px min height with dynamic expansion', () => {
      const shortTitle = 'Do task';
      const shortDims = computeNodeDimensions(shortTitle);
      expect(shortDims.width).toBe(210);
      expect(shortDims.height).toBe(160);

      const longTitle = 'This is an exceptionally long task title designed to stretch across multiple lines in the Post-it card body to test the vertical height expansion formula';
      const longDims = computeNodeDimensions(longTitle);
      expect(longDims.width).toBe(210);
      expect(longDims.height).toBeGreaterThan(160);
    });
  });
});


