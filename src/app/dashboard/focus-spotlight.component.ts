// src/app/dashboard/focus-spotlight.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ADHDPostItNote } from '../models/taskstick-graph.model';
import { TaskstickStoreService } from '../services/taskstick-store.service';

@Component({
  selector: 'app-focus-spotlight',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="spotlight-backdrop" (click)="onClose()">
      <div class="spotlight-modal" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="spotlight-header">
          <div class="badge-focus">🎯 Mode Hyperfocus</div>
          <button class="close-btn" (click)="onClose()">✕</button>
        </div>

        <!-- Active Focused Task -->
        <div class="task-spotlight-card" [attr.data-color]="task.color">
          <div class="task-header-row">
            <span class="cognitive-badge">⚡ Focus Session</span>
            <span class="est-badge">{{ task.estimatedMinutes }} min</span>
          </div>
          <h2 class="task-title">{{ task.title }}</h2>
          <p class="task-desc" *ngIf="task.content">{{ task.content }}</p>
          <div class="task-tags" *ngIf="task.tags.length">
            <span *ngFor="let t of task.tags" class="tag">{{ t }}</span>
          </div>
        </div>

        <!-- Circular Time-Timer -->
        <div class="timer-section">
          <div class="circle-timer-wrapper">
            <svg class="timer-svg" viewBox="0 0 160 160">
              <circle class="timer-bg" cx="80" cy="80" r="70" />
              <circle 
                class="timer-progress" 
                cx="80" cy="80" r="70"
                [style.stroke-dasharray]="circleCircumference"
                [style.stroke-dashoffset]="circleDashOffset"
              />
            </svg>
            <div class="timer-display">
              <span class="time-text">{{ formattedTime }}</span>
              <span class="time-label">{{ isRunning ? 'En cours' : 'En pause' }}</span>
            </div>
          </div>

          <div class="timer-controls">
            <button class="timer-btn" [class.active]="durationMinutes === 15" (click)="setDuration(15)">15m</button>
            <button class="timer-btn" [class.active]="durationMinutes === 25" (click)="setDuration(25)">25m</button>
            <button class="timer-btn" [class.active]="durationMinutes === 45" (click)="setDuration(45)">45m</button>
          </div>

          <div class="timer-action-buttons">
            <button class="main-timer-action" (click)="toggleTimer()">
              {{ isRunning ? '⏸️ Pause' : '▶️ Démarrer le Focus' }}
            </button>
            <button class="complete-task-action" (click)="markComplete()">
              ✓ Marquer comme Fait
            </button>
          </div>
        </div>

        <!-- Park Distraction / Quick Brain Dump -->
        <div class="park-distraction-section">
          <div class="distraction-label">💡 Mettre de côté une distraction (sauvegardée au mur sans quitter le focus) :</div>
          <div class="distraction-input-group">
            <input 
              type="text" 
              [(ngModel)]="distractionText" 
              (keydown.enter)="parkDistraction()" 
              placeholder="Une pensée parasite ? Tapez-la ici et appuyez sur Entrée..."
              class="distraction-input" />
            <button class="park-btn" (click)="parkDistraction()">Déposer</button>
          </div>
          <div class="park-confirm" *ngIf="parkedNotice">{{ parkedNotice }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spotlight-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(16px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .spotlight-modal {
      width: 100%;
      max-width: 580px;
      background: #121212;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 119, 0, 0.3);
      color: #fff;
    }

    .spotlight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge-focus {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #ff7700;
      background: rgba(255, 119, 0, 0.15);
      padding: 4px 12px;
      border-radius: 20px;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #777;
      font-size: 18px;
      cursor: pointer;
      transition: color 0.15s;
    }
    .close-btn:hover { color: #fff; }

    /* Task Card */
    .task-spotlight-card {
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: #000;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .task-spotlight-card[data-color='yellow'] { background: #fef08a; color: #713f12; }
    .task-spotlight-card[data-color='pink']   { background: #fbcfe8; color: #831843; }
    .task-spotlight-card[data-color='blue']   { background: #bae6fd; color: #0c4a6e; }
    .task-spotlight-card[data-color='green']  { background: #bbf7d0; color: #14532d; }
    .task-spotlight-card[data-color='purple'] { background: #e9d5ff; color: #581c87; }
    .task-spotlight-card[data-color='orange'] { background: #fed7aa; color: #7c2d12; }

    .task-header-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      opacity: 0.8;
    }

    .task-title {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.3;
      margin: 0;
    }

    .task-desc {
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
      opacity: 0.9;
    }

    .task-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.1);
      font-weight: 700;
    }

    /* Timer */
    .timer-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .circle-timer-wrapper {
      position: relative;
      width: 160px;
      height: 160px;
    }

    .timer-svg {
      width: 160px;
      height: 160px;
      transform: rotate(-90deg);
    }

    .timer-bg {
      fill: none;
      stroke: #222;
      stroke-width: 8;
    }

    .timer-progress {
      fill: none;
      stroke: #ff7700;
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.8s ease;
    }

    .timer-display {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .time-text {
      font-size: 28px;
      font-weight: 800;
      font-family: monospace;
      color: #fff;
    }
    .time-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      font-weight: 600;
    }

    .timer-controls {
      display: flex;
      gap: 8px;
    }
    .timer-btn {
      padding: 4px 12px;
      border-radius: 6px;
      background: #1f1f1f;
      border: 1px solid #333;
      color: #ccc;
      font-size: 12px;
      cursor: pointer;
    }
    .timer-btn.active {
      background: #ff7700;
      color: #000;
      border-color: #ff7700;
      font-weight: 700;
    }

    .timer-action-buttons {
      display: flex;
      gap: 12px;
      width: 100%;
    }

    .main-timer-action {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      background: #ff7700;
      color: #000;
      font-weight: 700;
      font-size: 14px;
      border: none;
      cursor: pointer;
      transition: transform 0.15s, background 0.15s;
    }
    .main-timer-action:hover {
      background: #ff881a;
      transform: translateY(-1px);
    }

    .complete-task-action {
      padding: 12px 18px;
      border-radius: 8px;
      background: #15803d;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      border: none;
      cursor: pointer;
    }
    .complete-task-action:hover {
      background: #16a34a;
    }

    /* Park Distraction */
    .park-distraction-section {
      background: #181818;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px dashed #333;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .distraction-label {
      font-size: 11px;
      color: #888;
      font-weight: 600;
    }
    .distraction-input-group {
      display: flex;
      gap: 8px;
    }
    .distraction-input {
      flex: 1;
      padding: 8px 12px;
      border-radius: 6px;
      background: #0f0f0f;
      border: 1px solid #2a2a2a;
      color: #fff;
      font-size: 12px;
      outline: none;
    }
    .park-btn {
      padding: 8px 14px;
      border-radius: 6px;
      background: #2a2a2a;
      color: #ccc;
      border: 1px solid #3a3a3a;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .park-btn:hover { background: #333; color: #fff; }
    .park-confirm {
      font-size: 11px;
      color: #22c55e;
      font-weight: 600;
    }
  `]
})
export class FocusSpotlightComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: ADHDPostItNote;
  @Output() close = new EventEmitter<void>();

  store = inject(TaskstickStoreService);

  durationMinutes = 25;
  remainingSeconds = 25 * 60;
  isRunning = false;
  timerInterval: any = null;

  distractionText = '';
  parkedNotice = '';

  readonly circleCircumference = 2 * Math.PI * 70; // ~439.82

  get circleDashOffset(): number {
    const totalSec = this.durationMinutes * 60;
    const progress = (totalSec - this.remainingSeconds) / totalSec;
    return this.circleCircumference * (1 - progress);
  }

  get formattedTime(): string {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  ngOnInit() {
    if (this.task.estimatedMinutes) {
      this.setDuration(this.task.estimatedMinutes);
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  setDuration(min: number) {
    this.durationMinutes = min;
    this.remainingSeconds = min * 60;
    this.stopTimer();
  }

  toggleTimer() {
    if (this.isRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
      } else {
        this.stopTimer();
        alert('🎉 Session Focus terminée ! Prenez une pause méritée.');
      }
    }, 1000);
  }

  stopTimer() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  markComplete() {
    this.store.toggleNoteStatus(this.task.id);
    this.onClose();
  }

  parkDistraction() {
    const text = this.distractionText.trim();
    if (!text) return;

    this.store.addNote({
      title: text,
      color: 'yellow',
      status: 'open',
      tags: ['#distraction', '#backlog']
    });

    this.distractionText = '';
    this.parkedNotice = '✓ Pensée déposée sur le mur en tâche de fond !';
    setTimeout(() => {
      this.parkedNotice = '';
    }, 3000);
  }

  onClose() {
    this.stopTimer();
    this.close.emit();
  }
}
