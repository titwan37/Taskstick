// src/app/services/google-calendar-sync.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { TaskstickStoreService } from './taskstick-store.service';
import { ADHDPostItNote, PostItColor } from '../models/taskstick-graph.model';

declare const google: any;

// Replace with your OAuth 2.0 Web Client ID from Google Cloud Console
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLOUD_CLIENT_ID.apps.googleusercontent.com';
export const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

/** Maps Taskstick PostItColor to Google Calendar Event colorId (1-11) */
const POSTIT_TO_GCAL_COLOR: Record<PostItColor, string> = {
  yellow: '5',  // Banana
  pink: '4',    // Flamingo
  blue: '7',    // Peacock
  green: '10',  // Basil
  purple: '3',  // Grape
  orange: '6'   // Tangerine
};

@Injectable({ providedIn: 'root' })
export class GoogleCalendarSyncService {
  private store = inject(TaskstickStoreService);
  private tokenClient: any = null;

  readonly accessToken = signal<string | null>(null);
  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncMessage = signal<string | null>(null);

  constructor() {
    this.restoreSessionToken();
  }

  /** Initialize GIS Token Client and trigger OAuth popup */
  authenticateAndSync(): void {
    if (this.accessToken()) {
      this.syncWeekWithGoogleCalendar();
      return;
    }

    if (typeof google === 'undefined' || !google.accounts?.oauth2) {
      this.lastSyncMessage.set('⚠️ Google Identity script non chargé.');
      return;
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CALENDAR_SCOPES,
      callback: (tokenResponse: any) => {
        if (tokenResponse?.access_token) {
          this.accessToken.set(tokenResponse.access_token);
          sessionStorage.setItem('gcal_access_token', tokenResponse.access_token);
          this.syncWeekWithGoogleCalendar();
        }
      }
    });

    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  private restoreSessionToken(): void {
    if (typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem('gcal_access_token');
      if (saved) this.accessToken.set(saved);
    }
  }

  /**
   * Computes the exact ISO-8601 start & end timestamps for a note's scheduledSlot
   * relative to the Monday of the week of `store.selectedDateKey()`.
   */
  private computeSlotIsoBounds(
    dateKey: string,
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7,
    startHour: number,
    durationMinutes: number
  ): { startIso: string; endIso: string } {
    const baseDate = new Date(dateKey + 'T00:00:00');
    const jsDay = baseDate.getDay(); // 0 = Sun, 1 = Mon ...
    const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;

    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + (dayOfWeek - 1));

    const hours = Math.floor(startHour);
    const minutes = Math.round((startHour - hours) * 60);
    targetDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(targetDate.getTime() + durationMinutes * 60_000);
    return {
      startIso: targetDate.toISOString(),
      endIso: endDate.toISOString()
    };
  }

  /**
   * Main 2-Way Synchronization Pass:
   * 1. Push / Update all scheduled Taskstick notes to primary Google Calendar
   * 2. Pull updated start/end times or completions from Google Calendar back into Taskstick
   */
  async syncWeekWithGoogleCalendar(calendarId = 'primary'): Promise<void> {
    const token = this.accessToken();
    if (!token) return;

    this.isSyncing.set(true);
    this.lastSyncMessage.set('🔄 Synchronisation Google Calendar en cours...');

    try {
      const dateKey = this.store.selectedDateKey();
      const allNotes = [...this.store.notes()];
      let pushedCount = 0;

      // 1. PUSH: Create or PATCH scheduled notes
      for (let i = 0; i < allNotes.length; i++) {
        const note = allNotes[i];
        if (!note.scheduledSlot) continue;

        const { dayOfWeek, startHour, durationMinutes, googleEventId } = note.scheduledSlot;
        const { startIso, endIso } = this.computeSlotIsoBounds(dateKey, dayOfWeek, startHour, durationMinutes);

        const isDone = note.status === 'done_check' || note.status === 'done_cross';
        const prefix = isDone ? '✓ ' : '⚡ [Taskstick] ';

        const payload = {
          summary: `${prefix}${note.title}`,
          description: [
            note.content || '',
            `---`,
            `Charge cognitive: ${note.cognitiveLoad} | Durée: ${note.estimatedMinutes}m`,
            `Tags: ${(note.tags || []).join(', ')}`
          ].join('\n'),
          start: { dateTime: startIso },
          end: { dateTime: endIso },
          colorId: POSTIT_TO_GCAL_COLOR[note.color] || '5',
          extendedProperties: {
            private: {
              taskstickNoteId: note.id,
              taskstickDateKey: dateKey,
              taskstickStatus: note.status
            }
          }
        };

        if (googleEventId) {
          // Update existing event
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            }
          );
          if (res.ok) pushedCount++;
        } else {
          // Insert new event
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            }
          );

          if (res.ok) {
            const created = await res.json();
            allNotes[i] = {
              ...note,
              scheduledSlot: {
                ...note.scheduledSlot,
                googleEventId: created.id,
                calendarId,
                lastSyncedAt: Date.now()
              }
            };
            pushedCount++;
          }
        }
      }

      // 2. PULL: Reconcile events modified directly inside Google Calendar
      const { startIso: weekStart } = this.computeSlotIsoBounds(dateKey, 1, 0, 0);
      const { endIso: weekEnd } = this.computeSlotIsoBounds(dateKey, 7, 23, 59);

      const listUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(weekStart)}&timeMax=${encodeURIComponent(weekEnd)}&singleEvents=true&privateExtendedProperty=${encodeURIComponent(`taskstickDateKey=${dateKey}`)}`;

      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (listRes.ok) {
        const data = await listRes.json();
        const remoteEvents: any[] = data.items || [];

        for (const ev of remoteEvents) {
          const noteId = ev.extendedProperties?.private?.taskstickNoteId;
          if (!noteId || !ev.start?.dateTime || !ev.end?.dateTime) continue;

          const idx = allNotes.findIndex(n => n.id === noteId);
          if (idx === -1) continue;

          if (ev.status === 'cancelled') {
            // Event was deleted in Google Calendar -> unschedule in Taskstick
            const updated = { ...allNotes[idx] };
            delete updated.scheduledSlot;
            allNotes[idx] = updated;
            continue;
          }

          const startDt = new Date(ev.start.dateTime);
          const endDt = new Date(ev.end.dateTime);
          const jsDay = startDt.getDay();
          const dayOfWeek = (jsDay === 0 ? 7 : jsDay) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
          const startHour = Math.round((startDt.getHours() + startDt.getMinutes() / 60) * 2) / 2;
          const durationMinutes = Math.max(15, Math.round((endDt.getTime() - startDt.getTime()) / 60_000));

          allNotes[idx] = {
            ...allNotes[idx],
            scheduledSlot: {
              dayOfWeek,
              startHour,
              durationMinutes,
              googleEventId: ev.id,
              calendarId,
              lastSyncedAt: Date.now()
            }
          };
        }
      }

      // Update store signal & persist to IndexedDB / LocalStorage
      this.store.notes.set(allNotes);
      this.lastSyncMessage.set(`✅ ${pushedCount} tâche(s) synchronisée(s) avec Google Calendar`);
    } catch (err: any) {
      this.lastSyncMessage.set(`❌ Erreur de synchronisation : ${err?.message || 'Inconnue'}`);
    } finally {
      this.isSyncing.set(false);
    }
  }

  /** Deletes the Google Calendar event when a task is unscheduled from WeeklyPlannerComponent */
  async deleteRemoteEventIfPresent(note: ADHDPostItNote): Promise<void> {
    const token = this.accessToken();
    const eventId = note.scheduledSlot?.googleEventId;
    const calId = note.scheduledSlot?.calendarId || 'primary';
    if (!token || !eventId) return;

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }
}