import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { FocusSpotlightComponent } from './focus-spotlight.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FocusSpotlightComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  constructor(private store: TaskstickStoreService) {}

  // Stats Signals
  stats = computed(() => this.store.graphStats());
  
  // Dopamine Progress Counters
  completedCount = computed(() => this.stats().done_cross + this.stats().done_check);
  openCount = computed(() => this.stats().open);
  momentumStreak = computed(() => {
    // Mock streak calculation based on recent completions
    return Math.max(0, this.completedCount() - this.openCount());
  });

  // Focus Mode Integration
  isFocusModeActive = signal<boolean>(false);

  toggleFocusSpotlight(): void {
    this.isFocusModeActive.set(true);
  }

  exitFocusSpotlight(): void {
    this.isFocusModeActive.set(false);
  }
}
