import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskstickStoreService } from '../services/taskstick-store.service';

@Component({
  selector: 'app-focus-spotlight',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './focus-spotlight.component.html',
  styleUrls: ['./focus-spotlight.component.scss']
})
export class FocusSpotlightComponent {
  constructor(private store: TaskstickStoreService) {}

  // State Signals
  isFocused = signal<boolean>(false);
  activeTaskId = signal<number | null>(null);
  selectedDuration = signal<'15' | '25' | '45'>('25');
  timerSeconds = signal<number>(0);
  parkInput = signal<string>('');

  // Computed
  activeTask = computed(() => {
    const notes = this.store.rootActionableNotes();
    return notes.find(n => n.id === this.activeTaskId()) || null;
  });

  timerPercentage = computed(() => {
    if (this.timerSeconds() <= 0) return 100;
    const totalMinutes = parseInt(this.selectedDuration());
    const totalSeconds = totalMinutes * 60;
    return ((totalSeconds - this.timerSeconds()) / totalSeconds) * 100;
  });

  // Methods
  startTimer(duration: '15' | '25' | '45'): void {
    this.selectedDuration.set(duration);
    const minutes = parseInt(duration);
    this.timerSeconds.set(minutes * 60);
  }

  resetTimer(): void {
    this.startTimer(this.selectedDuration());
  }

  toggleFocus(): void {
    this.isFocused.set(!this.isFocused());
    if (!this.isFocused()) {
      this.resetTimer();
    }
  }

  handleParkDistraction(): void {
    const text = this.parkInput().trim();
    if (text) {
      // Save to backlog without breaking focus
      console.log('Park distraction saved:', text);
      this.parkInput.set('');
    }
  }
}
