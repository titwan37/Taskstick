import { StorageService } from './storage.service';
import { ADHDPostItNote, PostItStatus } from '../models/postit.model';
import { ADHDPostItCluster } from '../models/cluster.model';
import { ADHDPostItZone } from '../models/zone.model';

export class StorageMigrationAdapter {
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Migrates legacy localStorage journal entries to the new Dexie database.
   * Scans all 'journal-YYYYMMDD' keys, parses text tasks into ADHDPostItNote records,
   * and stores them in the database WITHOUT deleting or overwriting the original localStorage entries.
   */
  async migrateLegacyLocalStorage(): Promise<void> {
    const dates = this.storageService.listDates();

    for (const dateKey of dates) {
      const rawContent = this.storageService.getItem(`journal-${dateKey}`);
      if (!rawContent) continue;

      try {
        // Parse the Mermaid text into ADHDPostItNote objects
        const notes: ADHDPostItNote[] = this.parseMermaidToNotes(rawContent);

        // Insert into Dexie database
        for (const note of notes) {
          await this.storageService.taskstickDbService.addNote(note);
        }
      } catch (error) {
        console.error(`Error migrating journal ${dateKey}:`, error);
      }
    }
  }

  /**
   * Syncs the Dexie database back to legacy localStorage for a specific date.
   * Generates Mermaid-compatible text and commits it to localStorage.
   */
  async syncGraphToLegacyLocalStorage(dateKey: string, notes: ADHDPostItNote[]): Promise<void> {
    const dbJournal = await this.storageService.taskstickDbService.getJournal(dateKey);

    if (!dbJournal) {
      // If journal doesn't exist in DB, create it with the current notes
      await this.storageService.taskstickDbService.addJournal({ dateKey, rawMmd: '' });
    } else {
      // Update existing journal
      await this.storageService.taskstickDbService.updateJournal(dateKey, { rawMmd: '' });
    }

    const mmdText = this.generateMermaidFromNotes(notes);
    await this.storageService.setItem(`journal-${dateKey}`, mmdText);
  }

  /**
   * Parses Mermaid text into ADHDPostItNote objects.
   * Assumes a simple format where lines starting with '+' are notes.
   */
  private parseMermaidToNotes(content: string): ADHDPostItNote[] {
    const notes: ADHDPostItNote[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim().startsWith('+')) continue;

      const text = line.substring(1).trim();
      const id = Date.now() + Math.random().toString(36).substr(2); // Generate unique ID

      notes.push({
        id,
        color: 'yellow',
        status: PostItStatus.DRAFT,
        clusterId: 1, // Default cluster
        zoneId: 1,   // Default zone
        text: text
      });
    }

    return notes;
  }

  /**
   * Generates Mermaid-compatible text from ADHDPostItNote objects.
   */
  private generateMermaidFromNotes(notes: ADHDPostItNote[]): string {
    const lines = notes.map(note => `+ ${note.text}`);
    return lines.join('\n');
  }
}
