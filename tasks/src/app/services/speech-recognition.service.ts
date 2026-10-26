import { Injectable } from '@angular/core';
import { ADHDPostItNote, PostItStatus } from '../models/postit.model';

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private recognition: any;
  private isListening = false;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
        if (finalTranscript.trim()) {
          this.handleSpeechResult(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  private handleSpeechResult(text: string): void {
    // Create a new note from speech
    const note: ADHDPostItNote = {
      id: crypto.randomUUID(),
      content: text,
      status: PostItStatus.open,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clusterId: null,
      zoneId: null,
      tags: ['voice'],
      priority: 'high'
    };

    // In a real app, you would emit an event or call a service to save this note
    console.log('Speech Note Created:', note);
    
    // Optional: Auto-start listening again for continuous dictation
    // this.startListening();
  }
}
