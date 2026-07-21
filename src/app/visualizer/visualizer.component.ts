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
                lineColor: this.dark ? '#333333' : '#afafaf',
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

                // 1. CONSOLE DEBUG LOGGING & DEEP SVG INSPECTION
                console.info('[VISUALIZER DEBUG] Rendering Mode:', this.mode, '| Dark Mode:', this.dark);
                const allEls = svgEl.querySelectorAll('*');
                const sampleClasses: string[] = [];
                allEls.forEach((el) => {
                    const cls = el.getAttribute('class');
                    if (cls) sampleClasses.push(`${el.tagName}.${cls.replace(/\s+/g, '.')}`);
                });
                console.info(`[DEEP DEBUG ISHIKAWA] Total SVG elements: ${allEls.length}. Element classes sample:`, sampleClasses.slice(0, 35));

                const svgShapes = svgEl.querySelectorAll('rect, circle, polygon, path, line');
                const htmlNodes = svgEl.querySelectorAll('foreignObject div, div, .node-bkg');
                let colorNodes = Array.from(svgEl.querySelectorAll('[class*="section-"], [class*="category-"], .cause, .effect, .category, .cluster'));
                console.info(`[VISUALIZER DEBUG] SVG Shapes: ${svgShapes.length} | HTML Nodes: ${htmlNodes.length} | Initial Colorized Nodes: ${colorNodes.length}`);

                // Fallback for Ishikawa or diagrams without explicit section-N classes: style all g.node or g groups sequentially!
                if (colorNodes.length < 5) {
                    const genericNodes = Array.from(svgEl.querySelectorAll('g.node, g.cluster, .node, svg > g > g, svg g'));
                    console.info(`[VISUALIZER DEBUG] Fallback triggered for ${this.mode}. Found ${genericNodes.length} generic nodes to colorize by index.`);
                    colorNodes = genericNodes;
                }

                // 2. INJECT CLEAN SVG STYLE OVERRIDES (FOR MINDMAP, KANBAN & ISHIKAWA FISHBONE)
                const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
                style.textContent = `
          /* Universal Text Overrides - Always Dark Readable Text */
          svg text,
          svg foreignObject,
          svg foreignObject div,
          svg foreignObject span,
          svg foreignObject p,
          svg .node text,
          svg .node div {
              color: #0f172a !important;
              fill: #0f172a !important;
              font-weight: 700 !important;
              font-size: 13px !important;
              opacity: 1 !important;
              letter-spacing: 0.2px;
          }

          /* HTML Div Cocooning Style */
          svg foreignObject div, svg .node-bkg {
              border-radius: 8px !important;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          }

          /* Root / Head Node (Positive Coral Rose) */
          svg .mindmap-node--root rect,
          svg .mindmap-node--root circle,
          svg .mindmap-node--root polygon,
          svg .mindmap-node--root path,
          svg .mindmap-node--root foreignObject div,
          svg .mindmap-node--root div,
          svg .effect rect, svg .effect circle, svg .effect div {
              fill: #ffe4e6 !important; 
              background: #ffe4e6 !important;
              background-color: #ffe4e6 !important;
              stroke: #e11d48 !important;
              border: 2px solid #e11d48 !important;
              color: #881337 !important;
          }

          /* Section 0 / Category 0: Mint Green */
          svg .section-0 rect, svg .section-0 circle, svg .section-0 polygon, svg .section-0 path,
          svg .section-0 foreignObject div, svg .section-0 div, svg .section-0 .node-bkg,
          svg .category-0 rect, svg .category-0 circle, svg .category-0 polygon, svg .category-0 path, svg .category-0 div {
              fill: #dcfce7 !important;
              background: #dcfce7 !important;
              background-color: #dcfce7 !important;
              stroke: #16a34a !important;
              border: 1.5px solid #16a34a !important;
          }
          svg .section-0 path.mindmap-edge, svg path.section-0, svg .category-0 line, svg line.category-0 { stroke: #34d399 !important; stroke-width: 3px !important; }

          /* Section 1 / Category 1: Ice Sky Blue */
          svg .section-1 rect, svg .section-1 circle, svg .section-1 polygon, svg .section-1 path,
          svg .section-1 foreignObject div, svg .section-1 div, svg .section-1 .node-bkg,
          svg .category-1 rect, svg .category-1 circle, svg .category-1 polygon, svg .category-1 path, svg .category-1 div {
              fill: #e0f2fe !important;
              background: #e0f2fe !important;
              background-color: #e0f2fe !important;
              stroke: #0284c7 !important;
              border: 1.5px solid #0284c7 !important;
          }
          svg .section-1 path.mindmap-edge, svg path.section-1, svg .category-1 line, svg line.category-1 { stroke: #38bdf8 !important; stroke-width: 3px !important; }

          /* Section 2 / Category 2: Warm Amber Gold */
          svg .section-2 rect, svg .section-2 circle, svg .section-2 polygon, svg .section-2 path,
          svg .section-2 foreignObject div, svg .section-2 div, svg .section-2 .node-bkg,
          svg .category-2 rect, svg .category-2 circle, svg .category-2 polygon, svg .category-2 path, svg .category-2 div {
              fill: #fef3c7 !important;
              background: #fef3c7 !important;
              background-color: #fef3c7 !important;
              stroke: #d97706 !important;
              border: 1.5px solid #d97706 !important;
          }
          svg .section-2 path.mindmap-edge, svg path.section-2, svg .category-2 line, svg line.category-2 { stroke: #fbbf24 !important; stroke-width: 3px !important; }

          /* Section 3 / Category 3: Soft Lavender Orchid */
          svg .section-3 rect, svg .section-3 circle, svg .section-3 polygon, svg .section-3 path,
          svg .section-3 foreignObject div, svg .section-3 div, svg .section-3 .node-bkg,
          svg .category-3 rect, svg .category-3 circle, svg .category-3 polygon, svg .category-3 path, svg .category-3 div {
              fill: #f3e8ff !important;
              background: #f3e8ff !important;
              background-color: #f3e8ff !important;
              stroke: #9333ea !important;
              border: 1.5px solid #9333ea !important;
          }
          svg .section-3 path.mindmap-edge, svg path.section-3, svg .category-3 line, svg line.category-3 { stroke: #c084fc !important; stroke-width: 3px !important; }

          /* Section 4 / Category 4: Soft Rose Coral */
          svg .section-4 rect, svg .section-4 circle, svg .section-4 polygon, svg .section-4 path,
          svg .section-4 foreignObject div, svg .section-4 div, svg .section-4 .node-bkg,
          svg .category-4 rect, svg .category-4 circle, svg .category-4 polygon, svg .category-4 path, svg .category-4 div {
              fill: #ffe4e6 !important;
              background: #ffe4e6 !important;
              background-color: #ffe4e6 !important;
              stroke: #e11d48 !important;
              border: 1.5px solid #e11d48 !important;
          }
          svg .section-4 path.mindmap-edge, svg path.section-4, svg .category-4 line, svg line.category-4 { stroke: #fb7185 !important; stroke-width: 3px !important; }

          /* Section 5 / Category 5: Warm Sunset Orange */
          svg .section-5 rect, svg .section-5 circle, svg .section-5 polygon, svg .section-5 path,
          svg .section-5 foreignObject div, svg .section-5 div, svg .section-5 .node-bkg,
          svg .category-5 rect, svg .category-5 circle, svg .category-5 polygon, svg .category-5 path, svg .category-5 div {
              fill: #ffedd5 !important;
              background: #ffedd5 !important;
              background-color: #ffedd5 !important;
              stroke: #ea580c !important;
              border: 1.5px solid #ea580c !important;
          }
          svg .section-5 path.mindmap-edge, svg path.section-5, svg .category-5 line, svg line.category-5 { stroke: #fb923c !important; stroke-width: 3px !important; }

          /* Section 6 / Category 6: Soft Turquoise */
          svg .section-6 rect, svg .section-6 circle, svg .section-6 polygon, svg .section-6 path,
          svg .section-6 foreignObject div, svg .section-6 div, svg .section-6 .node-bkg,
          svg .category-6 rect, svg .category-6 circle, svg .category-6 polygon, svg .category-6 path, svg .category-6 div {
              fill: #ccfbf1 !important;
              background: #ccfbf1 !important;
              background-color: #ccfbf1 !important;
              stroke: #0d9488 !important;
              border: 1.5px solid #0d9488 !important;
          }
          svg .section-6 path.mindmap-edge, svg path.section-6, svg .category-6 line, svg line.category-6 { stroke: #2dd4bf !important; stroke-width: 3px !important; }
        `;
                svgEl.prepend(style);

                // 3. DIRECT JAVASCRIPT INLINE STYLING GUARANTEE WITH LOGGING
                const paletteArray = [
                    { bg: '#dcfce7', stroke: '#16a34a', text: '#064e3b' }, // Soft Mint Green
                    { bg: '#e0f2fe', stroke: '#0284c7', text: '#0c4a6e' }, // Ice Sky Blue
                    { bg: '#fef3c7', stroke: '#d97706', text: '#78350f' }, // Warm Amber Gold
                    { bg: '#f3e8ff', stroke: '#9333ea', text: '#581c87' }, // Soft Lavender Orchid
                    { bg: '#ffe4e6', stroke: '#e11d48', text: '#881337' }, // Soft Rose Coral
                    { bg: '#ffedd5', stroke: '#ea580c', text: '#7c2d12' }, // Warm Sunset Orange
                    { bg: '#ccfbf1', stroke: '#0d9488', text: '#134e4a' }, // Soft Turquoise
                ];

                colorNodes.forEach((node: Element, idx: number) => {
                    const cls = node.getAttribute('class') || '';
                    let pal = paletteArray[idx % paletteArray.length];

                    // If class contains explicit section-N or category-N, match it
                    for (let i = 0; i < paletteArray.length; i++) {
                        if (cls.includes(`section-${i}`) || cls.includes(`category-${i}`)) {
                            pal = paletteArray[i];
                            break;
                        }
                    }

                    console.info(`[VISUALIZER DEBUG] Styling node ${idx} (${cls || node.tagName}): bg=${pal.bg}, stroke=${pal.stroke}`);

                    // Style HTML Divs
                    const divs = node.querySelectorAll('div, foreignObject div, .node-bkg');
                    divs.forEach((d: any) => {
                        d.style.setProperty('background-color', pal.bg, 'important');
                        d.style.setProperty('background', pal.bg, 'important');
                        d.style.setProperty('color', pal.text, 'important');
                        d.style.setProperty('border', `1.5px solid ${pal.stroke}`, 'important');
                        d.style.setProperty('border-radius', '8px', 'important');
                        d.style.setProperty('box-shadow', '0 4px 12px rgba(0,0,0,0.25)', 'important');
                    });

                    // Style SVG Shapes & Lines
                    const shapes = node.querySelectorAll('rect, circle, polygon, path, line');
                    shapes.forEach((s: any) => {
                        s.style.setProperty('fill', pal.bg, 'important');
                        s.style.setProperty('stroke', pal.stroke, 'important');
                        if (s.tagName.toLowerCase() === 'rect') {
                            s.setAttribute('rx', '6');
                            s.setAttribute('ry', '6');
                        }
                    });

                    // If the node itself is a shape (e.g. rect/path/line inside g)
                    if (['rect', 'circle', 'polygon', 'path', 'line'].includes(node.tagName.toLowerCase())) {
                        (node as any).style.setProperty('fill', pal.bg, 'important');
                        (node as any).style.setProperty('stroke', pal.stroke, 'important');
                    }

                    // Style Text
                    const texts = node.querySelectorAll('text, span, p');
                    texts.forEach((t: any) => {
                        t.style.setProperty('fill', pal.text, 'important');
                        t.style.setProperty('color', pal.text, 'important');
                    });
                });
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

    private getKanbanDiagram(): string {
        const lines = (this.diagram || '').split('\n');

        // 1. Predefined standard columns in order
        const standardColumns = ['Todo', 'Pending', 'Enqueued', 'Done', 'Delayed'];
        const columns: { [key: string]: string[] } = {};
        for (const col of standardColumns) {
            columns[col] = [];
        }

        let currentColumn = 'Todo';

        for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Check if the line has no indentation (0 spaces at start)
            const hasIndentation = line.startsWith(' ') || line.startsWith('\t');

            if (!hasIndentation) {
                // It's a column definition!
                // Detect which standard column it might match
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
                    // It's a custom column! Clean it (remove brackets or id prefixes)
                    // e.g. "custom[Custom Column]" or "[Custom]" or "Custom"
                    let colName = trimmed;
                    const bracketMatch = trimmed.match(/\[([^\]]+)\]/);
                    if (bracketMatch) {
                        colName = bracketMatch[1];
                    } else {
                        const idMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\[([^\]]+)\]/);
                        if (idMatch) {
                            colName = idMatch[2];
                        }
                    }
                    currentColumn = colName;
                    if (!columns[currentColumn]) {
                        columns[currentColumn] = [];
                    }
                }
            } else {
                // It's a task! Clean prefix (task:, event:, email:) if any
                const cleaned = trimmed.replace(/^(task:|event:|email:)\s*/, '');
                if (cleaned) {
                    columns[currentColumn].push(cleaned);
                }
            }
        }

        // 2. Build the Mermaid Kanban output
        let out = 'kanban\n';

        // We want to preserve the standard columns order first, then any extra custom columns
        const allColKeys = Array.from(new Set([...standardColumns, ...Object.keys(columns)]));

        for (const col of allColKeys) {
            const tasks = columns[col] || [];
            out += `${col}\n`;
            for (const t of tasks) {
                out += `    ${t}\n`;
            }
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