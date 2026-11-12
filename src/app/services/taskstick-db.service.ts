// src/app/services/taskstick-db.service.ts
import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { ADHDPostItNote, PostItEdge, NoteCluster, WhiteboardZone } from '../models/taskstick-graph.model';

export interface JournalRecord {
  dateKey: string;      // yyyyMMdd
  rawMmd: string;       // original text
  syncedAt: number;     // timestamp
}

@Injectable({ providedIn: 'root' })
export class TaskstickDbService extends Dexie {
  notes!: Table<ADHDPostItNote, string>;
  edges!: Table<PostItEdge, string>;
  clusters!: Table<NoteCluster, string>;
  zones!: Table<WhiteboardZone, string>;
  journals!: Table<JournalRecord, string>;

  constructor() {
    super('TaskstickDB');

    // Schema version 1
    this.version(1).stores({
      notes: 'id, color, status, clusterId, zoneId, updatedAt',
      edges: 'id, sourceId, targetId, type',
      clusters: 'id',
      zones: 'id, label',
      journals: 'dateKey, syncedAt'
    });
  }
}
