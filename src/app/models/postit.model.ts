// src/app/models/postit.model.ts
import { MultiLanguageContent } from '../editor/editor.component';

export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';


/**
 * Functional nature / archetype of a Post-it note:
 * - 'theme': Umbrella container, high-level subject or epic
 * - 'pivot': Decision point, milestone, key junction or gate
 * - 'action': Concrete actionable task or subtask
 */
export type PostItNature = 'theme' | 'pivot' | 'action';

/**
 * Visual & execution status of notes:
 * - 'open': Not yet completed (⭕ À faire)
 * - 'in_progress': Currently being worked on (⚡ En cours)
 * - 'on_hold': Paused / awaiting external input (⏸️ En pause)
 * - 'blocked': Manually blocked by an obstacle (🚫 Bloqué)
 * - 'done_cross': Completed / cancelled / rejected (❌ Annulé)
 * - 'done_check': Completed / verified (✓ Validé)
 */
export type PostItStatus = 'open' | 'in_progress' | 'on_hold' | 'blocked' | 'done_cross' | 'done_check';

/**
 * Cognitive complexity / effort estimation for ADHD prioritization:
 * - 'simple': Low effort (~5-15 min, high dopaminergic reward)
 * - 'medium': Moderate effort (~15-30 min)
 * - 'complex': High focus required (~30-60 min)
 * - 'epic': Heavy task requiring AI or manual decomposition
 */
export type PostItComplexity = 'simple' | 'medium' | 'complex' | 'epic';

export interface Coordinates2D {
  x: number;
  y: number;
}

export interface PostItNote {
  id: string;
  title: string;
  content?: string;
  aiSuggestion?: string;
  color: PostItColor;
  status: PostItStatus;
  nature?: PostItNature;
  complexity?: PostItComplexity;
  isThema?: boolean;
  isSubtask?: boolean;
  tags: string[];
  position: Coordinates2D;
  size?: { width: number; height: number };
  zIndex: number;
  clusterId?: string;
  zoneId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteCluster {
  id: string;
  noteIds: string[];
  relativeOffsets: Record<string, Coordinates2D>;
}

export interface WhiteboardZone {
  id: string;
  label: string;
  colorCode: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IdeationWallFilter {
  selectedColor?: PostItColor | 'all';
  selectedZone?: string | 'all';
  selectedTag?: string | 'all';
  searchQuery?: string;
}


