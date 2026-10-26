import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatColorPickerModule } from '@angular-material/color-picker';
import { MatChipsModule } from '@angular/material/chips';
import { ADHDPostItNote, PostItStatus } from '../models/postit.model';
import { TaskstickStoreService } from '../services/taskstick-store.service';

@Component({
  selector: 'app-post-it-node',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatColorPickerModule,
    MatChipsModule
  ],
  templateUrl: './post-it-node.component.html',
  styleUrls: ['./post-it-node.component.scss']
})
export class PostItNodeComponent implements OnInit {
  @Input() note: ADHDPostItNote;

  constructor(private storeService: TaskstickStoreService) {}

  ngOnInit(): void {
    // Initialize status if not set
    if (!this.note.status) {
      this.note.status = PostItStatus.open;
    }
  }

  get statusIcon(): string {
    switch (this.note.status) {
      case PostItStatus.done_cross:
        return 'done';
      case PostItStatus.done_check:
        return 'check';
      default:
        return 'close';
    }
  }

  toggleStatus(): void {
    this.storeService.toggleNoteStatus(this.note.id);
  }

  onDragStart(event: any): void {
    // Trigger magnetic snapping logic
    const movedNoteId = this.note.id;
    this.storeService.evaluateSticking(movedNoteId);
  }

  onGroupDragStart(event: any, clusterId: string): void {
    // Trigger magnetic snapping for group drag
    const movedNoteId = this.note.id;
    this.storeService.evaluateSticking(movedNoteId);
  }

  getColor(): string {
    return this.note.color || '#f4d59e';
  }

  get statusBadgeColor(): string {
    switch (this.note.status) {
      case PostItStatus.done_cross:
        return 'red';
      case PostItStatus.done_check:
        return 'green';
      default:
        return 'blue';
    }
  }
}
