import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { ADHDPostItNote, PostItStatus } from '../models/postit.model';

@Component({
  selector: 'app-weekly-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './weekly-planner.component.html',
  styleUrls: ['./weekly-planner.component.scss']
})
export class WeeklyPlannerComponent {
  constructor(private store: TaskstickStoreService) {}

  // Signals
  unblockedTasks = computed(() => this.store.blockedNotes());
  completedTasks = computed(() => this.store.rootActionableNotes());
  selectedDateKey = signal<string>('2023-10-01');
  isFocusMode = signal<boolean>(false);

  // Focus Mode State
  activeTaskId = signal<number | null>(null);
  focusTimerSeconds = signal<number>(25 * 60);
  selectedDuration = signal<'15' | '25' | '45'>('25');
  parkDistractionInput = signal<string>('');

  // Drag and Drop State
  draggedTaskId = signal<number | null>(null);

  // Helper to determine cognitive load based on task content (mock logic)
  getCognitiveLoad(task: ADHDPostItNote): 'High Focus' | 'Medium' | 'Low/Admin' {
    const text = (task.content || '').toLowerCase();
    if (text.includes('urgent') || text.includes('deadline') || text.includes('critical')) return 'High Focus';
    if (text.includes('admin') || text.includes('email') || text.includes('meeting')) return 'Low/Admin';
    return 'Medium';
  }

  // Timer Logic
  startTimer(duration: '15' | '25' | '45'): void {
    this.selectedDuration.set(duration);
    const minutes = parseInt(duration);
    this.focusTimerSeconds.set(minutes * 60);
  }

  resetTimer(): void {
    this.startTimer(this.selectedDuration());
  }

  toggleFocusMode(taskId: number): void {
    if (this.isFocusMode()) {
      this.activeTaskId.set(null);
      this.resetTimer();
    } else {
      this.activeTaskId.set(taskId);
      this.startTimer(this.selectedDuration());
    }
  }

  handleParkDistraction(): void {
    const text = this.parkDistractionInput().trim();
    if (text) {
      // In a real app, this would call the store to add a new note
      console.log('Park distraction saved:', text);
      this.parkDistractionInput.set('');
    }
  }

  // Drag and Drop Handlers
  onDragStart(event: any): void {
    this.draggedTaskId.set(event.dataTransfer?.effect ? event.dataTransfer.effect : null);
  }

  onDragOver(event: any): void {
    event.preventDefault();
  }

  onDrop(event: any): void {
    // Logic to move task between panes or update status would go here
    console.log('Dropped task:', this.draggedTaskId());
    this.draggedTaskId.set(null);
  }

  // Formatting helpers
  formatDate(dateKey: string): string {
    const date = new Date(dateKey + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  getDaysInWeek(): string[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days;
  }
}
