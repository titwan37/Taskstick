// src/app/services/workflow-layout.service.ts
import { Injectable } from '@angular/core';

export interface TaskNode {
  id: string;
  width: number;
  height: number;
  groupId?: string;
  x?: number;
  y?: number;
}

export interface TaskEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface TaskGroup {
  id: string;
  label: string;
  padding?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface LayoutConfig {
  nodeGapX: number;       // Horizontal spacing between dependency layers
  nodeGapY: number;       // Minimum vertical gap between parallel siblings
  groupPadding: number;   // Padding within thematic zones
  groupGapX: number;
  groupGapY: number;
  originX: number;
  originY: number;
}

export const DEFAULT_NODE_WIDTH = 210;
export const MIN_NODE_HEIGHT = 160;

export function computeNodeDimensions(title: string, customSize?: { width: number; height: number }): { width: number; height: number } {
  if (customSize && customSize.width >= 192 && customSize.height >= 160) {
    return { width: customSize.width, height: customSize.height };
  }
  const charCount = (title || '').length;
  const estimatedLines = Math.max(2, Math.ceil(charCount / 22));
  const titleHeight = estimatedLines * 20;

  return {
    width: DEFAULT_NODE_WIDTH,
    height: Math.max(MIN_NODE_HEIGHT, 114 + titleHeight)
  };
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeGapX: 110,
  nodeGapY: 48,
  groupPadding: 60,
  groupGapX: 140,
  groupGapY: 90,
  originX: 80,
  originY: 80
};



@Injectable({ providedIn: 'root' })
export class WorkflowLayoutService {

  public optimizeLayout(
    nodes: TaskNode[],
    edges: TaskEdge[],
    groups: TaskGroup[] = [],
    config: Partial<LayoutConfig> = {}
  ): { nodes: TaskNode[]; groups: TaskGroup[] } {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const clonedNodes: TaskNode[] = nodes.map(n => ({ ...n }));
    const clonedGroups: TaskGroup[] = groups.map(g => ({ ...g }));

    // 1. Separate grouped notes from ungrouped notes
    const groupNodeMap = new Map<string, TaskNode[]>();
    const ungroupedNodes: TaskNode[] = [];

    clonedNodes.forEach(node => {
      if (node.groupId && clonedGroups.some(g => g.id === node.groupId)) {
        if (!groupNodeMap.has(node.groupId)) groupNodeMap.set(node.groupId, []);
        groupNodeMap.get(node.groupId)!.push(node);
      } else {
        ungroupedNodes.push(node);
      }
    });

    // 2. Layout inner sub-graphs for each thematic zone
    const groupDimensions = new Map<string, { width: number; height: number }>();
    clonedGroups.forEach(grp => {
      const internalNodes = groupNodeMap.get(grp.id) || [];
      if (internalNodes.length === 0) {
        grp.width = 260;
        grp.height = 180;
        groupDimensions.set(grp.id, { width: 260, height: 180 });
        return;
      }

      const internalNodeIds = new Set(internalNodes.map(n => n.id));
      const internalEdges = edges.filter(
        e => internalNodeIds.has(e.sourceId) && internalNodeIds.has(e.targetId)
      );

      const headerOffset = 36;
      this.layoutCognitiveTree(internalNodes, internalEdges, {
        gapX: cfg.nodeGapX,
        gapY: cfg.nodeGapY,
        originX: cfg.groupPadding,
        originY: cfg.groupPadding + headerOffset
      });

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      internalNodes.forEach(n => {
        const nx = n.x ?? cfg.groupPadding;
        const ny = n.y ?? (cfg.groupPadding + headerOffset);
        minX = Math.min(minX, nx);
        maxX = Math.max(maxX, nx + n.width);
        minY = Math.min(minY, ny);
        maxY = Math.max(maxY, ny + n.height);
      });

      grp.width = Math.max((maxX - minX) + cfg.groupPadding * 2, 280);
      grp.height = Math.max((maxY - minY) + cfg.groupPadding * 2 + headerOffset, 200);
      groupDimensions.set(grp.id, { width: grp.width, height: grp.height });
    });

    // 3. Layout Meta-Graph (Zones + Ungrouped Nodes)
    interface MetaItem {
      id: string;
      isGroup: boolean;
      width: number;
      height: number;
      ref: TaskGroup | TaskNode;
    }

    const metaItems: MetaItem[] = [
      ...clonedGroups.map(g => ({ id: g.id, isGroup: true, width: g.width!, height: g.height!, ref: g })),
      ...ungroupedNodes.map(n => ({ id: n.id, isGroup: false, width: n.width, height: n.height, ref: n }))
    ];

    const nodeToMetaId = new Map<string, string>();
    clonedNodes.forEach(n => {
      nodeToMetaId.set(n.id, n.groupId && groupDimensions.has(n.groupId) ? n.groupId : n.id);
    });

    const metaEdges: TaskEdge[] = [];
    const metaEdgeSet = new Set<string>();
    edges.forEach(e => {
      const srcMeta = nodeToMetaId.get(e.sourceId);
      const tgtMeta = nodeToMetaId.get(e.targetId);
      if (srcMeta && tgtMeta && srcMeta !== tgtMeta) {
        const key = `${srcMeta}->${tgtMeta}`;
        if (!metaEdgeSet.has(key)) {
          metaEdgeSet.add(key);
          metaEdges.push({ id: key, sourceId: srcMeta, targetId: tgtMeta });
        }
      }
    });

    const metaNodesAdapter: TaskNode[] = metaItems.map(m => ({ id: m.id, width: m.width, height: m.height }));
    this.layoutCognitiveTree(metaNodesAdapter, metaEdges, {
      gapX: cfg.groupGapX,
      gapY: cfg.groupGapY,
      originX: cfg.originX,
      originY: cfg.originY
    });

    // 4. Transform relative coordinates back to absolute coordinates
    metaNodesAdapter.forEach(layoutMeta => {
      const meta = metaItems.find(m => m.id === layoutMeta.id)!;
      if (meta.isGroup) {
        const grp = meta.ref as TaskGroup;
        grp.x = layoutMeta.x;
        grp.y = layoutMeta.y;
        const children = groupNodeMap.get(grp.id) || [];
        children.forEach(child => {
          child.x = (grp.x || 0) + (child.x || 0);
          child.y = (grp.y || 0) + (child.y || 0);
        });
      } else {
        const node = meta.ref as TaskNode;
        node.x = layoutMeta.x;
        node.y = layoutMeta.y;
      }
    });

    return { nodes: clonedNodes, groups: clonedGroups };
  }

  /**
   * Enhanced Cognitive Tree Algorithm:
   * 1. Longest-Path Layering (X-Coordinates determined by dependency depth)
   * 2. Connected Component Partitioning (Separate distinct thought clusters)
   * 3. Forward & Backward Barycentric Centering (Align child Y with parent median Y)
   * 4. Overlap Removal with Subtree Preservation
   */
  private layoutCognitiveTree(
    nodes: TaskNode[],
    edges: TaskEdge[],
    options: { gapX: number; gapY: number; originX: number; originY: number }
  ): { width: number; height: number } {
    if (nodes.length === 0) return { width: 0, height: 0 };

    const nodeMap = new Map<string, TaskNode>(nodes.map(n => [n.id, n]));
    const inEdges = new Map<string, string[]>();
    const outEdges = new Map<string, string[]>();

    nodes.forEach(n => {
      inEdges.set(n.id, []);
      outEdges.set(n.id, []);
    });

    edges.forEach(e => {
      if (nodeMap.has(e.sourceId) && nodeMap.has(e.targetId)) {
        outEdges.get(e.sourceId)!.push(e.targetId);
        inEdges.get(e.targetId)!.push(e.sourceId);
      }
    });

    // Phase 1: Assign Horizontal Topological Ranks (X-axis depth)
    const rankMap = new Map<string, number>();
    const roots = nodes.filter(n => (inEdges.get(n.id)?.length || 0) === 0);

    // Fallback if full cycle exists
    if (roots.length === 0 && nodes.length > 0) {
      roots.push(nodes[0]);
    }

    roots.forEach(r => rankMap.set(r.id, 0));

    // Compute topological ranks via BFS / Longest-Path
    const queue = [...roots.map(r => r.id)];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currId = queue.shift()!;
      visited.add(currId);
      const currRank = rankMap.get(currId) || 0;

      for (const nextId of outEdges.get(currId) || []) {
        const nextRank = rankMap.get(nextId) ?? -1;
        if (currRank + 1 > nextRank) {
          rankMap.set(nextId, currRank + 1);
        }
        if (!visited.has(nextId) && !queue.includes(nextId)) {
          queue.push(nextId);
        }
      }
    }

    // Default remaining unvisited nodes
    nodes.forEach(n => {
      if (!rankMap.has(n.id)) rankMap.set(n.id, 0);
    });

    // Phase 2: Compute X positions by column layer
    const maxRank = Math.max(...Array.from(rankMap.values()), 0);
    const layers: TaskNode[][] = Array.from({ length: maxRank + 1 }, () => []);
    nodes.forEach(n => layers[rankMap.get(n.id)!].push(n));

    const layerXPositions: number[] = [];
    let currentX = options.originX;

    layers.forEach((layer, r) => {
      layerXPositions[r] = currentX;
      const maxColWidth = layer.reduce((max, n) => Math.max(max, n.width), DEFAULT_NODE_WIDTH);
      currentX += maxColWidth + options.gapX;
    });

    layers.forEach((layer, r) => {
      layer.forEach(node => {
        node.x = layerXPositions[r];
      });
    });

    // Phase 3: Initial Vertical Stacking with Barycentric Pre-sort
    let initialY = options.originY;
    layers[0].forEach(rootNode => {
      rootNode.y = initialY;
      initialY += rootNode.height + options.gapY;
    });

    for (let r = 1; r < layers.length; r++) {
      // Sort layer by median Y of parents
      layers[r].sort((a, b) => {
        const aParents = (inEdges.get(a.id) || []).map(pId => nodeMap.get(pId)!).filter(Boolean);
        const bParents = (inEdges.get(b.id) || []).map(pId => nodeMap.get(pId)!).filter(Boolean);

        const aCenter = aParents.length > 0
          ? aParents.reduce((sum, p) => sum + ((p.y || 0) + p.height / 2), 0) / aParents.length
          : Infinity;

        const bCenter = bParents.length > 0
          ? bParents.reduce((sum, p) => sum + ((p.y || 0) + p.height / 2), 0) / bParents.length
          : Infinity;

        return aCenter - bCenter;
      });

      // Initial sequential placement
      let colY = options.originY;
      layers[r].forEach(node => {
        node.y = colY;
        colY += node.height + options.gapY;
      });
    }

    // Phase 4: Two-Pass Centering (Aligning Child Centroids with Parents)
    // Forward Pass (L -> R): Center children around parents
    for (let r = 1; r < layers.length; r++) {
      layers[r].forEach(node => {
        const parents = (inEdges.get(node.id) || []).map(pId => nodeMap.get(pId)!).filter(Boolean);
        if (parents.length > 0) {
          const parentCenterY = parents.reduce((sum, p) => sum + ((p.y || 0) + p.height / 2), 0) / parents.length;
          node.y = parentCenterY - node.height / 2;
        }
      });
      this.resolveLayerCollisions(layers[r], options.gapY, options.originY);
    }

    // Backward Pass (R -> L): Re-center parents between their child forks
    for (let r = layers.length - 2; r >= 0; r--) {
      layers[r].forEach(node => {
        const children = (outEdges.get(node.id) || []).map(cId => nodeMap.get(cId)!).filter(Boolean);
        if (children.length > 0) {
          const childCenterY = children.reduce((sum, c) => sum + ((c.y || 0) + c.height / 2), 0) / children.length;
          node.y = childCenterY - node.height / 2;
        }
      });
      this.resolveLayerCollisions(layers[r], options.gapY, options.originY);
    }

    // Normalize to originY so diagram never shifts off-screen
    let minY = Infinity;
    let maxY = -Infinity;
    nodes.forEach(n => {
      minY = Math.min(minY, n.y || options.originY);
      maxY = Math.max(maxY, (n.y || options.originY) + n.height);
    });

    const shiftY = options.originY - minY;
    nodes.forEach(n => {
      n.y = (n.y || options.originY) + shiftY;
    });

    return {
      width: currentX - options.originX,
      height: (maxY + shiftY) - options.originY
    };
  }

  /**
   * Enforces minimum nodeGapY between adjacent vertical nodes
   * without destroying their relative alignment.
   */
  private resolveLayerCollisions(layer: TaskNode[], gapY: number, minY: number): void {
    if (layer.length <= 1) return;

    // Ensure sorted strictly by current Y
    layer.sort((a, b) => (a.y || 0) - (b.y || 0));

    // Downward push
    for (let i = 1; i < layer.length; i++) {
      const prev = layer[i - 1];
      const curr = layer[i];
      const requiredY = (prev.y || 0) + prev.height + gapY;
      if ((curr.y || 0) < requiredY) {
        curr.y = requiredY;
      }
    }

    // Upward bound guard
    if ((layer[0].y || 0) < minY) {
      const offset = minY - (layer[0].y || 0);
      layer.forEach(n => n.y = (n.y || 0) + offset);
    }
  }
}