// src/app/editor/editor.component.ts
import { Component, ChangeDetectionStrategy, Output, EventEmitter, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { StorageService } from '../services/storage.service';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [FormsModule, MonacoEditorModule],
    template: `
    <div class="editor-container">
        <ngx-monaco-editor
            class="monaco-instance"
            [options]="editorOptions"
            [(ngModel)]="content"
            (ngModelChange)="onChange($event)">
        </ngx-monaco-editor>
    </div>
  `,
    styles: [`
    :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        width: 100%;
        height: 100%;
    }
    .editor-container {
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        background: var(--pane-bg, #0d0d0d);
        border-right: 1px solid var(--border-color, #222);
        overflow: hidden;
    }
    .monaco-instance {
        flex: 1;
        width: 100%;
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorComponent implements OnInit, OnChanges {
    @Input() dark = true;
    content = '';
    @Output() contentChange = new EventEmitter<string>();

    editorOptions = {
        theme: 'vs-dark',
        language: 'markdown',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        padding: { top: 10, bottom: 10 },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: "on",
        renderLineHighlight: 'all',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    };

    constructor(private storage: StorageService, private cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        // Load today’s autosaved diagram (or empty)
        this.content = this.storage.load();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['dark']) {
            this.editorOptions = {
                ...this.editorOptions,
                theme: this.dark ? 'vs-dark' : 'vs'
            };
            this.cdr.markForCheck();
        }
    }

    onChange(val: string) {
        this.contentChange.emit(val);
        this.storage.save(val);            // autosave on every keystroke
    }
}
