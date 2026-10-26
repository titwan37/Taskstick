import { Injectable, signal, computed } from '@angular/core';
import { ADHDPostItNote, PostItEdge, PostItStatus } from '../models/postit.model';
import { ADHDPostItCluster } from '../models/cluster.model';
import { ADHDPostItZone } from '../models/zone.model';

@Injectable({
  providedIn: 'root'
})
export class TaskstickStoreService {
  // State Signals
  private _notes = signal<ADHDPostItNote[]>([]);
  private _edges = signal<PostItEdge[]>([]);
  private _clusters = signal<ADHDPostItCluster[]>([]);
  private _zones = signal<ADHDPostItZone[]>([]);
  private _activeFilter = signal<string>('all');
  private _selectedDateKey = signal<string>('2023-10-01');

  // Computed Signals
  rootActionableNotes = computed(() => {
    const notes = this._notes();
    return notes.filter(note => note.status === PostItStatus.open);
  });

  blockedNotes = computed(() => {
    const notes = this._notes();
    const edges = this._edges();

    // Create a map of note IDs to their status
    const noteStatusMap = new Map<number, PostItStatus>();
    notes.forEach(note => noteStatusMap.set(note.id, note.status));

    return notes.filter(note => {
      // Check if there is an incoming edge from a note with status 'open'
      const incomingEdges = edges.filter(edge => edge.targetId === note.id);
      return incomingEdges.some(edge => {
        const sourceStatus = noteStatusMap.get(edge.sourceId);
        return sourceStatus === PostItStatus.open;
      });
    });
  });

  graphStats = computed(() => {
    const notes = this._notes();
    const edges = this._edges();

    const total = notes.length;
    const open = notes.filter(n => n.status === PostItStatus.open).length;
    const doneCross = notes.filter(n => n.status === PostItStatus.done_cross).length;
    const doneCheck = notes.filter(n => n.status === PostItStatus.done_check).length;

    const completionPercentage = total > 0 ? Math.round(((doneCross + doneCheck) / total) * 100) : 0;

    return { total, open, done_cross: doneCross, done_check: doneCheck, completionPercentage };
  });

  // Methods
  detectCycle(newEdge: PostItEdge): boolean {
    const edges = this._edges();
    const notes = this._notes();

    // Build adjacency list
    const adjList = new Map<number, number[]>();
    notes.forEach(note => {
      if (!adjList.has(note.id)) {
        adjList.set(note.id, []);
      }
    });

    edges.forEach(edge => {
      if (!adjList.has(edge.sourceId)) {
        adjList.set(edge.sourceId, []);
      }
      adjList.get(edge.sourceId)!.push(edge.targetId);
    });

    // DFS to detect cycle starting from newEdge.targetId
    const visited = new Set<number>();
    const recStack = new Set<number>();
    const hasCycle = (node: number): boolean => {
      if (!adjList.has(node)) return false;
      
      visited.add(node);
      recStack.add(node);

      for (const neighbor of adjList.get(node)!) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    // Check cycle from target to source (reverse direction of edge)
    const reverseAdjList = new Map<number, number[]>();
    notes.forEach(note => {
      if (!reverseAdjList.has(note.id)) {
        reverseAdjList.set(note.id, []);
      }
    });

    edges.forEach(edge => {
      if (!reverseAdjList.has(edge.targetId)) {
        reverseAdjList.set(edge.targetId, []);
      }
      reverseAdjList.get(edge.targetId)!.push(edge.sourceId);
    });

    const visitedSet = new Set<number>();
    const recStackSet = new Set<number>();
    
    return hasCycle(newEdge.targetId);
  }

  evaluateSticking(movedNoteId: string, snapRadius = 30): void {
    // This method is a placeholder as the service operates on IDs/Numbers.
    // In a full implementation, this would query the database for notes near movedNoteId
    // and update their clusterId or zoneId to bind them together.
    console.log(`Evaluating sticking for note ID: ${movedNoteId}, radius: ${snapRadius}`);
  }

  toggleNoteStatus(noteId: string): void {
    const notes = this._notes();
    const noteIndex = notes.findIndex(n => n.id === parseInt(noteId));

    if (noteIndex === -1) return;

    const currentStatus = notes[noteIndex].status;
    let nextStatus: PostItStatus;

    switch (currentStatus) {
      case PostItStatus.open:
        nextStatus = PostItStatus.done_cross;
        break;
      case PostItStatus.done_cross:
        nextStatus = PostItStatus.done_check;
        break;
      case PostItStatus.done_check:
        nextStatus = PostItStatus.open;
        break;
      default:
        nextStatus = PostItStatus.open;
    }

    notes[noteIndex].status = nextStatus;
  }
}
