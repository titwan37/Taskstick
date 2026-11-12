// src/app/workers/translation.worker.ts
/// <reference lib="webworker" />

export interface TranslationWorkerRequest {
  id: string;
  type: 'translate';
  text: string;
  sourceLang: 'fr' | 'en' | 'de';
  targetLang: 'fr' | 'en' | 'de';
}

export interface TranslationWorkerResponse {
  id: string;
  type: 'result' | 'progress' | 'error';
  translatedText?: string;
  progress?: number;
  error?: string;
}

// Map of instantiated pipelines to prevent redundant model loads
const pipelines = new Map<string, any>();

function getModelKey(sourceLang: 'fr' | 'en' | 'de', targetLang: 'fr' | 'en' | 'de'): string {
  if (sourceLang === 'fr' && targetLang === 'en') return 'Xenova/opus-mt-fr-en';
  if (sourceLang === 'en' && targetLang === 'fr') return 'Xenova/opus-mt-en-fr';
  if (sourceLang === 'de' && targetLang === 'en') return 'Xenova/opus-mt-de-en';
  if (sourceLang === 'en' && targetLang === 'de') return 'Xenova/opus-mt-en-de';
  if (sourceLang === 'fr' && targetLang === 'de') return 'Xenova/opus-mt-fr-de';
  if (sourceLang === 'de' && targetLang === 'fr') return 'Xenova/opus-mt-de-fr';
  return `Xenova/opus-mt-${sourceLang}-${targetLang}`;
}

async function loadPipeline(modelKey: string, requestId: string): Promise<any> {
  if (pipelines.has(modelKey)) {
    return pipelines.get(modelKey);
  }

  // Load transformers dynamically using indirect dynamic import to bypass bundler node dependencies
  const dynamicImport = new Function('url', 'return import(url);');
  const transformersApi = await (dynamicImport('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2') as Promise<any>);

  const { pipeline, env } = transformersApi;

  if (env) {
    env.allowLocalModels = false;
    env.useBrowserCache = true;
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
        const resp: TranslationWorkerResponse = {
          id: requestId,
          type: 'progress',
          progress: Math.round(progress.progress)
        };
        postMessage(resp);
      }
    }
  });

  pipelines.set(modelKey, translator);
  return translator;
}

addEventListener('message', async (event: MessageEvent<TranslationWorkerRequest>) => {
  const req = event.data;
  if (!req || req.type !== 'translate') {
    return;
  }

  const { id, text, sourceLang, targetLang } = req;

  if (!text || text.trim().length === 0 || sourceLang === targetLang) {
    const emptyResp: TranslationWorkerResponse = {
      id,
      type: 'result',
      translatedText: text || ''
    };
    postMessage(emptyResp);
    return;
  }

  try {
    const modelKey = getModelKey(sourceLang, targetLang);
    const translator = await loadPipeline(modelKey, id);

    // Process translation preserving linebreaks if possible
    const lines = text.split('\n');
    const translatedLines: string[] = [];

    for (const line of lines) {
      if (line.trim().length === 0) {
        translatedLines.push(line);
        continue;
      }

      // Check if line is a structural Mermaid token (keep intact)
      const trimmed = line.trim();
      if (
        trimmed.startsWith('mindmap') ||
        trimmed.startsWith('graph ') ||
        trimmed.startsWith('kanban') ||
        trimmed.startsWith('timeline') ||
        trimmed.startsWith('classDiagram') ||
        trimmed.startsWith('stateDiagram') ||
        trimmed.startsWith('subgraph') ||
        trimmed === 'end'
      ) {
        translatedLines.push(line);
        continue;
      }

      const output = await translator(trimmed);
      let translation = '';
      if (Array.isArray(output) && output.length > 0) {
        translation = output[0]?.translation_text || trimmed;
      } else if (output?.translation_text) {
        translation = output.translation_text;
      } else {
        translation = trimmed;
      }

      // Re-apply original indentation
      const matchLeadingSpace = line.match(/^(\s*)/);
      const leadingSpace = matchLeadingSpace ? matchLeadingSpace[1] : '';
      translatedLines.push(leadingSpace + translation);
    }

    const response: TranslationWorkerResponse = {
      id,
      type: 'result',
      translatedText: translatedLines.join('\n')
    };
    postMessage(response);
  } catch (err: any) {
    const errorResp: TranslationWorkerResponse = {
      id,
      type: 'error',
      error: err?.message || 'Translation worker inference error'
    };
    postMessage(errorResp);
  }
});
