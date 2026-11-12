// src/app/date-selector/date-selector.component.ts
import {
    Component,
    ChangeDetectionStrategy,
    Output,
    EventEmitter,
    OnInit,
    ChangeDetectorRef,
    inject,
    effect
} from '@angular/core';
import { StorageService } from '../services/storage.service';
import { TaskstickDbService } from '../services/taskstick-db.service';
import { TaskstickStoreService } from '../services/taskstick-store.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-date-selector',
    standalone: true,
    imports: [CommonModule],
    template: `
    <select (change)="choose($event)" [value]="selected">
      <option *ngFor="let d of dates" [value]="d">{{ format(d) }}</option>
    </select>
  `,
    styles: [`
    select { background:#1e293b; color:#fff; border:none; padding:0.3rem; border-radius:4px; font-weight:500; cursor:pointer; }
    option { background:#0f172a; color:#fff; }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateSelectorComponent implements OnInit {
    @Output() dateChange = new EventEmitter<string>();
    dates: string[] = [];
    selected = '';

    private storage = inject(StorageService);
    private db = inject(TaskstickDbService);
    private store = inject(TaskstickStoreService);
    private cdr = inject(ChangeDetectorRef);

    constructor() {
        // Automatically re-render options whenever store.availableDates changes
        effect(() => {
            const storeDates = this.store.availableDates();
            const activeDate = this.store.selectedDateKey();

            if (storeDates && storeDates.length > 0) {
                this.dates = storeDates;
                this.selected = storeDates.includes(activeDate) ? activeDate : storeDates[0];
                this.cdr.markForCheck();
            }
        });
    }

    async ngOnInit() {
        await this.refreshDates();
    }

    async refreshDates(): Promise<void> {
        const sortedDates = await this.store.refreshAvailableDates();
        this.dates = sortedDates;

        const activeDate = this.store.selectedDateKey();
        this.selected = this.dates.includes(activeDate) ? activeDate : this.dates[0];

        this.cdr.markForCheck();
        this.dateChange.emit(this.selected);
    }

    choose(event: Event) {
        const val = (event.target as HTMLSelectElement).value;
        this.selected = val;
        this.dateChange.emit(val);
        this.store.switchDate(val);
    }

    /** Human readable yyyy-MM-dd */
    format(key: string): string {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const todayHyphen = new Date().toISOString().slice(0, 10);
        const isToday = key === today || key === todayHyphen;

        if (key && key.length === 8 && /^\d{8}$/.test(key)) {
            const label = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`;
            return isToday ? `Aujourd'hui (${label})` : label;
        } else if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
            return isToday ? `Aujourd'hui (${key})` : key;
        }
        return key;
    }
}
