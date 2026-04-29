// src/app/ai-agent.service.ts
import { Injectable } from '@angular/core';

export interface ExtractedAction {
    type: 'task' | 'event' | 'email';
    title: string;
    raw: string;
}

@Injectable({ providedIn: 'root' })
export class AiAgentService {
    /** Very simple parser – replace with real LLM call later */
    parse(mmd: string): ExtractedAction[] {
        const actions: ExtractedAction[] = [];
        for (const line of mmd.split('\n')) {
            const t = line.trim();
            if (t.startsWith('task:')) actions.push({ type: 'task', title: t.slice(5).trim(), raw: line });
            else if (t.startsWith('event:')) actions.push({ type: 'event', title: t.slice(6).trim(), raw: line });
            else if (t.startsWith('email:')) actions.push({ type: 'email', title: t.slice(6).trim(), raw: line });
        }
        return actions;
    }

    // ----- Mock “external” calls (replace with real APIs later) -----
    createTrelloCard(act: ExtractedAction) {
        console.log('🗂️  Trello card mock created →', act.title);
        return Promise.resolve();
    }

    createCalendarEvent(act: ExtractedAction) {
        console.log('📅  Calendar event mock created →', act.title);
        return Promise.resolve();
    }

    generateEmailDraft(act: ExtractedAction) {
        const subject = encodeURIComponent(act.title);
        const body = encodeURIComponent(`Draft for: ${act.title}\n\n`);
        const mailto = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = mailto;
        return Promise.resolve();
    }
}
