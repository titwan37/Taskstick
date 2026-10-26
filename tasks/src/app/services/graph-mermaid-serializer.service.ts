import { Injectable, signal } from '@angular/core';
import { PostItNote, PostItEdge } from '../models/postit.model';
import { TaskstickStoreService } from './taskstick-store.service';

@Injectable({
  providedIn: 'root'
})
export class GraphMermaidSerializerService {
  private notesSignal = signal<PostItNote[]>([]);
  private edgesSignal = signal<PostItEdge[]>([]);

  constructor(private storeService: TaskstickStoreService) {
    this.notesSignal = this.storeService.notes;
    this.edgesSignal = this.storeService.edges;
  }

  generateMermaidDiagram(layoutType: 'mindmap' | 'kanban' | 'ishikawa-beta'): string {
    const notes = this.notesSignal();
    const edges = this.edgesSignal();

    if (notes.length === 0) return '';

    let mermaidCode = '';

    switch (layoutType) {
      case 'mindmap':
        mermaidCode = this.generateMindMap(notes, edges);
        break;
      case 'kanban':
        mermaidCode = this.generateKanban(notes, edges);
        break;
      case 'ishikawa-beta':
        mermaidCode = this.generateIshikawaBeta(notes, edges);
        break;
      default:
        mermaidCode = this.generateMindMap(notes, edges);
    }

    return mermaidCode;
  }

  private generateMindMap(notes: PostItNote[], edges: PostItEdge[]): string {
    const rootId = notes[0]?.id || 'root';
    let graph = `graph TD`;
    graph += `\n`;
    
    // Define nodes with IDs
    notes.forEach(note => {
      graph += `\n    ${note.id}[${note.text}]`;
    });

    // Define edges based on dependencies (simplified: source -> target)
    edges.forEach(edge => {
      if (edge.type === 'depends_on') {
        graph += `\n    ${edge.sourceId} -->|depends_on| ${edge.targetId}`;
      } else if (edge.type === 'constrains') {
        graph += `\n    ${edge.sourceId} -.->|constrains| ${edge.targetId}`;
      } else if (edge.type === 'synergy') {
        graph += `\n    ${edge.sourceId} <-->|synergy| ${edge.targetId}`;
      }
    });

    // Set root
    graph += `\n`;
    graph += `rootId(${rootId})`;

    return graph;
  }

  private generateKanban(notes: PostItNote[], edges: PostItEdge[]): string {
    const columns = ['To Do', 'In Progress', 'Done'];
    let graph = `graph TD`;
    graph += `\n`;

    // Group notes by status for Kanban
    const groupedNotes = new Map<string, PostItNote[]>();
    notes.forEach(note => {
      if (!groupedNotes.has(note.status)) {
        groupedNotes.set(note.status, []);
      }
      groupedNotes.get(note.status)!.push(note);
    });

    columns.forEach(col => {
      graph += `\n    subgraph ${col}[${col}]`;
      const colNotes = groupedNotes.get(col) || [];
      colNotes.forEach(note => {
        graph += `\n        ${note.id}(${note.text})`;
      });
      graph += ` end`;
    });

    // Add edges between columns if needed (e.g., moving from To Do to In Progress)
    // For simplicity, we just show the flow if 'depends_on' exists across statuses
    edges.forEach(edge => {
      const sourceStatus = notes.find(n => n.id === edge.sourceId)?.status;
      const targetStatus = notes.find(n => n.id === edge.targetId)?.status;
      
      if (sourceStatus && targetStatus) {
        graph += `\n    ${edge.sourceId} -->|depends_on| ${edge.targetId}`;
      }
    });

    return graph;
  }

  private generateIshikawaBeta(notes: PostItNote[], edges: PostItEdge[]): string {
    // Ishikawa (Fishbone) diagram structure
    let graph = `graph TD`;
    graph += `\n`;

    const rootId = 'root_issue';
    const categories = ['Methods', 'Materials', 'Manpower', 'Environment', 'Measurement'];
    
    // Draw the spine
    graph += `\n    ${rootId}[Main Issue]`;
    categories.forEach((cat, index) => {
      const catId = `cat_${index}`;
      graph += `\n    ${catId}[${cat}]`;
      graph += `\n    ${rootId} -->|causes| ${catId}`;
    });

    // Add sub-issues (notes) to categories
    notes.forEach(note => {
      const categoryIndex = Math.floor(Math.random() * 5); // Distribute randomly for demo
      const catId = `cat_${categoryIndex}`;
      graph += `\n    ${catId} -->|${note.text}| sub_issue`;
    });

    // Add dependencies as cross-links
    edges.forEach(edge => {
      if (edge.type === 'depends_on') {
        graph += `\n    ${edge.sourceId} -.->|linked to| ${edge.targetId}`;
      }
    });

    return graph;
  }
}
