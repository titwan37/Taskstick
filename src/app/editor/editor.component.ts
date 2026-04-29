// src/app/editor/editor.component.ts
import { Component, ChangeDetectionStrategy, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../services/storage.service';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [FormsModule],
    template: `
    <textarea
      class="editor"
      [(ngModel)]="content"
      (ngModelChange)="onChange($event)"
      placeholder="Write Mermaid syntax here…"
    ></textarea>
  `,
    styles: [`
    .editor {
      width:100%; height:100%; resize:none;
      font-family:monospace; padding:1rem;
      background:#111; color:#eee; border:1px solid #444;
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorComponent implements OnInit {
    content = '';
    @Output() contentChange = new EventEmitter<string>();

    constructor(private storage: StorageService) { }

    ngOnInit(): void {
        // Load today’s autosaved diagram (or empty)
        this.content = this.storage.load();
    }

    onChange(val: string) {
        this.contentChange.emit(val);
        this.storage.save(val);            // autosave on every keystroke
    }
}
