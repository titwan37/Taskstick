// src/app/main-app.component.ts
import { Component, HostBinding, OnInit, ChangeDetectorRef, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularSplitModule } from 'angular-split';
import { EditorComponent } from './editor/editor.component';
import { AiPanelComponent } from './ai-panel/ai-panel.component';
import { DateSelectorComponent } from './date-selector/date-selector.component';
import { VisualizerComponent } from './visualizer/visualizer.component';
import { StorageService } from './services/storage.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    AngularSplitModule,
    EditorComponent,
    VisualizerComponent,
    AiPanelComponent,
    DateSelectorComponent
  ],
  template: `
    <header class="header">
      <div class="center-group">
        <button class="header-btn-toggle" (click)="toggleTheme()">
        {{dark ? "☀️ Light" : "🌙 Dark"}}
        </button>
      </div>
      <div class="logo-img" *ngIf="logoSvg" [innerHTML]="logoSvg"></div>
      <div class="brand">
        <span class="logo">Taskstick</span>
        <span class="version">v1.2.0</span>
      </div>
      <div class="center-group">
        <button (click)="editorVisible = !editorVisible" class="header-btn" [class.active]="editorVisible">
          {{editorVisible ? '⬅️ Editor' : 'Editor ➡️'}}
        </button>
        <span class="header-emoji">📝</span>
      </div>      
      <div class="right-group">
        <button (click)="loadFromDrive()" class="header-btn"><span class="btn-icon">📤</span> Load</button>
        <button (click)="saveToDatabase()" class="header-btn"><span class="btn-icon">💾</span> Save to DB</button>
        <button (click)="exportToDrive()" class="header-btn"><span class="btn-icon">📤</span> Export</button>
      </div>
      <!-- The Separator -->
      <div class="header-divider"></div>
      <!-- The Separator -->
      <div class="right-group">
        <button (click)="aiVisible = !aiVisible" class="header-btn" [class.active]="aiVisible">
          {{aiVisible ? 'Tasks ➡️' : '⬅️ Tasks'}}
        </button>
        <span class="header-emoji">📝</span>
        <app-date-selector (dateChange)="loadDate($event)"></app-date-selector>
      </div>
    </header>

    <main class="layout">
      <as-split direction="horizontal" unit="pixel" gutterSize="4">
        
        <!-- LEFT: EDITOR -->
        <as-split-area [size]="300" [minSize]="220" *ngIf="editorVisible">
          <section class="pane">
            <div class="pane-header">Editor</div>
            <app-editor [dark]="dark" [content]="diagram" (contentChange)="onDiagramChange($event)"></app-editor>
          </section>
        </as-split-area>
        
        <!-- CENTER: VISUALIZERS -->
        <as-split-area [size]="'*'">
          <!-- New Flex Wrapper -->
          <div class="viz-wrapper">
            
            <!-- Top View Menu Bar (Fixed) -->
            <div class="viz-layout-header">
              <span class="viz-layout-label">Grid:</span>
              <button [class.active]="vizLayout === 'split'" (click)="vizLayout = 'split'">Two</button>
              <button [class.active]="vizLayout === 'grid'" (click)="vizLayout = 'grid'">Three</button>
              <span class="viz-layout-label"></span>
              <span class="viz-layout-label"></span>
              <span class="viz-layout-label"></span>
              <span class="viz-layout-label">Single View:</span>
              <button [class.active]="vizLayout === 'ishikawa'" (click)="vizLayout = 'ishikawa'">Fishbone</button>
              <button [class.active]="vizLayout === 'mindmap'" (click)="vizLayout = 'mindmap'">Mindmap</button>
              <button [class.active]="vizLayout === 'kanban'" (click)="vizLayout = 'kanban'">Kanban</button>
            </div>

            <!-- Scroll-Free Split Container -->
            <div class="viz-split-container">
              <as-split direction="vertical" gutterSize="4">
                
                <!-- ROW 1: TILES -->
                <as-split-area 
                  [size]="vizLayout === 'grid' ? 50 : 100" 
                  *ngIf="['grid', 'ishikawa', 'kanban', 'split'].includes(vizLayout)">
                  <as-split direction="horizontal" gutterSize="4">
                    <as-split-area 
                      [size]="vizLayout === 'ishikawa' ? 100 : 50" 
                      *ngIf="['grid', 'ishikawa', 'split'].includes(vizLayout)">
                      <div class="viz-container">
                        <h4 class="viz-title">Fishbone Analysis</h4>
                        <app-visualizer [dark]="dark" [diagram]="diagram" mode="ishikawa"></app-visualizer>
                      </div>
                    </as-split-area>
                    <as-split-area 
                      [size]="vizLayout === 'kanban' ? 100 : 50" 
                      *ngIf="['grid', 'kanban', 'split'].includes(vizLayout)">
                      <div class="viz-container">
                        <h4 class="viz-title">Kanban Board</h4>
                        <app-visualizer [dark]="dark" [diagram]="diagram" mode="kanban"></app-visualizer>
                      </div>
                    </as-split-area>
                  </as-split>
                </as-split-area>

                <!-- ROW 2: FULL -->
                <as-split-area 
                  [size]="vizLayout === 'mindmap' ? 100 : 50" 
                  *ngIf="vizLayout === 'grid' || vizLayout === 'mindmap'">
                  <div class="viz-container">
                    <h4 class="viz-title">Strategic Mindmap</h4>
                    <app-visualizer [dark]="dark" [diagram]="diagram" mode="mindmap"></app-visualizer>
                  </div>
                </as-split-area>

              </as-split>
            </div>
          </div>
        </as-split-area>
 
        <!-- RIGHT: AI PANEL -->
        <as-split-area [size]="450" [minSize]="200" *ngIf="aiVisible">
          <section class="pane">
            <section class="pane">
              <div class="pane-header">Instructions:</div>
              <div class="whats-changed">
                <ol>
                  <li>task: <i> Create a Trello Card </i></li>
                  <li>email: <i> Create a Gmail Draft </i></li>
                  <li>event: <i> Create a Google Calendar Event </i></li>
                </ol>
              </div>
              <div class="pane-header">AI Insights</div>
              <app-ai-panel [diagram]="diagram"></app-ai-panel>
            </section>
 
          </section>
        </as-split-area>
 
      </as-split>
    </main>
  `,
  styles: [`
    :host { 
      display: flex; 
      flex-direction: column; 
      height: 100vh; 
      background: var(--bg-main, #080808); 
      color: var(--text-main, #e0e0e0); 
      font-family: 'Inter', system-ui, -apple-system, sans-serif;

      /* Dark Theme Variables (Default) */
      --bg-main: #080808;
      --text-main: #e0e0e0;
      --header-bg: #121212;
      --border-color: #222;
      --pane-bg: #0d0d0d;
      --pane-header-bg: #151515;
      --viz-bg: #0a0a0a;
      --btn-bg: #222;
      --btn-text: #ccc;
      --btn-border: #333;
      --btn-hover-bg: #333;
    }

    :host.light-mode {
      /* Light Theme Overrides */
      --bg-main: #f5f5f7;
      --text-main: #1d1d1f;
      --header-bg: #ffffff;
      --border-color: #d2d2d7;
      --pane-bg: #ffffff;
      --pane-header-bg: #f5f5f7;
      --viz-bg: #fafafa;
      --btn-bg: #f5f5f7;
      --btn-text: #1d1d1f;
      --btn-border: #d2d2d7;
      --btn-hover-bg: #e8e8ed;
    }
    
    .header-emoji {
      font-size: 1.2rem;
      margin-left: 8px;
      margin-right: 8px;
    }

    .header { 
      padding: 0.75rem 1.5rem; 
      background: var(--header-bg, #310404); 
      border-bottom: 1px solid var(--border-color, #222); 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }

    .center-group { flex: 1; display: flex; justify-content: center; }
    
    .header-btn-toggle {
      background: var(--btn-bg, #222);
      color: var(--btn-text, #ccc);
      border: 1px solid var(--btn-border, #333);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-btn-toggle:hover {
      background: var(--btn-hover-bg, #333);
      color: #fff;
      border-color: #ff7700;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(255, 119, 0, 0.2);
    }

    .right-group { display: flex; align-items: center; gap: 12px; }
    
    .header-btn {
      background: #222;
      color: #ccc;
      border: 1px solid #333;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .header-btn:hover {
      background: #333;
      color: #fff;
      border-color: #ff7700;
    }

    .header-btn.active {
      border-color: #492505;
      color: #663300;
      display: flex;
      border-radius: 16px;
      background: rgba(56, 30, 7, 0.21);
    }

    .brand { display: flex; align-items: center; gap: 10px; }
    .logo-img { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; view-transition-name: logo-icon; }
    .logo-img ::ng-deep svg { width: 24px; height: 24px; display: block; }
    .logo { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px; color: #ff7700; view-transition-name: logo-text; }
    .version { font-size: 10px; color: #555; font-family: monospace; }

    .layout { flex: 1; display: flex; overflow: hidden; background: var(--bg-main); }

    .debug-container { 
      border: 3px solid red !important; 
      border-radius: 8px; 
      min-height: 400px !important; 
      background: #000 !important; 
      display: block !important;
      position: relative;
    }

    .debug-title { 
      background: red !important; 
      color: white !important; 
      padding: 5px 10px !important; 
      margin: 0 !important; 
      font-size: 12px !important; 
      display: block !important;
      font-weight: bold;
    }      
      
    .pane { height: 100%; display: flex; flex-direction: column; background: var(--pane-bg); }
    .pane-header { 
      padding: 8px 12px; 
      font-size: 11px; 
      text-transform: uppercase; 
      letter-spacing: 1px; 
      color: #666; 
      background: var(--pane-header-bg);
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
    }

    .header-divider {
      width: 1px;
      height: 20px;
      background-color: var(--border-color, #333);
      margin: 0 8px;
      opacity: 0.6;
    }

    /* Optional: Ensure the right-group alignment stays perfect */
    .right-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .whats-changed {
      font-size: small;      
    }

    /* Splitter Styling */
    ::ng-deep .as-split-gutter {
      background-color: var(--border-color) !important;
      border: none !important;
      transition: background-color 0.3s;
    }
    ::ng-deep .as-split-gutter:hover {
      background-color: #ff7700 !important;
    }
    ::ng-deep .as-split-gutter-icon {
      display: none !important;
    }
    
    /* Flexbox logic for the center viewer */
    .viz-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .viz-container { 
      height: 100%;
      background: var(--viz-bg); 
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .viz-title { 
      background: rgba(20, 20, 20, 0.8); 
      color: #888; 
      padding: 6px 12px; 
      margin: 0; 
      font-size: 10px; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      font-weight: 700;
      border-bottom: 1px solid #222;
      backdrop-filter: blur(10px);
    }
    app-editor, app-visualizer { 
      flex: 1; 
      display: flex; 
      flex-direction: column; 
      overflow: hidden; 
    }

    /* Viz Layout Switcher */
    .viz-layout-header {
      flex: 0 0 auto; /* Do not grow, do not shrink */
      background: var(--pane-header-bg);
      padding: 5px 10px !important;
      margin: 0 !important; 
      font-size: 10px !important;
      /* display: block !important; */
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid var(--border-color);
      height: 36px; /* Explicit height helps calculation */
      box-sizing: border-box;
    }

    .viz-split-container {
      flex: 1; /* Take all remaining vertical space */
      position: relative; /* Context for absolute-positioned inner splits */
      overflow: hidden;
    }

    /* Force inner components to fill the flex container */
    as-split {
      height: 100% !important;
      width: 100% !important;
    }

    .viz-container { 
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .viz-layout-label {
      font-size: 10px;
      color: #423737;
      font-weight: 800;
      text-transform: uppercase;
      margin-right: 4px;
    }
    .viz-layout-header button {
      background: transparent;
      border: 1px solid transparent;
      color: #6e280f;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.2s;
    }
    .viz-layout-header button:hover {
      background: rgba(255, 119, 0, 0.1);
      color: #ff7700;
    }
    .viz-layout-header button.active {
      background: #ff7700;
      color: #000;
    }
  `]
})

export class MainAppComponent implements OnInit {
  diagram = '';
  dark = true;
  vizLayout: 'grid' | 'split' | 'ishikawa' | 'kanban' | 'mindmap' = 'grid';
  editorVisible = true;
  aiVisible = false; // Change this to false
  logoSvg: SafeHtml | null = null;

  constructor(
    private storage: StorageService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private el: ElementRef,     // ✅ ADD THIS
    private renderer: Renderer2 // ✅ ADD THIS
  ) {
    this.initializeTheme();
    console.info('%c [DEBUG] AppComponent Initialized', 'background: #ff00ff; color: #000');
  }

  // You must completely delete these three lines!
  // ❌ DELETE THIS BLOCK:
  // @HostBinding('class.light-mode') get isLightMode() {
  //   return !this.dark;
  // }

  private initializeTheme() {
    const savedTheme = localStorage.getItem('taskstick-theme');

    if (savedTheme) {
      this.dark = savedTheme === 'dark';
    } else {
      const hour = new Date().getHours();
      const isNight = hour < 8 || hour >= 18;
      if (isNight) {
        this.dark = true;
      } else {
        this.dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
    }
    this.updateRootTheme();
    console.info(`[DEBUG] Theme initialized to: ${this.dark ? 'Dark' : 'Light'}`);
  }

  private updateRootTheme() {
    // This now correctly uses Renderer2 to add/remove classes from the host element, 
    // avoiding the ExpressionChangedAfterItHasBeenCheckedError.
    if (this.dark) {
      document.documentElement.classList.remove('light-mode');
      this.renderer.removeClass(this.el.nativeElement, 'light-mode');
      console.info('%c [DEBUG] Remove Light Mode', 'background: #ff00ff; color: #000');
    } else {
      document.documentElement.classList.add('light-mode');
      this.renderer.addClass(this.el.nativeElement, 'light-mode');
      console.info('%c [DEBUG] Add Light Mode', 'background: #ff00ff; color: #000');
    }
  }

  ngOnInit() {
    this.diagram = this.storage.load() || '';

    this.http.get<any[]>('./iconmaps.json').subscribe({
      next: (icons) => {
        const logo = icons.find(i => i.id === 'fantaskstick');
        if (logo) {
          this.logoSvg = this.sanitizer.bypassSecurityTrustHtml(logo.iconmap);
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('[Error] Failed to load icons', err)
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change', e => {
      if (!localStorage.getItem('taskstick-theme')) {
        this.dark = e.matches;
        this.updateRootTheme();
        this.cdr.detectChanges();
      }
    });
  }

  toggleTheme() {
    const applyToggle = () => {
      this.dark = !this.dark;
      localStorage.setItem('taskstick-theme', this.dark ? 'dark' : 'light');
      this.updateRootTheme();

      this.cdr.detectChanges();

      console.info(`[DEBUG] Theme toggled to: ${this.dark ? 'Dark' : 'Light'}`);
    };

    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        applyToggle();
      });
    } else {
      applyToggle();
    }
  }

  onDiagramChange(event: { lang?: string; content: string } | string) {
    this.diagram = typeof event === 'string' ? event : (event.content ?? '');
  }
  loadDate(dateKey: string) {
    this.diagram = this.storage.load(dateKey) || '';
  }

  exportToDrive() {
    if (!this.diagram.trim()) return;
    const blob = new Blob([this.diagram], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskstick-export-${new Date().toISOString().slice(0, 10)}.mmd`;
    a.click();
    window.URL.revokeObjectURL(url);
    console.info('[DEBUG] Exported to HDD');
  }

  saveToDatabase() {
    if (!this.diagram.trim()) return;
    // For now, "Database" is our StorageService which uses localStorage
    // but this represents an explicit sync/commit action.
    this.storage.save(this.diagram);
    alert('✅ Diagram successfully committed to Database.');
    console.info('[DEBUG] Saved to Database');
  }

  loadFromDrive() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mmd,.txt';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent: any) => {
        const content = readerEvent.target.result;
        this.diagram = content;
        this.storage.save(content);
        console.info('[DEBUG] Loaded from "Drive" (Local Upload)');
      };
      reader.readAsText(file);
      console.info('[DEBUG] Loaded from "Drive" (Local Upload) - FileReader initiated');
    };
    input.click();
    console.info('[DEBUG] Clicked - File Input Triggered');
  }
}
