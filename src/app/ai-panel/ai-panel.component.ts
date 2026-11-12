// src/app/ai-panel/ai-panel.component.ts
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import {
  AiAgentService,
  ExtractedAction,
  DEFAULT_OLLAMA_ENDPOINT,
  SERVER_DEFAULT_MODEL,
  FALLBACK_MODELS
} from '../services/ai-agent.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <div class="panel-header">
        <h3>AI‑extracted actions</h3>
        <!-- Sovereign Model Selector & Status Pill -->
        <div class="model-control-pill" [class.online]="ai.isOnline()">
          <span class="status-dot" [title]="ai.isOnline() ? 'Ollama Localhost Online' : 'Fallback Catalog Mode'"></span>
          <select 
            [ngModel]="selectedModel" 
            (ngModelChange)="onModelChange($event)"
            class="model-select"
            title="Sovereign AI Engine Model">
            <option *ngFor="let m of availableModels" [value]="m">
              {{ m === defaultModel ? '★ ' + m + ' (default)' : m }}
            </option>
          </select>
        </div>
      </div>

      <div class="endpoint-info">
        <span class="endpoint-label">Endpoint:</span>
        <code>{{ ai.getEndpoint() }}</code>
      </div>

      <ng-container *ngIf="actions.length; else none">
        <ul>
          <li *ngFor="let act of actions">
            <strong>{{ act.type | titlecase }}:</strong> {{ act.title }}
            <button *ngIf="act.type==='task'"   (click)="run('task',   act)">Trello</button>
            <button *ngIf="act.type==='event'"  (click)="run('event',  act)">Calendar</button>
            <button *ngIf="act.type==='email'"  (click)="run('email',  act)">Email</button>
          </li>
        </ul>
      </ng-container>
      <ng-template #none><p class="empty-state">No actions detected.</p></ng-template>
    </section>
  `,
  styles: [`
    .panel { padding:0.75rem; font-size: 12px; background:#1e293b; color:#fff; height:100%; overflow:auto; display:flex; flex-direction:column; gap:8px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; }
    .panel-header h3 { margin: 0; font-size: 13px; font-weight: 700; color: #38bdf8; }
    .model-control-pill { display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 9999px; padding: 2px 8px; font-family: monospace; font-size: 10px; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
    .model-control-pill.online .status-dot { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .model-select { background: transparent; border: none; color: #fff; font-size: 10px; outline: none; cursor: pointer; max-width: 130px; }
    .model-select option { background: #1e293b; color: #fff; }
    .endpoint-info { font-size: 9px; color: #94a3b8; display: flex; gap: 4px; font-family: monospace; }
    .endpoint-info code { color: #38bdf8; }
    ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    li { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; padding: 6px; }
    button { margin-left:0.5rem; background:#334155; color:#fff; border:none; padding:0.2rem 0.4rem; border-radius:3px; cursor:pointer; }
    button:hover { background:#475569; }
    .empty-state { color: #94a3b8; font-style: italic; margin: 8px 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiPanelComponent implements OnInit, OnChanges {
  @Input() diagram = '';
  actions: ExtractedAction[] = [];

  readonly defaultModel = SERVER_DEFAULT_MODEL;
  selectedModel = SERVER_DEFAULT_MODEL;
  availableModels = [...FALLBACK_MODELS];

  constructor(
    public ai: AiAgentService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    this.selectedModel = this.ai.getSelectedModel();
    this.availableModels = this.ai.getAvailableModels();
    const info = await this.ai.probeOllama();
    this.availableModels = info.models;
    this.selectedModel = info.selectedModel;
    this.cdr.markForCheck();
  }

  onModelChange(newModel: string) {
    this.selectedModel = newModel;
    this.ai.setSelectedModel(newModel);
    this.cdr.markForCheck();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['diagram']) {
      this.actions = this.ai.parse(this.diagram);
    }
  }

  async run(type: 'task' | 'event' | 'email', act: ExtractedAction) {
    if (type === 'task') await this.ai.createTrelloCard(act);
    if (type === 'event') await this.ai.createCalendarEvent(act);
    if (type === 'email') await this.ai.generateEmailDraft(act);
    alert(`${type} "${act.title}" processed (mock).`);
  }
}
