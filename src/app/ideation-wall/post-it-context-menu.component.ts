// src/app/ideation-wall/post-it-context-menu.component.ts
import { Component, Input, Output, EventEmitter, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ADHDPostItNote,
  PostItColor,
  PostItNature,
  PostItStatus,
  PostItComplexity
} from '../models/taskstick-graph.model';
import { TaskstickStoreService } from '../services/taskstick-store.service';

@Component({
  selector: 'app-post-it-context-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Transparent backdrop to capture outside clicks -->
    <div class="context-menu-backdrop" (click)="onBackdropClick($event)" (contextmenu)="onBackdropClick($event)">
      <div 
        class="context-menu-panel"
        [style.left.px]="adjustedX"
        [style.top.px]="adjustedY"
        (click)="$event.stopPropagation()">
        
        <!-- Header with Note Title & Close Button -->
        <div class="menu-header" [attr.data-color]="note.color">
          <div class="menu-title-row">
            <span class="menu-note-color-badge"></span>
            <span class="menu-note-title" [title]="note.title">{{ note.title }}</span>
            <button type="button" class="menu-close-btn" (click)="close.emit()" title="Fermer (Échap)">✕</button>
          </div>
        </div>

        <div class="menu-body">
          <!-- 1. NATURE (Theme, Pivot, Action) -->
          <div class="menu-section">
            <div class="section-label">
              <span>🏷️ Nature de la tâche</span>
            </div>
            <div class="segmented-buttons nature-buttons">
              <button 
                type="button"
                class="seg-btn"
                [class.active]="currentNature === 'theme'"
                (click)="setNature('theme')"
                title="Grand thème parapluie / conteneur">
                🏛️ Thème
              </button>
              <button 
                type="button"
                class="seg-btn"
                [class.active]="currentNature === 'pivot'"
                (click)="setNature('pivot')"
                title="Point de pivot, jalon clé ou carrefour de décision">
                💎 Pivot
              </button>
              <button 
                type="button"
                class="seg-btn"
                [class.active]="currentNature === 'action'"
                (click)="setNature('action')"
                title="Action concrète / sous-tâche">
                ⚡ Action
              </button>
            </div>
          </div>

          <!-- 2. STATUS (Open, In Progress, On Hold, Blocked, Done Check, Done Cross) -->
          <div class="menu-section">
            <div class="section-label">
              <span>📊 Statut d'avancement</span>
            </div>
            <div class="status-grid">
              <button 
                type="button"
                class="status-pill-btn"
                [class.active]="note.status === 'open'"
                (click)="setStatus('open')"
                title="Non commencé / À faire">
                ⭕ À faire
              </button>
              <button 
                type="button"
                class="status-pill-btn in-progress"
                [class.active]="note.status === 'in_progress'"
                (click)="setStatus('in_progress')"
                title="Tâche en cours de réalisation">
                ⚡ En cours
              </button>
              <button 
                type="button"
                class="status-pill-btn on-hold"
                [class.active]="note.status === 'on_hold'"
                (click)="setStatus('on_hold')"
                title="En pause ou en attente d'une réponse externe">
                ⏸️ En pause
              </button>
              <button 
                type="button"
                class="status-pill-btn blocked"
                [class.active]="note.status === 'blocked'"
                (click)="setStatus('blocked')"
                title="Bloqué par un obstacle">
                🚫 Bloqué
              </button>
              <button 
                type="button"
                class="status-pill-btn done-check"
                [class.active]="note.status === 'done_check'"
                (click)="setStatus('done_check')"
                title="Validé et terminé">
                ✓ Validé
              </button>
              <button 
                type="button"
                class="status-pill-btn done-cross"
                [class.active]="note.status === 'done_cross'"
                (click)="setStatus('done_cross')"
                title="Annulé ou abandonné">
                ❌ Annulé
              </button>
            </div>
          </div>

          <!-- 3. COMPLEXITY / COGNITIVE LOAD -->
          <div class="menu-section">
            <div class="section-label">
              <span>🧠 Complexité & Effort TDAH</span>
            </div>
            <div class="segmented-buttons complexity-buttons">
              <button 
                type="button"
                class="seg-btn"
                [class.active]="currentComplexity === 'simple'"
                (click)="setComplexity('simple')"
                title="Rapide, faible friction (~5-15m)">
                🪶 Simple
              </button>
              <button 
                type="button"
                class="seg-btn"
                [class.active]="currentComplexity === 'medium'"
                (click)="setComplexity('medium')"
                title="Effort modéré (~15-30m)">
                🔋 Moyen
              </button>
              <button 
                type="button"
                class="seg-btn"
                [class.active]="currentComplexity === 'complex'"
                (click)="setComplexity('complex')"
                title="Fort focus requis (~30-60m)">
                ⚡ Complexe
              </button>
              <button 
                type="button"
                class="seg-btn"
                [class.active]="currentComplexity === 'epic'"
                (click)="setComplexity('epic')"
                title="Tâche lourde / Épique à découper">
                🏔️ Épique
              </button>
            </div>
          </div>

          <!-- 4. DURATION / TIMEBOXING (Actions Only) -->
          <div class="menu-section" *ngIf="!isThema && !isPivot">
            <div class="section-label">
              <span>⏱️ Timeboxing (Minutes)</span>
            </div>
            <div class="duration-row">
              <button 
                type="button"
                *ngFor="let m of [5, 15, 25, 45, 60, 90]"
                class="duration-btn"
                [class.active]="note.estimatedMinutes === m"
                (click)="setDuration(m)">
                {{ m }}m
              </button>
            </div>
          </div>

          <!-- Dynamic Cumulative Duration for Thema -->
          <div class="menu-section" *ngIf="isThema">
            <div class="section-label">
              <span>⏳ Durée Cumulée de la Chaîne</span>
            </div>
            <div class="cumulative-summary-box">
              <span class="cumul-icon">Σ</span>
              <span class="cumul-val">{{ cumulativeDuration.formatted }}</span>
              <span class="cumul-desc">({{ cumulativeDuration.totalMinutes }}m au total, reste {{ cumulativeDuration.remainingFormatted }})</span>
            </div>
          </div>

          <!-- Dynamic Upstream Lead Time for Pivot -->
          <div class="menu-section" *ngIf="isPivot">
            <div class="section-label">
              <span>⏳ Cumul Amont (Lead Time)</span>
            </div>
            <div class="cumulative-summary-box">
              <span class="cumul-icon">🚩</span>
              <span class="cumul-val">{{ pivotLeadTime.formatted }}</span>
              <span class="cumul-desc">({{ pivotLeadTime.totalMinutes }}m requis pour atteindre ce jalon)</span>
            </div>
          </div>

          <!-- 5. COLOR PALETTE -->
          <div class="menu-section">
            <div class="section-label">
              <span>🎨 Couleur du Post-it</span>
            </div>
            <div class="color-row">
              <button 
                type="button"
                *ngFor="let c of availableColors"
                class="color-circle"
                [attr.data-color]="c"
                [class.selected]="note.color === c"
                (click)="setColor(c)"></button>
            </div>
          </div>

          <!-- 6. QUICK ACTIONS -->
          <div class="menu-section actions-section">
            <button type="button" class="menu-action-row" (click)="launchFocus()">
              <span class="row-icon">🎯</span>
              <span class="row-text">Lancer en Hyperfocus</span>
            </button>
            <button type="button" class="menu-action-row" (click)="triggerAddSubtask()">
              <span class="row-icon">➕</span>
              <span class="row-text">Ajouter sous-tâche connectée</span>
            </button>
            <button type="button" class="menu-action-row" (click)="triggerDecompose()">
              <span class="row-icon">🪄</span>
              <span class="row-text">Décomposer avec l'IA</span>
            </button>
            <button type="button" class="menu-action-row" (click)="duplicate()">
              <span class="row-icon">📋</span>
              <span class="row-text">Dupliquer le Post-it</span>
            </button>
            <button 
              *ngIf="note.clusterId || isThema"
              type="button" 
              class="menu-action-row cascade-row" 
              (click)="cascadeDone()">
              <span class="row-icon">🏁</span>
              <span class="row-text">Tout valider (Cascade Done)</span>
            </button>
            <button type="button" class="menu-action-row danger-row" (click)="deleteNote()">
              <span class="row-icon">🗑️</span>
              <span class="row-text">Supprimer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .context-menu-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 99999;
      background: transparent;
      user-select: none;
    }

    .context-menu-panel {
      position: absolute;
      width: 290px;
      max-width: calc(100vw - 20px);
      background: #18181b;
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: menuFadeIn 0.15s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    @keyframes menuFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .menu-header {
      padding: 10px 12px;
      background: #27272a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
    }

    .menu-header[data-color='yellow'] { border-top: 3px solid #eab308; }
    .menu-header[data-color='pink']   { border-top: 3px solid #f472b6; }
    .menu-header[data-color='blue']   { border-top: 3px solid #38bdf8; }
    .menu-header[data-color='green']  { border-top: 3px solid #4ade80; }
    .menu-header[data-color='purple'] { border-top: 3px solid #c084fc; }
    .menu-header[data-color='orange'] { border-top: 3px solid #fb923c; }

    .menu-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .menu-note-color-badge {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ff7700;
    }

    .menu-note-title {
      flex: 1;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #fafafa;
    }

    .menu-close-btn {
      background: none;
      border: none;
      color: #a1a1aa;
      font-size: 14px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .menu-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .menu-body {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .menu-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .section-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #a1a1aa;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Segmented Buttons */
    .segmented-buttons {
      display: flex;
      background: #27272a;
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }

    .seg-btn {
      flex: 1;
      background: none;
      border: none;
      color: #d4d4d8;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 4px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
      white-space: nowrap;
    }
    .seg-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    .seg-btn.active {
      background: #ff7700;
      color: #000;
      font-weight: 700;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    /* Status Grid */
    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
    }

    .status-pill-btn {
      background: #27272a;
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #d4d4d8;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 4px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
      white-space: nowrap;
    }
    .status-pill-btn:hover {
      background: #3f3f46;
      color: #fff;
    }
    .status-pill-btn.active {
      background: #3b82f6;
      color: #fff;
      border-color: #60a5fa;
      font-weight: 700;
    }
    .status-pill-btn.in-progress.active {
      background: #f59e0b;
      color: #000;
      border-color: #fbbf24;
    }
    .status-pill-btn.on-hold.active {
      background: #eab308;
      color: #000;
      border-color: #facc15;
    }
    .status-pill-btn.blocked.active {
      background: #ef4444;
      color: #fff;
      border-color: #f87171;
    }
    .status-pill-btn.done-check.active {
      background: #22c55e;
      color: #fff;
      border-color: #4ade80;
    }
    .status-pill-btn.done-cross.active {
      background: #64748b;
      color: #fff;
      border-color: #94a3b8;
    }

    /* Duration Row */
    .duration-row {
      display: flex;
      gap: 4px;
    }
    .duration-btn {
      flex: 1;
      background: #27272a;
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #d4d4d8;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .duration-btn:hover {
      background: #3f3f46;
      color: #fff;
    }
    .duration-btn.active {
      background: #ff7700;
      color: #000;
      border-color: #ff7700;
      font-weight: 700;
    }

    .cumulative-summary-box {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 11px;
    }
    .cumul-icon {
      font-weight: 800;
      color: #ff7700;
    }
    .cumul-val {
      font-weight: 800;
      color: #fff;
    }
    .cumul-desc {
      font-size: 10px;
      color: #888;
    }

    /* Color Row */
    .color-row {
      display: flex;
      gap: 8px;
      padding: 2px 0;
    }
    .color-circle {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }
    .color-circle:hover { transform: scale(1.18); }
    .color-circle.selected {
      border-color: #ffffff;
      transform: scale(1.15);
      box-shadow: 0 0 0 2px #ff7700;
    }
    .color-circle[data-color='yellow'] { background: #fef08a; }
    .color-circle[data-color='pink']   { background: #fbcfe8; }
    .color-circle[data-color='blue']   { background: #bae6fd; }
    .color-circle[data-color='green']  { background: #bbf7d0; }
    .color-circle[data-color='purple'] { background: #e9d5ff; }
    .color-circle[data-color='orange'] { background: #fed7aa; }

    /* Actions Section */
    .actions-section {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 6px;
      gap: 3px;
    }
    .menu-action-row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      background: none;
      border: none;
      border-radius: 6px;
      color: #e4e4e7;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.12s;
      text-align: left;
    }
    .menu-action-row:hover {
      background: #27272a;
      color: #fff;
    }
    .menu-action-row .row-icon {
      font-size: 13px;
    }
    .menu-action-row.cascade-row:hover {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }
    .menu-action-row.danger-row:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
  `]
})
export class PostItContextMenuComponent implements OnInit {
  @Input({ required: true }) note!: ADHDPostItNote;
  @Input({ required: true }) position!: { x: number; y: number };

  @Output() close = new EventEmitter<void>();
  @Output() addSubtask = new EventEmitter<ADHDPostItNote>();
  @Output() requestDecompose = new EventEmitter<ADHDPostItNote>();

  store = inject(TaskstickStoreService);

  readonly availableColors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];

  adjustedX = 0;
  adjustedY = 0;

  ngOnInit() {
    this.calculateAdjustedPosition();
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    event.preventDefault();
    this.close.emit();
  }

  private calculateAdjustedPosition() {
    const menuWidth = 300;
    const menuHeight = 440;
    const padding = 12;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let x = this.position.x;
    let y = this.position.y;

    if (x + menuWidth > viewportW - padding) {
      x = Math.max(padding, viewportW - menuWidth - padding);
    }
    if (y + menuHeight > viewportH - padding) {
      y = Math.max(padding, viewportH - menuHeight - padding);
    }

    this.adjustedX = x;
    this.adjustedY = y;
  }

  get currentNature(): PostItNature {
    if (this.note.nature) return this.note.nature;
    if (this.store.isThemaNote(this.note)) return 'theme';
    const tags = this.note.tags || [];
    if (tags.includes('pivot')) return 'pivot';
    return 'action';
  }

  get currentComplexity(): PostItComplexity {
    if (this.note.complexity) return this.note.complexity;
    switch (this.note.cognitiveLoad) {
      case 'low': return 'simple';
      case 'medium': return 'medium';
      case 'high':
      default: return 'complex';
    }
  }

  get isThema(): boolean {
    return this.store.isThemaNote(this.note);
  }

  get isPivot(): boolean {
    return this.store.isPivotNote(this.note);
  }

  get cumulativeDuration(): { totalMinutes: number; formatted: string; remainingMinutes: number; remainingFormatted: string } {
    return this.store.getChainCumulativeDuration(this.note.id);
  }

  get pivotLeadTime(): { totalMinutes: number; formatted: string; remainingMinutes: number; remainingFormatted: string } {
    return this.store.getPivotUpstreamDuration(this.note.id);
  }

  setNature(nature: PostItNature) {
    this.store.setNoteNature(this.note.id, nature);
  }

  setStatus(status: PostItStatus) {
    this.store.updateNote(this.note.id, { status });
  }

  setComplexity(complexity: PostItComplexity) {
    this.store.setNoteComplexity(this.note.id, complexity);
  }

  setDuration(estimatedMinutes: number) {
    if (this.isThema || this.isPivot) return;
    this.store.updateNote(this.note.id, { estimatedMinutes });
  }

  setColor(color: PostItColor) {
    this.store.updateNote(this.note.id, { color });
  }

  launchFocus() {
    this.store.setActiveFocusNote(this.note, true);
    this.close.emit();
  }

  triggerAddSubtask() {
    this.addSubtask.emit(this.note);
    this.close.emit();
  }

  triggerDecompose() {
    this.requestDecompose.emit(this.note);
    this.close.emit();
  }

  async duplicate() {
    await this.store.duplicateNote(this.note.id);
    this.close.emit();
  }

  async cascadeDone() {
    await this.store.completeTaskCascade(this.note.id);
    this.close.emit();
  }

  deleteNote() {
    this.store.deleteNote(this.note.id);
    this.close.emit();
  }
}
