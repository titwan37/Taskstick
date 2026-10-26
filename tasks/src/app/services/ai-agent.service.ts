import { Injectable, signal, computed } from '@angular/core';
import { ADHDPostItNote, PostItEdge, PostItStatus } from '../models/postit.model';
import { ADHDPostItCluster } from '../models/cluster.model';
import { ADHDPostItZone } from '../models/zone.model';
import { TaskstickStoreService } from './taskstick-store.service';
import { SpeechRecognitionService } from './speech-recognition.service';

@Injectable({
  providedIn: 'root'
})
export class AiAgentService {
  private store = inject(TaskstickStoreService);
  private speechService = inject(SpeechRecognitionService);

  // State Signals
  private _taskDecompositionHistory = signal<Record<string, string[]>>({});
  private _dependencySuggestions = signal<Record<string, PostItEdge[]>>({});

  constructor() {
    // Initialize empty suggestions map
    this._dependencySuggestions.set({});
  }

  inject = (service: any) => {
    return service;
  };

  // Task Decomposition Logic
  decomposeTask(note: ADHDPostItNote): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/app/workers/translation.worker.ts');
      
      worker.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          resolve(result.subtasks);
        } catch (e) {
          reject(e);
        }
      };

      worker.onerror = (error) => {
        reject(error);
      };

      // Send task content to worker
      worker.postMessage(JSON.stringify({
        task: note.content,
        maxDurationMinutes: 20,
        language: 'en'
      }));
    });
  }

  // Dependency Inference Logic
  inferDependencies(notes: ADHDPostItNote[]): Promise<PostItEdge[]> {
    return new Promise((resolve) => {
      const worker = new Worker('/app/workers/translation.worker.ts');
      
      worker.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          resolve(result.dependencies);
        } catch (e) {
          resolve([]); // Fallback on error
        }
      };

      worker.onerror = (error) => {
        resolve([]);
      };

      worker.postMessage(JSON.stringify({
        notes: notes.map(n => ({ id: n.id, content: n.content }))
      }));
    });
  }

  // Speech to Note Creation (Wrapper)
  async createNoteFromSpeech(text: string): Promise<ADHDPostItNote> {
    const timestamp = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      content: text,
      status: PostItStatus.open,
      createdAt: timestamp,
      updatedAt: timestamp,
      clusterId: null,
      zoneId: null,
      tags: [],
      priority: 'medium'
    };
  }
}
