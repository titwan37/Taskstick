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
    .viz-wrapper { position: relative; flex: 1; width: 100%; overflow: hidden; background: var(--viz-bg, #050505) !important; border-radius: 4px; }
    .viz-canvas { width: 100%; height: 100%; cursor: grab; }
    .viz-canvas:active { cursor: grabbing; }
    .controls { position: absolute; bottom: 12px; right: 12px; z-index: 10; display: flex; gap: 8px; }
    .controls button { 
      background: rgba(89, 79, 79, 0.7); color: #aaa; border: 1px solid #333; 
      padding: 4px 12px; border-radius: 20px; cursor: pointer; font-size: 11px;
      backdrop-filter: blur(8px); transition: all 0.2s ease;
      font-weight: 600;
    }
    .controls button:hover { background: #ff7700; color: #000; border-color: #ff7700; }
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
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      look: this.dark ? 'neo' : 'handDrawn',
      securityLevel: 'loose',
      fontFamily: '"Chalkboard SE", "Comic Sans MS", "Caveat", "Segoe Print", cursive',
      themeVariables: {
        darkMode: this.dark,
        background: 'transparent',
        // Node and Edge defaults
        lineColor: this.dark ?  '#333333': '#afafaf',
        // FISHBONE GOLDEN TRICK
        textColor: this.dark ? '#d1960a' : '#333333',
        // Specific node backgrounds for dark mode visibility
        // 1. Set the global node background (the "Head" of the fish / Root of Mindmap)
        nodeBorder: this.dark ? '#666666' : '#b6b6ff',
        nodeBkg: this.dark ? '#cc0000' : '#ffffff', // Slightly darker red for better dark-mode viewing
        // 2. THE FIX: Force White text in dark mode for contrast!
        // 2. Set the text color for the main tile (Black or Royal Blue)
        nodeTextColor: this.dark ? '#ffffff' : '#1f18e4',
        titleColor: this.dark ? 'rgb(250, 147, 147)' : '#501212',
        clusterBkg: this.dark ? '#2a2a2aff' : '#f9f9f9',
        clusterBorder: this.dark ? '#3fa617' : '#ccc',
        // BRANCH COLORS (The Magic Sauce)
        // These will be applied to the lines and borders of the main branches
        cScale0: '#FF5555', // Vibrant Coral/Red
        cScale1: '#50FA7B', // Bright Green
        cScale2: '#8BE9FD', // Bright Cyan
        cScale3: '#F1FA8C', // Bright Yellow
        cScale4: '#FF79C6', // Hot Pink
        cScale5: '#BD93F9', // Neon Purple
        cScale6: '#FFB86C', // Neon Orange
        cScale7: '#FF92DF', // Light Pink
        cScale8: '#4FFFB0', // Aquamarine
        cScale9: '#FFFF7E', // Laser Lemon
        // Mindmap specific
        cScale10: '#7E99FF', // Periwinkle
        cScale11: '#B5FFAD', // Mint
        
        cScale12: '#ffff33', // Bright Yellow
        cScale13: '#33ffff', // Bright Cyan
        cScale14: '#ff9933', // Bright Orange
        cScale15: '#9933ff', // Bright Purple
        cScale16: '#33ff99', // Bright Spring Green

        // Mindmap branch colors (Neon Palette)
        cScale17: '#ff3333', // Bright Red
        cScale18: '#33ff33', // Bright Green
        cScale19: '#3333ff', // Bright Blue

        cScale20: '#99ff33', // Bright Lime
        cScale21: '#ff33ff', // Bright Magenta
        cScale22: '#3399ff', // Bright Sky Blue
        cScale23: '#ff3399', // Bright Pink
      }
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
      container.innerHTML = `<div style="color:#555; padding:2rem; text-align:center;">[${this.mode.toUpperCase()}] Ready.</div>`;
      this.pz?.dispose();
      return;
    }

    const full = `${this.getHeader()}\n${this.getIndentedContent()}`;

    try {
      const id = `dsvg-${this.mode}-${Math.floor(Math.random() * 1000000)}`;
      const { svg } = await mermaid.render(id, full);
      this.pz?.dispose();
      container.innerHTML = svg;

      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        this.pz = panzoom(svgEl, { maxZoom: 5, minZoom: 0.1 });

        // THE SLEDGEHAMMER FIX (Contrast-Optimized Edition)
        console.info('[DEBUG] SVG element found.');
        // THE SLEDGEHAMMER FIX (High-Contrast Edition)
        const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = `
          /* 1. FORCE ROOT TEXT TO WHITE */
          .mermaid svg .mindmap-node--root text,
          .mermaid svg .mindmap-node--root foreignObject div,
          .mermaid svg .mindmap-node--root span,
          .mermaid svg text.title {
              fill: #ffffff !important;
              color: #ffffff !important;
              font-weight: 900 !important;
          }

          /* 2. BRANCH TEXT: Crisp White in Dark Mode, Dark in Light Mode */
          .mermaid svg .mindmap-node:not(.mindmap-node--root) text,
          .mermaid svg .mindmap-node:not(.mindmap-node--root) foreignObject div,
          .mermaid svg .mindmap-node:not(.mindmap-node--root) span {
              fill: ${this.dark ? '#ffffff' : '#333333'} !important;
              color: ${this.dark ? '#ffffff' : '#333333'} !important;
              font-weight: bold !important;
          }

          /* 3. BRANCH SHAPES: Dark Grey backgrounds so the white text pops */
          .mermaid svg .mindmap-node:not(.mindmap-node--root) rect,
          .mermaid svg .mindmap-node:not(.mindmap-node--root) polygon,
          .mermaid svg .mindmap-node:not(.mindmap-node--root) path {
              fill: ${this.dark ? '#222222' : 'inherit'} !important; 
              stroke: ${this.dark ? '#555555' : 'inherit'} !important;
          }

          /* 4. ROOT SHAPES: Red Background */
          .mermaid svg .mindmap-node--root rect,
          .mermaid svg .mindmap-node--root circle,
          .mermaid svg rect.component {
              fill: ${this.dark ? '#cc0000' : '#ff0000'} !important; 
              stroke: ${this.dark ? '#ffffff' : '#333333'} !important;
          }
        `;
        svgEl.prepend(style);
      }
    } catch (e) {
      console.error(`[DEBUG] Mermaid Render Error:`, e);
      container.innerHTML = `<div style="color:red; border:1px solid red; padding:5px;">ERR: ${(e as any).message}</div>`;
    }
  }

  // Helper Methods
  private getHeader(): string {
      console.info('[DEBUG] Mermaid mode:', this.mode);
      // THE MAGIC SAUCE: Different headers for different diagram types
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

  resetZoom() { this.pz?.moveTo(0, 0); this.pz?.zoomAbs(0, 0, 1); }

  exportMMD() {
    const full = `${this.getHeader()}\n${this.getIndentedContent()}`;
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

      // CRITICAL FIX: Inject namespaces required by <foreignObject> to prevent canvas tainting
      if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
        source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) {
        source = source.replace('<svg', '<svg xmlns:xhtml="http://www.w3.org/1999/xhtml"');
      }

      // Convert SVG directly to Base64 to bypass Blob origin restrictions
      const svgBase64 = btoa(unescape(encodeURIComponent(source)));
      const url = `data:image/svg+xml;base64,${svgBase64}`;

      const img = new Image();
      img.crossOrigin = 'anonymous'; // Important for CORS

      img.onload = () => {
        ctx.fillStyle = this.dark ? '#050505' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `taskstick-${this.mode}.png`;
          downloadLink.click();
        } catch (err) {
          console.error("Canvas is still tainted: ", err);
          alert("Browser security blocked PNG export due to HTML inside the SVG. Please use SVG export.");
        }
      };

    img.onerror = (err) => {
      console.error('PNG Export failed to load SVG image', err);
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