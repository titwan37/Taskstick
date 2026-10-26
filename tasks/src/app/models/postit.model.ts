import type { MultiLanguageContent, SupportedLanguage } from '../editor/editor.component';

export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';
export type PostItStatus = 'open' | 'done_cross' | 'done_check';
export type RelationType = 'depends_on' | 'constrains' | 'synergy' | 'parent_of';
export type CognitiveLoad = 'low' | 'medium' | 'high';

export interface Coordinates2D {
  x: number;
  y: number;
}

export interface NoteCluster {
  id: string;
  noteIds: string[];
  relativeOffsets: Record<string, Coordinates2D>;
}

export interface WhiteboardZone {
  id: string;
  label: string;
  colorCode: PostItColor;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MultiLanguageContent {
  [key in SupportedLanguage]?: string;
}

export interface PostItEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  label?: Partial<MultiLanguageContent>;
}

export interface ADHDPostItNote {
  id: string;
  color: PostItColor;
  status: PostItStatus;
  translations: Partial<MultiLanguageContent>;
  cognitiveLoad: CognitiveLoad;
  estimatedMinutes: number;
  isBlocked: boolean;
  scheduledSlot?: {
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    startHour: number;
    durationMinutes: number;
  };
  zIndex: number;
  clusterId?: string;
  zoneId?: string;
}
