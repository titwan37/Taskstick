// src/app/task-manager/weekly-planner.component.ts
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { FocusSpotlightComponent } from '../dashboard/focus-spotlight.component';
import { ADHDPostItNote, CognitiveLoad } from '../models/taskstick-graph.model';

export interface DayColumn {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
}

export interface CascadingSubtaskItem {
  task: ADHDPostItNote;
  isPivot?: boolean;
  isPivotPassed?: boolean;
  isScheduled: boolean;
  scheduledDayLabel?: string;
  isNextAction: boolean;
  isLocked: boolean;
  prerequisiteTitle?: string;
}

export interface CascadingGroup {
  thema: ADHDPostItNote;
  subtasks: CascadingSubtaskItem[];
  nextPlannableTask: ADHDPostItNote | null;
  firstUndoneTask: ADHDPostItNote | null;
}

@Component({
  selector: 'app-weekly-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusSpotlightComponent],
  template: `
    <div class="planner-container" [class.dark]="dark" [attr.data-mobile-view]="mobileActiveView">
      
      <!-- Temporal Integrity Alert Banner -->
      <div *ngIf="temporalAlert" class="temporal-alert-banner">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">{{ temporalAlert }}</span>
        <button class="alert-close" (click)="temporalAlert = null" title="Fermer">✕</button>
      </div>

      <!-- Mobile View Switcher (Backlog vs Semaine) -->
      <div class="planner-mobile-switcher mobile-only">
        <button 
          type="button" 
          class="mobile-switch-btn" 
          [class.active]="mobileActiveView === 'backlog'"
          (click)="mobileActiveView = 'backlog'">
          ⚡ Tâches Prioritaires ({{ store.plannableNotes().length }})
        </button>
        <button 
          type="button" 
          class="mobile-switch-btn" 
          [class.active]="mobileActiveView === 'calendar'"
          (click)="mobileActiveView = 'calendar'">
          📅 Agenda Semaine
        </button>
      </div>

      <!-- Left Pane: Actionable Topological Backlog -->
      <div class="planner-backlog-pane" [class.mobile-hidden]="mobileActiveView === 'calendar'">
        <div class="pane-header">
          <span class="header-icon">⚡</span>
          <span class="header-text">Tâches Prioritaires</span>
          <span class="count-badge">{{ store.plannableNotes().length }}</span>
        </div>

        <div class="sub-hint">
          Déblocage progressif en cascade : chaque étape planifiée déverrouille la suivante
        </div>

        <div class="backlog-list">
          <!-- UC7: Group by parent Thema in cascading hierarchy -->
          <div *ngFor="let group of cascadingGroups()" class="thema-cascade-group" [attr.data-color]="group.thema.color">
            <!-- Thema Container Header -->
            <div class="thema-group-header">
              <span class="thema-icon">🏛️</span>
              <span class="thema-title">{{ group.thema.title }}</span>
              <span class="thema-separator">•</span>
              <span class="thema-subcount">{{ getActionCount(group) }} étapes</span>
              <span class="thema-separator">•</span>
              <span class="thema-duration-pill" [title]="'Durée estimée cumulée de la chaîne : ' + getCumulativeDuration(group.thema.id).formatted">
                ⏱️ Total : {{ getCumulativeDuration(group.thema.id).formatted }}
              </span>
              <button 
                class="cascade-done-mini-btn" 
                (click)="store.completeTaskCascade(group.thema.id)" 
                title="Valider toute la chaîne (Cascade Done)">
                ✓ Tout valider
              </button>
            </div>

            <!-- Cascading Indented Subtasks in Dependency Order -->
            <div class="cascade-subtasks-list">
              <ng-container *ngFor="let item of group.subtasks">
                
                <!-- Pivot / Milestone Gate (non-draggable horizontal milestone marker) -->
                <div *ngIf="item.isPivot" class="cascade-milestone-row" [class.passed]="item.isPivotPassed">
                  <div class="milestone-line"></div>
                  <div 
                    class="milestone-badge" 
                    [title]="item.isPivotPassed ? 'Jalon franchi — Cliquez pour basculer le statut' : 'Jalon en attente des étapes préalables — Cliquez pour valider manuellement'"
                    (click)="togglePivotStatus(item.task)">
                    <span class="milestone-icon">🚩</span>
                    <span class="milestone-title">{{ item.task.title }}</span>
                    <span class="milestone-cumul-pill" [title]="'Temps cumulé amont requis pour atteindre le pivot : ' + getPivotLeadTime(item.task.id).formatted">
                      (cumul amont : {{ getPivotLeadTime(item.task.id).formatted }})
                    </span>
                    <span class="milestone-status">{{ item.isPivotPassed ? '✓ Franchi' : '⏳ En attente' }}</span>
                  </div>
                  <div class="milestone-line"></div>
                </div>

                <!-- Concrete Executable Action Card -->
                <div 
                  *ngIf="!item.isPivot"
                  class="backlog-card subtask-card"
                  [class.next-action]="item.isNextAction"
                  [class.is-scheduled-step]="item.isScheduled"
                  [class.is-blocked-step]="item.isLocked"
                  [attr.data-color]="item.task.color"
                  [attr.draggable]="item.isNextAction || item.isScheduled"
                  (dragstart)="(item.isNextAction || item.isScheduled) && onDragStart(item.task, $event)">
                  
                  <div class="card-top">
                    <span class="subtask-order-pill">#{{ getActionIndex(group, item) }}</span>
                    <span class="task-title">{{ item.task.title }}</span>

                    <!-- State Badges -->
                    <span *ngIf="item.isNextAction" class="next-action-badge">
                      ⚡ À planifier
                    </span>
                    <span *ngIf="item.isScheduled" class="scheduled-badge" title="Déjà planifié dans l'agenda">
                      📅 {{ item.scheduledDayLabel }}
                    </span>
                    <span *ngIf="item.isLocked" class="blocked-step-badge" [title]="'Débloqué après ' + (item.prerequisiteTitle || 'l’étape précédente')">
                      🔒 Verrouillé
                    </span>

                    <span class="load-badge" [attr.data-load]="item.task.cognitiveLoad">
                      {{ getLoadIcon(item.task.cognitiveLoad) }}
                    </span>
                  </div>

                  <!-- Locked explanation indicator -->
                  <div *ngIf="item.isLocked" class="locked-hint">
                    🔒 Débloqué après : <strong>{{ item.prerequisiteTitle || 'étape précédente' }}</strong>
                  </div>

                  <div class="card-bottom">
                    <span class="est-duration">⏱️ {{ item.task.estimatedMinutes }}m</span>
                    <div class="card-actions">
                      <button 
                        *ngIf="item.isScheduled" 
                        class="card-unschedule-btn"
                        (click)="unschedule(item.task)" 
                        title="Retirer de l'agenda">
                        ✕ Retirer
                      </button>
                      <button 
                        class="focus-launch-btn" 
                        [disabled]="item.isLocked"
                        (click)="!item.isLocked && openFocus(item.task)" 
                        [title]="item.isLocked ? 'Verrouillée par l’étape précédente' : 'Lancer en Hyperfocus'">
                        🎯 Focus
                      </button>
                    </div>
                  </div>
                </div>
              </ng-container>

              <!-- All chain scheduled indicator -->
              <div *ngIf="!group.nextPlannableTask && hasActionSubtasks(group)" class="chain-completed-hint">
                🎉 Chaîne entièrement planifiée !
              </div>
            </div>
          </div>

          <!-- Standalone Actionable Tasks (Not bound to a thema) -->
          <div *ngIf="standaloneTasks().length > 0" class="standalone-section">
            <div class="standalone-section-title">📌 Autres Tâches Libres</div>
            <div 
              *ngFor="let task of standaloneTasks()"
              class="backlog-card"
              [attr.data-color]="task.color"
              draggable="true"
              (dragstart)="onDragStart(task, $event)">
              
              <div class="card-top">
                <span class="task-title">{{ task.title }}</span>
                <span class="next-action-badge">⚡ À planifier</span>
                <span class="load-badge" [attr.data-load]="task.cognitiveLoad">
                  {{ getLoadIcon(task.cognitiveLoad) }}
                </span>
              </div>

              <div class="card-bottom">
                <span class="est-duration">⏱️ {{ task.estimatedMinutes }}m</span>
                <button class="focus-launch-btn" (click)="openFocus(task)" title="Lancer en Hyperfocus">
                  🎯 Focus
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="cascadingGroups().length === 0 && standaloneTasks().length === 0" class="empty-backlog">
            🎉 Toutes les tâches libres sont planifiées ou terminées !
          </div>
        </div>
      </div>

      <!-- Right Pane: 7-Day Weekly Schedule Grid -->
      <div class="planner-grid-pane" [class.mobile-hidden]="mobileActiveView === 'backlog'">
        <div class="grid-header">
          <div class="grid-title">
            <span>📅</span>
            <span>Agenda Hebdomadaire Adaptatif (Énergie vs Temps)</span>
          </div>
          <div class="energy-legend">
            <span class="legend-item">⚡ Fort focus (Matin)</span>
            <span class="legend-item">🔋 Moyen</span>
            <span class="legend-item">🪶 Léger / Admin</span>
          </div>
        </div>

        <div class="days-columns">
          <div 
            *ngFor="let day of weekDays"
            class="day-col"
            (dragover)="onDragOver($event)"
            (drop)="onDropToDay(day.dayOfWeek, $event)">
            
            <div class="day-col-header">
              <span class="day-name">{{ day.label }}</span>
              <span class="day-task-count">{{ getTasksForDay(day.dayOfWeek).length }}</span>
            </div>

            <div class="day-slot-list">
              <div 
                *ngFor="let scheduled of getTasksForDay(day.dayOfWeek)"
                class="scheduled-task-pill"
                [attr.data-color]="scheduled.color"
                draggable="true"
                (dragstart)="onDragStart(scheduled, $event)">
                
                <div class="pill-title">{{ scheduled.title }}</div>
                <div class="pill-meta">
                  <span>{{ scheduled.estimatedMinutes }}m</span>
                  <button class="pill-focus" (click)="openFocus(scheduled)">🎯</button>
                  <button class="pill-remove" (click)="unschedule(scheduled)">✕</button>
                </div>
              </div>

              <div class="drop-target-hint">
                Glisser ici
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spotlight Modal Overlay -->
      <app-focus-spotlight 
        *ngIf="selectedFocusTask"
        [task]="selectedFocusTask"
        (close)="selectedFocusTask = null">
      </app-focus-spotlight>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    .planner-container {
      display: flex;
      width: 100%;
      height: 100%;
      background: #0d0d0d;
      color: #e0e0e0;
      overflow: hidden;
      position: relative;
    }

    .planner-container:not(.dark) {
      background: #f8fafc;
      color: #0f172a;
    }

    /* Temporal Integrity Alert Banner */
    .temporal-alert-banner {
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #7f1d1d;
      color: #fef2f2;
      border: 1px solid #ef4444;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      animation: alertSlide 0.25s ease-out;
    }
    @keyframes alertSlide {
      from { opacity: 0; transform: translate(-50%, -10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .alert-icon { font-size: 16px; }
    .alert-text { flex: 1; }
    .alert-close {
      background: none;
      border: none;
      color: #fef2f2;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.8;
      padding: 0 4px;
    }
    .alert-close:hover { opacity: 1; }

    /* Left Backlog Pane */
    .planner-backlog-pane {
      width: 320px;
      border-right: 1px solid #222;
      background: #121212;
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 12px;
      overflow-y: auto;
    }
    .planner-container:not(.dark) .planner-backlog-pane {
      background: #ffffff;
      border-right-color: #e2e8f0;
    }

    .pane-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 14px;
    }
    .count-badge {
      margin-left: auto;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #ff7700;
      color: #000;
      font-weight: 700;
    }

    .sub-hint {
      font-size: 11px;
      color: #888;
      line-height: 1.3;
    }

    .backlog-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* UC7: Cascading Thema Group Styles */
    .thema-cascade-group {
      border: 1px solid rgba(255, 119, 0, 0.35);
      border-radius: 8px;
      background: rgba(255, 119, 0, 0.04);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .thema-cascade-group[data-color='yellow'] { border-color: rgba(234, 179, 8, 0.4); background: rgba(254, 240, 138, 0.08); }
    .thema-cascade-group[data-color='pink']   { border-color: rgba(244, 114, 182, 0.4); background: rgba(251, 207, 232, 0.08); }
    .thema-cascade-group[data-color='blue']   { border-color: rgba(56, 189, 248, 0.4); background: rgba(186, 230, 253, 0.08); }
    .thema-cascade-group[data-color='green']  { border-color: rgba(74, 222, 128, 0.4); background: rgba(187, 247, 208, 0.08); }
    .thema-cascade-group[data-color='purple'] { border-color: rgba(192, 132, 252, 0.4); background: rgba(233, 213, 255, 0.08); }
    .thema-cascade-group[data-color='orange'] { border-color: rgba(251, 146, 60, 0.4); background: rgba(254, 215, 170, 0.08); }

    .thema-group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      padding-bottom: 4px;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
    }
    .thema-title {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .thema-subcount {
      font-size: 10px;
      opacity: 0.7;
    }
    .thema-duration-pill {
      font-size: 9.5px;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1px 6px;
      border-radius: 8px;
      color: inherit;
      white-space: nowrap;
    }
    .planner-container:not(.dark) .thema-duration-pill {
      background: rgba(0, 0, 0, 0.08);
      border-color: rgba(0, 0, 0, 0.15);
    }
    .cascade-done-mini-btn {
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #22c55e;
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .cascade-done-mini-btn:hover {
      background: #22c55e;
      color: #fff;
    }

    .cascade-subtasks-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-left: 8px;
      border-left: 2px dashed rgba(255, 119, 0, 0.3);
    }
    .subtask-order-pill {
      font-size: 9px;
      font-weight: 800;
      opacity: 0.6;
      margin-right: 4px;
    }

    .next-action-badge {
      font-size: 8.5px;
      font-weight: 800;
      background: #ff7700;
      color: #000;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .scheduled-badge {
      font-size: 8.5px;
      font-weight: 800;
      background: #2563eb;
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 3px;
      letter-spacing: 0.3px;
    }

    .blocked-step-badge {
      font-size: 8.5px;
      font-weight: 800;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid rgba(239, 68, 68, 0.4);
      letter-spacing: 0.2px;
    }

    .subtask-card.next-action {
      box-shadow: 0 0 0 2px #ff7700, 0 4px 12px rgba(255, 119, 0, 0.3);
      border-left: 4px solid #ff7700;
    }

    .subtask-card.is-scheduled-step {
      opacity: 0.88;
      border: 1px solid rgba(37, 99, 235, 0.5);
    }

    .subtask-card.is-blocked-step {
      opacity: 0.55;
      filter: grayscale(0.65);
      cursor: not-allowed;
      border: 1px dashed rgba(239, 68, 68, 0.4);
    }
    .subtask-card.is-blocked-step:active {
      transform: none;
    }

    .locked-hint {
      font-size: 9.5px;
      color: #dc2626;
      background: rgba(239, 68, 68, 0.08);
      padding: 3px 6px;
      border-radius: 4px;
      border-left: 2px solid #ef4444;
      line-height: 1.25;
    }
    .planner-container.dark .locked-hint {
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.15);
    }

    .chain-completed-hint {
      font-size: 11px;
      font-weight: 700;
      color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
      border: 1px dashed rgba(34, 197, 94, 0.3);
      border-radius: 6px;
      padding: 6px;
      text-align: center;
      margin-top: 4px;
    }

    /* Cascade Milestone Row */
    .cascade-milestone-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 4px 0;
      padding: 2px 0;
      user-select: none;
    }
    .milestone-line {
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.15);
      border-top: 1px dashed rgba(255, 255, 255, 0.2);
    }
    .planner-container:not(.dark) .milestone-line {
      background: rgba(0, 0, 0, 0.1);
      border-top: 1px dashed rgba(0, 0, 0, 0.15);
    }
    .milestone-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(147, 51, 234, 0.15);
      border: 1px solid rgba(147, 51, 234, 0.4);
      color: #c084fc;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .milestone-badge:hover {
      transform: scale(1.02);
      border-color: rgba(147, 51, 234, 0.7);
    }
    .planner-container:not(.dark) .milestone-badge {
      background: #f3e8ff;
      border-color: #d8b4fe;
      color: #7e22ce;
    }
    .cascade-milestone-row.passed .milestone-badge {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.4);
      color: #4ade80;
    }
    .planner-container:not(.dark) .cascade-milestone-row.passed .milestone-badge {
      background: #dcfce7;
      border-color: #86efac;
      color: #15803d;
    }
    .milestone-icon { font-size: 11px; }
    .milestone-label { opacity: 0.8; font-weight: 600; text-transform: uppercase; font-size: 8.5px; }
    .milestone-title { font-weight: 700; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .milestone-status { font-size: 8.5px; opacity: 0.9; margin-left: 2px; }
    .milestone-cumul-pill {
      font-size: 8.5px;
      font-weight: 800;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      padding: 1px 4px;
      margin-left: 3px;
      opacity: 0.9;
    }

    .standalone-section {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .standalone-section-title {
      font-size: 11px;
      font-weight: 700;
      opacity: 0.7;
    }

    .backlog-card {
      border-radius: 8px;
      padding: 10px 12px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: grab;
      color: #000;
      transition: transform 0.15s;
    }
    .backlog-card:active { cursor: grabbing; transform: scale(1.02); }

    .backlog-card[data-color='yellow'] { background: #fef08a; color: #713f12; }
    .backlog-card[data-color='pink']   { background: #fbcfe8; color: #831843; }
    .backlog-card[data-color='blue']   { background: #bae6fd; color: #0c4a6e; }
    .backlog-card[data-color='green']  { background: #bbf7d0; color: #14532d; }
    .backlog-card[data-color='purple'] { background: #e9d5ff; color: #581c87; }
    .backlog-card[data-color='orange'] { background: #fed7aa; color: #7c2d12; }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }
    .task-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
      flex: 1;
    }
    .load-badge {
      font-size: 12px;
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card-unschedule-btn {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #ef4444;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .card-unschedule-btn:hover {
      background: #ef4444;
      color: #fff;
    }

    .focus-launch-btn {
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.2);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .focus-launch-btn:hover { background: rgba(0, 0, 0, 0.3); }

    .empty-backlog {
      padding: 24px 12px;
      text-align: center;
      font-size: 12px;
      color: #888;
      border: 1px dashed #333;
      border-radius: 8px;
    }

    /* Right Weekly Grid Pane */
    .planner-grid-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px 20px;
      gap: 14px;
      overflow-x: auto;
    }

    .grid-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grid-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
    }
    .energy-legend {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #888;
    }

    .days-columns {
      display: grid;
      grid-template-columns: repeat(7, minmax(130px, 1fr));
      gap: 10px;
      flex: 1;
      min-height: 500px;
    }

    .day-col {
      background: #141414;
      border: 1px solid #222;
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.2s;
    }
    .planner-container:not(.dark) .day-col {
      background: #ffffff;
      border-color: #e2e8f0;
    }
    .day-col:hover { border-color: #444; }

    .day-col-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      border-bottom: 1px solid #222;
    }
    .planner-container:not(.dark) .day-col-header { border-bottom-color: #e2e8f0; }

    .day-name {
      font-weight: 700;
      font-size: 13px;
    }
    .day-task-count {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 8px;
      background: rgba(255, 119, 0, 0.2);
      color: #ff7700;
    }

    .day-slot-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .scheduled-task-pill {
      border-radius: 6px;
      padding: 8px;
      font-size: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      color: #000;
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: grab;
      transition: transform 0.15s;
    }
    .scheduled-task-pill:active {
      cursor: grabbing;
      transform: scale(1.02);
    }
    .scheduled-task-pill[data-color='yellow'] { background: #fef08a; color: #713f12; }
    .scheduled-task-pill[data-color='pink']   { background: #fbcfe8; color: #831843; }
    .scheduled-task-pill[data-color='blue']   { background: #bae6fd; color: #0c4a6e; }
    .scheduled-task-pill[data-color='green']  { background: #bbf7d0; color: #14532d; }
    .scheduled-task-pill[data-color='purple'] { background: #e9d5ff; color: #581c87; }
    .scheduled-task-pill[data-color='orange'] { background: #fed7aa; color: #7c2d12; }

    .pill-title {
      font-weight: 600;
      line-height: 1.25;
    }

    .pill-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      opacity: 0.8;
    }

    .pill-focus, .pill-remove {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 11px;
      padding: 1px 3px;
    }
    .pill-focus:hover, .pill-remove:hover { transform: scale(1.2); }

    .drop-target-hint {
      margin-top: auto;
      padding: 12px;
      text-align: center;
      font-size: 10px;
      color: #555;
      border: 1px dashed #262626;
      border-radius: 6px;
    }

    /* RESPONSIVE & MOBILE FLEX LAYOUT */
    .mobile-only {
      display: none !important;
    }

    @media (max-width: 860px) {
      .mobile-only {
        display: flex !important;
      }

      .planner-container {
        flex-direction: column;
        overflow-y: auto;
        position: relative;
      }

      .planner-mobile-switcher {
        display: flex;
        padding: 8px 12px;
        background: #141414;
        border-bottom: 1px solid #222;
        gap: 8px;
        position: sticky;
        top: 0;
        z-index: 50;
      }
      .planner-container:not(.dark) .planner-mobile-switcher {
        background: #f1f5f9;
        border-bottom-color: #cbd5e1;
      }

      .mobile-switch-btn {
        flex: 1;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #333;
        background: #1e1e1e;
        color: #888;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .planner-container:not(.dark) .mobile-switch-btn {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #64748b;
      }

      .mobile-switch-btn.active {
        background: #ff7700;
        color: #000;
        border-color: #ff7700;
      }

      .planner-backlog-pane {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid #222;
        max-height: none;
        overflow-y: visible;
      }

      .planner-grid-pane {
        padding: 12px;
        overflow-x: auto;
      }

      .days-columns {
        grid-template-columns: repeat(7, minmax(160px, 1fr));
      }

      .mobile-hidden {
        display: none !important;
      }
    }
  `]
})
export class WeeklyPlannerComponent {
  @Input() dark = true;

  store = inject(TaskstickStoreService);

  mobileActiveView: 'backlog' | 'calendar' = 'backlog';
  selectedFocusTask: ADHDPostItNote | null = null;
  draggedTask: ADHDPostItNote | null = null;
  temporalAlert: string | null = null;

  readonly weekDays: DayColumn[] = [
    { dayOfWeek: 1, label: 'Lundi' },
    { dayOfWeek: 2, label: 'Mardi' },
    { dayOfWeek: 3, label: 'Mercredi' },
    { dayOfWeek: 4, label: 'Jeudi' },
    { dayOfWeek: 5, label: 'Vendredi' },
    { dayOfWeek: 6, label: 'Samedi' },
    { dayOfWeek: 7, label: 'Dimanche' }
  ];

  getDayLabel(day: 1 | 2 | 3 | 4 | 5 | 6 | 7): string {
    const found = this.weekDays.find(d => d.dayOfWeek === day);
    return found ? found.label : `Jour ${day}`;
  }

  getShortDayLabel(day: 1 | 2 | 3 | 4 | 5 | 6 | 7): string {
    const map: Record<number, string> = {
      1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim'
    };
    return map[day] || `J${day}`;
  }

  /**
   * Cascading hierarchy of themes, milestones (pivots) and child subtasks in topological sequence.
   * Exposes active next action to plan, milestone gates, already scheduled steps with day badge, and future locked steps.
   */
  cascadingGroups(): CascadingGroup[] {
    const allNotes = this.store.notes();
    const allEdges = this.store.edges();
    const noteMap = new Map(allNotes.map(n => [n.id, n]));
    const themas = allNotes.filter(n => this.store.isThemaNote(n));

    const groups: CascadingGroup[] = [];

    for (const thema of themas) {
      // Find all subtasks connected to or clustered under this thema
      const childIds = new Set<string>();
      
      // Follow all outgoing depends_on paths from thema
      const queue = [thema.id];
      const visited = new Set<string>([thema.id]);

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

      // Also gather notes sharing this clusterId
      if (thema.clusterId) {
        for (const n of allNotes) {
          if (n.clusterId === thema.clusterId && n.id !== thema.id && !this.store.isThemaNote(n)) {
            childIds.add(n.id);
          }
        }
      }

      // Both concrete actions and milestones (pivots) under this thema are kept for topological sequencing, but themas are excluded
      const matchingNotes = allNotes.filter(n => childIds.has(n.id) && !this.store.isThemaNote(n));
      if (matchingNotes.length === 0) continue;

      // Sort subtasks in strict topological order
      const orderedSubtasks = this.store.sortTasksTopologically(matchingNotes);
      
      // Determine the single next plannable task in the chain (strictly concrete actions)
      const nextPlannableTask = this.store.getNextPlannableTaskForChain(orderedSubtasks);
      const firstUndoneTask = this.store.getFirstUndoneTaskInChain(orderedSubtasks);

      // Only show groups if there are still open tasks
      const openSubtasks = orderedSubtasks.filter(n => this.store.isNoteOpen(n));
      if (openSubtasks.length > 0) {
        const subtaskItems: CascadingSubtaskItem[] = openSubtasks.map(task => {
          const isPivot = this.store.isPivotNote(task);
          const isPivotPassed = isPivot ? this.store.isPredecessorSatisfied(task, noteMap) : false;
          const isScheduled = !isPivot && task.scheduledSlot !== undefined;
          const isNextAction = !isPivot && !isScheduled && task.id === nextPlannableTask?.id;
          const isLocked = !isPivot && !isScheduled && !isNextAction;

          let prerequisiteTitle: string | undefined;
          if (isLocked) {
            const incoming = allEdges.filter(e => e.targetId === task.id && e.type === 'depends_on');
            const pred = incoming
              .map(e => noteMap.get(e.sourceId))
              .find(p => p && !this.store.isThemaNote(p) && p.status === 'open' && !p.scheduledSlot);
            if (pred) {
              prerequisiteTitle = pred.title;
            }
          }

          return {
            task,
            isPivot,
            isPivotPassed,
            isScheduled,
            scheduledDayLabel: isScheduled && task.scheduledSlot ? this.getShortDayLabel(task.scheduledSlot.dayOfWeek) : undefined,
            isNextAction,
            isLocked,
            prerequisiteTitle
          };
        });

        groups.push({
          thema,
          subtasks: subtaskItems,
          nextPlannableTask,
          firstUndoneTask
        });
      }
    }

    return groups;
  }

  getActionIndex(group: CascadingGroup, item: CascadingSubtaskItem): number {
    const actionItems = group.subtasks.filter(s => !s.isPivot);
    const idx = actionItems.findIndex(s => s.task.id === item.task.id);
    return idx >= 0 ? idx + 1 : 1;
  }

  getActionCount(group: CascadingGroup): number {
    return group.subtasks.filter(s => !s.isPivot).length;
  }

  hasActionSubtasks(group: CascadingGroup): boolean {
    return group.subtasks.some(s => !s.isPivot);
  }

  getCumulativeDuration(nodeId: string): { totalMinutes: number; formatted: string; remainingMinutes: number; remainingFormatted: string } {
    return this.store.getChainCumulativeDuration(nodeId);
  }

  getPivotLeadTime(nodeId: string): { totalMinutes: number; formatted: string; remainingMinutes: number; remainingFormatted: string } {
    return this.store.getPivotUpstreamDuration(nodeId);
  }

  async togglePivotStatus(task: ADHDPostItNote) {
    await this.store.toggleNoteStatus(task.id);
  }

  /** Standalone plannable tasks not belonging to any thema group (strictly excluding Themas and Pivots) */
  standaloneTasks(): ADHDPostItNote[] {
    const groupSubtaskIds = new Set(this.cascadingGroups().flatMap(g => g.subtasks.map(s => s.task.id)));
    return this.store.notes().filter(n => 
      !this.store.isThemaNote(n) && 
      !this.store.isPivotNote(n) && 
      !groupSubtaskIds.has(n.id) && 
      this.store.isTaskPlannable(n)
    );
  }

  getTasksForDay(day: 1 | 2 | 3 | 4 | 5 | 6 | 7): ADHDPostItNote[] {
    return this.store.notes().filter(n => 
      !this.store.isThemaNote(n) && 
      !this.store.isPivotNote(n) && 
      n.scheduledSlot?.dayOfWeek === day
    );
  }

  getLoadIcon(load: CognitiveLoad): string {
    switch (load) {
      case 'high': return '⚡';
      case 'medium': return '🔋';
      case 'low': return '🪶';
      default: return '🔋';
    }
  }

  onDragStart(task: ADHDPostItNote, event: DragEvent) {
    if (this.store.isThemaNote(task) || this.store.isPivotNote(task)) {
      event.preventDefault();
      return;
    }
    this.draggedTask = task;
    event.dataTransfer?.setData('text/plain', task.id);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async onDropToDay(dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7, event: DragEvent) {
    event.preventDefault();
    if (!this.draggedTask) return;

    const task = this.draggedTask;
    // Strict Guard: Neither Themes nor Pivots can be assigned a scheduledSlot
    if (this.store.isThemaNote(task) || this.store.isPivotNote(task)) {
      this.draggedTask = null;
      return;
    }

    const allNotes = this.store.notes();
    const noteMap = new Map(allNotes.map(n => [n.id, n]));
    const incomingEdges = this.store.edges().filter(e => e.targetId === task.id && e.type === 'depends_on');

    // 1. Check prerequisite temporal constraints: cannot schedule before any scheduled prerequisite
    const scheduledPrereqs: Array<{ note: ADHDPostItNote; dayOfWeek: number }> = [];
    for (const edge of incomingEdges) {
      const pred = noteMap.get(edge.sourceId);
      if (pred && !this.store.isThemaNote(pred)) {
        if (pred.scheduledSlot?.dayOfWeek) {
          scheduledPrereqs.push({ note: pred, dayOfWeek: pred.scheduledSlot.dayOfWeek });
        } else if (this.store.isPivotNote(pred)) {
          // If predecessor is a Pivot, check upstream scheduled actions of the pivot
          const pivotUpstreamScheduled = this.getUpstreamScheduledNotes(pred.id, noteMap);
          scheduledPrereqs.push(...pivotUpstreamScheduled);
        }
      }
    }

    if (scheduledPrereqs.length > 0) {
      const minAllowedDay = Math.max(...scheduledPrereqs.map(p => p.dayOfWeek));
      if (dayOfWeek < minAllowedDay) {
        const culprit = scheduledPrereqs.find(p => p.dayOfWeek === minAllowedDay);
        const culpritDayLabel = this.getDayLabel(culprit?.note.scheduledSlot?.dayOfWeek as any || minAllowedDay as any);
        this.temporalAlert = `⚠️ Impossible de planifier « ${task.title} » avant « ${culprit?.note.title} » prévu le ${culpritDayLabel}.`;
        setTimeout(() => { this.temporalAlert = null; }, 5000);
        this.draggedTask = null;
        return;
      }
    }

    // 2. Check if any downstream scheduled dependents would be violated by moving task after them
    const downstreamViolations = this.getDownstreamScheduledViolations(task.id, dayOfWeek);
    if (downstreamViolations.length > 0) {
      for (const violId of downstreamViolations) {
        await this.store.unscheduleTaskWithCascade(violId);
      }
      this.temporalAlert = `⚠️ Attention: ${downstreamViolations.length} tâche(s) dépendante(s) prévue(s) plus tôt ont été déprogrammées.`;
      setTimeout(() => { this.temporalAlert = null; }, 5000);
    }

    await this.store.updateNote(task.id, {
      scheduledSlot: {
        dayOfWeek,
        startHour: 9,
        durationMinutes: task.estimatedMinutes || 25
      }
    });

    this.draggedTask = null;
  }

  private getUpstreamScheduledNotes(nodeId: string, noteMap: Map<string, ADHDPostItNote>): Array<{ note: ADHDPostItNote; dayOfWeek: number }> {
    const results: Array<{ note: ADHDPostItNote; dayOfWeek: number }> = [];
    const allEdges = this.store.edges();
    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const edge of allEdges) {
        if (edge.targetId === curr && edge.type === 'depends_on' && !visited.has(edge.sourceId)) {
          visited.add(edge.sourceId);
          const pred = noteMap.get(edge.sourceId);
          if (pred && !this.store.isThemaNote(pred)) {
            if (pred.scheduledSlot?.dayOfWeek) {
              results.push({ note: pred, dayOfWeek: pred.scheduledSlot.dayOfWeek });
            } else if (this.store.isPivotNote(pred)) {
              queue.push(pred.id);
            }
          }
        }
      }
    }
    return results;
  }

  private getDownstreamScheduledViolations(taskId: string, newDayOfWeek: number): string[] {
    const allNotes = this.store.notes();
    const allEdges = this.store.edges();
    const violations: string[] = [];
    const queue = [taskId];
    const visited = new Set<string>([taskId]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const edge of allEdges) {
        if (edge.sourceId === curr && edge.type === 'depends_on' && !visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          queue.push(edge.targetId);
          const child = allNotes.find(n => n.id === edge.targetId);
          if (child?.scheduledSlot?.dayOfWeek && child.scheduledSlot.dayOfWeek < newDayOfWeek) {
            violations.push(child.id);
          }
        }
      }
    }

    return violations;
  }

  async unschedule(task: ADHDPostItNote) {
    const rolledBackIds = await this.store.unscheduleTaskWithCascade(task.id);
    if (rolledBackIds.length > 0) {
      this.temporalAlert = `⚠️ ${rolledBackIds.length} tâche(s) dépendante(s) ont été déprogrammées pour préserver l'intégrité temporelle.`;
      setTimeout(() => { this.temporalAlert = null; }, 5000);
    }
  }

  openFocus(task: ADHDPostItNote) {
    this.selectedFocusTask = task;
  }
}
