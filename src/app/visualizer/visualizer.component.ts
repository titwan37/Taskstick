// src/app/visualizer/visualizer.component.ts
import { Component, Input, AfterViewInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import mermaid from 'mermaid';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `<div #graph class="viz-canvas"></div>`,
  styles: [`
    .viz-canvas { width: 100%; min-height: 350px; background: #0a0a0a; border: 1px solid #444; }
  `]
})
export class VisualizerComponent implements AfterViewInit, OnChanges {
  @Input() diagram: string = '';
  @Input() mode: string = '';

  @ViewChild('graph', { static: true }) graph!: ElementRef<HTMLDivElement>;

  ngAfterViewInit() {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    this.render();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.render();
  }

  private async render() {
    const container = this.graph?.nativeElement;
    if (!container) return;

    // 1. Determine Radical
    let header = 'graph TD';
    switch (this.mode) {
      case 'kanban': header = 'kanban\n  Todo'; break;
      case 'mindmap': header = 'mindmap\n  root((Work Log))'; break;
      case 'ishikawa': header = 'ishikawa\n  Done'; break;
      default: console.warn('[DEBUG] Unknown mode, falling back to graph TD:', this.mode);
    }

    // 2. Process Content
    const raw = this.diagram || '';
    const indented = raw.split('\n').map(l => `    ${(l || '').replace(/^(task:|event:|email:)\s*/, '')}`).join('\n');

    // 3. Assemble
    const full = `${header}\n${indented}`;

    console.group(`[DEBUG] Render: ${this.mode}`);
    console.log('Header:', header);
    console.log('Full Diagram Text Sent to Mermaid:\n', full);
    console.groupEnd();

    if (!raw.trim()) {
      container.innerHTML = `<div style="color:#555; padding:2rem; text-align:center;">[${this.mode.toUpperCase()}] Ready.</div>`;
      return;
    }

    try {
      const { svg } = await mermaid.render(`svg-${this.mode}-${Math.random()}`, full);
      container.innerHTML = svg;
    } catch (e) {
      console.error(`[DEBUG] Mermaid Render Error in ${this.mode}:`, e);
      container.innerHTML = `<div style="color:red; border:1px solid red; padding:5px;">ERR: ${(e as any).message}</div>`;
    }
  }
}
