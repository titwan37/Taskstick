import { Injectable } from '@nestjs/common';
import { TaskstickDBService } from './taskstick-db.service';
import { StorageMigrationAdapter } from './storage-migration.adapter';

@Injectable()
export class StorageService {
  constructor(
    private taskstickDbService: TaskstickDBService,
    private storageMigrationAdapter: StorageMigrationAdapter
  ) {}

  /**
   * List all available date keys in localStorage (e.g., 'journal-20231001').
   */
  listDates(): string[] {
    const dates = new Set<string>();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('journal-')) {
        dates.add(key);
      }
    }
    return Array.from(dates).sort();
  }

  /**
   * Get a specific item from localStorage.
   */
  getItem<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    return value ? (value as unknown) as T : null;
  }

  /**
   * Set an item in localStorage.
   */
  setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Remove an item from localStorage.
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage items starting with 'journal-'.
   */
  clearJournalKeys(): void {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('journal-')) {
        this.removeItem(key);
      }
    }
  }

  /**
   * Inject StorageMigrationAdapter into the service.
   * This ensures the adapter is available for migration operations.
   */
  injectMigrationAdapter(): void {
    // The constructor already initializes the adapter with this instance,
    // but this method can be used to ensure it's ready if needed externally.
    this.storageMigrationAdapter.inject(this);
  }

  /**
   * Run the migration process.
   */
  async runMigration(): Promise<void> {
    await this.storageMigrationAdapter.migrateLegacyLocalStorage();
  }
}
