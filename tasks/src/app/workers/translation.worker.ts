// Translation Worker for AI Task Decomposer & Speech Capture
// Handles heavy processing off the main thread

self.onmessage = async (event) => {
  const { data } = event;
  let result = null;

  try {
    if (data.type === 'decompose') {
      result = await decomposeTask(data.task, data.maxDurationMinutes, data.language);
    } else if (data.type === 'inferDependencies') {
      result = await inferDependencies(data.notes);
    } else if (data.type === 'translate') {
      result = await translateText(data.text, data.sourceLang, data.targetLang);
    }
  } catch (error) {
    console.error('Worker Error:', error);
    result = { error: error.message };
  }

  self.postMessage(JSON.stringify(result));
};

// Simulated AI Decomposition Logic
async function decomposeTask(task: string, maxDurationMinutes: number, language: string): Promise<string[]> {
  // In a real scenario, this would call an LLM API or use the transformers model here
  // For now, we simulate breaking down a task into sub-steps
  
  const steps = [
    "Analyze the main goal of the task.",
    "Identify key resources and constraints.",
    "Break down into actionable micro-tasks under 20 minutes.",
    "Prioritize tasks based on urgency and dependency."
  ];

  return steps;
}

// Simulated Dependency Inference Logic
async function inferDependencies(notes: Array<{ id: string, content: string }>): Promise<PostItEdge[]> {
  const edges = [];
  
  // Simple heuristic: if one note mentions "after" or "then", it depends on the previous
  for (let i = 0; i < notes.length - 1; i++) {
    const currentContent = notes[i].content.toLowerCase();
    const nextContent = notes[i + 1].content.toLowerCase();
    
    if (currentContent.includes('after') || currentContent.includes('then')) {
      edges.push({
        sourceId: notes[i].id,
        targetId: notes[i + 1].id,
        label: 'Prerequisite'
      });
    }
  }

  return edges;
}

// Simulated Translation Logic (FR <-> EN <-> DE)
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  // In a real scenario, this would use @xenova/transformers pipeline here
  // For now, we return the text with a language tag to indicate processing
  
  const translations = {
    'en': 'English',
    'fr': 'Français',
    'de': 'Deutsch'
  };

  return `${text} [Translated from ${translations[sourceLang]} to ${translations[targetLang]}]`;
}
