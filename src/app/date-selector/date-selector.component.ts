// src/app/date-selector/date-selector.component.ts
import {
    Component,
    ChangeDetectionStrategy,
    Output,
    EventEmitter,
    OnInit
} from '@angular/core';
import { StorageService } from '../services/storage.service';
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
    select { background:#1e293b; color:#fff; border:none; padding:0.3rem; }
    option { background:#0f172a; }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateSelectorComponent implements OnInit {
    @Output() dateChange = new EventEmitter<string>();
    dates: string[] = [];
    selected = '';

    constructor(private storage: StorageService) { }

    ngOnInit() {
        this.dates = this.storage.listDates();
        if (!this.dates.length) {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            this.dates = [today];
        }
        this.selected = this.dates[0];
        this.dateChange.emit(this.selected);
    }

    choose(event: Event) {
        const val = (event.target as HTMLSelectElement).value;
        this.selected = val;
        this.dateChange.emit(val);
    }

    /** Human readable yyyy‑MM‑dd */
    format(key: string) {
        return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`;
    }
}
