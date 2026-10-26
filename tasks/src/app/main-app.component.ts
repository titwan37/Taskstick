import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { TaskstickStoreService } from './services/taskstick-store.service';
import { IdeationWallComponent } from './components/ideation-wall/ideation-wall.component';
import { TaskManagerComponent } from './components/task-manager/task-manager.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StudioMermaidComponent } from './components/studio-mermaid/studio-mermaid.component';

@Component({
  selector: 'app-main-app',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, IdeationWallComponent, TaskManagerComponent, DashboardComponent, StudioMermaidComponent],
  templateUrl: './main-app.component.html',
  styleUrls: ['./main-app.component.css']
})
export class MainAppComponent {
  private store = new TaskstickStoreService();

  // State Signals
  activeZone = signal<'wall' | 'tasks' | 'dashboard' | 'legacy_studio'>('wall');
  darkMode = signal<boolean>(false);
  selectedDateKey = signal<string>('2023-10-01');
  exportFormat = signal<'json' | 'csv'>('json');

  // Computed Signals
  graphStats = computed(() => this.store.graphStats());
  rootActionableNotes = computed(() => this.store.rootActionableNotes());
  blockedNotes = computed(() => this.store.blockedNotes());

  constructor() {
    this.selectedDateKey.set('2023-10-01');
  }

  toggleDarkMode(): void {
    this.darkMode.update(val => !val);
  }

  exportData(): void {
    const data = JSON.stringify(this.store._notes(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskstick-export-${this.selectedDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadData(file: File): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        this.store._notes.set(data);
        alert('Data loaded successfully');
      } catch (e) {
        alert('Error loading data: ' + e);
      }
    };
    reader.readAsText(file);
  }

  loadSampleData(): void {
    const sampleNotes = [
      { id: '1', content: 'Idea for new project', status: 'open' },
      { id: '2', content: 'Research phase', status: 'done_cross' },
      { id: '3', content: 'Drafting document', status: 'done_check' }
    ];
    this.store._notes.set(sampleNotes);
  }

  get activeZoneLabel(): string {
    switch (this.activeZone()) {
      case 'wall': return '1. Mur à Idées';
      case 'tasks': return '2. Tâches & Agenda';
      case 'dashboard': return '3. Dashboard & Focus';
      case 'legacy_studio': return '4. Studio Mermaid (Expert)';
      default: return '';
    }
  }

  get activeZoneIcon(): string {
    switch (this.activeZone()) {
      case 'wall': return '🎨';
      case 'tasks': return '✅';
      case 'dashboard': return '📊';
      case 'legacy_studio': return '🧪';
      default: return '';
    }
  }

  setZone(zone: 'wall' | 'tasks' | 'dashboard' | 'legacy_studio'): void {
    this.activeZone.set(zone);
  }
}
