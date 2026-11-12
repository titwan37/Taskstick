// src/app/services/speech-recognition.service.ts
import { Injectable, signal } from '@angular/core';

// Declare Web Speech API browser types for cross-browser compatibility
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export type SupportedSpeechLang = 'fr-FR' | 'en-US' | 'de-DE';

export interface SpeechRecognitionEventCallback {
  onFinalResult?: (transcript: string) => void;
  onInterimResult?: (interim: string) => void;
  onError?: (error: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private recognition: any = null;

  // Angular Signals for reactive UI binding
  readonly isListening = signal<boolean>(false);
  readonly currentTranscript = signal<string>('');
  readonly lastFinalTranscript = signal<string>('');
  readonly isSupported = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') {
      this.isSupported.set(false);
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      this.isSupported.set(false);
      console.warn('SpeechRecognition API is not supported in this browser environment.');
      return;
    }

    this.isSupported.set(true);
    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false; // Stop on pause/sentence end for atomic Post-it creation
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening.set(true);
        this.errorMessage.set(null);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening.set(false);
        const err = event.error || 'Speech recognition error';
        this.errorMessage.set(err);
        console.warn('SpeechRecognition error:', err);
      };
    } catch (err: any) {
      this.isSupported.set(false);
      this.errorMessage.set(err?.message || 'Failed to initialize SpeechRecognition');
    }
  }

  /**
   * Start listening for voice dictation in the requested language
   */
  start(lang: SupportedSpeechLang = 'fr-FR', callbacks?: SpeechRecognitionEventCallback): void {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) {
        this.errorMessage.set('Web Speech API unavailable in this browser.');
        callbacks?.onError?.('Speech recognition not available');
        return;
      }
    }

    if (this.isListening()) {
      this.stop();
    }

    this.recognition.lang = lang;
    this.currentTranscript.set('');
    this.errorMessage.set(null);

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const activeText = final || interim;
      this.currentTranscript.set(activeText);

      if (interim && callbacks?.onInterimResult) {
        callbacks.onInterimResult(interim);
      }

      if (final) {
        this.lastFinalTranscript.set(final.trim());
        if (callbacks?.onFinalResult) {
          callbacks.onFinalResult(final.trim());
        }
      }
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Could not start microphone');
      callbacks?.onError?.(err?.message || 'Could not start microphone');
    }
  }

  /**
   * Stop speech recording
   */
  stop(): void {
    if (this.recognition && this.isListening()) {
      try {
        this.recognition.stop();
      } catch {
        // Silent catch if already stopping
      }
      this.isListening.set(false);
    }
  }

  /**
   * Toggle listening state
   */
  toggle(lang: SupportedSpeechLang = 'fr-FR', callbacks?: SpeechRecognitionEventCallback): void {
    if (this.isListening()) {
      this.stop();
    } else {
      this.start(lang, callbacks);
    }
  }

  /**
   * One-shot promise returning the dictated voice sentence
   */
  dictateOnce(lang: SupportedSpeechLang = 'fr-FR'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Speech recognition is not supported in this browser.'));
        return;
      }

      this.start(lang, {
        onFinalResult: (transcript) => {
          this.stop();
          resolve(transcript);
        },
        onError: (err) => {
          this.stop();
          reject(new Error(err));
        }
      });
    });
  }
}
