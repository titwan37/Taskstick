import { Dexie } from 'dexie';
import { ADHDPostItNote, PostItEdge, PostItStatus } from '../models/postit.model';
import { ADHDPostItCluster } from '../models/cluster.model';
import { ADHDPostItZone } from '../models/zone.model';

export class TaskstickDBService {
  private db: Dexie;

  constructor() {
    this.db = new Dexie('TaskstickDB');

    // Initialize tables as per requirements
    this.db.version(1).stores({
      notes: 'id, color, status, clusterId, zoneId, updatedAt',
      edges: 'id, sourceId, targetId, type',
      zones: 'id, label',
      clusters: 'id',
      journals: 'dateKey, rawMmd, syncedAt'
    });

    // Initialize default data if needed (optional, can be expanded)
    this.db.clusters.table('clusters').add({ id: 1, name: 'Default Cluster' });
    this.db.zones.table('zones').add({ id: 1, label: 'General' });
  }

  // CRUD Operations for Notes
  async addNote(note: ADHDPostItNote): Promise<void> {
    await this.db.notes.add({
      id: note.id,
      color: note.color,
      status: note.status,
      clusterId: note.clusterId || 1,
      zoneId: note.zoneId || 1,
      updatedAt: new Date()
    });
  }

  async getNote(id: number): Promise<ADHDPostItNote | null> {
    const dbNote = await this.db.notes.get(id);
    if (!dbNote) return null;

    // Map back to ADHDPostItNote model
    return {
      id: dbNote.id,
      color: dbNote.color,
      status: dbNote.status,
      clusterId: dbNote.clusterId,
      zoneId: dbNote.zoneId,
      updatedAt: dbNote.updatedAt
    };
  }

  async updateNote(id: number, updates: Partial<ADHDPostItNote>): Promise<void> {
    const existing = await this.getNote(id);
    if (!existing) return;

    const updatedData = { ...existing, ...updates };
    await this.db.notes.update(id, {
      color: updatedData.color,
      status: updatedData.status,
      clusterId: updatedData.clusterId,
      zoneId: updatedData.zoneId,
      updatedAt: new Date()
    });
  }

  async deleteNote(id: number): Promise<void> {
    await this.db.notes.delete(id);
  }

  // CRUD Operations for Edges
  async addEdge(edge: PostItEdge): Promise<void> {
    await this.db.edges.add({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type
    });
  }

  async getEdge(id: number): Promise<PostItEdge | null> {
    const dbEdge = await this.db.edges.get(id);
    if (!dbEdge) return null;

    return {
      id: dbEdge.id,
      sourceId: dbEdge.sourceId,
      targetId: dbEdge.targetId,
      type: dbEdge.type
    };
  }

  async updateEdge(id: number, updates: Partial<PostItEdge>): Promise<void> {
    const existing = await this.getEdge(id);
    if (!existing) return;

    const updatedData = { ...existing, ...updates };
    await this.db.edges.update(id, {
      sourceId: updatedData.sourceId,
      targetId: updatedData.targetId,
      type: updatedData.type
    });
  }

  async deleteEdge(id: number): Promise<void> {
    await this.db.edges.delete(id);
  }

  // CRUD Operations for Zones
  async addZone(zone: ADHDPostItZone): Promise<void> {
    await this.db.zones.add({
      id: zone.id,
      label: zone.label
    });
  }

  async getZone(id: number): Promise<ADHDPostItZone | null> {
    const dbZone = await this.db.zones.get(id);
    if (!dbZone) return null;

    return { id: dbZone.id, label: dbZone.label };
  }

  async updateZone(id: number, updates: Partial<ADHDPostItZone>): Promise<void> {
    const existing = await this.getZone(id);
    if (!existing) return;

    const updatedData = { ...existing, ...updates };
    await this.db.zones.update(id, { label: updatedData.label });
  }

  async deleteZone(id: number): Promise<void> {
    await this.db.zones.delete(id);
  }

  // CRUD Operations for Clusters
  async addCluster(cluster: ADHDPostItCluster): Promise<void> {
    await this.db.clusters.add({
      id: cluster.id,
      name: cluster.name
    });
  }

  async getCluster(id: number): Promise<ADHDPostItCluster | null> {
    const dbCluster = await this.db.clusters.get(id);
    if (!dbCluster) return null;

    return { id: dbCluster.id, name: dbCluster.name };
  }

  async updateCluster(id: number, updates: Partial<ADHDPostItCluster>): Promise<void> {
    const existing = await this.getCluster(id);
    if (!existing) return;

    const updatedData = { ...existing, ...updates };
    await this.db.clusters.update(id, { name: updatedData.name });
  }

  async deleteCluster(id: number): Promise<void> {
    await this.db.clusters.delete(id);
  }

  // CRUD Operations for Journals
  async addJournal(journal: { dateKey: string; rawMmd: string }): Promise<void> {
    await this.db.journals.add({
      dateKey: journal.dateKey,
      rawMmd: journal.rawMmd,
      syncedAt: new Date()
    });
  }

  async getJournal(dateKey: string): Promise<{ dateKey: string; rawMmd: string; syncedAt: Date } | null> {
    const dbJournal = await this.db.journals.get(dateKey);
    if (!dbJournal) return null;

    return {
      dateKey: dbJournal.dateKey,
      rawMmd: dbJournal.rawMmd,
      syncedAt: dbJournal.syncedAt
    };
  }

  async updateJournal(dateKey: string, updates: Partial<{ rawMmd: string; syncedAt: Date }>): Promise<void> {
    const existing = await this.getJournal(dateKey);
    if (!existing) return;

    const updatedData = { ...existing, ...updates };
    await this.db.journals.update(dateKey, {
      rawMmd: updatedData.rawMmd,
      syncedAt: updatedData.syncedAt || new Date()
    });
  }

  async deleteJournal(dateKey: string): Promise<void> {
    await this.db.journals.delete(dateKey);
  }

  // Query helpers
  async getAllNotes(): Promise<ADHDPostItNote[]> {
    const notes = await this.db.notes.toArray();
    return notes.map(n => ({
      id: n.id,
      color: n.color,
      status: n.status,
      clusterId: n.clusterId,
      zoneId: n.zoneId,
      updatedAt: n.updatedAt
    }));
  }

  async getAllEdges(): Promise<PostItEdge[]> {
    const edges = await this.db.edges.toArray();
    return edges.map(e => ({
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      type: e.type
    }));
  }

  async getAllZones(): Promise<ADHDPostItZone[]> {
    const zones = await this.db.zones.toArray();
    return zones.map(z => ({ id: z.id, label: z.label }));
  }

  async getAllClusters(): Promise<ADHDPostItCluster[]> {
    const clusters = await this.db.clusters.toArray();
    return clusters.map(c => ({ id: c.id, name: c.name }));
  }

  async getAllJournals(): Promise<{ dateKey: string; rawMmd: string; syncedAt: Date }[]> {
    const journals = await this.db.journals.toArray();
    return journals.map(j => ({
      dateKey: j.dateKey,
      rawMmd: j.rawMmd,
      syncedAt: j.syncedAt
    }));
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
