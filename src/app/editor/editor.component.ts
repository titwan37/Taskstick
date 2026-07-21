// src/app/editor/editor.component.ts
import { Component, ChangeDetectionStrategy, Output, EventEmitter, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { StorageService } from '../services/storage.service';

/** 1. State Data Model (TypeScript Interfaces) */
export type SupportedLanguage = 'fr' | 'en' | 'de';
export type TranslationEngine = 'transformers' | 'native';

export interface MultiLanguageContent {
  fr: string;
  en: string;
  de: string;
}

export interface TabConfig {
  code: SupportedLanguage;
  label: string;
  flag: string;
}

export interface MultiLangEditorState {
  activeLang: SupportedLanguage;
  contents: MultiLanguageContent;
  lastSavedContents: MultiLanguageContent;
  isDirty: Record<SupportedLanguage, boolean>;
  errors: Record<SupportedLanguage, string | null>;
  isTranslating: boolean;
  hasNativeTranslationSupport: boolean;
  translationEngine: TranslationEngine;
  modelLoadingProgress: number | null;
  activeModelName: string | null;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorModule],
  template: `
    <div class="multi-lang-editor flex-column">
      <!-- Tab Bar -->
      <div class="editor-tab-bar">
        <div class="tab-group">
          <button
            *ngFor="let tab of tabs"
            type="button"
            class="lang-tab"
            [class.active]="state.activeLang === tab.code"
            [class.has-dirty]="state.isDirty[tab.code]"
            [class.has-error]="!!state.errors[tab.code]"
            (click)="switchTab(tab.code)">
            <span class="tab-flag">{{ tab.flag }}</span>
            <span class="tab-label">{{ tab.label }}</span>
            <span *ngIf="state.isDirty[tab.code]" class="dirty-indicator" title="Unsaved changes">•</span>
          </button>
        </div>

        <!-- Engine Selector & Actions -->
        <div class="editor-actions">
          <!-- Engine Selector Toggle -->
          <div class="engine-toggle-group">
            <button
              type="button"
              class="btn-engine"
              [class.active]="state.translationEngine === 'transformers'"
              (click)="setEngine('transformers')"
              title="Hugging Face @xenova/transformers (ONNX In-Browser Model)">
              🤗 Transformers.js
            </button>
            <button
              type="button"
              class="btn-engine"
              [class.active]="state.translationEngine === 'native'"
              (click)="setEngine('native')"
              title="Chrome/Edge Native On-Device Translation API">
              🌐 Web Native
            </button>
          </div>

          <!-- Translate Action Button -->
          <button
            type="button"
            class="btn-action btn-translate"
            [disabled]="state.isTranslating"
            (click)="triggerTranslation()"
            [title]="state.translationEngine === 'transformers' ? 'Translate using Hugging Face In-Browser Neural Network' : 'Translate using Browser Native API'">
            <span class="icon">{{ state.isTranslating ? '⏳' : '🤖' }}</span>
            {{ state.isTranslating ? (state.modelLoadingProgress !== null ? ('Downloading ' + state.modelLoadingProgress + '%') : 'Translating...') : 'AI Translate' }}
            <span class="badge-engine">{{ state.translationEngine === 'transformers' ? 'ONNX HF' : 'NATIVE' }}</span>
          </button>

          <button type="button" class="btn-action" (click)="triggerDisplay()">
            <span class="icon">👁️</span> Display ({{ state.activeLang | uppercase }})
          </button>
          <button type="button" class="btn-action btn-primary" (click)="triggerExport()">
            <span class="icon">📥</span> Export ({{ state.activeLang | uppercase }})
          </button>
        </div>
      </div>

      <!-- Error / Validation Banner -->
      <div *ngIf="state.errors[state.activeLang]" class="editor-banner error-banner">
        ⚠️ {{ state.errors[state.activeLang] }}
      </div>

      <!-- Model Download Progress Banner -->
      <div *ngIf="state.modelLoadingProgress !== null" class="editor-banner progress-banner">
        🔄 <strong>Downloading Neural Model ({{ state.activeModelName }}):</strong> {{ state.modelLoadingProgress }}% complete. Cached locally in browser for offline reuse.
      </div>

      <!-- Engine Info Banner -->
      <div *ngIf="state.translationEngine === 'transformers'" class="editor-banner info-banner">
        🤗 <strong>Hugging Face Transformers.js Active:</strong> Powered by Meta opus-mt ONNX models running directly in WebAssembly/WebGPU on your machine.
      </div>
      <div *ngIf="state.translationEngine === 'native' && !state.hasNativeTranslationSupport" class="editor-banner warning-banner">
        💡 <strong>On-Device Native API Tip:</strong> Enable Chrome/Edge flag <code>chrome://flags/#translation-api</code> or switch to <strong>Transformers.js</strong> above.
      </div>

      <!-- Monaco Editor Canvas Area -->
      <div class="editor-container">
        <ngx-monaco-editor
          class="monaco-instance"
          [options]="editorOptions"
          [ngModel]="currentContent"
          (ngModelChange)="onContentChange($event)">
        </ngx-monaco-editor>
      </div>
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
    .multi-lang-editor {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: 100%;
      background: var(--pane-bg, #0d0d0d);
    }
    .editor-tab-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #18181b;
      border-bottom: 1px solid #27272a;
      padding: 0 12px;
      height: 42px;
      user-select: none;
    }
    .tab-group {
      display: flex;
      gap: 4px;
      height: 100%;
    }
    .lang-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #a1a1aa;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .lang-tab:hover {
      color: #f4f4f5;
      background: rgba(39, 39, 42, 0.25);
    }
    .lang-tab.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
      background: rgba(39, 39, 42, 0.5);
    }
    .lang-tab.has-dirty {
      font-style: italic;
    }
    .lang-tab.has-error {
      color: #f87171;
    }
    .dirty-indicator {
      color: #f59e0b;
      font-size: 18px;
      line-height: 0;
    }
    .editor-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .engine-toggle-group {
      display: flex;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 4px;
      padding: 2px;
      gap: 2px;
    }
    .btn-engine {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-weight: 500;
    }
    .btn-engine:hover {
      color: #e4e4e7;
    }
    .btn-engine.active {
      background: #27272a;
      color: #38bdf8;
      font-weight: 600;
    }
    .btn-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 4px;
      border: 1px solid #3f3f46;
      background: #27272a;
      color: #e4e4e7;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-action:hover {
      background: #3f3f46;
    }
    .btn-action.btn-translate {
      border-color: #7c3aed;
      background: #4c1d95;
      color: #ddd6fe;
    }
    .btn-action.btn-translate:hover {
      background: #5b21b6;
    }
    .btn-action.btn-primary {
      background: #0284c7;
      border-color: #0369a1;
      color: #ffffff;
    }
    .btn-action.btn-primary:hover {
      background: #0369a1;
    }
    .badge-engine {
      font-size: 9px;
      background: #a855f7;
      color: #fff;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 700;
    }
    .editor-banner {
      padding: 6px 16px;
      font-size: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .error-banner {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border-bottom-color: rgba(239, 68, 68, 0.3);
    }
    .info-banner {
      background: rgba(168, 85, 247, 0.12);
      color: #d8b4fe;
      border-bottom-color: rgba(168, 85, 247, 0.25);
    }
    .warning-banner {
      background: rgba(234, 179, 8, 0.12);
      color: #fef08a;
      border-bottom-color: rgba(234, 179, 8, 0.25);
    }
    .progress-banner {
      background: rgba(14, 165, 233, 0.15);
      color: #7dd3fc;
      border-bottom-color: rgba(14, 165, 233, 0.3);
    }
    .editor-container {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
      background: var(--pane-bg, #0d0d0d);
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
  @Input() initialContents?: Partial<MultiLanguageContent>;
  @Input() set content(val: string) {
    if (val !== undefined && val !== null) {
      this.state.contents[this.state.activeLang] = val;
    }
  }
  get content(): string {
    return this.state.contents[this.state.activeLang] || '';
  }

  @Output() contentChange = new EventEmitter<{ lang: SupportedLanguage; content: string }>();
  @Output() activeLangChange = new EventEmitter<SupportedLanguage>();

  readonly tabs: TabConfig[] = [
    { code: 'fr', label: 'French (FR)', flag: '🇫🇷' },
    { code: 'en', label: 'English (EN)', flag: '🇬🇧' },
    { code: 'de', label: 'German (DE)', flag: '🇩🇪' }
  ];

  readonly FALLBACK_LANG: SupportedLanguage = 'en';

  private pipelines = new Map<string, any>();
  private pipelinePromises = new Map<string, Promise<any>>();

  state: MultiLangEditorState = {
    activeLang: 'fr',
    contents: { fr: '', en: '', de: '' },
    lastSavedContents: { fr: '', en: '', de: '' },
    isDirty: { fr: false, en: false, de: false },
    errors: { fr: null, en: null, de: null },
    isTranslating: false,
    hasNativeTranslationSupport: false,
    translationEngine: 'transformers',
    modelLoadingProgress: null,
    activeModelName: null
  };

  editorOptions = {
    theme: 'vs-dark',
    language: 'markdown',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 12,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    padding: { top: 10, bottom: 10 },
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on' as const,
    renderLineHighlight: 'all' as const,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
  };

  constructor(private storage: StorageService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.checkNativeTranslationSupport();

    const loadedFr = this.storage.load('fr');
    const loadedEn = this.storage.load('en');
    const loadedDe = this.storage.load('de');

    const contents: MultiLanguageContent = {
      fr: loadedFr || this.initialContents?.fr || '',
      en: loadedEn || this.initialContents?.en || '',
      de: loadedDe || this.initialContents?.de || ''
    };

    this.state.contents = { ...contents };
    this.state.lastSavedContents = { ...contents };
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

  get currentContent(): string {
    return this.state.contents[this.state.activeLang] || '';
  }

  setEngine(engine: TranslationEngine): void {
    this.state.translationEngine = engine;
    this.cdr.markForCheck();
  }

  private checkNativeTranslationSupport(): void {
    const nav = typeof self !== 'undefined' ? (self as any) : (window as any);
    this.state.hasNativeTranslationSupport = !!(nav?.translation || nav?.ai?.translator || nav?.translationFactory);
  }

  private getBestSourceLanguage(targetLang: SupportedLanguage): SupportedLanguage {
    const priority: SupportedLanguage[] = targetLang === 'de' ? ['en', 'fr'] : targetLang === 'fr' ? ['en', 'de'] : ['fr', 'de'];
    for (const lang of priority) {
      if (this.state.contents[lang]?.trim()) {
        return lang;
      }
    }
    return priority[0];
  }

  async switchTab(targetLang: SupportedLanguage): Promise<void> {
    // Guard clause: stop execution if already translating or clicking active tab
    if (this.state.isTranslating || this.state.activeLang === targetLang) {
      return;
    }

    const previousLang = this.state.activeLang;
    this.validateContent(previousLang);

    const sourceLang = this.state.contents[previousLang]?.trim() ? previousLang : this.getBestSourceLanguage(targetLang);
    const sourceContent = this.state.contents[sourceLang]?.trim() || '';

    const sourceLineCount = sourceContent.split(/\r\n|\r|\n/).filter(l => l.trim()).length;
    const targetContent = this.state.contents[targetLang] || '';
    const targetLineCount = targetContent.split(/\r\n|\r|\n/).filter(l => l.trim()).length;

    this.state.activeLang = targetLang;
    this.activeLangChange.emit(targetLang);

    // Auto-translate if target is empty OR target is corrupted single-line while source has multiple lines
    const targetNeedsTranslation = !targetContent.trim() || (sourceLineCount > 1 && targetLineCount <= 1);

    if (targetNeedsTranslation && sourceContent) {
      await this.runTranslationPipeline(sourceLang, targetLang, sourceContent);
    }

    this.cdr.markForCheck();
  }

  onContentChange(val: string): void {
    const lang = this.state.activeLang;
    this.state.contents[lang] = val;
    this.state.isDirty[lang] = val !== this.state.lastSavedContents[lang];

    this.validateContent(lang);

    this.contentChange.emit({ lang, content: val });
    this.storage.save(val, lang);
    this.state.lastSavedContents[lang] = val;
    this.state.isDirty[lang] = false;
    this.cdr.markForCheck();
  }

  async triggerTranslation(): Promise<void> {
    const currentLang = this.state.activeLang;
    const sourceLang = this.getBestSourceLanguage(currentLang);
    const sourceContent = this.state.contents[sourceLang]?.trim();

    if (!sourceContent) {
      alert('No source text available to translate.');
      return;
    }

    await this.runTranslationPipeline(sourceLang, currentLang, sourceContent);
  }

  private async runTranslationPipeline(
    sourceLang: SupportedLanguage,
    targetLang: SupportedLanguage,
    text: string
  ): Promise<void> {
    this.state.isTranslating = true;
    this.state.errors[targetLang] = null;
    this.cdr.markForCheck();

    try {
      // Opus-MT direct models exist for fr<->en and en<->de, but NOT fr<->de.
      // Pivot through English ('en') when translating directly between French ('fr') and German ('de').
      if ((sourceLang === 'fr' && targetLang === 'de') || (sourceLang === 'de' && targetLang === 'fr')) {
        const intermediateLang: SupportedLanguage = 'en';

        // Step 1: Translate source to English
        const englishText = await this.executeSingleTranslationPass(sourceLang, intermediateLang, text);
        if (!englishText) return;

        // Auto-fill English tab buffer if empty
        if (!this.state.contents[intermediateLang]?.trim()) {
          this.state.contents[intermediateLang] = englishText;
          this.storage.save(englishText, intermediateLang);
        }

        // Step 2: Translate English to target (de or fr)
        const targetText = await this.executeSingleTranslationPass(intermediateLang, targetLang, englishText);
        if (targetText) {
          this.state.contents[targetLang] = targetText;
          this.storage.save(targetText, targetLang);
          this.state.isDirty[targetLang] = false;
        }
        return;
      }

      // Direct translation for fr<->en and en<->de
      const translatedText = await this.executeSingleTranslationPass(sourceLang, targetLang, text);
      if (translatedText) {
        this.state.contents[targetLang] = translatedText;
        this.storage.save(translatedText, targetLang);
        this.state.isDirty[targetLang] = false;
      }
    } catch (err) {
      console.error('[Translation Error]', err);
      this.state.errors[targetLang] = `Translation failed: ${(err as Error).message || err}`;
    } finally {
      this.state.isTranslating = false;
      this.state.modelLoadingProgress = null;
      this.cdr.markForCheck();
    }
  }

  private async getTransformersPipeline(sourceLang: SupportedLanguage, targetLang: SupportedLanguage): Promise<any> {
    const modelPair = `${sourceLang}-${targetLang}`;
    const modelKey = `Xenova/opus-mt-${modelPair}`;

    // 1. Return cached instance if already loaded
    if (this.pipelines.has(modelKey)) {
      return this.pipelines.get(modelKey);
    }

    // 2. Return pending initialization promise if already in progress (Prevents infinite loop!)
    if (this.pipelinePromises.has(modelKey)) {
      return this.pipelinePromises.get(modelKey);
    }

    const pipelinePromise = (async () => {
      this.state.activeModelName = modelKey;
      this.state.modelLoadingProgress = 0;
      this.cdr.markForCheck();

      const transformersApi = await (eval(`import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2')`) as Promise<any>);
      const pipeline = transformersApi.pipeline;
      const env = transformersApi.env;

      if (env) {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        // Disable ONNX C++ graph optimization warning logs that swamp the console
        if (env.backends?.onnx) {
          env.backends.onnx.logLevel = 'error';
          if (env.backends.onnx.wasm) {
            env.backends.onnx.wasm.numThreads = 1;
          }
        }
      }

      const translator = await pipeline('translation', modelKey, {
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && typeof progress.progress === 'number') {
            this.state.modelLoadingProgress = Math.round(progress.progress);
            this.cdr.markForCheck();
          }
        }
      });

      this.pipelines.set(modelKey, translator);
      this.pipelinePromises.delete(modelKey);
      this.state.modelLoadingProgress = null;
      this.cdr.markForCheck();
      return translator;
    })();

    this.pipelinePromises.set(modelKey, pipelinePromise);
    return pipelinePromise;
  }

  private async executeSingleTranslationPass(
    sourceLang: SupportedLanguage,
    targetLang: SupportedLanguage,
    text: string
  ): Promise<string | null> {
    if (this.state.translationEngine === 'transformers') {
      const translator = await this.getTransformersPipeline(sourceLang, targetLang);
      return await this.translatePreservingStructure(text, async (chunks: string[]) => {
        const output = await translator(chunks);
        if (Array.isArray(output)) {
          return output.map((item: any) => item?.translation_text || '');
        }
        return [output?.translation_text || ''];
      });
    } else {
      const globalObj = typeof self !== 'undefined' ? (self as any) : (window as any);
      const translationApi = globalObj.translation || globalObj.ai?.translator;
      if (!translationApi) {
        throw new Error(`Native translation API unavailable. Switch engine to Transformers.js.`);
      }
      const translator = await translationApi.createTranslator({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      });
      return await this.translatePreservingStructure(text, async (chunks: string[]) => {
        const results: string[] = [];
        for (const chunk of chunks) {
          results.push(await translator.translate(chunk));
        }
        return results;
      });
    }
  }

  /** Helper to preserve line breaks, indentation, and Mermaid (.mmd) syntax using batching */
  private async translatePreservingStructure(
    text: string,
    translateBatchFn: (chunks: string[]) => Promise<string[]>
  ): Promise<string> {
    const lines = text.split(/\r\n|\r|\n/);

    // 1. Identify non-syntax, non-empty content lines to batch translate
    const batchItems: { lineIndex: number; content: string }[] = [];

    lines.forEach((line, lineIndex) => {
      if (!line.trim()) return;
      const content = line.trim();
      if (this.isSyntaxLine(content)) return;
      batchItems.push({ lineIndex, content });
    });

    if (batchItems.length === 0) {
      return text;
    }

    // 2. Process in 5-line micro-batches and yield to browser UI thread to prevent WASM/UI freeze
    const BATCH_SIZE = 5;
    const translatedResults: string[] = [];
    const contentsOnly = batchItems.map(item => item.content);

    for (let i = 0; i < contentsOnly.length; i += BATCH_SIZE) {
      const chunkBatch = contentsOnly.slice(i, i + BATCH_SIZE);
      try {
        const batchOutput = await translateBatchFn(chunkBatch);
        translatedResults.push(...batchOutput);
      } catch (err) {
        console.warn('[Micro-batch Translation Failed, keeping original content]', err);
        translatedResults.push(...chunkBatch);
      }
      // Yield execution to event loop so Angular UI remains responsive
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Map results back by line index
    const resultMap = new Map<number, string>();
    batchItems.forEach((item, idx) => {
      const res = translatedResults[idx] || item.content;
      const clean = res.replace(/[\r\n]+/g, ' ').trim();
      resultMap.set(item.lineIndex, clean);
    });

    // 3. Reconstruct lines with exact indentation preserved
    const finalLines: string[] = [];
    lines.forEach((line, lineIndex) => {
      if (!line.trim() || this.isSyntaxLine(line.trim())) {
        finalLines.push(line);
      } else {
        const leadingIndent = line.match(/^[\t ]*/)?.[0] || '';
        const translatedContent = resultMap.get(lineIndex) ?? line.trim();
        finalLines.push(leadingIndent + translatedContent);
      }
    });

    return finalLines.join('\n');
  }

  private isSyntaxLine(content: string): boolean {
    const syntaxRegex = /^(graph\s+(TD|TB|BT|RL|LR)|flowchart\s+(TD|TB|BT|RL|LR)|sequenceDiagram|gantt|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gitGraph|pie|quadrantChart|architectureDiagram|c4Diagram|mindmap|timeline|zenuml|sankey|block-beta|subgraph\s+[A-Za-z0-9_]+$|end$|classDef\s|style\s|linkStyle\s|click\s|```)/i;
    return syntaxRegex.test(content);
  }

  triggerDisplay(): void {
    const resolvedContent = this.getResolvedContentWithFallback(this.state.activeLang);
    this.dispatchDynamicAction('display', this.state.activeLang, resolvedContent);
  }

  triggerExport(): void {
    const lang = this.state.activeLang;
    if (!this.validateContent(lang)) {
      return;
    }
    const resolvedContent = this.getResolvedContentWithFallback(lang);
    this.dispatchDynamicAction('export', lang, resolvedContent);
  }

  private dispatchDynamicAction(operation: 'display' | 'export', lang: SupportedLanguage, content: string): void {
    const methodName = `${operation}_${lang}` as keyof this;
    if (typeof this[methodName] === 'function') {
      (this[methodName] as Function)(content);
    } else {
      console.warn(`[Dispatcher] Handler method ${String(methodName)} is not implemented.`);
    }
  }

  display_fr(content: string): void {
    console.log('[FR Display]', content);
    alert(`[French Preview]\n\n${content || '(Vide)'}`);
  }

  display_en(content: string): void {
    console.log('[EN Display]', content);
    alert(`[English Preview]\n\n${content || '(Empty)'}`);
  }

  display_de(content: string): void {
    console.log('[DE Display]', content);
    alert(`[German Preview]\n\n${content || '(Leer)'}`);
  }

  export_fr(content: string): void {
    this.downloadFile(content, 'document_fr.md', 'text/markdown;charset=utf-8');
  }

  export_en(content: string): void {
    this.downloadFile(content, 'document_en.md', 'text/markdown;charset=utf-8');
  }

  export_de(content: string): void {
    this.downloadFile(content, 'document_de.md', 'text/markdown;charset=utf-8');
  }

  private getResolvedContentWithFallback(lang: SupportedLanguage): string {
    const primary = this.state.contents[lang];
    if (primary && primary.trim().length > 0) {
      return primary;
    }

    const fallback =
      this.state.contents[this.FALLBACK_LANG] ||
      this.state.contents.fr ||
      this.state.contents.de ||
      '';

    if (fallback) {
      console.info(`[Fallback Engine] Language '${lang}' content is empty. Falling back to primary content.`);
    }
    return fallback;
  }

  private validateContent(lang: SupportedLanguage): boolean {
    const content = this.state.contents[lang];
    if (!content || content.trim().length === 0) {
      this.state.errors[lang] = `Content for '${lang.toUpperCase()}' is currently empty.`;
      return true;
    }

    this.state.errors[lang] = null;
    return true;
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
