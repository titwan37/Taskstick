import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatColorPickerModule } from '@angular-material/color-picker'; // Assuming a custom or standard implementation exists, adjust import if needed
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { ADHDPostItNote, PostItStatus } from '../models/postit.model';
import { ADHDPostItCluster } from '../models/cluster.model';
import { ADHDPostItZone } from '../models/zone.model';
import { PanzoomModule } from 'panzoom';

@Component({
  selector: 'app-ideation-wall',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatChipsModule,
    MatSlideToggleModule,
    PanzoomModule
  ],
  templateUrl: './ideation-wall.component.html',
  styleUrls: ['./ideation-wall.component.scss']
})
export class IdeationWallComponent implements OnInit {
  notes = signal<ADHDPostItNote[]>([]);
  clusters = signal<ADHDPostItCluster[]>([]);
  zones = signal<ADHDPostItZone[]>([]);
  activeFilter = signal<string>('all');
  selectedDateKey = signal<string>('2023-10-01');

  // Panzoom state
  panzoomState = {
    x: 0,
    y: 0,
    scale: 1,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  };

  // Quick capture bar state
  showQuickCaptureBar = signal<boolean>(false);
  quickCaptureColor = signal<string>('#f4d59e');

  constructor(private storeService: TaskstickStoreService) {}

  ngOnInit(): void {
    this.storeService._notes.subscribe(notes => {
      this.notes.set(notes);
    });
    this.storeService._clusters.subscribe(clusters => {
      this.clusters.set(clusters);
    });
    this.storeService._zones.subscribe(zones => {
      this.zones.set(zones);
    });
  }

  onQuickCapture(color: string): void {
    const newNote = {
      id: Date.now().toString(),
      user_id: 'current_user',
      name: '',
      core_identity_anchor: '',
      compiled_anchor_prompt: '',
      reference_image_url: '',
      status: PostItStatus.open,
      clusterId: null,
      zoneId: null,
      tags: []
    };

    this.storeService._notes.update(notes => [...notes, newNote]);
    this.showQuickCaptureBar.set(false);
  }

  onGroupByColor(): void {
    const notes = this.notes();
    const colorGroups = {};
    
    notes.forEach(note => {
      if (!colorGroups[note.color]) {
        colorGroups[note.color] = [];
      }
      colorGroups[note.color].push(note);
    });

    // Assign cluster IDs based on groups
    let clusterIdCounter = 1;
    Object.keys(colorGroups).forEach((color, index) => {
      const groupNotes = colorGroups[color];
      groupNotes.forEach((note, i) => {
        note.clusterId = `cluster_${index}_${i}`;
      });
    });

    this.storeService._notes.update(notes => {
      return notes.map(note => ({ ...note })); // Trigger re-render with updated clusterIds
    });
  }

  onGroupByZone(): void {
    const notes = this.notes();
    const zoneGroups = {};
    
    notes.forEach(note => {
      if (!zoneGroups[note.zoneId]) {
        zoneGroups[note.zoneId] = [];
      }
      zoneGroups[note.zoneId].push(note);
    });

    // Assign cluster IDs based on groups
    let clusterIdCounter = 1;
    Object.keys(zoneGroups).forEach((zoneId, index) => {
      const groupNotes = zoneGroups[zoneId];
      groupNotes.forEach((note, i) => {
        note.clusterId = `cluster_zone_${index}_${i}`;
      });
    });

    this.storeService._notes.update(notes => {
      return notes.map(note => ({ ...note }));
    });
  }

  onGroupByTag(): void {
    const notes = this.notes();
    const tagGroups = {};
    
    notes.forEach(note => {
      note.tags.forEach(tag => {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push(note);
      });
    });

    // Assign cluster IDs based on groups
    let clusterIdCounter = 1;
    Object.keys(tagGroups).forEach((tag, index) => {
      const groupNotes = tagGroups[tag];
      groupNotes.forEach((note, i) => {
        note.clusterId = `cluster_tag_${index}_${i}`;
      });
    });

    this.storeService._notes.update(notes => {
      return notes.map(note => ({ ...note }));
    });
  }

  toggleNoteStatus(noteId: string): void {
    this.storeService.toggleNoteStatus(noteId);
  }

  onPanZoomMove(x: number, y: number, scale: number): void {
    this.panzoomState.x = x;
    this.panzoomState.y = y;
    this.panzoomState.scale = scale;
  }

  onQuickCaptureClick(): void {
    this.showQuickCaptureBar.set(true);
  }

  closeQuickCaptureBar(): void {
    this.showQuickCaptureBar.set(false);
  }
}
