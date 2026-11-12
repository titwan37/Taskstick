import { Component, Input, Output, EventEmitter, ElementRef, HostListener, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ADHDPostItNote, PostItColor } from '../models/taskstick-graph.model';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { AiAgentService } from '../services/ai-agent.service';

@Component({
  selector: 'app-post-it-node',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="post-it-card"
      [attr.data-color]="note.color"
      [class.is-done]="note.status === 'done_check' || note.status === 'done_cross'"
      [class.is-blocked]="note.isBlocked || note.status === 'blocked'"
      [class.is-clustered]="!!note.clusterId"
      [class.is-subtask]="isSubtask"
      [class.is-thema]="isThema"
      [class.is-pivot]="isPivot"
      [class.is-dragging]="isDragging"
      [style.width.px]="note.size?.width"
      [style.height.px]="note.size?.height"
      (contextmenu)="onContextMenu($event)"
      (mousedown)="onMouseDown($event)">
      <!-- Left Connector Port (Target / Inflow) -->
      <div 
        class="connector-port left"
        (mouseup)="onPortMouseUp($event)"
        title="Relier ici comme dépendance">
      </div>

      <!-- Right Connector Port (Source / Outflow) -->
      <div 
        class="connector-port right"
        (mousedown)="onPortMouseDown($event)"
        title="Tirer une dépendance vers un autre Post-it (ou lâcher dans le vide pour créer une sous-tâche)">
        <span class="port-plus-icon">+</span>
      </div>

      <!-- Card Header -->
      <div class="card-header">
        <button 
          type="button"
          class="status-toggle-btn"
          [title]="getStatusTooltip()"
          (click)="onToggleStatus($event)">
          <span class="status-icon">{{ getStatusIcon() }}</span>
        </button>

        <span class="thema-badge" *ngIf="isThema" title="Thème / Sujet principal">
          🏛️ Thème
        </span>

        <span class="pivot-badge" *ngIf="isPivot" title="Pivot / Jalon clé">
          💎 Pivot
        </span>

        <span class="subtask-badge" *ngIf="isSubtask && !isThema && !isPivot" title="Sous-tâche concrète">
          ⚡ Action
        </span>

        <span class="cluster-badge" *ngIf="note.clusterId && !isThema" title="Collé à un groupe solidaire">
          🔗 Collé
        </span>

        <span class="in-progress-badge" *ngIf="note.status === 'in_progress'" title="En cours de réalisation">
          ⚡ En cours
        </span>

        <span class="on-hold-badge" *ngIf="note.status === 'on_hold'" title="Tâche en pause">
          ⏸️ En pause
        </span>

        <span class="blocked-badge" *ngIf="note.isBlocked || note.status === 'blocked'" title="Dépendance non résolue ou bloquée">
          🔒 Bloqué
        </span>

        <div class="actions-right">
          <!-- Context Menu Trigger Button (⋯) -->
          <button 
            type="button" 
            class="action-icon-btn context-menu-btn" 
            (click)="onOpenContextMenu($event)" 
            title="Propriétés et options (Clic droit ou ⋯)">
            ⋯
          </button>

          <!-- Quick Subtask Creation (+) -->
          <button 
            type="button" 
            class="action-icon-btn add-subtask" 
            (click)="onAddSubtask($event)" 
            title="Créer une sous-tâche connectée (+)">
            ➕
          </button>

          <!-- Direct Focus Launcher (UC7) -->
          <button 
            type="button" 
            class="action-icon-btn focus" 
            (click)="onLaunchFocus($event)" 
            title="🎯 Lancer directement en Hyperfocus (Time-Timer)">
            🎯
          </button>

          <!-- Cascade Complete All Button (UC8) -->
          <button 
            *ngIf="note.clusterId || isThema"
            type="button" 
            class="action-icon-btn cascade-done" 
            (click)="onCompleteCascade($event)" 
            title="🏁 Marquer cette chaîne et ses étapes connectées comme Terminées (Cascade Done)">
            🏁
          </button>

          <!-- AI Task Decomposer Button -->
          <button 
            type="button" 
            class="action-icon-btn ai" 
            (click)="onDecompose($event)" 
            title="🪄 Décomposer en sous-étapes TDAH (≤ 20 min)">
            🪄
          </button>

          <!-- Color Picker Trigger -->
          <div class="color-picker-dropdown">
            <button type="button" class="action-icon-btn" (click)="toggleColorMenu($event)" title="Changer la couleur">
              🎨
            </button>
            <div class="color-palette" *ngIf="showColorMenu" (click)="$event.stopPropagation()">
              <button 
                *ngFor="let c of availableColors" 
                class="color-dot"
                [attr.data-color]="c"
                [class.selected]="note.color === c"
                (click)="setColor(c)"></button>
            </div>
          </div>

          <!-- Unstick Button (if in cluster) -->
          <button 
            *ngIf="note.clusterId"
            type="button" 
            class="action-icon-btn" 
            (click)="onUnstick($event)" 
            title="Décoller du groupe">
            ✂️
          </button>

          <!-- Delete Button -->
          <button 
            type="button" 
            class="action-icon-btn delete" 
            (click)="onDelete($event)" 
            title="Supprimer">
            🗑️
          </button>
        </div>
      </div>

      <!-- Card Title, Description Spot & Inline Edit -->
      <div class="card-body">
        <div 
          *ngIf="!isEditingTitle" 
          class="note-title-display"
          (dblclick)="startEditingTitle($event)"
          title="Double-clic pour modifier le titre">
          {{ note.title }}
        </div>

        <textarea 
          #titleTextarea
          *ngIf="isEditingTitle"
          class="note-title-input"
          [(ngModel)]="editTitleValue"
          (blur)="saveTitle()"
          (keydown.enter)="saveTitle()"
          (keydown.escape)="cancelEditingTitle()"
          (click)="$event.stopPropagation()"
          rows="2"
          placeholder="Titre de la tâche..."></textarea>

        <!-- Description Box (Double-click to edit) -->
        <div 
          *ngIf="!isEditingContent" 
          class="note-description-spot"
          (dblclick)="startEditingContent($event)"
          [title]="'Double-cliquez pour éditer la description'">
          <div class="desc-content" *ngIf="note.content">
            {{ note.content }}
          </div>
          <div class="desc-placeholder" *ngIf="!note.content && !note.aiSuggestion">
            <span class="placeholder-text">+ Description (double-clic)</span>
          </div>

          <!-- AI Suggestion Banner (UC5) -->
          <div *ngIf="note.aiSuggestion" class="ai-suggestion-box" (click)="$event.stopPropagation()">
            <div class="ai-suggestion-header">
              <span class="ai-sparkle-icon">✨</span>
              <span class="ai-label">Suggestion IA</span>
              <div class="ai-actions">
                <button type="button" class="ai-btn accept" (click)="acceptAiSuggestion($event)" title="Accepter la suggestion">
                  ✓
                </button>
                <button type="button" class="ai-btn reject" (click)="rejectAiSuggestion($event)" title="Rejeter la suggestion">
                  ✗
                </button>
              </div>
            </div>
            <div class="ai-suggestion-text">{{ note.aiSuggestion }}</div>
          </div>
        </div>

        <!-- Inline Description Textarea -->
        <textarea 
          #contentTextarea
          *ngIf="isEditingContent"
          class="note-description-input"
          [(ngModel)]="editContentValue"
          (blur)="saveContent()"
          (keydown.escape)="cancelEditingContent()"
          (click)="$event.stopPropagation()"
          rows="3"
          placeholder="Description ou détails de la tâche..."></textarea>
      </div>

      <!-- Card Footer (Cognitive Load & Tags) -->
      <div class="card-footer">
        <div class="tags-container" *ngIf="note.tags && note.tags.length">
          <span *ngFor="let tag of note.tags" class="tag-chip">{{ tag }}</span>
        </div>

        <!-- UC7: Quick Duration Selector Chips: Concrete Actions Only -->
        <div class="duration-chips" *ngIf="!isThema && !isPivot" (click)="$event.stopPropagation()">
          <button 
            type="button" 
            *ngFor="let d of [5, 15, 25, 45]"
            class="duration-chip" 
            [class.active]="note.estimatedMinutes === d"
            (click)="setDuration(d, $event)"
            [title]="'Définir la durée à ' + d + ' min'">
            {{ d }}m
          </button>
        </div>

        <!-- Dynamic Cumulative Chain Duration for Thème -->
        <div 
          class="cumulative-duration-badge" 
          *ngIf="isThema"
          [title]="'Durée estimée cumulée de la chaîne d’actions : ' + cumulativeDuration.formatted">
          <span class="cumul-icon">⏱️ Chaîne :</span>
          <span class="cumul-text">{{ cumulativeDuration.formatted }}</span>
        </div>

        <!-- Dynamic Upstream Lead Time for Pivot / Milestone -->
        <div 
          class="cumulative-duration-badge pivot-cumul" 
          *ngIf="isPivot"
          [title]="'Temps cumulé amont requis pour atteindre le jalon : ' + pivotLeadTime.formatted">
          <span class="cumul-icon">⏱️ Amont :</span>
          <span class="cumul-text">{{ pivotLeadTime.formatted }}</span>
        </div>

        <div 
          class="cognitive-pill" 
          [title]="isThema
            ? ('Thème — ' + cumulativeDuration.formatted + ' cumulés') 
            : (isPivot 
              ? ('Pivot — ' + pivotLeadTime.formatted + ' amont requis')
              : ('Complexité : ' + (note.complexity || note.cognitiveLoad) + ' (' + note.estimatedMinutes + 'm)'))">
          <span *ngIf="isThema">🏛️ Thème</span>
          <span *ngIf="isPivot">🚩 Jalon</span>
          <ng-container *ngIf="!isThema && !isPivot">
            <span *ngIf="note.complexity === 'epic'">🏔️ Épique</span>
            <span *ngIf="note.complexity === 'complex' || (!note.complexity && note.cognitiveLoad === 'high')">⚡ Complexe</span>
            <span *ngIf="note.complexity === 'medium' || (!note.complexity && note.cognitiveLoad === 'medium')">🔋 Moyen</span>
            <span *ngIf="note.complexity === 'simple' || (!note.complexity && note.cognitiveLoad === 'low')">🪶 Simple</span>
          </ng-container>
        </div>
      </div>

      <!-- Resize handle bottom-right -->
      <div 
        class="post-it-resize-handle"
        (mousedown)="onResizeHandleMouseDown($event)"
        title="Redimensionner le Post-it">
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      user-select: none;
      touch-action: none;
      flex-shrink: 0;
      box-sizing: border-box;
      min-width: 192px;
      min-height: 160px;
    }

    .post-it-card {
      box-sizing: border-box;
      min-width: 192px;
      width: 210px;
      min-height: 160px;
      height: fit-content;
      flex-shrink: 0;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.12);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: grab;
      position: relative;
      overflow: visible;
    }

    .post-it-card:active, .post-it-card.is-dragging {
      cursor: grabbing;
      transform: scale(1.03);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.2);
      z-index: 9999 !important;
    }

    /* Connector Ports */
    .connector-port {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid #555;
      cursor: crosshair;
      z-index: 20;
      transition: all 0.15s ease;
      opacity: 0.3;
    }
    .post-it-card:hover .connector-port {
      opacity: 0.9;
    }
    .connector-port:hover {
      opacity: 1;
      transform: translateY(-50%) scale(1.3);
      background: #ff7700;
      border-color: #fff;
    }
    .connector-port.left {
      left: -7px;
    }
    .connector-port.right {
      right: -8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .port-plus-icon {
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      color: #333;
      pointer-events: none;
      display: none;
    }
    .post-it-card:hover .port-plus-icon {
      display: block;
    }
    .connector-port:hover .port-plus-icon {
      color: #fff;
    }

    /* Pastels Palettes */
    .post-it-card[data-color='yellow'] { background: #fef08a; color: #713f12; border-color: #facc15; }
    .post-it-card[data-color='pink']   { background: #fbcfe8; color: #831843; border-color: #f472b6; }
    .post-it-card[data-color='blue']   { background: #bae6fd; color: #0c4a6e; border-color: #38bdf8; }
    .post-it-card[data-color='green']  { background: #bbf7d0; color: #14532d; border-color: #4ade80; }
    .post-it-card[data-color='purple'] { background: #e9d5ff; color: #581c87; border-color: #c084fc; }
    .post-it-card[data-color='orange'] { background: #fed7aa; color: #7c2d12; border-color: #fb923c; }

    /* Completion States */
    .post-it-card.is-done {
      opacity: 0.72;
      filter: saturate(0.85);
    }
    .post-it-card.is-done .note-title-display {
      text-decoration: line-through;
    }

    /* Blocked State */
    .post-it-card.is-blocked {
      border: 2px dashed #ef4444 !important;
    }

    /* Clustered Magnet Halo */
    .post-it-card.is-clustered {
      box-shadow: 0 0 0 2px rgba(255, 119, 0, 0.6), 0 6px 16px rgba(0, 0, 0, 0.25);
    }

    /* Header */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .status-toggle-btn {
      background: rgba(255, 255, 255, 0.5);
      border: none;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }
    .status-toggle-btn:hover {
      transform: scale(1.15);
      background: rgba(255, 255, 255, 0.8);
    }

    .cluster-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(255, 119, 0, 0.25);
      color: inherit;
    }

    .pivot-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(168, 85, 247, 0.25);
      border: 1px solid rgba(168, 85, 247, 0.45);
      color: #6b21a8;
    }

    .in-progress-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.25);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #92400e;
    }

    .on-hold-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(234, 179, 8, 0.25);
      border: 1px solid rgba(234, 179, 8, 0.45);
      color: #854d0e;
    }

    .blocked-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.25);
      color: #991b1b;
    }

    .actions-right {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      position: relative;
    }

    .action-icon-btn {
      background: transparent;
      border: none;
      padding: 2px 4px;
      font-size: 12px;
      cursor: pointer;
      border-radius: 4px;
      opacity: 0.6;
      transition: all 0.15s;
    }
    .action-icon-btn:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.08);
      transform: scale(1.1);
    }
    .action-icon-btn.delete:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Color Palette Dropdown */
    .color-picker-dropdown {
      position: relative;
    }
    .color-palette {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: #1e1e1e;
      padding: 6px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      display: flex;
      gap: 6px;
      z-index: 1000;
      border: 1px solid #333;
    }
    .color-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .color-dot:hover { transform: scale(1.2); }
    .color-dot.selected { border-color: #fff; }
    .color-dot[data-color='yellow'] { background: #fef08a; }
    .color-dot[data-color='pink']   { background: #fbcfe8; }
    .color-dot[data-color='blue']   { background: #bae6fd; }
    .color-dot[data-color='green']  { background: #bbf7d0; }
    .color-dot[data-color='purple'] { background: #e9d5ff; }
    .color-dot[data-color='orange'] { background: #fed7aa; }

    /* Body */
    .card-body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 40px;
    }

    .note-title-display {
      flex: 1 1 auto;
      min-height: 40px;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
      word-break: break-word;
      cursor: text;
    }

    .note-title-input {
      width: 100%;
      min-height: 40px;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.85);
      color: inherit;
      padding: 4px;
      resize: none;
      outline: none;
      font-family: inherit;
    }

    /* UC2: Subtask and Thema Post-it Sizing & Aesthetics */
    .post-it-card.is-subtask {
      min-width: 192px;
      width: 210px;
      min-height: 140px;
      padding: 10px 12px;
      gap: 6px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }
    .post-it-card.is-subtask .note-title-display {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
    }
    .post-it-card.is-subtask .note-title-input {
      font-size: 12px;
    }

    .post-it-card.is-thema {
      min-height: 180px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1.5px rgba(255, 119, 0, 0.4);
    }
    .post-it-card.is-thema .note-title-display {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.2px;
    }

    .thema-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(255, 119, 0, 0.25);
      color: #9a3412;
      border: 1px solid rgba(255, 119, 0, 0.35);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .subtask-badge {
      font-size: 8.5px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.2);
      color: #1e40af;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    /* Description Spot & UC5 Inline Editing */
    .note-description-spot {
      margin-top: 6px;
      padding: 5px 7px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.04);
      border: 1px dashed rgba(0, 0, 0, 0.15);
      font-size: 10px;
      line-height: 1.35;
      max-height: 90px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
      opacity: 0.9;
      cursor: text;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .note-description-spot:hover {
      background: rgba(0, 0, 0, 0.07);
      border-color: rgba(0, 0, 0, 0.25);
    }
    .desc-placeholder {
      font-style: italic;
      opacity: 0.6;
      font-size: 9.5px;
    }

    .note-description-input {
      margin-top: 6px;
      width: 100%;
      font-size: 10.5px;
      line-height: 1.35;
      border: 1px solid rgba(0, 0, 0, 0.25);
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.92);
      color: inherit;
      padding: 4px 6px;
      resize: vertical;
      outline: none;
      font-family: inherit;
    }

    /* AI Suggestion Box (UC5) */
    .ai-suggestion-box {
      margin-top: 5px;
      padding: 5px 6px;
      border-radius: 5px;
      background: linear-gradient(135deg, rgba(255, 119, 0, 0.15), rgba(168, 85, 247, 0.15));
      border: 1px solid rgba(255, 119, 0, 0.35);
      font-size: 9.5px;
      animation: fadeInSuggestion 0.25s ease-out;
    }
    @keyframes fadeInSuggestion {
      from { opacity: 0; transform: translateY(-3px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ai-suggestion-header {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 800;
      color: #9a3412;
      margin-bottom: 3px;
    }
    .ai-label {
      flex: 1;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .ai-actions {
      display: flex;
      gap: 3px;
    }
    .ai-btn {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      transition: transform 0.1s;
    }
    .ai-btn:hover { transform: scale(1.15); }
    .ai-btn.accept { background: #22c55e; color: #fff; }
    .ai-btn.reject { background: #ef4444; color: #fff; }
    .ai-suggestion-text {
      color: inherit;
      line-height: 1.3;
      font-size: 9.5px;
      opacity: 0.95;
    }

    /* Footer & Duration Chips (UC7) */
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      font-size: 10px;
    }

    .duration-chips {
      display: flex;
      gap: 3px;
      align-items: center;
    }
    .duration-chip {
      background: rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      padding: 1px 6px;
      max-height: 20px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      color: inherit;
      transition: all 0.15s;
    }
    .duration-chip:hover {
      background: rgba(0, 0, 0, 0.18);
      transform: scale(1.08);
    }
    .duration-chip.active {
      background: #ff7700;
      color: #000;
      border-color: #e65100;
    }

    .cumulative-duration-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.2px;
      color: inherit;
    }
    .cumulative-duration-badge .cumul-icon {
      font-size: 9px;
    }

    .action-icon-btn.focus:hover {
      background: rgba(255, 119, 0, 0.25);
    }
    .action-icon-btn.cascade-done:hover {
      background: rgba(34, 197, 94, 0.25);
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }
    .tag-chip {
      background: rgba(0, 0, 0, 0.08);
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
    }

    .cognitive-pill {
      margin-left: auto;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 3px;
      opacity: 0.85;
    }

    /* Resize Handle */
    .post-it-resize-handle {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 14px;
      height: 14px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.3) 50%);
      border-bottom-right-radius: 9px;
      opacity: 0.35;
      transition: opacity 0.15s, transform 0.15s;
      z-index: 25;
    }
    .post-it-card:hover .post-it-resize-handle {
      opacity: 0.85;
    }
    .post-it-resize-handle:hover {
      opacity: 1;
      transform: scale(1.15);
      background: linear-gradient(135deg, transparent 50%, #ff7700 50%);
    }
  `]
})
export class PostItNodeComponent {
  @Input({ required: true }) note!: ADHDPostItNote;
  @Input() set autoFocusEdit(val: boolean) {
    if (val && !this.isEditingTitle) {
      this.startEditingTitle();
    }
  }

  @Output() dragStarted = new EventEmitter<{ noteId: string; clientX: number; clientY: number }>();
  @Output() resizeStarted = new EventEmitter<{ noteId: string; clientX: number; clientY: number }>();
  @Output() connectStarted = new EventEmitter<{ noteId: string; clientX: number; clientY: number }>();
  @Output() connectEnded = new EventEmitter<{ targetNoteId: string }>();
  @Output() addSubtask = new EventEmitter<{ note: ADHDPostItNote }>();
  @Output() requestDecompose = new EventEmitter<{ note: ADHDPostItNote }>();
  @Output() contextMenuOpened = new EventEmitter<{ note: ADHDPostItNote; clientX: number; clientY: number }>();
  @Output() editFinished = new EventEmitter<void>();

  @ViewChild('titleTextarea') titleTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('contentTextarea') contentTextarea?: ElementRef<HTMLTextAreaElement>;

  store = inject(TaskstickStoreService);
  aiAgent = inject(AiAgentService);

  isDragging = false;
  isEditingTitle = false;
  editTitleValue = '';
  isEditingContent = false;
  editContentValue = '';
  showColorMenu = false;
  isDecomposing = false;

  readonly availableColors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];

  get isSubtask(): boolean {
    if (this.note.nature === 'action') return true;
    if (this.note.nature === 'theme' || this.note.nature === 'pivot') return false;
    const tags = this.note.tags || [];
    return tags.includes('sous-tâche') || tags.includes('subtask');
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

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuOpened.emit({
      note: this.note,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  onOpenContextMenu(event: MouseEvent) {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement || event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.contextMenuOpened.emit({
      note: this.note,
      clientX: rect.left,
      clientY: rect.bottom + 4
    });
  }

  onAddSubtask(event: MouseEvent) {
    event.stopPropagation();
    this.addSubtask.emit({ note: this.note });
  }

  setDuration(minutes: number, event: MouseEvent) {
    event.stopPropagation();
    if (this.isThema || this.isPivot) return;
    this.store.updateNote(this.note.id, { estimatedMinutes: minutes });
  }

  onLaunchFocus(event: MouseEvent) {
    event.stopPropagation();
    this.store.setActiveFocusNote(this.note, true);
  }

  async onCompleteCascade(event: MouseEvent) {
    event.stopPropagation();
    await this.store.completeTaskCascade(this.note.id);
  }

  onDecompose(event: MouseEvent) {
    event.stopPropagation();
    this.requestDecompose.emit({ note: this.note });
  }

  onPortMouseDown(event: MouseEvent) {
    event.stopPropagation();
    this.connectStarted.emit({
      noteId: this.note.id,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  onResizeHandleMouseDown(event: MouseEvent) {
    event.stopPropagation();
    if (event.button !== 0) return;
    this.resizeStarted.emit({
      noteId: this.note.id,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  onPortMouseUp(event: MouseEvent) {
    event.stopPropagation();
    this.connectEnded.emit({ targetNoteId: this.note.id });
  }

  onMouseDown(event: MouseEvent) {
    // Only drag with left click and if not editing
    if (event.button !== 0 || this.isEditingTitle || this.showColorMenu) return;

    const targetEl = event.target as HTMLElement;
    if (targetEl.closest('button') || targetEl.closest('textarea') || targetEl.closest('.color-palette')) {
      return;
    }

    this.dragStarted.emit({
      noteId: this.note.id,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  onToggleStatus(event: MouseEvent) {
    event.stopPropagation();
    this.store.toggleNoteStatus(this.note.id);
  }

  getStatusIcon(): string {
    switch (this.note.status) {
      case 'in_progress': return '⚡';
      case 'on_hold': return '⏸️';
      case 'blocked': return '🚫';
      case 'done_cross': return '❌';
      case 'done_check': return '✓';
      case 'open':
      default: return '⭕';
    }
  }

  getStatusTooltip(): string {
    switch (this.note.status) {
      case 'in_progress': return 'En cours (⚡) - Cliquez pour valider';
      case 'on_hold': return 'En pause (⏸️) - Cliquez pour reprendre';
      case 'blocked': return 'Bloqué (🚫) - Cliquez pour débloquer';
      case 'done_cross': return 'Terminé / Annulé (❌) - Cliquez pour valider';
      case 'done_check': return 'Validé (✓) - Cliquez pour rouvrir';
      case 'open':
      default: return 'Non terminé (⭕) - Cliquez pour marquer fait';
    }
  }

  toggleColorMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showColorMenu = !this.showColorMenu;
  }

  setColor(color: PostItColor) {
    this.store.updateNote(this.note.id, { color });
    this.showColorMenu = false;
  }

  onUnstick(event: MouseEvent) {
    event.stopPropagation();
    this.store.unstickNote(this.note.id);
  }

  onDelete(event: MouseEvent) {
    event.stopPropagation();
    this.store.deleteNote(this.note.id);
  }

  startEditingTitle(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.isEditingTitle = true;
    this.editTitleValue = this.note.title;
    setTimeout(() => {
      if (this.titleTextarea) {
        this.titleTextarea.nativeElement.focus();
        this.titleTextarea.nativeElement.select();
      }
    }, 50);
  }

  saveTitle() {
    const trimmed = this.editTitleValue.trim();
    if (trimmed && trimmed !== this.note.title) {
      this.store.updateNote(this.note.id, { title: trimmed });
    }
    this.isEditingTitle = false;
    this.editFinished.emit();
  }

  cancelEditingTitle() {
    this.isEditingTitle = false;
    this.editFinished.emit();
  }

  // --- UC5: Description Editing & AI Suggestions ---

  startEditingContent(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.isEditingContent = true;
    this.editContentValue = this.note.content || '';
    setTimeout(() => {
      if (this.contentTextarea) {
        this.contentTextarea.nativeElement.focus();
        this.contentTextarea.nativeElement.select();
      }
    }, 50);
  }

  saveContent() {
    const trimmed = this.editContentValue.trim();
    if (trimmed !== (this.note.content || '')) {
      this.store.updateNote(this.note.id, { content: trimmed });
    }
    this.isEditingContent = false;
  }

  cancelEditingContent() {
    this.isEditingContent = false;
  }

  acceptAiSuggestion(event: MouseEvent) {
    event.stopPropagation();
    if (!this.note.aiSuggestion) return;
    const current = this.note.content ? `${this.note.content}\n\n` : '';
    const newContent = `${current}${this.note.aiSuggestion}`.trim();
    this.store.updateNote(this.note.id, {
      content: newContent,
      aiSuggestion: undefined
    });
  }

  rejectAiSuggestion(event: MouseEvent) {
    event.stopPropagation();
    this.store.updateNote(this.note.id, {
      aiSuggestion: undefined
    });
  }
}
