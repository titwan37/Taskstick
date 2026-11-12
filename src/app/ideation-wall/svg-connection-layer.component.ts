// src/app/ideation-wall/svg-connection-layer.component.ts
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { PostItEdge, ADHDPostItNote, RelationType } from '../models/taskstick-graph.model';

export interface ConnectorPort {
  noteId: string;
  x: number;
  y: number;
  side: 'left' | 'right';
}

@Component({
  selector: 'app-svg-connection-layer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="svg-layer" [attr.width]="width" [attr.height]="height">
      <defs>
        <!-- Arrowhead for depends_on (Coral / Red) -->
        <marker id="arrow-depends" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
        </marker>

        <!-- Arrowhead for constrains (Amber / Gold) -->
        <marker id="arrow-constrains" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
        </marker>

        <!-- Arrowhead for synergy (Cyan / Blue) -->
        <marker id="arrow-synergy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
        </marker>
      </defs>

      <!-- Existing Logical Edges -->
      <g *ngFor="let edge of store.edges()">
        <path
          [attr.d]="computeBezierPath(edge)"
          class="edge-path"
          [class.is-critical-flow]="isCriticalEdge(edge)"
          [attr.data-type]="edge.type"
          [attr.marker-end]="getMarkerEnd(edge.type)"
          (click)="onEdgeClick(edge, $event)"
        />
      </g>

      <!-- Interactive Temporary Drawing Line -->
      <path
        *ngIf="drawingLine"
        [attr.d]="drawingLine"
        class="drawing-temp-line"
      />
    </svg>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    }

    .svg-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      overflow: visible;
    }

    .edge-path {
      fill: none;
      stroke-width: 2.5px;
      pointer-events: stroke;
      cursor: pointer;
      transition: stroke-width 0.15s;
    }
    .edge-path:hover {
      stroke-width: 4.5px;
    }

    /* Edge Types Differentiation */
    .edge-path[data-type='depends_on'] {
      stroke: #f43f5e;
    }
    .edge-path[data-type='constrains'] {
      stroke: #f59e0b;
      stroke-dasharray: 6, 4;
    }
    .edge-path[data-type='synergy'] {
      stroke: #06b6d4;
      stroke-dasharray: 2, 4;
    }
    .edge-path[data-type='parent_of'] {
      stroke: #a855f7;
      stroke-width: 3px;
    }

    .drawing-temp-line {
      fill: none;
      stroke: #ff7700;
      stroke-width: 2.5px;
      stroke-dasharray: 4, 4;
    }

    .edge-path.is-critical-flow {
      stroke-width: 4px !important;
      stroke-dasharray: 10, 6 !important;
      animation: criticalFlowPulse 0.9s linear infinite;
      filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.75));
    }

    @keyframes criticalFlowPulse {
      from { stroke-dashoffset: 32; }
      to   { stroke-dashoffset: 0; }
    }

  `]
})
export class SvgConnectionLayerComponent {
  @Input() width = 6000;
  @Input() height = 6000;
  @Input() drawingLine: string | null = null;
  @Output() edgeDeleted = new EventEmitter<string>();

  store = inject(TaskstickStoreService);

  computeBezierPath(edge: PostItEdge): string {
    const notesMap = new Map(this.store.notes().map(n => [n.id, n]));
    const source = notesMap.get(edge.sourceId);
    const target = notesMap.get(edge.targetId);

    if (!source || !target) return '';

    // Anchor source right center: (x + width, y + height/2)
    const sWidth = source.size?.width || (source.tags?.includes('sous-tâche') ? 160 : 190);
    const sHeight = source.size?.height || (source.tags?.includes('sous-tâche') ? 125 : 160);
    const sx = source.position.x + sWidth;
    const sy = source.position.y + sHeight / 2;

    // Anchor target left center: (x, y + height/2)
    const tHeight = target.size?.height || (target.tags?.includes('sous-tâche') ? 125 : 160);
    const tx = target.position.x;
    const ty = target.position.y + tHeight / 2;

    const dx = Math.abs(tx - sx) * 0.5;
    const cx1 = sx + Math.max(dx, 40);
    const cy1 = sy;
    const cx2 = tx - Math.max(dx, 40);
    const cy2 = ty;

    return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
  }

  getMarkerEnd(type: RelationType): string {
    switch (type) {
      case 'depends_on': return 'url(#arrow-depends)';
      case 'constrains': return 'url(#arrow-constrains)';
      case 'synergy': return 'url(#arrow-synergy)';
      default: return 'url(#arrow-depends)';
    }
  }

  onEdgeClick(edge: PostItEdge, event: MouseEvent) {
    event.stopPropagation();
    if (confirm(`Supprimer le lien ${edge.type} entre ces deux tâches ?`)) {
      this.store.deleteEdge(edge.id);
      this.edgeDeleted.emit(edge.id);
    }
  }

  isCriticalEdge(edge: PostItEdge): boolean {
    const rootNotes = this.store.rootActionableNotes();
    const topStart = rootNotes.length > 0 ? rootNotes[0] : null;
    const focusNote = this.store.activeFocusNote();
    const activeId = focusNote?.id || topStart?.id;
    if (!activeId) return false;
    return edge.sourceId === activeId || edge.targetId === activeId;
  }
}
