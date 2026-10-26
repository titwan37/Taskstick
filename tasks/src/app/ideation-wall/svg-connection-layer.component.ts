import { Component, Input, OnInit, OnDestroy, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostItEdge, PostItStatus } from '../models/postit.model';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-svg-connection-layer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './svg-connection-layer.component.html',
  styleUrls: ['./svg-connection-layer.component.scss']
})
export class SvgConnectionLayerComponent implements OnInit, OnDestroy {
  @Input() notes: Signal<PostItEdge[]> = () => [];
  @Input() edges: Signal<PostItEdge[]> = () => [];

  private subscriptions: Subscription[] = [];

  constructor(private storeService: TaskstickStoreService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.storeService.notes.subscribe(() => {
        // Trigger redraw if notes change (though input is already reactive, this ensures sync)
      }),
      this.storeService.edges.subscribe(() => {
        this.renderEdges();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  renderEdges(): void {
    const edgeList = this.edges();
    
    // Group edges by type for styling
    const dependsOnEdges = edgeList.filter(e => e.type === 'depends_on');
    const constrainsEdges = edgeList.filter(e => e.type === 'constrains');
    const synergyEdges = edgeList.filter(e => e.type === 'synergy');

    // Generate SVG paths for each type
    const svgPaths = [
      ...this.generatePaths(dependsOnEdges, '#FF6B6B', true), // Solid red/coral with arrowhead
      ...this.generatePaths(constrainsEdges, '#FFD93D', false), // Dashed amber
      ...this.generatePaths(synergyEdges, '#00CED1', false)  // Dotted cyan
    ];

    // Generate lock overlays for blocked nodes (simplified: check if node has incoming edges from open status)
    const lockOverlays = this.renderLockOverlays();

    // Construct the SVG string
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800">`;
    
    svgContent += '<defs>';
    svgContent += '<marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#FF6B6B" /></marker>';
    svgContent += '</defs>';

    svgContent += '<g id="edges">';
    svgPaths.forEach(path => {
      svgContent += path;
    });
    svgContent += '</g>';

    svgContent += '<g id="locks">';
    lockOverlays.forEach(lock => {
      svgContent += lock;
    });
    svgContent += '</g>';

    svgContent += '</svg>';
  }

  private generatePaths(edges: PostItEdge[], color: string, isArrowhead: boolean): string[] {
    return edges.map(edge => {
      const sourceNote = this.storeService.notes().find(n => n.id === edge.sourceId);
      const targetNote = this.storeService.notes().find(n => n.id === edge.targetId);

      if (!sourceNote || !targetNote) return '';

      // Calculate coordinates based on note positions (assuming a grid or calculated layout)
      // In a real app, you'd use a layout algorithm. Here we assume fixed positions for demo.
      const sourceX = this.getNoteX(sourceNote.id);
      const sourceY = this.getNoteY(sourceNote.id);
      const targetX = this.getNoteX(targetNote.id);
      const targetY = this.getNoteY(targetNote.id);

      // Cubic Bézier curve: source right to target left
      const startX = sourceX + 50;
      const startY = sourceY + 20;
      const endX = targetX - 50;
      const endY = targetY + 20;
      
      // Control points for cubic bezier (M x1 y1 C cp1x cp1y cp2x cp2y x2 y2)
      const cp1x = startX + (endX - startX) * 0.5;
      const cp1y = startY + (endY - startY) * 0.5;
      const cp2x = endX - (endX - startX) * 0.5;
      const cp2y = endY + (endY - startY) * 0.5;

      let pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

      if (isArrowhead) {
        pathData += ' L 0 0'; // Add arrowhead logic here if needed, or use marker
        // For simplicity in SVG text, we'll just draw the line and assume a marker is applied via CSS or an external library
        // Here we simulate the arrowhead by extending the path slightly or using a polygon.
        // Let's use a simple polygon at the end for clarity in this standalone component.
        const angle = Math.atan2(endY - cp2y, endX - cp2x);
        const headLen = 10;
        const h1 = Math.cos(angle) * headLen;
        const h2 = Math.sin(angle) * headLen;
        pathData += ` L ${endX + h1} ${endY + h2} L ${endX - h1} ${endY + h2} Z`;
      }

      return `<path d="${pathData}" stroke="${color}" stroke-width="3" fill="none" />`;
    });
  }

  private renderLockOverlays(): string[] {
    const notes = this.storeService.notes();
    const edges = this.edges();
    
    // Identify blocked nodes (nodes that are targets of open notes)
    const blockedIds = new Set<number>();
    edges.forEach(edge => {
      if (this.isNoteOpen(notes.find(n => n.id === edge.sourceId))) {
        blockedIds.add(edge.targetId);
      }
    });

    return Array.from(blockedIds).map(id => {
      const note = notes.find(n => n.id === id);
      if (!note) return '';
      
      const x = this.getNoteX(id);
      const y = this.getNoteY(id);
      
      return `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" fill="rgba(255,255,255,0.8)" stroke="#333" stroke-width="1"/>`;
    });
  }

  private isNoteOpen(note: any): boolean {
    return note && note.status === PostItStatus.open;
  }

  private getNoteX(id: number): number {
    // Placeholder for actual layout logic. 
    // Assuming a simple grid or calculated position based on ID for demonstration.
    // In production, this would come from a layout service.
    return (id % 5) * 100 + 50;
  }

  private getNoteY(id: number): number {
    return Math.floor(id / 5) * 100 + 50;
  }
}
