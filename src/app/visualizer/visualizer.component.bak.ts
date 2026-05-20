// src/app/visualizer/visualizer.component.ts
import { Component, Input, AfterViewInit, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import mermaid from 'mermaid';
import { CommonModule } from '@angular/common';
import panzoom, { PanZoom } from 'panzoom';
import { text } from 'mermaid/dist/rendering-util/rendering-elements/shapes/text.js';

@Component({
  selector: 'app-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viz-wrapper">
      <div #graph class="viz-canvas"></div>
      <div class="controls" *ngIf="diagram.trim()">
        <button (click)="exportMMD()" title="Export Mermaid (.mmd)">.MMD</button>
        <!-- implement for getting a new png export functionality -->
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

    /* Force text color in hand-drawn mode */
    .mermaid svg g.root g.nodes g.node foreignObject div,
    .mermaid svg g.root g.nodes g.node text,
    .mermaid svg .node label,
    .mermaid svg .label text {
        color: #1825e3 !important; /* Your Royal Blue */
        fill: #1825e3 !important;
    }

    /* Specifically for the hand-drawn 'sketchy' text */
    [data-look="handDrawn"] text, 
    [data-look="handDrawn"] span {
        fill: #1825e3 !important;
        color: #1825e3 !important;
    }
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
      theme: 'base', // 'base' is required to use themeVariables effectively
      look: this.dark ? 'neo':'handDrawn',
      securityLevel: 'loose',
      fontFamily: '"Chalkboard SE", "Comic Sans MS", "Caveat", "Segoe Print", cursive',
      themeVariables: {
        darkMode: this.dark,
        background: 'transparent',

        // Node and Edge defaults
        lineColor: this.dark ?  '#333333': '#afafaf',
        textColor: this.dark ? '#d1960a' : '#333333',
        nodeBorder: this.dark ? '#666666' : '#b6b6ff',

        // Specific node backgrounds for dark mode visibility

        // 1. Set the global node background (the "Head" of the fish)
        nodeBkg: this.dark ? '#ff0000' : '#ffffff', // Your main tile color
        
        // 2. Set the text color for the main tile (Black or Royal Blue)
        nodeTextColor: this.dark ? '#1825e3' : '#1f18e4',

        clusterBkg: this.dark ? '#2a2a2aff' : '#f9f9f9',
        clusterBorder: this.dark ? '#ffffff' : '#ccc',

        titleColor: this.dark ? 'rgb(250, 147, 147)' : '#501212',

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

    // 4. Inject specific CSS to force branch text to stay light
    // In Fishbone, the main head uses .node text, 
    // but we can target the labels specifically for branches.
    // if (this.dark) {
    //     const style = document.createElement('style');
    //     style.innerHTML = `
    //         /* Target text inside the fishbone branches specifically */
    //         #graph-container svg .label text, 
    //         #graph-container svg .entity-label {
    //             fill: #ffffff !important; 
    //         }
    //         /* Ensure the main 'head' node stays black/blue */
    //         #graph-container svg .node text {
    //             fill: #000000 !important;
    //         }
    //     `;
    //     // Note: You may need to append this to the specific graph container
    //     this.graph.nativeElement.appendChild(style);
    // }

      // Remove existing styles first to avoid duplicates
      const style = document.createElement('style');
        style.innerHTML = `
            /* Target text inside the fishbone branches specifically */
            #graph-container svg .label text, 
            #graph-container svg .entity-label {
                fill: #ffffff !important; 
            }
            /* Ensure the main 'head' node stays black/blue */
            #graph-container svg .node text {
                fill: #000000 !important;
            }
        `;
        // Note: You may need to append this to the specific graph container
        this.graph.nativeElement.appendChild(style);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dark']) {
      this.initMermaid();
    }
    this.render();
  }

  ngOnDestroy() {
    this.pz?.dispose();
  }

  resetZoom() {
    this.pz?.moveTo(0, 0);
    this.pz?.zoomAbs(0, 0, 1);
  }

  exportMMD() {
    const full = `${this.getHeader()}\n${this.getIndentedContent()}`;
    this.downloadFile(full, `taskstick-${this.mode}.mmd`, 'text/plain');
  }

  exportPNG() {
    const svgElement = this.graph.nativeElement.querySelector('svg');
    if (!svgElement) return;

    // Create a clone to avoid modifying the displayed SVG
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    // Get dimensions from viewBox or bounding box
    const bbox = svgElement.getBBox();
    const width = svgElement.viewBox.baseVal.width || bbox.width || 800;
    const height = svgElement.viewBox.baseVal.height || bbox.height || 600;

    // Ensure the SVG has explicit width and height for the canvas
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clonedSvg);

    // Add namespaces if missing
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const canvas = document.createElement('canvas');
    const scale = window.devicePixelRatio || 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Draw background to avoid transparency issues if desired
      ctx.fillStyle = this.dark ? '#050505' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Export to PNG
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `taskstick-${this.mode || 'export'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      URL.revokeObjectURL(url);
    };

    img.onerror = (err) => {
      console.error('PNG Export failed to load SVG image', err);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  exportSVG() {
    const svgElement = this.graph.nativeElement.querySelector('svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElement);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
      this.downloadFile(source, `taskstick-${this.mode}.svg`, 'image/svg+xml');
    }
  }

  private downloadFile(content: string, fileName: string, contentType: string) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private getHeader(): string {
    switch (this.mode) {
      case 'kanban': return 'kanban\n  Todo';
      case 'mindmap': return 'mindmap\n  root((Work Log))';
      case 'ishikawa': return 'ishikawa-beta\n  Done';
      default: return 'graph TD';
    }
  }

  private getIndentedContent(): string {
    const raw = this.diagram || '';
    return raw.split('\n').map(l => `    ${(l || '').replace(/^(task:|event:|email:)\s*/, '')}`).join('\n');
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
        // 1. Setup panzoom for all modes
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        this.pz = panzoom(svgEl, { maxZoom: 5, minZoom: 0.1 });

        // 2. Inject MASTER OVERRIDE STYLES
        const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = `

          /* A. THE ROOT NODE (Red background, Royal Blue text) */
          .mermaid svg .mindmap-node--root rect,
          .mermaid svg .mindmap-node--root circle,
          .mermaid svg rect.component {
              fill: ${this.dark ? '#ff0000' : '#ffffff'} !important;
              stroke: ${this.dark ? '#ffffff' : '#333333'} !important;
          }

          .mermaid svg .mindmap-node--root text,
          .mermaid svg text.title {
              fill: ${this.dark ? '#1825e3' : '#1f18e4'} !important;
              font-weight: 800 !important;
          }

          /* B. THE BRANCH COLORS (Restore the scale!) */
          /* 1. Remove the 'fill' override to restore branch colors */
          .mermaid svg .mindmap-node rect,
          .mermaid svg .node.section rect {
              stroke-width: 2px !important;
          }
          /* 2. Force text to be black so it's visible on the bright tiles */
          .mermaid svg .mindmap-node text,
          .mermaid svg .node.section text,
          .mermaid svg .label text {
              fill: #000000 !important;
          }
          /* 3. Keep final 'leaf' text white for contrast on the dark background */
          ${this.dark ? `
            .mermaid svg .mindmap-node--leaf text,
            .mermaid svg .mindmap-node--leaf-content text {
                fill: #ffffff !important;
            }
          ` : ''}

          /* C. THE TEXT VISIBILITY FIX */
          /* We force the text to be dark so it is visible on the bright neon branch colors */
          .mermaid svg .mindmap-node text,
          .mermaid svg .node.section text,
          .mermaid svg .label text,
          .mermaid svg .node.section .label {
              fill: #000000 !important; /* Black text works on almost all neon colors */
              color: #000000 !important;
          }

          /* D. THE LEAVES (Keep them white/bright in Dark Mode for contrast) */
          ${this.dark ? `
            .mermaid svg .mindmap-node--leaf text {
                fill: #ffffff !important; 
            }
            /* If the leaf has no box, make sure the text is bright */
            .mermaid svg .mindmap-node--leaf-content text {
                fill: #ffffff !important;
            }
          ` : ''}
        `;
        svgEl.prepend(style);
      }
    } catch (e) {
      console.error(`[DEBUG] Mermaid Render Error:`, e);
      container.innerHTML = `<div style="color:red; border:1px solid red; padding:5px;">ERR: ${(e as any).message}</div>`;
    }
  }
}
