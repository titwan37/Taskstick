// src/app/services/graph-mermaid-serializer.service.ts
import { Injectable } from '@angular/core';
import { ADHDPostItNote, PostItEdge, PostItColor } from '../models/taskstick-graph.model';

@Injectable({ providedIn: 'root' })
export class GraphMermaidSerializerService {

  /**
   * Generates clean Mermaid Mindmap syntax from graph notes and edges.
   */
  serializeToMindmap(notes: ADHDPostItNote[], edges: PostItEdge[], rootTitle = 'Atelier Idées'): string {
    if (notes.length === 0) {
      return `mindmap\n  root((${rootTitle}))\n    (Nouvelle idée)`;
    }

    const lines: string[] = ['mindmap', `  root((${this.sanitize(rootTitle)}))`];

    // Group notes by color or by parent/child edges
    const colors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
    const notesByColor: Record<string, ADHDPostItNote[]> = {};

    for (const n of notes) {
      if (!notesByColor[n.color]) notesByColor[n.color] = [];
      notesByColor[n.color].push(n);
    }

    for (const color of colors) {
      const list = notesByColor[color];
      if (!list || list.length === 0) continue;

      lines.push(`    ::icon(fa fa-folder) ${color.toUpperCase()}`);
      for (const note of list) {
        const marker = note.status === 'open' ? '⭕' : (note.status === 'done_cross' ? '❌' : '✓');
        lines.push(`      ${this.sanitize(marker + ' ' + note.title)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generates clean Mermaid Kanban syntax.
   */
  serializeToKanban(notes: ADHDPostItNote[]): string {
    const lines: string[] = ['kanban'];

    const todoNotes = notes.filter(n => n.status === 'open' && !n.isBlocked);
    const blockedNotes = notes.filter(n => n.status === 'open' && n.isBlocked);
    const doneNotes = notes.filter(n => n.status !== 'open');

    lines.push('  Todo');
    if (todoNotes.length === 0) lines.push('    [Aucune tâche]');
    for (const n of todoNotes) {
      lines.push(`    [${this.sanitize(n.title)}]`);
    }

    lines.push('  Blocked (Dépendances)');
    if (blockedNotes.length === 0) lines.push('    [Aucun blocage]');
    for (const n of blockedNotes) {
      lines.push(`    [🔒 ${this.sanitize(n.title)}]`);
    }

    lines.push('  Done');
    if (doneNotes.length === 0) lines.push('    [Rien de terminé]');
    for (const n of doneNotes) {
      const m = n.status === 'done_check' ? '✓' : '❌';
      lines.push(`    [${m} ${this.sanitize(n.title)}]`);
    }

    return lines.join('\n');
  }

  /**
   * Generates Mermaid Fishbone (Ishikawa) diagram syntax.
   */
  serializeToFishbone(notes: ADHDPostItNote[], problemTitle = 'Projet & Objectifs'): string {
    const lines: string[] = [
      'graph LR',
      `  Problem["🎯 ${this.sanitize(problemTitle)}"]`
    ];

    const colors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
    colors.forEach((color, idx) => {
      const matching = notes.filter(n => n.color === color);
      if (matching.length > 0) {
        const boneId = `Bone_${idx}`;
        lines.push(`  ${boneId}["📂 ${color.toUpperCase()}"] --> Problem`);
        matching.forEach((n, nIdx) => {
          const subId = `Sub_${idx}_${nIdx}`;
          const m = n.status === 'open' ? '⭕' : '✓';
          lines.push(`  ${subId}["${m} ${this.sanitize(n.title)}"] --> ${boneId}`);
        });
      }
    });

    return lines.join('\n');
  }

  private sanitize(str: string): string {
    return str.replace(/["\n\r\[\]\(\)]/g, ' ').trim();
  }
}
