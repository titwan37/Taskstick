// src/app/ai-panel/ai-panel.component.ts
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { AiAgentService, ExtractedAction } from '../services/ai-agent.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <h3>AI‑extracted actions</h3>
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
      <ng-template #none><p>No actions detected.</p></ng-template>
    </section>
  `,
  styles: [`
    .panel { padding:0.5rem; font-size: 12px; background:#1e293b; color:#fff; height:100%; overflow:auto; }
    button { margin-left:0.5rem; background:#334155; color:#fff; border:none; padding:0.2rem 0.4rem; cursor:pointer; }
    button:hover { background:#475569; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiPanelComponent implements OnChanges {
  @Input() diagram = '';
  actions: ExtractedAction[] = [];

  constructor(private ai: AiAgentService) { }

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
