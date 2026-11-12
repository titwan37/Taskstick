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

  /** AuDHD Actuation & Bottleneck Intelligence */
  enemy?: ParalysisEnemy;
  ramCheckpoint?: string;               // "Where I left off + next keystroke"
  microChecklist?: MicroChecklistItem[]; // 2-3 inline steps right on the post-it
  downstreamUnlockCount?: number;       // Computed transitive bottleneck weight

  /** Optional weekly agenda time slot */
  scheduledSlot?: {
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Monday to Sunday
    startHour: number;                     // e.g. 9.5 for 09:30
    durationMinutes: number;
    /** Google Calendar Sync Metadata */
    googleEventId?: string;
    calendarId?: string;
    lastSyncedAt?: number;
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

// src/app/models/taskstick-graph.model.ts
export type ParalysisEnemyType =
  | 'AMBIGUITY_FOG'       // 🌫️ Flou / Décision manquante
  | 'MONOLITH_OVERWHELM'  // 🏔️ Monolithe trop massif
  | 'PERFECTIONISM_TRAP'  // 🌀 Piège de perfectionnisme
  | 'EXTERNAL_GATE'       // ⏳ Attente externe / Tiers
  | 'RAM_OVERFLOW';       // 🧠 Surcharge mémoire de travail

export interface ParalysisEnemy {
  type: ParalysisEnemyType;
  label: string;          // e.g. "API schema undecided"
  ignitionStep: string;   // <= 2 min physical starter action
}

export interface MicroChecklistItem {
  id: string;
  label: string;
  done: boolean;
}