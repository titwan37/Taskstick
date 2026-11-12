// src/app/dashboard/dashboard.component.ts
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { FocusSpotlightComponent } from './focus-spotlight.component';
import { ADHDPostItNote } from '../models/taskstick-graph.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FocusSpotlightComponent],
  template: `
    <div class="dashboard-container" [class.dark]="dark">
      <div class="dashboard-header">
        <div class="title">
          <span>📊</span>
          <span>Tableau de Bord Exécutif & Focus</span>
        </div>
        <button 
          *ngIf="store.rootActionableNotes().length > 0"
          class="launch-spotlight-btn" 
          (click)="launchNextSpotlight()">
          🎯 Lancer la Prochaine Tâche Prioritaire
        </button>
      </div>

      <!-- Dopamine Progress Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon">📝</div>
          <div class="kpi-value">{{ store.graphStats().totalNotes }}</div>
          <div class="kpi-label">Idées & Tâches Totales</div>
        </div>

        <div class="kpi-card highlight">
          <div class="kpi-icon">🔥</div>
          <div class="kpi-value">{{ store.graphStats().completionPercentage }}%</div>
          <div class="kpi-label">Progression Dopamine</div>
        </div>

        <div class="kpi-card success">
          <div class="kpi-icon">🏆</div>
          <div class="kpi-value">{{ store.graphStats().doneCrossCount + store.graphStats().doneCheckCount }}</div>
          <div class="kpi-label">Tâches Accomplies</div>
        </div>

        <div class="kpi-card warning">
          <div class="kpi-icon">🔒</div>
          <div class="kpi-value">{{ store.graphStats().blockedCount }}</div>
          <div class="kpi-label">Tâches en Attente (DAG)</div>
        </div>
      </div>

      <!-- Quick Actionable Recommendations for ADHD -->
      <div class="recommendations-box">
        <div class="section-title">⚡ Recommandations Immédiates (Sans Paralysie d'Analyse)</div>
        <div class="actionable-cards-row">
          <div 
            *ngFor="let rec of store.rootActionableNotes().slice(0, 3)"
            class="action-rec-card"
            [attr.data-color]="rec.color">
            <div class="rec-title">{{ rec.title }}</div>
            <div class="rec-meta">
              <span>⏱️ {{ rec.estimatedMinutes }}m</span>
              <button class="rec-focus-btn" (click)="selectedSpotlightTask = rec">
                🎯 Lancer Focus
              </button>
            </div>
          </div>

          <div *ngIf="store.rootActionableNotes().length === 0" class="no-rec-hint">
            Aucune tâche bloquante en attente. Votre esprit est libre !
          </div>
        </div>
      </div>

      <!-- Color Distribution & Categorization -->
      <div class="section-title">Répartition Thématique par Couleur de Post-it</div>
      <div class="color-distribution">
        <div *ngFor="let entry of colorList" class="color-bar-item">
          <div class="color-badge" [attr.data-color]="entry">{{ entry }}</div>
          <div class="color-count">{{ store.graphStats().byColor[entry] || 0 }}</div>
        </div>
      </div>

      <!-- Spotlight Modal -->
      <app-focus-spotlight
        *ngIf="store.activeFocusNote() || selectedSpotlightTask"
        [task]="store.activeFocusNote() || selectedSpotlightTask!"
        (close)="closeSpotlight()">
      </app-focus-spotlight>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 22px;
      padding: 24px 28px;
      height: 100%;
      width: 100%;
      background: #0d0d0d;
      color: #e0e0e0;
      overflow-y: auto;
    }
    .dashboard-container:not(.dark) {
      background: #f8fafc;
      color: #0f172a;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dashboard-header .title {
      font-size: 20px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .launch-spotlight-btn {
      padding: 8px 18px;
      border-radius: 8px;
      background: #ff7700;
      color: #000;
      font-weight: 700;
      font-size: 13px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(255, 119, 0, 0.3);
    }
    .launch-spotlight-btn:hover {
      background: #ff881a;
      transform: translateY(-1px);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #222;
      background: #141414;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
    }
    .dashboard-container:not(.dark) .kpi-card {
      background: #ffffff;
      border-color: #e2e8f0;
    }
    .kpi-icon {
      font-size: 20px;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 32px;
      font-weight: 800;
      color: #fff;
    }
    .dashboard-container:not(.dark) .kpi-value {
      color: #0f172a;
    }
    .kpi-label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      font-weight: 700;
    }
    .kpi-card.highlight .kpi-value { color: #ff7700; }
    .kpi-card.success .kpi-value { color: #22c55e; }
    .kpi-card.warning .kpi-value { color: #f59e0b; }

    /* Recommendations */
    .recommendations-box {
      background: #141414;
      border: 1px solid #222;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .dashboard-container:not(.dark) .recommendations-box {
      background: #ffffff;
      border-color: #e2e8f0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .actionable-cards-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }

    .action-rec-card {
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      color: #000;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }
    .action-rec-card[data-color='yellow'] { background: #fef08a; color: #713f12; }
    .action-rec-card[data-color='pink']   { background: #fbcfe8; color: #831843; }
    .action-rec-card[data-color='blue']   { background: #bae6fd; color: #0c4a6e; }
    .action-rec-card[data-color='green']  { background: #bbf7d0; color: #14532d; }
    .action-rec-card[data-color='purple'] { background: #e9d5ff; color: #581c87; }
    .action-rec-card[data-color='orange'] { background: #fed7aa; color: #7c2d12; }

    .rec-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
    }
    .rec-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .rec-focus-btn {
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.2);
      border: none;
      font-weight: 700;
      cursor: pointer;
    }
    .rec-focus-btn:hover { background: rgba(0, 0, 0, 0.35); }

    .no-rec-hint {
      font-size: 12px;
      color: #666;
      padding: 12px;
    }

    /* Color distribution */
    .color-distribution {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .color-bar-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 8px;
      background: #141414;
      border: 1px solid #222;
    }
    .dashboard-container:not(.dark) .color-bar-item {
      background: #fff;
      border-color: #e2e8f0;
    }
    .color-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .color-badge[data-color='yellow'] { background: #fef08a; color: #713f12; }
    .color-badge[data-color='pink']   { background: #fbcfe8; color: #831843; }
    .color-badge[data-color='blue']   { background: #bae6fd; color: #0c4a6e; }
    .color-badge[data-color='green']  { background: #bbf7d0; color: #14532d; }
    .color-badge[data-color='purple'] { background: #e9d5ff; color: #581c87; }
    .color-badge[data-color='orange'] { background: #fed7aa; color: #7c2d12; }
    .color-count {
      font-weight: 700;
      font-size: 14px;
    }

    @media (max-width: 860px) {
      .dashboard-container {
        padding: 16px 14px;
        gap: 16px;
      }
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .launch-spotlight-btn {
        width: 100%;
        text-align: center;
      }
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .kpi-card {
        padding: 14px;
      }
      .kpi-value {
        font-size: 24px;
      }
      .actionable-cards-row {
        flex-direction: column;
      }
      .action-rec-card {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent {
  @Input() dark = true;
  store = inject(TaskstickStoreService);

  selectedSpotlightTask: ADHDPostItNote | null = null;

  readonly colorList: ('yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange')[] = [
    'yellow',
    'pink',
    'blue',
    'green',
    'purple',
    'orange'
  ];

  launchNextSpotlight() {
    const next = this.store.rootActionableNotes()[0];
    if (next) {
      this.selectedSpotlightTask = next;
    }
  }

  closeSpotlight() {
    this.selectedSpotlightTask = null;
    this.store.setActiveFocusNote(null, false);
  }
}
