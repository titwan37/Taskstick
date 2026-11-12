// src/app/services/ai-agent.service.ts
import { Injectable } from '@angular/core';
import { TaskstickStoreService } from './taskstick-store.service';
import { TranslationWorkerRequest, TranslationWorkerResponse } from '../workers/translation.worker';
import {
  ADHDPostItNote,
  PostItEdge,
  PostItColor,
  PostItNature,
  PostItComplexity, 
  ParalysisEnemyType,
  CognitiveLoad,
  RelationType
} from '../models/taskstick-graph.model';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
export const SERVER_DEFAULT_MODEL = 'qwen3:1.7b';

export const FALLBACK_MODELS = [
  'qwen3:1.7b',
  'qwen2.5-coder:7b',
  'llama3.2:3b',
  'openclaw-brain:latest',
  'qwen2.5:7b',
  'mistral-7b:latest',
  'deepseek-r1:8b',
  'deepseek-coder-v2:lite',
];

export const TASKSTICK_SYSTEM_PROMPT = `# ROLE AND IDENTITY
You are the sovereign AI Intelligence Assistant for "Taskstick", a visual cognitive ADHD task and ideation management system. Your purpose is to turn vague ideas and overwhelming initiatives into clear, atomic, non-intimidating sub-steps (<= 20 min) and concise, high-value summaries.

# OPERATIONAL DIRECTIVES
1. EXECUTIVE DYSFUNCTION MITIGATION: Break tasks into concrete, low-friction micro-actions with estimated duration.
2. CONCISE GROUNDING: Provide direct, action-oriented answers without conversational fluff, moralizing, or verbose preambles.
3. STRUCTURED OUTPUT: Return actionable bullet points or structured Markdown blocks.`;

export interface ExtractedAction {
  type: 'task' | 'event' | 'email';
  title: string;
  raw: string;
}

export interface OllamaModelInfo {
  online: boolean;
  endpoint: string;
  models: string[];
  selectedModel: string;
}



export interface GhostNodePrediction {
  title: string;
  nature: PostItNature;
  relationToSource: RelationType;
  estimatedMinutes: number;
  color: PostItColor;
}

export interface AutoTriageResult {
  cleanTitle: string;
  nature: PostItNature;
  complexity: PostItComplexity;
  cognitiveLoad: CognitiveLoad;
  estimatedMinutes: number;
  suggestedColor: PostItColor;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class AiAgentService {
  private translationWorker: Worker | null = null;
  private pendingTranslations = new Map<
    string,
    { resolve: (val: string) => void; reject: (err: any) => void }
  >();

  private ollamaEndpoint = DEFAULT_OLLAMA_ENDPOINT;
  private selectedModel = SERVER_DEFAULT_MODEL;
  private availableModels: string[] = [...FALLBACK_MODELS];
  private isOllamaOnline = false;

  constructor() {
    this.initTranslationWorker();
    this.restoreModelPreferences();
    this.probeOllama();
  }

  getEndpoint(): string {
    return this.ollamaEndpoint;
  }

  setEndpoint(url: string): void {
    this.ollamaEndpoint = (url || DEFAULT_OLLAMA_ENDPOINT).replace(/\/$/, '');
    this.probeOllama();
  }

  getSelectedModel(): string {
    return this.selectedModel;
  }

  setSelectedModel(model: string): void {
    this.selectedModel = model || SERVER_DEFAULT_MODEL;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('taskstick_selected_model', this.selectedModel);
      } catch (_e) {}
    }
  }

  getAvailableModels(): string[] {
    return this.availableModels;
  }

  isOnline(): boolean {
    return this.isOllamaOnline;
  }

  private restoreModelPreferences(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('taskstick_selected_model');
        if (stored) {
          this.selectedModel = stored;
        }
      } catch (_e) {}
    }
  }

  /**
   * Probes Ollama localhost instance (/api/tags) with timeout.
   * Falls back to sovereign FALLBACK_MODELS if unreachable.
   */
  async probeOllama(): Promise<OllamaModelInfo> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.ollamaEndpoint}/api/tags`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawModels: string[] = (data.models || [])
          .map((m: any) => m.name || m.model)
          .filter(Boolean);

        if (rawModels.length > 0) {
          this.availableModels = rawModels;
          this.isOllamaOnline = true;
          if (!this.availableModels.includes(this.selectedModel)) {
            this.selectedModel = this.availableModels.includes(SERVER_DEFAULT_MODEL)
              ? SERVER_DEFAULT_MODEL
              : this.availableModels[0];
          }
          return {
            online: true,
            endpoint: this.ollamaEndpoint,
            models: this.availableModels,
            selectedModel: this.selectedModel,
          };
        }
      }
    } catch (_err) {
      // Fallback
    }

    this.isOllamaOnline = false;
    this.availableModels = [...FALLBACK_MODELS];
    return {
      online: false,
      endpoint: this.ollamaEndpoint,
      models: this.availableModels,
      selectedModel: this.selectedModel,
    };
  }

    // Inside AiAgentService (src/app/services/ai-agent.service.ts)
    async diagnoseParalysisAndIgnite(note: ADHDPostItNote, upstreamTitles: string[], downstreamTitles: string[]): Promise<{
      enemyType: ParalysisEnemyType;
      enemyName: string;
      ignitionStep: string;
      microSteps: string[];
    }> {
      const prompt = `
    Task Title: "${note.title}"
    Details: "${note.content || 'None'}"
    Upstream Prerequisites: ${upstreamTitles.join(', ') || 'None'}
    Downstream Dependents Unlocked (${downstreamTitles.length}): ${downstreamTitles.join(', ') || 'None'}

    Diagnose why an AuDHD engineer would stall on this node. Nominate the Enemy, give a <=2 min physical Ignition Step, and 3 micro-steps. Respond in JSON.`;

      const raw = await this.generateCompletion(prompt); // Uses your existing Ollama fetch pipeline
      if (!raw) {
        throw new Error('No completion returned from AI engine');
      }
      try {
        const cleanJson = raw.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch {
        return {
          enemyType: 'AMBIGUITY_FOG',
          enemyName: 'Point d’entrée flou',
          ignitionStep: `Ouvrir le fichier lié à "${note.title}" et écrire un commentaire TODO de 1 ligne.`,
          microSteps: ['Définir l’entrée/sortie attendue', 'Coder le cas minimal', 'Valider et cocher']
        };
      }
    }

        /**
     * High-speed structured JSON inference optimized for qwen3:1.7b.
     * Uses `think: false` and strict JSON Schema grammar enforcement for <250ms latency.
     */
    async generateStructuredFast<T>(
      userPrompt: string,
      jsonSchema: Record<string, any>,
      systemPrompt = 'Tu es le copilote cognitif temps-réel de Taskstick. Réponds strictement en JSON.'
    ): Promise<T | null> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${this.ollamaEndpoint}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.selectedModel, // 'qwen3:1.7b'
            messages: [
              { role: 'system', content: systemPrompt },
              // Prepend /no_think to guarantee instant non-reasoning output on Qwen3
              { role: 'user', content: `/no_think\n${userPrompt}` }
            ],
            stream: false,
            think: false,
            format: jsonSchema,
            options: {
              temperature: 0.2,
              num_ctx: 2048,     // Small context window = ultra-fast KV cache on GPU/CPU
              num_predict: 256
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const raw = data?.message?.content;
          if (raw) {
            return JSON.parse(raw) as T;
          }
        }
      } catch (e) {
        console.warn('[AiAgent FastStructured] Fallback triggered:', e);
      }
      return null;
    }


  /**
   * Generates completion using Ollama /api/chat with fallback to heuristic logic
   */
  async generateCompletion(
    userPrompt: string,
    systemPrompt: string = TASKSTICK_SYSTEM_PROMPT
  ): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${this.ollamaEndpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 1024,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data?.message?.content;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch (e) {
      console.warn('[AiAgent] Ollama completion offline or timed out, using fallback heuristics:', e);
    }
    return null;
  }

  private initTranslationWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.translationWorker = new Worker(
          new URL('../workers/translation.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.translationWorker.onmessage = (event: MessageEvent<TranslationWorkerResponse>) => {
          const resp = event.data;
          if (!resp || !resp.id) return;
          const handler = this.pendingTranslations.get(resp.id);
          if (!handler) return;

          if (resp.type === 'result') {
            handler.resolve(resp.translatedText || '');
            this.pendingTranslations.delete(resp.id);
          } else if (resp.type === 'error') {
            handler.reject(new Error(resp.error || 'Translation worker inference error'));
            this.pendingTranslations.delete(resp.id);
          }
        };

        this.translationWorker.onerror = (err) => {
          console.warn('Translation Web Worker error:', err);
        };
      } catch (err) {
        console.warn('Web Worker initialization skipped or unsupported:', err);
      }
    }
  }

  /**
   * Run multi-language translation via off-thread Web Worker
   */
  translateWithWorker(
    text: string,
    sourceLang: 'fr' | 'en' | 'de',
    targetLang: 'fr' | 'en' | 'de'
  ): Promise<string> {
    if (sourceLang === targetLang || !text || text.trim().length === 0) {
      return Promise.resolve(text);
    }

    if (!this.translationWorker) {
      this.initTranslationWorker();
    }

    if (!this.translationWorker) {
      return Promise.reject(new Error('Web Worker translation is not available in this environment.'));
    }

    const id = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const req: TranslationWorkerRequest = {
      id,
      type: 'translate',
      text,
      sourceLang,
      targetLang
    };

    return new Promise<string>((resolve, reject) => {
      this.pendingTranslations.set(id, { resolve, reject });
      this.translationWorker!.postMessage(req);

      // 60-second safety timeout
      setTimeout(() => {
        if (this.pendingTranslations.has(id)) {
          this.pendingTranslations.delete(id);
          reject(new Error('Translation worker request timed out.'));
        }
      }, 60000);
    });
  }

  /**
   * ADHD Goblin Decomposer:
   * Breaks down an overwhelming task into 3-4 concrete, non-intimidating sub-steps
   * strictly sized at <= 20 minutes each to overcome executive dysfunction.
   * Leverages Ollama (qwen3:1.7b) if reachable, falling back to sovereign pattern matching.
   */
  async decomposeTask(note: ADHDPostItNote): Promise<string[]> {
    const rawTitle = (note.title || '').trim();

    // Try generative LLM prompt first if online
    if (this.isOllamaOnline) {
      const prompt = `Décompose cette tâche en 3 ou 4 sous-actions concrètes, non-intimidantes, de 5 à 15 minutes max pour une personne TDAH.
Tâche : "${rawTitle}"
Réponds UNIQUEMENT sous la forme d'une liste de 3 ou 4 lignes commençant par un tiret avec le temps estimé entre parenthèses, sans intro ni blabla. Exemple:
- Ouvrir le dossier et vérifier les pièces requises (5 min)
- Rédiger la première version (15 min)
- Relire et valider l'envoi (10 min)`;

      const llmResult = await this.generateCompletion(prompt);
      if (llmResult) {
        const lines = llmResult
          .split('\n')
          .map(l => l.replace(/^[-*•\d.)\s]+/, '').trim())
          .filter(l => l.length > 5);

        if (lines.length >= 2) {
          return lines.slice(0, 5);
        }
      }
    }

    const lower = rawTitle.toLowerCase();

    // 1. Technical / Dev tasks
    if (
      lower.includes('code') ||
      lower.includes('bug') ||
      lower.includes('api') ||
      lower.includes('feature') ||
      lower.includes('service') ||
      lower.includes('refactor') ||
      lower.includes('component') ||
      lower.includes('développer')
    ) {
      return [
        `Ouvrir l'environnement de code et isoler le fichier cible (5 min)`,
        `Lire la spécification ou reproduire le cas d'usage (10 min)`,
        `Rédiger le composant ou corriger la fonction clé (15 min)`,
        `Tester l'exécution et committer la modification (10 min)`
      ];
    }

    // 2. Writing / Documentation / Email
    if (
      lower.includes('rédiger') ||
      lower.includes('écrire') ||
      lower.includes('doc') ||
      lower.includes('rapport') ||
      lower.includes('mail') ||
      lower.includes('spec') ||
      lower.includes('article')
    ) {
      return [
        `Ouvrir le document vierge et lister 3 puces clés (5 min)`,
        `Rédiger le premier paragraphe sans retoucher (15 min)`,
        `Relire et ajuster les formulations principales (10 min)`,
        `Envoyer ou publier le livrable terminé (5 min)`
      ];
    }

    // 3. Organization / Administrative / Cleaning
    if (
      lower.includes('ranger') ||
      lower.includes('trier') ||
      lower.includes('payer') ||
      lower.includes('facture') ||
      lower.includes('impôt') ||
      lower.includes('dossier') ||
      lower.includes('nettoyer') ||
      lower.includes('bureau')
    ) {
      return [
        `Rassembler tous les documents sur la table (5 min)`,
        `Trier en 2 piles : à traiter vs à archiver (10 min)`,
        `Numériser ou payer le document prioritaire (10 min)`,
        `Classer le dossier et libérer le bureau (5 min)`
      ];
    }

    // 4. Meeting / Presentation / Coordination
    if (
      lower.includes('réunion') ||
      lower.includes('meeting') ||
      lower.includes('présentation') ||
      lower.includes('call') ||
      lower.includes('sync') ||
      lower.includes('appeler')
    ) {
      return [
        `Ouvrir l'invitation et noter 2 objectifs clés (5 min)`,
        `Lire les notes préalables et préparer 1 question (10 min)`,
        `Participer activement et noter les décisions (15 min)`,
        `Envoyer 3 puces récapitulatives d'action (10 min)`
      ];
    }

    // 5. Generic ADHD-Friendly Decomposer fallback
    return [
      `Ouvrir les outils nécessaires pour "${rawTitle}" (5 min)`,
      `Lire ou définir le premier micro-pas sans distraction (10 min)`,
      `Rédiger ou exécuter la tranche concrète la plus accessible (15 min)`,
      `Vérifier le livrable et savourer la fin d'étape (5 min)`
    ];
  }

  /**
   * Decompose an overwhelming note and automatically spawn sub-notes
   * placed in a neat vertical cascade below the parent note, joined in a common cluster
   * with 'depends_on' relation edges.
   */
  async decomposeAndCluster(note: ADHDPostItNote, store: TaskstickStoreService): Promise<ADHDPostItNote[]> {
    const subSteps = await this.decomposeTask(note);
    const clusterId = note.clusterId || `cluster_${Date.now()}`;
    
    // Ensure parent note has the clusterId assigned
    if (!note.clusterId) {
      store.updateNote(note.id, { clusterId });
    }

    const createdSubNotes: ADHDPostItNote[] = [];
    let previousSubNoteId = note.id;

    const colors: PostItColor[] = ['yellow', 'blue', 'green', 'pink'];

    for (let i = 0; i < subSteps.length; i++) {
      const stepTitle = subSteps[i];
      const subNote = await store.addNote({
        title: stepTitle,
        color: colors[i % colors.length],
        position: {
          x: note.position.x + (i + 1) * 30,
          y: note.position.y + 160 + i * 150
        },
        clusterId,
        tags: [...(note.tags || []), 'sous-tâche'],
        cognitiveLoad: 'low',
        estimatedMinutes: 15
      });

      createdSubNotes.push(subNote);

      // Create topological dependency link: previous step -> current step
      await store.addEdge(previousSubNoteId, subNote.id, 'depends_on');
      previousSubNoteId = subNote.id;
    }

    // UC2: Auto-enrich parent thema with knowledge and subtasks summary
    await this.enrichThemaWithKnowledge(note, createdSubNotes, store);

    return createdSubNotes;
  }

  /**
   * UC2: Detects whether a title contains an action verb.
   * If false, the note is typically a conceptual "Thema" rather than a subtask.
   */
  hasActionVerb(title: string): boolean {
    if (!title || !title.trim()) return false;
    const lower = title.toLowerCase().trim();
    const actionVerbs = [
      'faire', 'créer', 'coder', 'dev', 'développer', 'tester', 'écrire', 'rédiger',
      'envoyer', 'appeler', 'corriger', 'préparer', 'installer', 'configurer', 'nettoyer',
      'ranger', 'acheter', 'payer', 'analyser', 'valider', 'publier', 'fixer', 'ajouter',
      'modifier', 'supprimer', 'organiser', 'résoudre', 'trier', 'lancer', 'vérifier',
      'relire', 'découper', 'imprimer', 'scanner', 'réserver', 'planifier',
      'build', 'create', 'write', 'fix', 'test', 'send', 'call', 'clean', 'buy', 'pay',
      'setup', 'add', 'check', 'review', 'deploy', 'refactor', 'solve', 'start'
    ];
    return actionVerbs.some(verb => new RegExp(`\\b${verb}`, 'i').test(lower));
  }

  /**
   * UC2: Enriches a parent Thema's description spot (`content`)
   * by synthesizing previous knowledge and current subtask context.
   */
  async enrichThemaWithKnowledge(
    themaNote: ADHDPostItNote,
    subtasks: ADHDPostItNote[],
    store?: TaskstickStoreService
  ): Promise<string> {
    const count = subtasks.length;
    const doneCount = subtasks.filter(s => s.status !== 'open').length;
    const progressPct = count > 0 ? Math.round((doneCount / count) * 100) : 0;
    const totalMinutes = subtasks.reduce((acc, s) => acc + (s.estimatedMinutes || 15), 0);

    const subtaskLines = subtasks.map(s => {
      const icon = s.status === 'done_check' ? '✓' : (s.status === 'done_cross' ? '✗' : '○');
      return `• ${icon} ${s.title} (${s.estimatedMinutes || 15}m)`;
    }).join('\n');

    const enrichedContent = [
      `🏛️ Thème : ${themaNote.title}`,
      `📊 Avancement : ${doneCount}/${count} étapes (${progressPct}%) • ⏱️ ~${totalMinutes}m`,
      subtaskLines ? `\n📋 Sous-tâches ordonnées :\n${subtaskLines}` : '',
      `\n💡 Guide TDAH : Traitez une seule sous-tâche active pour maintenir votre dopamine.`
    ].filter(Boolean).join('\n');

    if (store) {
      const currentTags = themaNote.tags || [];
      const tagsWithThema = currentTags.includes('thème') ? currentTags : [...currentTags, 'thème'];
      await store.updateNote(themaNote.id, {
        content: enrichedContent,
        tags: tagsWithThema
      });
    }

    return enrichedContent;
  }

  /**
   * UC5: Generates an AI suggestion for a post-it's description based on
   * connected tasks (prerequisites, dependents), title, tags, and context clues.
   */
  async suggestDescriptionForNote(
    targetNote: ADHDPostItNote,
    store: TaskstickStoreService
  ): Promise<string> {
    const allNotes = store.notes();
    const allEdges = store.edges();

    // Find incoming edges (prerequisites / tasks that lead to this note)
    const incomingPrereqIds = allEdges.filter(e => e.targetId === targetNote.id && e.type === 'depends_on').map(e => e.sourceId);
    const prereqNotes = allNotes.filter(n => incomingPrereqIds.includes(n.id));

    // Find outgoing edges (dependent tasks that wait on this note)
    const outgoingDepIds = allEdges.filter(e => e.sourceId === targetNote.id && e.type === 'depends_on').map(e => e.targetId);
    const depNotes = allNotes.filter(n => outgoingDepIds.includes(n.id));

    // Connected cluster or neighbor notes
    const clusterNotes = targetNote.clusterId 
      ? allNotes.filter(n => n.clusterId === targetNote.clusterId && n.id !== targetNote.id)
      : [];

    // Generative AI suggestion if Ollama is online
    if (this.isOllamaOnline) {
      const prereqContext = prereqNotes.map(p => p.title).join(', ');
      const depContext = depNotes.map(d => d.title).join(', ');
      const clusterContext = clusterNotes.slice(0, 3).map(c => c.title).join(', ');

      const prompt = `Propose une description d'action courte et motivante (1 à 2 phrases) pour ce Post-it :
      Titre : "${targetNote.title}"
      ${prereqContext ? `Prérequis : ${prereqContext}\n` : ''}${depContext ? `Débloque ensuite : ${depContext}\n` : ''}${clusterContext ? `Contexte : ${clusterContext}\n` : ''}
      Consigne : Rédige directement la description sans formules de politesse ni titre.`;

      const aiDesc = await this.generateCompletion(prompt);
      if (aiDesc && aiDesc.length > 10) {
        return aiDesc;
      }
    }

    const lowerTitle = (targetNote.title || '').toLowerCase();
    const suggestions: string[] = [];

    // Context from prerequisites
    if (prereqNotes.length > 0) {
      const prereqTitles = prereqNotes.map(p => `"${p.title}"`).join(', ');
      suggestions.push(`Préalables requis : ${prereqTitles}.`);
    }

    // Specific functional recommendations based on keywords
    if (lowerTitle.includes('test') || lowerTitle.includes('valid')) {
      suggestions.push('Objectif : Vérifier les critères d\'acceptation, tester les cas nominaux et d\'erreur.');
    } else if (lowerTitle.includes('doc') || lowerTitle.includes('rédig') || lowerTitle.includes('écrire')) {
      suggestions.push('Livrable attendu : Documentation concise avec exemples et étapes concrètes.');
    } else if (lowerTitle.includes('api') || lowerTitle.includes('backend') || lowerTitle.includes('bdd') || lowerTitle.includes('db')) {
      suggestions.push('Points techniques : Définir les schémas d\'entrée/sortie, gérer les erreurs 4xx/5xx et persistance.');
    } else if (lowerTitle.includes('ui') || lowerTitle.includes('front') || lowerTitle.includes('design') || lowerTitle.includes('css')) {
      suggestions.push('Attentes visuelles : Responsive, accessibilité, contrastes et micro-interactions soignées.');
    } else if (lowerTitle.includes('déploy') || lowerTitle.includes('prod') || lowerTitle.includes('livr')) {
      suggestions.push('Checklist de mise en ligne : Build vérifié, tests au vert, backup de sécurité prêt.');
    } else {
      suggestions.push(`Déroulement pour "${targetNote.title}" : Définir le résultat concret attendu avant de commencer.`);
    }

    // Context for following steps
    if (depNotes.length > 0) {
      const depTitles = depNotes.map(d => `"${d.title}"`).join(', ');
      suggestions.push(`Débloquera ensuite : ${depTitles}.`);
    }

    if (clusterNotes.length > 0 && prereqNotes.length === 0 && depNotes.length === 0) {
      suggestions.push(`En synergie avec le groupe : ${clusterNotes.slice(0, 3).map(c => c.title).join(' • ')}.`);
    }

    return suggestions.join(' ');
  }

  /**
   * Infer topological and logical dependencies among a set of Post-it notes
   * suggesting prerequisite relationships (e.g. Conception -> Développement -> Test -> Déploiement)
   */
  async inferDependencies(notes: ADHDPostItNote[]): Promise<PostItEdge[]> {
    const edges: PostItEdge[] = [];
    if (!notes || notes.length < 2) {
      return edges;
    }

    const stageKeywords = [
      { stage: 0, keywords: ['setup', 'init', 'concevoir', 'spec', 'maquette', 'recherche', 'analys', 'modèle'] },
      { stage: 1, keywords: ['développ', 'implément', 'cod', 'créer', 'composant', 'build', 'écrire', 'rédig'] },
      { stage: 2, keywords: ['test', 'valid', 'vérifi', 'relectur', 'audit', 'check'] },
      { stage: 3, keywords: ['déploy', 'livr', 'releas', 'prod', 'publi', 'clôtur'] }
    ];

    const noteStages = new Map<string, number>();

    for (const note of notes) {
      const title = (note.title || '').toLowerCase();
      let assignedStage = -1;

      for (const sk of stageKeywords) {
        if (sk.keywords.some((kw) => title.includes(kw))) {
          assignedStage = sk.stage;
          break;
        }
      }

      if (assignedStage >= 0) {
        noteStages.set(note.id, assignedStage);
      }
    }

    // Link notes from stage N to stage N+1
    for (let s = 0; s < 3; s++) {
      const currentStageNotes = notes.filter((n) => noteStages.get(n.id) === s);
      const nextStageNotes = notes.filter((n) => noteStages.get(n.id) === s + 1);

      for (const src of currentStageNotes) {
        for (const tgt of nextStageNotes) {
          // Avoid self-loops
          if (src.id !== tgt.id) {
            edges.push({
              id: `edge_inferred_${src.id}_${tgt.id}`,
              sourceId: src.id,
              targetId: tgt.id,
              type: 'depends_on'
            });
          }
        }
      }
    }

    return edges;
  }

  // =========================================================================
  // Legacy / Parser compatibility methods
  // =========================================================================

  /** Very simple parser – extracts action lines from mermaid/text */
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
    if (typeof window !== 'undefined') {
      window.location.href = mailto;
    }
    return Promise.resolve();
  }
}
