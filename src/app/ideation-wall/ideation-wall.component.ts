import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, inject, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import panzoom, { PanZoom } from 'panzoom';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { PostItNodeComponent } from './post-it-node.component';
import { SvgConnectionLayerComponent } from './svg-connection-layer.component';
import { PostItContextMenuComponent } from './post-it-context-menu.component';
import { ADHDPostItNote, PostItColor, PostItNature, RelationType, WhiteboardZone } from '../models/taskstick-graph.model';
import { SpeechRecognitionService } from '../services/speech-recognition.service';
import { AiAgentService, AutoTriageResult, GhostNodePrediction } from '../services/ai-agent.service';

@Component({
  selector: 'app-ideation-wall',
  standalone: true,
  imports: [CommonModule, FormsModule, PostItNodeComponent, SvgConnectionLayerComponent, PostItContextMenuComponent],
  templateUrl: './ideation-wall-template.html',
  styleUrl: './ideation-wall.css'
})
export class IdeationWallComponent implements OnInit, OnDestroy {
  @Input() dark = true;
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWorld', { static: true }) canvasWorld!: ElementRef<HTMLDivElement>;

  store = inject(TaskstickStoreService);
  speech = inject(SpeechRecognitionService);
  aiAgent = inject(AiAgentService);

  readonly defaultModel = 'qwen3:1.7b';

  onModelSelectChange(newModel: string) {
    this.aiAgent.setSelectedModel(newModel);
  }

  readonly newlyCreatedNoteIdForEdit = signal<string | null>(null);

  private pz?: PanZoom;
  quickInputText = '';
  selectedQuickColor: PostItColor = 'yellow';
  mobileOptionsOpen = false;

  // Context Menu State
  activeContextMenuNote: ADHDPostItNote | null = null;
  contextMenuPosition: { x: number; y: number } = { x: 0, y: 0 };

  openContextMenu(event: { note: ADHDPostItNote; clientX: number; clientY: number }) {
    this.activeContextMenuNote = event.note;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
  }

  closeContextMenu() {
    this.activeContextMenuNote = null;
  }

  toggleVoiceDictation() {
    this.speech.toggle('fr-FR', {
      onFinalResult: (transcript: string) => {
        if (!transcript.trim()) return;
        const transform = this.pz ? this.pz.getTransform() : { x: 0, y: 0, scale: 1 };
        const spawnX = Math.round((-transform.x + 300) / transform.scale);
        const spawnY = Math.round((-transform.y + 200) / transform.scale);

        this.store.addNote({
          title: transcript.trim(),
          color: this.selectedQuickColor,
          position: { x: spawnX, y: spawnY },
          tags: ['vocal']
        });
      }
    });
  }

  async autoInferDependencies() {
    const notes = this.store.notes();
    if (notes.length < 2) return;
    const inferred = await this.aiAgent.inferDependencies(notes);
    for (const edge of inferred) {
      this.store.addEdge(edge.sourceId, edge.targetId, edge.type);
    }
  }

  async onAutoAlignTree() {
    await this.store.autoAlignCognitiveTree();
    this.showToast('🌳 Arbre Cognitif réaligné avec succès.');
  }

  private activeDragNoteId: string | null = null;
  private dragStartMouseX = 0;
  private dragStartMouseY = 0;
  private dragStartNoteX = 0;
  private dragStartNoteY = 0;

  // Post-it resizing state
  private activeResizeNoteId: string | null = null;
  private dragStartNoteSize = { width: 190, height: 160 };

  // Region interaction state (UC4)
  editingRegionId: string | null = null;
  editingRegionLabel = '';
  private activeDragRegion: WhiteboardZone | null = null;
  private dragStartRegionBounds = { x: 0, y: 0, width: 0, height: 0 };
  private isResizingRegion = false;
  private capturedNotesInRegion: Array<{ id: string; initialX: number; initialY: number }> = [];

  // UC8: Staging Tray State for AI Micro-Actions Curation
  stagingThema: ADHDPostItNote | null = null;
  stagedSteps: Array<{ text: string; accepted: boolean; estimatedMinutes: number }> = [];
  customStepInput = '';

  get acceptedStepsCount(): number {
    return this.stagedSteps.filter(s => s.accepted && s.text.trim().length > 0).length;
  }

  async openDecomposeModal(note: ADHDPostItNote) {
    this.stagingThema = note;
    this.customStepInput = '';
    const generated = await this.aiAgent.decomposeTask(note);
    this.stagedSteps = generated.map(step => ({
      text: step,
      accepted: true,
      estimatedMinutes: 10
    }));
  }

  closeDecomposeModal() {
    this.stagingThema = null;
    this.stagedSteps = [];
    this.customStepInput = '';
  }

  moveStagedStep(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= this.stagedSteps.length) return;
    const temp = this.stagedSteps[index];
    this.stagedSteps[index] = this.stagedSteps[target];
    this.stagedSteps[target] = temp;
  }

  removeStagedStep(index: number) {
    this.stagedSteps.splice(index, 1);
  }

  addCustomStagedStep() {
    const trimmed = this.customStepInput.trim();
    if (!trimmed) return;
    this.stagedSteps.push({
      text: trimmed,
      accepted: true,
      estimatedMinutes: 15
    });
    this.customStepInput = '';
  }

  async applyStagedStepsToBoard() {
    if (!this.stagingThema) return;
    const accepted = this.stagedSteps.filter(s => s.accepted && s.text.trim().length > 0);
    if (accepted.length === 0) {
      this.closeDecomposeModal();
      return;
    }

    const note = this.stagingThema;
    this.store.recordSnapshot();

    const clusterId = note.clusterId || `cluster_${Date.now()}`;
    if (!note.clusterId) {
      await this.store.updateNote(note.id, { clusterId });
    }

    const createdSubNotes: ADHDPostItNote[] = [];
    let previousSubNoteId = note.id;

    for (let i = 0; i < accepted.length; i++) {
      const step = accepted[i];
      const subNote = await this.store.addNote({
        title: step.text.trim(),
        color: note.color, // Inherits Thema color
        position: {
          x: note.position.x + (i + 1) * 30,
          y: note.position.y + 160 + i * 140
        },
        clusterId,
        tags: [...(note.tags || []).filter(t => t !== 'vocal' && t !== 'thème'), 'sous-tâche'],
        cognitiveLoad: 'low',
        estimatedMinutes: step.estimatedMinutes
      });

      createdSubNotes.push(subNote);
      await this.store.addEdge(previousSubNoteId, subNote.id, 'depends_on');
      previousSubNoteId = subNote.id;
    }

    // Auto-enrich parent thema with knowledge
    await this.aiAgent.enrichThemaWithKnowledge(note, createdSubNotes, this.store);

    this.closeDecomposeModal();
  }

  ngOnInit() {
    this.initPanzoom();
  }

  ngOnDestroy() {
    if (this.pz) {
      this.pz.dispose();
    }
  }

  private initPanzoom() {
    this.pz = panzoom(this.canvasWorld.nativeElement, {
      maxZoom: 3,
      minZoom: 0.2,
      smoothScroll: false,
      zoomDoubleClickSpeed: 1, // Disable default zoom on dblclick to allow adding note
      filterKey: () => true,
      beforeMouseDown: (e) => {
        // Don't pan if clicking directly on a post-it note or dashed region
        const target = e.target as HTMLElement;
        if (target.closest('app-post-it-node') || target.closest('.dashed-region-box')) {
          return true; // Cancel panzoom drag
        }
        return false;
      }
    });
  }

  // --- REGION / ZONE OPERATIONS (UC4) ---
  addNewRegion() {
    const transform = this.pz ? this.pz.getTransform() : { x: 0, y: 0, scale: 1 };
    const spawnX = Math.round((-transform.x + 250) / transform.scale);
    const spawnY = Math.round((-transform.y + 150) / transform.scale);

    const colors = ['#ff7700', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f59e0b'];
    const randomColor = colors[this.store.zones().length % colors.length];

    this.store.addZone({
      label: `Groupe ${this.store.zones().length + 1}`,
      colorCode: randomColor,
      bounds: {
        x: spawnX,
        y: spawnY,
        width: 480,
        height: 380
      }
    });
  }

  onRegionDragStarted(event: MouseEvent, zone: WhiteboardZone) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    this.store.recordSnapshot();
    this.activeDragRegion = zone;
    this.isResizingRegion = false;
    this.dragStartMouseX = event.clientX;
    this.dragStartMouseY = event.clientY;
    this.dragStartRegionBounds = { ...zone.bounds };

    // Capture initiale étanche : toutes les notes actuellement à l'intérieur
    const r = zone.bounds;
    this.capturedNotesInRegion = this.store.notes()
      .filter(n =>
        n.position.x >= r.x &&
        n.position.x <= r.x + r.width &&
        n.position.y >= r.y &&
        n.position.y <= r.y + r.height
      )
      .map(n => ({
        id: n.id,
        initialX: n.position.x,
        initialY: n.position.y
      }));

    event.stopPropagation();
  }

  onRegionResizeStarted(event: MouseEvent, zone: WhiteboardZone) {
    if (event.button !== 0) return;
    this.store.recordSnapshot();
    this.activeDragRegion = zone;
    this.isResizingRegion = true;
    this.dragStartMouseX = event.clientX;
    this.dragStartMouseY = event.clientY;
    this.dragStartRegionBounds = { ...zone.bounds };
    event.stopPropagation();
  }

  startEditingRegionLabel(event: MouseEvent, zone: WhiteboardZone) {
    event.stopPropagation();
    this.editingRegionId = zone.id;
    this.editingRegionLabel = zone.label;
  }

  saveRegionLabel(zone: WhiteboardZone) {
    const trimmed = this.editingRegionLabel.trim();
    if (trimmed && trimmed !== zone.label) {
      this.store.updateZone(zone.id, { label: trimmed });
    }
    this.editingRegionId = null;
  }

  deleteRegion(event: MouseEvent, zoneId: string) {
    event.stopPropagation();
    this.store.deleteZone(zoneId);
  }

  resetView() {
    if (this.pz) {
      this.pz.zoomAbs(0, 0, 1);
      this.pz.moveTo(0, 0);
    }
  }

  cycleQuickColor() {
    const colors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
    const idx = colors.indexOf(this.selectedQuickColor);
    this.selectedQuickColor = colors[(idx + 1) % colors.length];
  }

  addQuickNote() {
    const title = this.quickInputText.trim();
    if (!title) return;

    // Place near current viewport view
    const transform = this.pz ? this.pz.getTransform() : { x: 0, y: 0, scale: 1 };
    const spawnX = Math.round((-transform.x + 300) / transform.scale);
    const spawnY = Math.round((-transform.y + 200) / transform.scale);

    this.store.addNote({
      title,
      color: this.selectedQuickColor,
      position: { x: spawnX, y: spawnY }
    });

    this.quickInputText = '';
  }

  async autoTriageRawThought(rawInput: string): Promise<AutoTriageResult | null> {
      const schema = {
        type: 'object',
        properties: {
          cleanTitle: { type: 'string' },
          nature: { type: 'string', enum: ['theme', 'pivot', 'action'] },
          complexity: { type: 'string', enum: ['simple', 'medium', 'complex', 'epic'] },
          cognitiveLoad: { type: 'string', enum: ['low', 'medium', 'high'] },
          estimatedMinutes: { type: 'integer', enum: [5, 10, 15, 25, 45, 60] },
          suggestedColor: { type: 'string', enum: ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'] },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['cleanTitle', 'nature', 'complexity', 'cognitiveLoad', 'estimatedMinutes', 'suggestedColor', 'tags']
      };

      const prompt = `Analyse cette note jetée sur un mur d'idéation TDAH : "${rawInput}"
    Règles :
    - Si c'est un grand sujet global sans verbe d'action -> nature='theme', color='purple'
    - Si c'est un jalon, une décision ou une validation -> nature='pivot', color='orange'
    - Si c'est une action concrète -> nature='action', reformule cleanTitle avec un verbe d'action précis.`;

      return this.aiAgent.generateStructuredFast<AutoTriageResult>(prompt, schema);
    }


    async predictNextGhostNodes(
  sourceNote: ADHDPostItNote,
  store: TaskstickStoreService
): Promise<GhostNodePrediction[]> {
  // Extract 1-hop local context (keeps prompt tiny and fast for 1.7B)
  const allEdges = store.edges();
  const allNotes = store.notes();
  const upstreamTitles = allEdges
    .filter(e => e.targetId === sourceNote.id)
    .map(e => allNotes.find(n => n.id === e.sourceId)?.title)
    .filter(Boolean);

  const schema = {
    type: 'object',
    properties: {
      predictions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            nature: { type: 'string', enum: ['pivot', 'action'] },
            relationToSource: { type: 'string', enum: ['depends_on', 'constrains', 'synergy'] },
            estimatedMinutes: { type: 'integer', enum: [5, 10, 15, 20] },
            color: { type: 'string', enum: ['yellow', 'blue', 'green', 'pink', 'orange'] }
          },
          required: ['title', 'nature', 'relationToSource', 'estimatedMinutes', 'color']
        }
      }
    },
    required: ['predictions']
  };

  const prompt = `Contexte amont : ${upstreamTitles.join(' -> ') || 'Racine'}
Noeud actuel (${sourceNote.nature || 'action'}) : "${sourceNote.title}"
Détails : "${sourceNote.content || ''}"

Propose exactement 3 suites logiques complémentaires :
1. L'action immédiate suivante (depends_on, <= 15 min)
2. Une action parallèle ou de synergie (synergy)
3. Un point de contrôle / jalon ou risque à vérifier (pivot / constrains)`;

    const res = await this.aiAgent.generateStructuredFast<{ predictions: GhostNodePrediction[] }>(prompt, schema);
    return res?.predictions || [];
  }

async brainDumpToSubgraph(spokenText: string): Promise<{
  nodes: Array<{ tempId: string; title: string; nature: PostItNature; estimatedMinutes: number }>;
  edges: Array<{ fromTempId: string; toTempId: string; type: RelationType }>;
} | null> {
  const schema = {
    type: 'object',
    properties: {
      nodes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tempId: { type: 'string' },
            title: { type: 'string' },
            nature: { type: 'string', enum: ['theme', 'pivot', 'action'] },
            estimatedMinutes: { type: 'integer' }
          },
          required: ['tempId', 'title', 'nature', 'estimatedMinutes']
        }
      },
      edges: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fromTempId: { type: 'string' },
            toTempId: { type: 'string' },
            type: { type: 'string', enum: ['depends_on', 'constrains', 'synergy', 'parent_of'] }
          },
          required: ['fromTempId', 'toTempId', 'type']
        }
      }
    },
    required: ['nodes', 'edges']
  };

      const prompt = `Transforme ce flux de pensée dicté en un graphe de tâches structuré (3 à 6 noeuds max) :
    "${spokenText}"
    Utilise tempId ("n1", "n2"...) pour relier les dépendances logiques de gauche à droite.`;

      return this.aiAgent.generateStructuredFast(prompt, schema);
    }


// Inside IdeationWallComponent class (src/app/ideation-wall/ideation-wall.component.ts)

boardManagerOpen = false;
selectedSourceDateForAction = '';
mergeOnlyOpenTasks = true;
mergeAutoAlign = true;
toastBannerMessage = signal<string | null>(null);

async openBoardManager() {
  this.mobileOptionsOpen = false;
  await this.store.refreshAvailableDates();
  const otherDates = this.previousDates;
  if (otherDates.length > 0 && !this.selectedSourceDateForAction) {
    this.selectedSourceDateForAction = otherDates[0];
  }
  this.boardManagerOpen = true;
}

get previousDates(): string[] {
  const active = this.store.selectedDateKey();
  return this.store.availableDates().filter(d => d !== active);
}

formatDateLabel(key: string): string {
  if (key && key.length === 8 && /^\d{8}$/.test(key)) {
    return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`;
  }
  return key;
}

private showToast(msg: string) {
  this.toastBannerMessage.set(msg);
  setTimeout(() => {
    if (this.toastBannerMessage() === msg) {
      this.toastBannerMessage.set(null);
    }
  }, 5000);
}

/** 1. Clear whole board or completed only */
async onClearBoard(onlyCompleted: boolean) {
  const removed = await this.store.clearActiveBoard(onlyCompleted);
  this.boardManagerOpen = false;
  if (removed > 0) {
    this.showToast(`🧹 ${removed} Post-it retiré(s). (Appuyez sur ↩️ pour annuler)`);
  }
}

/** 2. Reload a previous day's board */
async onReloadDateBoard(mode: 'switch' | 'replace_today' | 'carry_over_open') {
  if (!this.selectedSourceDateForAction) return;
  const count = await this.store.reloadPreviousBoard(this.selectedSourceDateForAction, mode);
  this.boardManagerOpen = false;
  this.resetView();
  this.showToast(`📅 Tableau du ${this.formatDateLabel(this.selectedSourceDateForAction)} chargé (${count} notes).`);
}

/** 3A. Merge another date's board into current board */
async onMergeDateBoard() {
  if (!this.selectedSourceDateForAction) return;
  const added = await this.store.mergeWithBoard(this.selectedSourceDateForAction, {
    onlyOpenTasks: this.mergeOnlyOpenTasks,
    autoLayout: this.mergeAutoAlign
  });
  this.boardManagerOpen = false;
  this.showToast(`🔀 Fusion réussie : +${added} nouvelles notes ajoutées au mur !`);
}

/** 3B. Merge an external .json Snapshot file from phone/tablet storage */
triggerMergeFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      const added = await this.store.mergeWithBoard(snapshot, {
        onlyOpenTasks: this.mergeOnlyOpenTasks,
        autoLayout: this.mergeAutoAlign
      });
      this.boardManagerOpen = false;
      this.showToast(`📥 Fichier fusionné : +${added} notes intégrées !`);
    } catch {
      this.showToast(`⚠️ Fichier JSON invalide.`);
    }
  };
  input.click();
}


  onCanvasDblClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('app-post-it-node') || target.closest('.wall-toolbar')) return;

    const transform = this.pz ? this.pz.getTransform() : { x: 0, y: 0, scale: 1 };
    const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const canvasX = Math.round((clickX - transform.x) / transform.scale);
    const canvasY = Math.round((clickY - transform.y) / transform.scale);

    this.store.addNote({
      title: 'Nouvelle Idée',
      color: this.selectedQuickColor,
      position: { x: canvasX, y: canvasY }
    });
  }

  onNoteDragStarted(event: { noteId: string; clientX: number; clientY: number }) {
    const targetNote = this.store.notes().find(n => n.id === event.noteId);
    if (!targetNote) return;

    this.store.recordSnapshot(); // Capture snapshot before drag movement
    this.activeDragNoteId = event.noteId;
    this.dragStartMouseX = event.clientX;
    this.dragStartMouseY = event.clientY;
    this.dragStartNoteX = targetNote.position.x;
    this.dragStartNoteY = targetNote.position.y;
  }

  onNoteResizeStarted(event: { noteId: string; clientX: number; clientY: number }) {
    const targetNote = this.store.notes().find(n => n.id === event.noteId);
    if (!targetNote) return;

    this.store.recordSnapshot();
    this.activeResizeNoteId = event.noteId;
    this.dragStartMouseX = event.clientX;
    this.dragStartMouseY = event.clientY;

    const isSub = (targetNote.tags || []).includes('sous-tâche') || (targetNote.tags || []).includes('subtask');
    const defaultW = isSub ? 160 : 190;
    const defaultH = isSub ? 125 : 160;

    this.dragStartNoteSize = {
      width: targetNote.size?.width || defaultW,
      height: targetNote.size?.height || defaultH
    };
  }

  // Connection drawing state
  drawingSourceNoteId: string | null = null;
  drawingBezierPath: string | null = null;
  drawingStartPos = { x: 0, y: 0 };
  dragConnectStartClientX = 0;
  dragConnectStartClientY = 0;

  onConnectStarted(event: { noteId: string; clientX: number; clientY: number }) {
    const sourceNote = this.store.notes().find(n => n.id === event.noteId);
    if (!sourceNote) return;

    this.drawingSourceNoteId = event.noteId;
    this.dragConnectStartClientX = event.clientX;
    this.dragConnectStartClientY = event.clientY;
    this.drawingStartPos = {
      x: sourceNote.position.x + 190,
      y: sourceNote.position.y + 80
    };
  }

  async onQuickLinkRequested(event: { noteId: string }) {
    if (!this.drawingSourceNoteId) {
      // Step 1: Set as source
      this.drawingSourceNoteId = event.noteId;
      const sourceNote = this.store.notes().find(n => n.id === event.noteId);
      if (sourceNote) {
        this.drawingStartPos = {
          x: sourceNote.position.x + 190,
          y: sourceNote.position.y + 80
        };
      }
    } else if (this.drawingSourceNoteId === event.noteId) {
      // Clicked on same note again: cancel linking mode
      this.cancelDrawingConnection();
    } else {
      // Step 2: Complete link between drawingSourceNoteId and event.noteId
      await this.onConnectEnded({ targetNoteId: event.noteId });
    }
  }

  async onConnectEnded(event: { targetNoteId: string }) {
    if (!this.drawingSourceNoteId || this.drawingSourceNoteId === event.targetNoteId) {
      this.cancelDrawingConnection();
      return;
    }

    const sourceId = this.drawingSourceNoteId;
    const targetId = event.targetNoteId;
    this.cancelDrawingConnection();

    // Default to 'depends_on' relation (prerequisite)
    const newEdge = {
      id: `edge-${Date.now()}`,
      sourceId,
      targetId,
      type: 'depends_on' as const
    };

    const added = await this.store.addEdge(newEdge);
    if (!added) {
      alert('⚠️ Impossible de relier : cette dépendance créerait une boucle cyclique !');
    } else {
      // UC5: Connected tasks provide new clues, trigger AI description suggestion
      const targetNote = this.store.notes().find(n => n.id === targetId);
      if (targetNote && !targetNote.content && !targetNote.aiSuggestion) {
        this.aiAgent.suggestDescriptionForNote(targetNote, this.store).then(suggestion => {
          if (suggestion) {
            this.store.updateNote(targetNote.id, { aiSuggestion: suggestion });
          }
        }).catch(err => console.warn('[AiAgent] Suggestion error:', err));
      }
    }
  }

  cancelDrawingConnection() {
    this.drawingSourceNoteId = null;
    this.drawingBezierPath = null;
  }

  /**
   * UC2: Generates a connected subtask inheriting the parent note's color,
   * creates a 'depends_on' relationship, marks the parent as Thema,
   * enriches the parent's description spot via AiAgentService,
   * and activates immediate title editing focus.
   */
  async createConnectedSubtask(parentNote: ADHDPostItNote, targetPosition?: { x: number; y: number }) {
    const defaultPos = {
      x: parentNote.position.x + 240,
      y: parentNote.position.y
    };
    const pos = targetPosition || defaultPos;

    // UC2: Check if parent is a thema (especially if it does not contain an action verb)
    const isParentThema = !this.aiAgent.hasActionVerb(parentNote.title);
    if (isParentThema && !(parentNote.tags || []).includes('thème')) {
      await this.store.updateNote(parentNote.id, {
        tags: [...(parentNote.tags || []), 'thème']
      });
    }

    // Grid snap on 10px increments (Unclamped world space coordinates)
    const spawnX = Math.round(pos.x / 10) * 10;
    const spawnY = Math.round(pos.y / 10) * 10;

    const subtask = await this.store.addNote({
      title: 'Nouvelle sous-tâche',
      color: parentNote.color, // Similar color to parent
      position: { x: spawnX, y: spawnY },
      tags: [...(parentNote.tags || []).filter(t => t !== 'vocal' && t !== 'thème'), 'sous-tâche'],
      cognitiveLoad: 'low',
      estimatedMinutes: 15,
      clusterId: parentNote.clusterId
    });

    // Create topological dependency link: parent -> subtask
    await this.store.addEdge(parentNote.id, subtask.id, 'depends_on');

    // UC2: Auto-enrich parent thema knowledge with the updated subtask list
    const currentSubtasks = this.store.notes().filter(n =>
      this.store.edges().some(e => e.sourceId === parentNote.id && e.targetId === n.id) || n.id === subtask.id
    );
    await this.aiAgent.enrichThemaWithKnowledge(parentNote, currentSubtasks, this.store);

    // UC5: AI agent automatically infers description suggestion from connected context
    this.aiAgent.suggestDescriptionForNote(subtask, this.store).then(suggestion => {
      if (suggestion) {
        this.store.updateNote(subtask.id, { aiSuggestion: suggestion });
      }
    }).catch(err => console.warn('[AiAgent] Suggestion failed:', err));

    // Trigger immediate inline title editing & focus
    this.newlyCreatedNoteIdForEdit.set(subtask.id);
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    // Don't intercept when actively typing in an input or textarea
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) {
        event.preventDefault();
        this.store.redo();
      } else {
        event.preventDefault();
        this.store.undo();
      }
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.store.redo();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent) {
    if (this.drawingSourceNoteId) {
      const transform = this.pz ? this.pz.getTransform() : { x: 0, y: 0, scale: 1 };
      const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
      const currentCanvasX = (event.clientX - rect.left - transform.x) / transform.scale;
      const currentCanvasY = (event.clientY - rect.top - transform.y) / transform.scale;

      const sx = this.drawingStartPos.x;
      const sy = this.drawingStartPos.y;
      const tx = currentCanvasX;
      const ty = currentCanvasY;

      const dx = Math.abs(tx - sx) * 0.5;
      this.drawingBezierPath = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
      return;
    }

    if (this.activeDragRegion) {
      const transform = this.pz ? this.pz.getTransform() : { scale: 1 };
      
      // Calculate delta from drag origin in canvas space
      const rawDeltaX = (event.clientX - this.dragStartMouseX) / transform.scale;
      const rawDeltaY = (event.clientY - this.dragStartMouseY) / transform.scale;

      if (this.isResizingRegion) {
        // Uniform grid snapping (10px) for resizing
        const newWidth = Math.max(160, Math.round((this.dragStartRegionBounds.width + rawDeltaX) / 10) * 10);
        const newHeight = Math.max(120, Math.round((this.dragStartRegionBounds.height + rawDeltaY) / 10) * 10);
        
        this.store.updateZone(this.activeDragRegion.id, {
          bounds: {
            ...this.activeDragRegion.bounds,
            width: newWidth,
            height: newHeight
          }
        });
      } else {
        // Uniform grid snapping (10px) for translating
        const snappedDeltaX = Math.round(rawDeltaX / 10) * 10;
        const snappedDeltaY = Math.round(rawDeltaY / 10) * 10;

        // 1. Update the dashed region boundary (Unclamped world-space coordinates)
        const newRegionX = this.dragStartRegionBounds.x + snappedDeltaX;
        const newRegionY = this.dragStartRegionBounds.y + snappedDeltaY;

        this.store.updateZone(this.activeDragRegion.id, {
          bounds: {
            ...this.activeDragRegion.bounds,
            x: newRegionX,
            y: newRegionY
          }
        });

        // 2. Rigid 1:1 translation for all notes captured at drag start (Unclamped world-space coordinates)
        for (const item of this.capturedNotesInRegion) {
          this.store.updateNote(item.id, {
            position: {
              x: item.initialX + snappedDeltaX,
              y: item.initialY + snappedDeltaY
            }
          });
        }
      }
      return;
    }

    if (this.activeResizeNoteId) {
      const transform = this.pz ? this.pz.getTransform() : { scale: 1 };
      const deltaX = (event.clientX - this.dragStartMouseX) / transform.scale;
      const deltaY = (event.clientY - this.dragStartMouseY) / transform.scale;

      const newWidth = Math.max(140, Math.round((this.dragStartNoteSize.width + deltaX) / 10) * 10);
      const newHeight = Math.max(100, Math.round((this.dragStartNoteSize.height + deltaY) / 10) * 10);

      this.store.updateNote(this.activeResizeNoteId, {
        size: { width: newWidth, height: newHeight }
      });
      return;
    }

    if (!this.activeDragNoteId) return;

    const transform = this.pz ? this.pz.getTransform() : { scale: 1 };
    const deltaX = (event.clientX - this.dragStartMouseX) / transform.scale;
    const deltaY = (event.clientY - this.dragStartMouseY) / transform.scale;

    const rawX = this.dragStartNoteX + deltaX;
    const rawY = this.dragStartNoteY + deltaY;

    // Grid snap on 10px increments (Unclamped world coordinates R^2)
    const snappedX = Math.round(rawX / 10) * 10;
    const snappedY = Math.round(rawY / 10) * 10;

    this.store.moveNoteWithCluster(this.activeDragNoteId, snappedX, snappedY);
  }

  @HostListener('window:mouseup', ['$event'])
  async onWindowMouseUp(event: MouseEvent) {
    if (this.activeDragRegion) {
      this.activeDragRegion = null;
      this.isResizingRegion = false;
      this.capturedNotesInRegion = [];// Réinitialiser le tableau tampon
      return;
    }

    if (this.activeResizeNoteId) {
      this.activeResizeNoteId = null;
      return;
    }

    if (this.drawingSourceNoteId) {
      const sourceId = this.drawingSourceNoteId;
      const sourceNote = this.store.notes().find(n => n.id === sourceId);
      this.cancelDrawingConnection();

      if (sourceNote) {
        const transform = this.pz ? this.pz.getTransform() : { x: 0, y: 0, scale: 1 };
        const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
        const dropCanvasX = Math.round((event.clientX - rect.left - transform.x) / transform.scale);
        const dropCanvasY = Math.round((event.clientY - rect.top - transform.y) / transform.scale);

        const dist = Math.hypot(
          event.clientX - this.dragConnectStartClientX,
          event.clientY - this.dragConnectStartClientY
        );

        if (dist > 30) {
          // Dragged into the void: create connected subtask at target drop coordinates
          await this.createConnectedSubtask(sourceNote, { x: dropCanvasX, y: dropCanvasY - 40 });
        } else {
          // Quick click on connector port: spawn right next to parent note
          await this.createConnectedSubtask(sourceNote, {
            x: sourceNote.position.x + 240,
            y: sourceNote.position.y
          });
        }
      }
      return;
    }

    if (!this.activeDragNoteId) return;

    const movedNoteId = this.activeDragNoteId;
    this.activeDragNoteId = null;

    // Test magnetic proximity sticking
    await this.store.evaluateSticking(movedNoteId, 30);
  }

  trackByNoteId(index: number, note: ADHDPostItNote): string {
    return note.id;
  }
}
