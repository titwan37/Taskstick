// src/app/models/taskstick-graph.model.ts
import { MultiLanguageContent } from '../editor/editor.component';
import { PostItNote, PostItColor, PostItStatus, Coordinates2D, NoteCluster, WhiteboardZone } from './postit.model';

export * from './postit.model';

export type RelationType = 'depends_on' | 'constrains' | 'synergy' | 'parent_of';
export type CognitiveLoad = 'low' | 'medium' | 'high';

export interface PostItEdge {
  id: string;
  sourceId: string;       // Source note ID (e.g. prerequisite)
  targetId: string;       // Target note ID (dependent note)
  type: RelationType;
  label?: Partial<MultiLanguageContent>;
}

export interface ADHDPostItNote extends PostItNote {
  /** Multilingual titles & notes for FR / EN / DE */
  translations?: Partial<MultiLanguageContent>;

  /** Executive function cognitive attributes */
  cognitiveLoad: CognitiveLoad;
  estimatedMinutes: number;       // Time-boxing duration (e.g. 15, 30, 45, 60)
  isBlocked: boolean;             // Computed dynamically by DAG solver

  /** Optional weekly agenda time slot */
  scheduledSlot?: {
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Monday to Sunday
    startHour: number;                     // e.g. 9.5 for 09:30
    durationMinutes: number;
  };
}

export interface GraphStats {
  totalNotes: number;
  openCount: number;
  doneCrossCount: number;
  doneCheckCount: number;
  blockedCount: number;
  completionPercentage: number;
  byColor: Record<PostItColor, number>;
}

export interface IdeationWallSnapshot {
  version: 1;
  app: 'Taskstick';
  exportedAt: number;
  dateKey: string;
  notes: ADHDPostItNote[];
  edges: PostItEdge[];
  clusters: NoteCluster[];
  zones: WhiteboardZone[];
}

