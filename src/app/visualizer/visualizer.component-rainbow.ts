import { Component, Input, AfterViewInit, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import mermaid from 'mermaid';
import { CommonModule } from '@angular/common';
import panzoom, { PanZoom } from 'panzoom';

@Component({
  selector: 'app-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viz-wrapper">
      <div #graph class="viz-canvas"></div>
      <div class="controls" *ngIf="diagram.trim()">
        <button (click)="exportMMD()" title="Export Mermaid (.mmd)">.MMD</button>
        <button (click)="exportPNG()" title="Export PNG image">.PNG</button>
        <button (click)="exportSVG()" title="Export SVG image">.SVG</button>
        <button (click)="resetZoom()" title="Reset View">Reset View</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; width: 100%; height: 100%; }
    .viz-wrapper { position: relative; flex: 1; width: 100%; overflow: hidden; background: var(--viz-bg, #09090b) !important; border-radius: 8px; }
    .viz-canvas { width: 100%; height: 100%; cursor: grab; }
    .viz-canvas:active { cursor: grabbing; }
    .controls { position: absolute; bottom: 12px; right: 12px; z-index: 10; display: flex; gap: 8px; }
    .controls button { 
      background: rgba(18, 18, 24, 0.75); color: #fff; border: 1px solid rgba(255,255,255,0.15); 
      padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 11px;
      backdrop-filter: blur(10px); transition: all 0.2s ease; font-weight: 600;
    }
    .controls button:hover { background: #ff2a85; color: #fff; border-color: #ff2a85; box-shadow: 0 0 12px rgba(255,42,133,0.5); }
  `]
})
export class VisualizerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() diagram: string = '';
  @Input() mode: string = '';
  @Input() dark: boolean = true;
  @ViewChild('graph', { static: true }) graph!: ElementRef<HTMLDivElement>;
  private pz?: PanZoom;

  ngAfterViewInit() {
    this.initMermaid();
    this.render();
  }

  private initMermaid() {
    // VIBRANT RAINBOW PALETTE (Hue spectrum across branch indices / levels)
    const rainbowColors = [
      '#FF0055', '#FF5E00', '#FFAA00', '#AEEA00',
      '#00E676', '#00B0FF', '#2979FF', '#651FFF',
      '#AA00FF', '#F50057'
    ];

    const themeVars: Record<string, any> = {
      darkMode: this.dark,
      background: 'transparent',
      lineColor: this.dark ? '#ffffff55' : '#1e293b88',
      textColor: this.dark ? '#ffffff' : '#0f172a',
      nodeTextColor: this.dark ? '#ffffff' : '#0f172a',
      titleColor: this.dark ? '#ff007f' : '#d90429',
      clusterBkg: this.dark ? '#121218' : '#f8fafc',
      clusterBorder: this.dark ? '#ff007f' : '#6366f1',
    };

    // Populate branch scales with vivid neon colors
    rainbowColors.forEach((color, i) => {
      themeVars[`cScale${i}`] = color;
    });

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      look: this.dark ? 'neo' : 'handDrawn',
      securityLevel: 'loose',
      fontFamily: '"Chalkboard SE", "Comic Sans MS", "Caveat", "Segoe Print", cursive',
      themeVariables: themeVars
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dark'] || changes['mode']) {
      this.initMermaid();
    }
    this.render();
  }

  ngOnDestroy() {
    this.pz?.dispose();
  }

  private async render() {
    const container = this.graph?.nativeElement;
    if (!container || !this.diagram?.trim()) {
      container.innerHTML = `<div style="color:#888; padding:2rem; text-align:center;">[${this.mode.toUpperCase()}] Ready.</div>`;
      this.pz?.dispose();
      return;
    }

    const full = this.mode === 'kanban'
      ? this.getKanbanDiagram()
      : `${this.getHeader()}\n${this.getIndentedContent()}`;

    try {
      const id = `dsvg-${this.mode}-${Math.floor(Math.random() * 1000000)}`;
      const { svg } = await mermaid.render(id, full);
      this.pz?.dispose();
      container.innerHTML = svg;

      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.maxWidth = 'none';
        this.pz = panzoom(svgEl, { maxZoom: 5, minZoom: 0.1 });

        // INJECT VIBRANT LEVEL-GRADUATED CSS OVERRIDES FOR MINDMAPS
        this.applyMindmapRainbowGraduation(svgEl);
      }
    } catch (e) {
      console.error(`[DEBUG] Mermaid Render Error:`, e);
      container.innerHTML = `<div style="color:#ff3366; border:1px solid #ff3366; padding:12px; border-radius:6px;">ERR: ${(e as any).message}</div>`;
    }
  }

  /**
   * Applies rainbow graduated styles based on node depth levels (Depth 0, 1, 2, 3...)
   * Works smoothly across Light & Dark modes!
   */
  private applyMindmapRainbowGraduation(svgEl: SVGSVGElement) {
    // Hue sequence around the 360° color wheel per depth level
    // L0 = Hot Pink/Red (0deg), L1 = Orange/Gold (45deg), L2 = Lime/Green (120deg), L3 = Cyan/Blue (200deg), etc.
    const levelHues = [340, 30, 90, 170, 220, 270, 310];

    let styleRules = `
      svg text, svg foreignObject div, svg span {
        font-weight: 700 !important;
        transition: all 0.3s ease;
      }
    `;

    // Generate depth-based rainbow CSS rules
    levelHues.forEach((hue, level) => {
      // Dark Mode: Deep saturated backgrounds + neon bright stroke + white text
      // Light Mode: Soft pastel tinted backgrounds + rich vivid stroke + dark text
      const bgLightness = this.dark ? '18%' : '88%';
      const bgSat = this.dark ? '85%' : '90%';
      const strokeLightness = this.dark ? '60%' : '40%';
      const textColor = this.dark ? '#ffffff' : '#09090b';

      const bg = `hsl(${hue}, ${bgSat}, ${bgLightness})`;
      const stroke = `hsl(${hue}, 95%, ${strokeLightness})`;
      const shadow = `hsla(${hue}, 100%, 50%, ${this.dark ? '0.4' : '0.2'})`;

      const selectorPrefix = level === 0
        ? 'svg .mindmap-node--root, svg .node-depth-0'
        : `svg .node-depth-${level}, svg .section-${level - 1}`;

      styleRules += `
        ${selectorPrefix} rect,
        ${selectorPrefix} circle,
        ${selectorPrefix} polygon,
        ${selectorPrefix} path,
        ${selectorPrefix} foreignObject div {
          fill: ${bg} !important;
          background-color: ${bg} !important;
          stroke: ${stroke} !important;
          stroke-width: ${level === 0 ? '3px' : '2px'} !important;
          filter: drop-shadow(0px 4px 10px ${shadow}) !important;
          color: ${textColor} !important;
        }

        ${selectorPrefix} text,
        ${selectorPrefix} span,
        ${selectorPrefix} div {
          fill: ${textColor} !important;
          color: ${textColor} !important;
        }

        ${selectorPrefix} path.mindmap-edge {
          stroke: ${stroke} !important;
          stroke-width: ${Math.max(4 - level, 2)}px !important;
        }
      `;
    });

    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = styleRules;
    svgEl.prepend(styleEl);

    // Dynamic Javascript fallback targeting nodes by depth if SVG classing differs
    const allMindmapNodes = svgEl.querySelectorAll('g.mindmap-node, g.node');
    allMindmapNodes.forEach((node) => {
      // Find level class or determine depth
      const cls = node.getAttribute('class') || '';
      let level = 1;

      if (cls.includes('mindmap-node--root') || cls.includes('depth-0')) level = 0;
      else if (cls.includes('depth-1')) level = 1;
      else if (cls.includes('depth-2')) level = 2;
      else if (cls.includes('depth-3')) level = 3;
      else if (cls.includes('depth-4')) level = 4;

      const hue = levelHues[level % levelHues.length];
      const bg = `hsl(${hue}, ${this.dark ? '85%' : '90%'}, ${this.dark ? '18%' : '88%'})`;
      const stroke = `hsl(${hue}, 95%, ${this.dark ? '60%' : '40%'})`;
      const textColor = this.dark ? '#ffffff' : '#0f172a';

      const shapes = node.querySelectorAll('rect, circle, polygon, path, div');
      shapes.forEach((s: any) => {
        s.style.setProperty('fill', bg, 'important');
        s.style.setProperty('background-color', bg, 'important');
        s.style.setProperty('stroke', stroke, 'important');
        s.style.setProperty('color', textColor, 'important');
      });
    });
  }

  // Helper Methods
  private getHeader(): string {
    switch (this.mode) {
      case 'kanban': return 'kanban\n  Todo';
      case 'mindmap': return 'mindmap\n  root((Work Log))';
      case 'ishikawa': return 'ishikawa-beta\n  Done';
      default: return 'graph TD';
    }
  }

  private getIndentedContent(): string {
    return (this.diagram || '').split('\n')
      .map(l => `    ${(l || '').replace(/^(task:|event:|email:)\s*/, '')}`)
      .join('\n');
  }

  private getKanbanDiagram(): string {
    const lines = (this.diagram || '').split('\n');
    const standardColumns = ['Todo', 'Pending', 'Enqueued', 'Done', 'Delayed'];
    const columns: { [key: string]: string[] } = {};
    for (const col of standardColumns) columns[col] = [];

    let currentColumn = 'Todo';

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const hasIndentation = line.startsWith(' ') || line.startsWith('\t');

      if (!hasIndentation) {
        const lower = trimmed.toLowerCase();
        let matched = false;
        for (const col of standardColumns) {
          if (lower.includes(col.toLowerCase())) {
            currentColumn = col;
            matched = true;
            break;
          }
        }

        if (!matched) {
          let colName = trimmed;
          const bracketMatch = trimmed.match(/\[([^\]]+)\]/);
          if (bracketMatch) colName = bracketMatch[1];
          currentColumn = colName;
          if (!columns[currentColumn]) columns[currentColumn] = [];
        }
      } else {
        const cleaned = trimmed.replace(/^(task:|event:|email:)\s*/, '');
        if (cleaned) columns[currentColumn].push(cleaned);
      }
    }

    let out = 'kanban\n';
    const allColKeys = Array.from(new Set([...standardColumns, ...Object.keys(columns)]));
    for (const col of allColKeys) {
      const tasks = columns[col] || [];
      out += `${col}\n`;
      for (const t of tasks) out += `    ${t}\n`;
    }
    return out;
  }

  resetZoom() { this.pz?.moveTo(0, 0); this.pz?.zoomAbs(0, 0, 1); }

  exportMMD() {
    const full = this.mode === 'kanban'
      ? this.getKanbanDiagram()
      : `${this.getHeader()}\n${this.getIndentedContent()}`;
    this.downloadFile(full, `taskstick-${this.mode}.mmd`, 'text/plain');
  }

  exportSVG() {
    const svgElement = this.graph.nativeElement.querySelector('svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElement);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
      this.downloadFile(source, `taskstick-${this.mode}.svg`, 'image/svg+xml');
    }
  }

  exportPNG() {
    const svgElement = this.graph.nativeElement.querySelector('svg');
    if (!svgElement) return;

    const bbox = svgElement.getBBox();
    const width = svgElement.viewBox?.baseVal?.width || bbox.width || 800;
    const height = svgElement.viewBox?.baseVal?.height || bbox.height || 600;

    const canvas = document.createElement('canvas');
    const scale = window.devicePixelRatio || 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
      source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) {
      source = source.replace('<svg', '<svg xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    }

    const svgBase64 = btoa(unescape(encodeURIComponent(source)));
    const url = `data:image/svg+xml;base64,${svgBase64}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      ctx.fillStyle = this.dark ? '#09090b' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `taskstick-${this.mode}.png`;
        downloadLink.click();
      } catch (err) {
        console.error("Canvas is tained: ", err);
      }
    };

    img.src = url;
  }

  private downloadFile(content: string, fileName: string, contentType: string) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}