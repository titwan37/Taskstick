// src/app/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorComponent } from './editor/editor.component';
import { VisualizerComponent } from './visualizer/visualizer.component';
import { AiPanelComponent } from './ai-panel/ai-panel.component';
import { DateSelectorComponent } from './date-selector/date-selector.component';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    EditorComponent,
    VisualizerComponent,
    AiPanelComponent,
    DateSelectorComponent
  ],
  template: `
    <div class="debug-banner">DEBUG MODE ACTIVE STABLE_BUILD_20260429_1930 - UI VERSION 1.2</div>
    
    <header class="header">
      <h1>📝 Taskstick</h1>
      <app-date-selector (dateChange)="loadDate($event)"></app-date-selector>
    </header>

    <main class="layout">
      <section class="pane left">
        <app-editor (contentChange)="onDiagramChange($event)"></app-editor>
      </section>

      <section class="pane right">
        <div class="views-stack">
          <!-- KANBAN -->
          <div class="debug-container">
            <h4 class="debug-title">DEBUG: KANBAN VIEW</h4>
            <app-visualizer [diagram]="diagram" mode="kanban"></app-visualizer>
          </div>

          <!-- MINDMAP -->
          <div class="debug-container">
            <h4 class="debug-title">DEBUG: MINDMAP VIEW</h4>
            <app-visualizer [diagram]="diagram" mode="mindmap"></app-visualizer>
          </div>

          <!-- ISHIKAWA -->
          <div class="debug-container">
            <h4 class="debug-title">DEBUG: FISHBONE VIEW</h4>
            <app-visualizer [diagram]="diagram" mode="ishikawa"></app-visualizer>
          </div>
        </div>
      </section>

      <section class="pane ai">
        <app-ai-panel [diagram]="diagram"></app-ai-panel>
      </section>
    </main>
  `,
  styles: [`
    :host { display: flex !important; flex-direction: column !important; height: 100vh !important; background: #000 !important; color: white !important; }
    .debug-banner { background: #ff00ff; color: #000; font-weight: bold; text-align: center; padding: 2px; font-size: 10px; }
    .header { padding: 1rem; background: #111; border-bottom: 2px solid #ff00ff; display: flex; justify-content: space-between; align-items: center; }
    .layout { flex: 1; display: flex; overflow: hidden; }
    .pane { border: 1px solid #333; display: flex; flex-direction: column; }
    .left { width: 300px; }
    .right { flex: 1; overflow-y: auto; background: #050505; }
    .ai { width: 250px; }

    .views-stack { padding: 20px; display: flex; flex-direction: column; gap: 30px; }
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
  `]
})
export class MainAppComponent {
  diagram = '';
  constructor(private storage: StorageService) { 
    console.info('%c [DEBUG] AppComponent Initialized', 'background: #ff00ff; color: #000');
  }
  onDiagramChange(text: string) {
    this.diagram = text;
  }
  loadDate(dateKey: string) {
    this.diagram = this.storage.load(dateKey) || '';
  }
}
