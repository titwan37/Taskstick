import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, inject, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import panzoom, { PanZoom } from 'panzoom';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { PostItNodeComponent } from './post-it-node.component';
import { SvgConnectionLayerComponent } from './svg-connection-layer.component';
import { PostItContextMenuComponent } from './post-it-context-menu.component';
import { ADHDPostItNote, PostItColor, WhiteboardZone } from '../models/taskstick-graph.model';
import { SpeechRecognitionService } from '../services/speech-recognition.service';
import { AiAgentService } from '../services/ai-agent.service';

@Component({
  selector: 'app-ideation-wall',
  standalone: true,
  imports: [CommonModule, FormsModule, PostItNodeComponent, SvgConnectionLayerComponent, PostItContextMenuComponent],
  template: `
    <div class="wall-wrapper" [class.dark]="dark">
      <!-- Top Action Toolbar -->
      <div class="wall-toolbar">
        <div class="toolbar-left">
          <div class="quick-add-group">
            <input 
              type="text" 
              class="quick-input"
              [(ngModel)]="quickInputText"
              (keydown.enter)="addQuickNote()"
              placeholder="💡 Idée soudaine... (Tapez Entrée pour projeter)" />
            
            <button class="quick-color-btn" [attr.data-color]="selectedQuickColor" (click)="cycleQuickColor()">
              🎨
            </button>
            <button class="tool-btn primary" (click)="addQuickNote()">
              ➕ Poser
            </button>
            <button 
              type="button" 
              class="tool-btn mic-btn" 
              [class.is-recording]="speech.isListening()"
              (click)="toggleVoiceDictation()"
              [title]="speech.isListening() ? 'Arrêter la dictée vocale' : 'Dicter une note vocale (Web Speech API)'">
              {{ speech.isListening() ? '🔴 Dictée en cours...' : '🎙️ Dicter' }}
            </button>
          </div>
        </div>

        <!-- Auto Grouping, History & Filters (Desktop) -->
        <div class="toolbar-right desktop-only">
          <div class="history-btn-group">
            <button 
              type="button" 
              class="tool-btn" 
              [disabled]="!store.canUndo()" 
              (click)="store.undo()" 
              title="Annuler la dernière action (Ctrl+Z)">
              ↩️ Annuler
            </button>
            <button 
              type="button" 
              class="tool-btn" 
              [disabled]="!store.canRedo()" 
              (click)="store.redo()" 
              title="Rétablir l'action annulée (Ctrl+Y)">
              ↪️ Rétablir
            </button>
          </div>

          <button class="tool-btn" (click)="addNewRegion()" title="Créer une zone / région en pointillés pour regrouper des Post-it">
            📐 + Région
          </button>
          <button class="tool-btn highlight-btn" (click)="store.optimizeSpatialLayout()" title="Optimiser la disposition spatiale (alignement, espacement selon thèmes, cascades de sous-tâches et connexions)">
            ⚡ Optimiser Disposition
          </button>

          <!-- Sovereign Ollama Model Badge / Selector -->
          <div class="ai-engine-badge" [class.online]="aiAgent.isOnline()" [title]="aiAgent.isOnline() ? 'Ollama Localhost En Ligne (' + aiAgent.getEndpoint() + ')' : 'Mode secours catalogue actif'">
            <span class="ai-dot"></span>
            <span class="ai-engine-label">IA:</span>
            <select 
              [ngModel]="aiAgent.getSelectedModel()" 
              (ngModelChange)="onModelSelectChange($event)"
              class="ai-model-dropdown">
              <option *ngFor="let m of aiAgent.getAvailableModels()" [value]="m">
                {{ m === defaultModel ? '★ ' + m : m }}
              </option>
            </select>
          </div>

          <button class="tool-btn" (click)="autoInferDependencies()" title="Déduire et relier automatiquement les dépendances entre tâches">
            ✨ Déduire Dépendances
          </button>
          <button class="tool-btn" (click)="store.autoGroupByColor()" title="Aligner en colonnes par couleur">
            🎨 Grouper par Couleur
          </button>
          <button class="tool-btn" (click)="resetView()" title="Réinitialiser le zoom">
            🔍 Reset Zoom
          </button>
          <span class="wall-stats-badge">
            {{ store.notes().length }} Post-it
          </span>
        </div>

        <!-- Mobile Controls (Quick Actions & Submenu Toggle) -->
        <div class="toolbar-right mobile-only">
          <button 
            type="button" 
            class="tool-btn" 
            [disabled]="!store.canUndo()" 
            (click)="store.undo()" 
            title="Annuler (Ctrl+Z)">
            ↩️
          </button>
          <button 
            type="button" 
            class="tool-btn" 
            [disabled]="!store.canRedo()" 
            (click)="store.redo()" 
            title="Rétablir (Ctrl+Y)">
            ↪️
          </button>
          <button 
            type="button" 
            class="tool-btn more-options-btn" 
            (click)="mobileOptionsOpen = !mobileOptionsOpen" 
            title="Plus d'outils">
            ⚙️ Outils ▾
          </button>
        </div>

        <!-- Mobile Sub-Menu Sheet for Wall -->
        <div class="wall-mobile-sheet" *ngIf="mobileOptionsOpen" (click)="$event.stopPropagation()">
          <div class="sheet-title">Outils Mur d'Idées ({{ store.notes().length }} Post-it)</div>
          <div class="sheet-grid">
            <button class="sheet-action-btn" (click)="store.optimizeSpatialLayout(); mobileOptionsOpen = false">
              ⚡ Optimiser Disposition
            </button>
            <button class="sheet-action-btn" (click)="addNewRegion(); mobileOptionsOpen = false">
              📐 + Région Pointillée
            </button>
            <button class="sheet-action-btn" (click)="autoInferDependencies(); mobileOptionsOpen = false">
              ✨ Déduire Dépendances
            </button>
            <button class="sheet-action-btn" (click)="store.autoGroupByColor(); mobileOptionsOpen = false">
              🎨 Grouper par Couleur
            </button>
            <button class="sheet-action-btn" (click)="resetView(); mobileOptionsOpen = false">
              🔍 Réinitialiser Zoom
            </button>
          </div>
        </div>
      </div>

      <!-- Infinite Zoomable Magnetic Canvas -->
      <div #canvasContainer class="canvas-viewport" (dblclick)="onCanvasDblClick($event)">
        <div #canvasWorld class="canvas-world">
          <!-- Dashed Grouping Regions / Zones (UC4) -->
          <div 
            *ngFor="let zone of store.zones()"
            class="dashed-region-box"
            [style.left.px]="zone.bounds.x"
            [style.top.px]="zone.bounds.y"
            [style.width.px]="zone.bounds.width"
            [style.height.px]="zone.bounds.height"
            [style.--zone-color]="zone.colorCode || '#ff7700'">
            
            <!-- Region Header & Controls -->
            <div 
              class="region-header"
              (mousedown)="onRegionDragStarted($event, zone)">
              <div 
                *ngIf="editingRegionId !== zone.id"
                class="region-label" 
                (dblclick)="startEditingRegionLabel($event, zone)"
                title="Double-cliquez pour renommer la région">
                {{ zone.label }}
              </div>
              <input 
                *ngIf="editingRegionId === zone.id"
                type="text" 
                class="region-label-input"
                [(ngModel)]="editingRegionLabel"
                (blur)="saveRegionLabel(zone)"
                (keydown.enter)="saveRegionLabel(zone)"
                (keydown.escape)="editingRegionId = null"
                (click)="$event.stopPropagation()" />
              
              <div class="region-actions">
                <button 
                  type="button" 
                  class="region-action-btn delete" 
                  (click)="deleteRegion($event, zone.id)" 
                  title="Supprimer la région">
                  ✕
                </button>
              </div>
            </div>

            <!-- Resize handle bottom-right -->
            <div 
              class="region-resize-handle"
              (mousedown)="onRegionResizeStarted($event, zone)"
              title="Redimensionner la région">
            </div>
          </div>

          <!-- SVG Connections Overlay Layer -->
          <app-svg-connection-layer
            [width]="6000"
            [height]="6000"
            [drawingLine]="drawingBezierPath">
          </app-svg-connection-layer>

          <!-- Post-it Notes Nodes -->
          <app-post-it-node 
            *ngFor="let note of store.filteredNotes(); trackBy: trackByNoteId"
            [note]="note"
            [autoFocusEdit]="newlyCreatedNoteIdForEdit() === note.id"
            [style.left.px]="note.position.x"
            [style.top.px]="note.position.y"
            [style.z-index]="note.zIndex"
            (dragStarted)="onNoteDragStarted($event)"
            (resizeStarted)="onNoteResizeStarted($event)"
            (connectStarted)="onConnectStarted($event)"
            (connectEnded)="onConnectEnded($event)"
            (addSubtask)="createConnectedSubtask($event.note)"
            (requestDecompose)="openDecomposeModal($event.note)"
            (contextMenuOpened)="openContextMenu($event)"
            (editFinished)="newlyCreatedNoteIdForEdit.set(null)">
          </app-post-it-node>
        </div>
      </div>

      <!-- UC8: Interactive AI Micro-Action Staging Tray Modal -->
      <div 
        *ngIf="stagingThema"
        class="staging-modal-backdrop" 
        (click)="closeDecomposeModal()">
        <div class="staging-modal" (click)="$event.stopPropagation()">
          
          <div class="staging-header">
            <div class="staging-title-box">
              <span class="ai-tray-icon">🪄</span>
              <div>
                <div class="staging-title">Décomposition en Micro-Actions TDAH</div>
                <div class="staging-subtitle">Thème : <strong>{{ stagingThema.title }}</strong></div>
              </div>
            </div>
            <button class="staging-close-btn" (click)="closeDecomposeModal()">✕</button>
          </div>

          <div class="staging-hint">
            Sélectionnez, réorganisez ou modifiez les micro-actions avant de les projeter sur le mur.
          </div>

          <!-- Staging Items List -->
          <div class="staging-items-list">
            <div 
              *ngFor="let item of stagedSteps; let i = index"
              class="staging-item"
              [class.excluded]="!item.accepted">
              
              <input 
                type="checkbox" 
                class="step-check"
                [(ngModel)]="item.accepted" 
                [title]="item.accepted ? 'Action acceptée' : 'Action écartée'" />

              <span class="step-order">#{{ i + 1 }}</span>

              <input 
                type="text" 
                class="step-text-input" 
                [(ngModel)]="item.text" 
                placeholder="Libellé de l'action..." />

              <div class="step-duration-box">
                <select [(ngModel)]="item.estimatedMinutes" class="step-duration-select">
                  <option [ngValue]="5">5m</option>
                  <option [ngValue]="10">10m</option>
                  <option [ngValue]="15">15m</option>
                  <option [ngValue]="20">20m</option>
                </select>
              </div>

              <div class="step-reorder-buttons">
                <button type="button" class="reorder-btn" (click)="moveStagedStep(i, -1)" [disabled]="i === 0" title="Monter">▲</button>
                <button type="button" class="reorder-btn" (click)="moveStagedStep(i, 1)" [disabled]="i === stagedSteps.length - 1" title="Descendre">▼</button>
                <button type="button" class="delete-step-btn" (click)="removeStagedStep(i)" title="Supprimer">🗑️</button>
              </div>
            </div>
          </div>

          <!-- Add custom micro-action manually -->
          <div class="staging-add-custom">
            <input 
              type="text" 
              class="add-custom-input" 
              [(ngModel)]="customStepInput" 
              (keydown.enter)="addCustomStagedStep()" 
              placeholder="+ Ajouter un micro-pas manuel..." />
            <button class="add-custom-btn" (click)="addCustomStagedStep()">Ajouter</button>
          </div>

          <!-- Modal Actions -->
          <div class="staging-footer">
            <button class="staging-btn cancel" (click)="closeDecomposeModal()">Annuler</button>
            <button class="staging-btn apply" (click)="applyStagedStepsToBoard()">
              🚀 Appliquer au Mur ({{ acceptedStepsCount }} actions)
            </button>
          </div>
        </div>
      </div>

      <!-- Post-It Properties & Options Context Menu -->
      <app-post-it-context-menu
        *ngIf="activeContextMenuNote"
        [note]="activeContextMenuNote"
        [position]="contextMenuPosition"
        (close)="closeContextMenu()"
        (addSubtask)="createConnectedSubtask($event)"
        (requestDecompose)="openDecomposeModal($event)">
      </app-post-it-context-menu>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .wall-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: 100%;
      background: #080808;
      color: #e0e0e0;
      position: relative;
    }

    .wall-wrapper:not(.dark) {
      background: #f5f5f7;
      color: #1d1d1f;
    }

    /* Toolbar */
    .wall-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      background: rgba(18, 18, 18, 0.92);
      border-bottom: 1px solid #222;
      backdrop-filter: blur(12px);
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }
    .wall-wrapper:not(.dark) .wall-toolbar {
      background: rgba(255, 255, 255, 0.92);
      border-bottom-color: #e2e8f0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .quick-add-group {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.35);
      padding: 4px 6px;
      border-radius: 8px;
      border: 1px solid #333;
    }
    .wall-wrapper:not(.dark) .quick-add-group {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .quick-input {
      width: 280px;
      background: transparent;
      border: none;
      color: inherit;
      padding: 6px 10px;
      font-size: 13px;
      outline: none;
    }

    .quick-color-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      transition: transform 0.15s;
    }
    .quick-color-btn:hover { transform: scale(1.1); }
    .quick-color-btn[data-color='yellow'] { background: #fef08a; }
    .quick-color-btn[data-color='pink']   { background: #fbcfe8; }
    .quick-color-btn[data-color='blue']   { background: #bae6fd; }
    .quick-color-btn[data-color='green']  { background: #bbf7d0; }
    .quick-color-btn[data-color='purple'] { background: #e9d5ff; }
    .quick-color-btn[data-color='orange'] { background: #fed7aa; }

    .history-btn-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .tool-btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #333;
      background: #1e1e1e;
      color: #ccc;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tool-btn:hover:not(:disabled) {
      background: #2a2a2a;
      color: #fff;
      border-color: #ff7700;
    }
    .tool-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: #262626;
      background: #181818;
      color: #666;
    }
    .tool-btn.primary {
      background: #ff7700;
      color: #000;
      border-color: #ff7700;
      font-weight: 700;
    }
    .tool-btn.primary:hover:not(:disabled) {
      background: #ff881a;
    }
    .tool-btn.highlight-btn {
      background: linear-gradient(135deg, rgba(255, 119, 0, 0.25), rgba(168, 85, 247, 0.25));
      border-color: #ff7700;
      color: #ffaa55;
      font-weight: 700;
    }
    .tool-btn.highlight-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(255, 119, 0, 0.45), rgba(168, 85, 247, 0.45));
      color: #fff;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(255, 119, 0, 0.3);
    }
    .tool-btn.mic-btn.is-recording {
      background: #ef4444;
      color: #ffffff;
      border-color: #f87171;
      animation: pulse-mic 1.2s infinite ease-in-out;
    }
    @keyframes pulse-mic {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }

    .wall-stats-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(255, 119, 0, 0.2);
      color: #ff7700;
      border: 1px solid rgba(255, 119, 0, 0.3);
    }

    .ai-engine-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 0 8px;
      height: 32px;
      font-size: 11px;
      font-family: monospace;
      color: #aaa;
    }
    .ai-engine-badge.online {
      border-color: rgba(34, 197, 94, 0.5);
    }
    .ai-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #888;
    }
    .ai-engine-badge.online .ai-dot {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }
    .ai-engine-label {
      font-weight: 700;
      color: #ffaa55;
    }
    .ai-model-dropdown {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 11px;
      font-family: monospace;
      outline: none;
      cursor: pointer;
      max-width: 130px;
    }
    .ai-model-dropdown option {
      background: #1e293b;
      color: #fff;
    }

    /* Responsive Toolbar Styles */
    .mobile-only {
      display: none !important;
    }
    .desktop-only {
      display: flex !important;
    }

    @media (max-width: 860px) {
      .mobile-only {
        display: flex !important;
      }
      .desktop-only {
        display: none !important;
      }

      .wall-toolbar {
        padding: 8px 10px;
        position: relative;
        flex-wrap: wrap;
        gap: 8px;
      }

      .quick-input {
        width: 140px;
      }

      .more-options-btn {
        background: #ff7700;
        color: #000;
        font-weight: 700;
        border-color: #ff7700;
      }

      .wall-mobile-sheet {
        position: absolute;
        top: 100%;
        right: 10px;
        width: 250px;
        background: rgba(20, 20, 20, 0.98);
        border: 1px solid #333;
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(14px);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        animation: fadeInSheet 0.15s ease-out;
      }

      .wall-wrapper:not(.dark) .wall-mobile-sheet {
        background: rgba(255, 255, 255, 0.98);
        border-color: #cbd5e1;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      }

      .sheet-title {
        font-size: 10.5px;
        font-weight: 800;
        text-transform: uppercase;
        color: #888;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .sheet-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sheet-action-btn {
        padding: 8px 10px;
        border-radius: 6px;
        background: #1a1a1a;
        border: 1px solid #333;
        color: #e0e0e0;
        font-size: 11px;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
        transition: all 0.15s;
      }
      .wall-wrapper:not(.dark) .sheet-action-btn {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .sheet-action-btn:hover {
        background: #ff7700;
        color: #000;
        border-color: #ff7700;
      }
    }

    /* Infinite Magnetic Canvas */
    .canvas-viewport {
      flex: 1;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      cursor: grab;
      background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1.5px, transparent 1.5px);
      background-size: 24px 24px;
    }
    .canvas-viewport:active {
      cursor: grabbing;
    }
    .wall-wrapper:not(.dark) .canvas-viewport {
      background-image: radial-gradient(rgba(0, 0, 0, 0.12) 1.5px, transparent 1.5px);
    }

    .canvas-world {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      overflow: visible;
      flex-shrink: 0;
    }

    /* Dashed Grouping Regions / Zones (UC4) */
    .dashed-region-box {
      position: absolute;
      border: 2px dashed var(--zone-color, #ff7700);
      background: rgba(255, 119, 0, 0.04);
      border-radius: 12px;
      z-index: 5;
      display: flex;
      flex-direction: column;
      pointer-events: all;
      transition: border-color 0.15s ease, background-color 0.15s ease;
      box-sizing: border-box;
    }
    .dashed-region-box:hover {
      background: rgba(255, 119, 0, 0.08);
      border-color: #ff881a;
    }

    .region-header {
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      cursor: grab;
      user-select: none;
      background: rgba(0, 0, 0, 0.15);
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    }
    .region-header:active {
      cursor: grabbing;
    }

    .region-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--zone-color, #ff7700);
      cursor: text;
    }

    .region-label-input {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(0, 0, 0, 0.4);
      color: #fff;
      outline: none;
      width: 140px;
    }

    .region-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .region-action-btn {
      background: transparent;
      border: none;
      color: #aaa;
      font-size: 12px;
      cursor: pointer;
      padding: 2px 5px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .region-action-btn.delete:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #ef4444;
    }

    .region-resize-handle {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
      background: linear-gradient(135deg, transparent 50%, var(--zone-color, #ff7700) 50%);
      border-bottom-right-radius: 10px;
      opacity: 0.6;
      transition: opacity 0.15s;
    }
    .region-resize-handle:hover {
      opacity: 1;
    }

    /* UC8: AI Micro-Action Staging Tray Modal */
    .staging-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .staging-modal {
      width: 580px;
      max-width: 95vw;
      max-height: 85vh;
      background: #141414;
      border: 1px solid #333;
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #e0e0e0;
    }
    .wall-wrapper:not(.dark) .staging-modal {
      background: #ffffff;
      border-color: #d2d2d7;
      color: #1d1d1f;
    }

    .staging-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .staging-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-tray-icon {
      font-size: 24px;
    }
    .staging-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.2px;
    }
    .staging-subtitle {
      font-size: 11.5px;
      opacity: 0.7;
      margin-top: 2px;
    }
    .staging-close-btn {
      background: transparent;
      border: none;
      font-size: 16px;
      color: inherit;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.15s;
    }
    .staging-close-btn:hover { opacity: 1; }

    .staging-hint {
      padding: 10px 20px;
      font-size: 11px;
      background: rgba(255, 119, 0, 0.08);
      border-bottom: 1px solid rgba(255, 119, 0, 0.2);
      color: #ff881a;
    }

    .staging-items-list {
      padding: 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      max-height: 45vh;
    }

    .staging-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    .staging-item.excluded {
      opacity: 0.4;
      text-decoration: line-through;
    }
    .step-check {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #ff7700;
    }
    .step-order {
      font-size: 10.5px;
      font-weight: 800;
      opacity: 0.6;
      min-width: 24px;
    }
    .step-text-input {
      flex: 1;
      font-size: 12px;
      background: transparent;
      border: 1px solid transparent;
      color: inherit;
      padding: 3px 6px;
      border-radius: 4px;
      outline: none;
    }
    .step-text-input:focus {
      background: rgba(0, 0, 0, 0.3);
      border-color: #ff7700;
    }
    .step-duration-select {
      font-size: 10.5px;
      background: rgba(0, 0, 0, 0.3);
      color: inherit;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      padding: 2px 4px;
      outline: none;
    }

    .step-reorder-buttons {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .reorder-btn {
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 10px;
      padding: 2px 4px;
      opacity: 0.6;
    }
    .reorder-btn:hover:not(:disabled) { opacity: 1; }
    .delete-step-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 12px;
      padding: 2px;
      opacity: 0.6;
    }
    .delete-step-btn:hover { opacity: 1; }

    .staging-add-custom {
      padding: 10px 20px;
      display: flex;
      gap: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .add-custom-input {
      flex: 1;
      padding: 6px 10px;
      font-size: 11.5px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(0, 0, 0, 0.3);
      color: inherit;
      outline: none;
    }
    .add-custom-btn {
      padding: 6px 12px;
      font-size: 11.5px;
      font-weight: 700;
      border-radius: 6px;
      border: 1px solid #444;
      background: #222;
      color: #ccc;
      cursor: pointer;
    }
    .add-custom-btn:hover {
      background: #333;
      color: #fff;
    }

    .staging-footer {
      padding: 14px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.15);
    }
    .staging-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .staging-btn.cancel {
      background: transparent;
      border: 1px solid #444;
      color: #ccc;
    }
    .staging-btn.cancel:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
    .staging-btn.apply {
      background: #ff7700;
      border: 1px solid #ff7700;
      color: #000;
    }
    .staging-btn.apply:hover { background: #ff881a; }
  `]
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
