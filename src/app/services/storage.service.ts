// src/app/storage.service.ts
import { Injectable } from '@angular/core';

export interface JournalEntry {
    dateKey: string;   // yyyyMMdd
    content: string;   // raw .mmd text
}

@Injectable({ providedIn: 'root' })
export class StorageService {
    /** Today’s key in yyyyMMdd format */
    private todayKey(): string {
        const d = new Date();
        return d.toISOString().slice(0, 10).replace(/-/g, '');
    }

    /** Load a stored diagram (or empty string) */
    load(key?: string): string {
        const k = key ?? this.todayKey();
        return localStorage.getItem(`journal-${k}`) ?? '';
    }

    /** Save a diagram for a key (or today) */
    save(content: string, key?: string): void {
        const k = key ?? this.todayKey();
        localStorage.setItem(`journal-${k}`, content);
    }

    /** All stored date keys, most‑recent first */
    listDates(): string[] {
        return Object.keys(localStorage)
            .filter(k => k.startsWith('journal-'))
            .map(k => k.replace('journal-', ''))
            .sort()
            .reverse();
    }
}
