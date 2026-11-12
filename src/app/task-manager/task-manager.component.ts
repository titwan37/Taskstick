// src/app/task-manager/task-manager.component.ts
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { ADHDPostItNote } from '../models/taskstick-graph.model';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="task-manager-container" [class.dark]="dark">
      <div class="task-sidebar">
        <div class="sidebar-header">Catégories & Tags</div>
        <div class="filter-item" [class.active]="activeTag === 'all'" (click)="setTag('all')">
          <span>Toutes les tâches</span>
          <span class="count">{{ store.notes().length }}</span>
        </div>
        <div class="filter-item" [class.active]="activeTag === 'actionable'" (click)="setTag('actionable')">
          <span>⚡ Actionnables (non bloquées)</span>
          <span class="count">{{ store.rootActionableNotes().length }}</span>
        </div>
        <div class="filter-item" [class.active]="activeTag === 'blocked'" (click)="setTag('blocked')">
          <span>🔒 Bloquées (dépendances)</span>
          <span class="count">{{ store.blockedNotes().length }}</span>
        </div>
      </div>

      <div class="task-content">
        <div class="task-search-bar">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearch()" placeholder="🔍 Rechercher une tâche ou un tag..." class="search-input" />
        </div>

        <div class="task-list">
          <div *ngFor="let task of displayedTasks()" class="task-row" [class.is-done]="task.status !== 'open'">
            <button class="status-btn" (click)="store.toggleNoteStatus(task.id)">
              {{ task.status === 'open' ? '⭕' : (task.status === 'done_cross' ? '❌' : '✓') }}
            </button>
            <div class="task-info">
              <span class="task-title">{{ task.title }}</span>
              <div class="task-meta">
                <span class="task-badge" [attr.data-color]="task.color">{{ task.color }}</span>
                <span class="task-load" *ngIf="task.cognitiveLoad">⚡ {{ task.cognitiveLoad }}</span>
                <span *ngIf="task.isBlocked" class="task-blocked-badge">Bloqué par prérequis</span>
              </div>
            </div>
            <button class="delete-btn" (click)="store.deleteNote(task.id)">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-manager-container {
      display: flex;
      height: 100%;
      width: 100%;
      background: #0d0d0d;
      color: #e0e0e0;
    }
    .task-manager-container:not(.dark) {
      background: #f8fafc;
      color: #0f172a;
    }
    .task-sidebar {
      width: 260px;
      border-right: 1px solid #222;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #121212;
    }
    .task-manager-container:not(.dark) .task-sidebar {
      background: #ffffff;
      border-right-color: #e2e8f0;
    }
    .sidebar-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 8px;
    }
    .filter-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-item:hover {
      background: #1f1f1f;
    }
    .filter-item.active {
      background: #ff7700;
      color: #000;
      font-weight: 600;
    }
    .count {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.2);
    }
    .task-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px 24px;
      overflow-y: auto;
    }
    .task-search-bar {
      margin-bottom: 16px;
    }
    .search-input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #181818;
      color: #fff;
      font-size: 13px;
    }
    .task-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #222;
      background: #141414;
    }
    .task-row.is-done {
      opacity: 0.6;
    }
    .status-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
    }
    .task-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .task-title {
      font-size: 14px;
      font-weight: 500;
    }
    .task-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 11px;
    }
    .task-badge {
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 9px;
    }
    .task-badge[data-color='yellow'] { background: #fef08a; color: #713f12; }
    .task-badge[data-color='pink'] { background: #fbcfe8; color: #831843; }
    .task-badge[data-color='blue'] { background: #bae6fd; color: #0c4a6e; }
    .task-badge[data-color='green'] { background: #bbf7d0; color: #14532d; }
    .task-badge[data-color='purple'] { background: #e9d5ff; color: #581c87; }
    .task-badge[data-color='orange'] { background: #fed7aa; color: #7c2d12; }
    .task-blocked-badge {
      color: #ef4444;
      font-weight: 600;
    }
    .delete-btn {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.5;
    }
    .delete-btn:hover {
      opacity: 1;
    }
  `]
})
export class TaskManagerComponent {
  @Input() dark = true;
  store = inject(TaskstickStoreService);

  activeTag = 'all';
  searchQuery = '';

  setTag(tag: string) {
    this.activeTag = tag;
  }

  onSearch() {
    this.store.activeFilter.update(f => ({ ...f, searchQuery: this.searchQuery }));
  }

  displayedTasks(): ADHDPostItNote[] {
    if (this.activeTag === 'actionable') {
      return this.store.rootActionableNotes();
    }
    if (this.activeTag === 'blocked') {
      return this.store.blockedNotes();
    }
    return this.store.filteredNotes();
  }
}
