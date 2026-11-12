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
  nodeGapY: number;       // Vertical spacing between parallel tasks
  groupPadding: number;   // Internal padding inside groups
  groupGapX: number;      // Horizontal spacing between distinct groups/meta-nodes
  groupGapY: number;      // Vertical spacing between distinct groups/meta-nodes
}

export const DEFAULT_NODE_WIDTH = 210;
export const MIN_NODE_HEIGHT = 160;

/**
 * Computes dynamic sizing for a Post-it note based on title character count
 * while enforcing the strict minimum bounding box (210px x 160px).
 */
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
  nodeGapX: 90,
  nodeGapY: 45,
  groupPadding: 50,
  groupGapX: 120,
  groupGapY: 80
};

@Injectable({ providedIn: 'root' })
export class WorkflowLayoutService {

  /**
   * Main entry point: Optimizes positions of tasks and group boundaries.
   * - Strict Left-to-Right topological rank levels (Levels 1, 2, 3...)
   * - Parallel branches & forks spread along discrete vertical slots
   * - Strict compound group containment with auto-fitted bounding box + header
   * - Collision-free global meta-graph placement
   */
  public optimizeLayout(
    nodes: TaskNode[],
    edges: TaskEdge[],
    groups: TaskGroup[] = [],
    config: Partial<LayoutConfig> = {}
  ): { nodes: TaskNode[]; groups: TaskGroup[] } {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const clonedNodes: TaskNode[] = nodes.map(n => ({ ...n }));
    const clonedGroups: TaskGroup[] = groups.map(g => ({ ...g }));

    // 1. Partition nodes into groups and ungrouped (orphan) nodes
    const groupNodeMap = new Map<string, TaskNode[]>();
    const ungroupedNodes: TaskNode[] = [];

    clonedNodes.forEach(node => {
      if (node.groupId && clonedGroups.some(g => g.id === node.groupId)) {
        if (!groupNodeMap.has(node.groupId)) {
          groupNodeMap.set(node.groupId, []);
        }
        groupNodeMap.get(node.groupId)!.push(node);
      } else {
        ungroupedNodes.push(node);
      }
    });

    // 2. PHASE 1: Optimize inner layouts for each group (Left-to-Right & Top-to-Down)
    const groupDimensions = new Map<string, { width: number; height: number }>();
    clonedGroups.forEach(grp => {
      const internalNodes = groupNodeMap.get(grp.id) || [];
      if (internalNodes.length === 0) {
        const defaultW = 240;
        const defaultH = 160;
        grp.width = defaultW;
        grp.height = defaultH;
        groupDimensions.set(grp.id, { width: defaultW, height: defaultH });
        return;
      }

      // Filter internal edges
      const internalNodeIds = new Set(internalNodes.map(n => n.id));
      const internalEdges = edges.filter(
        e => internalNodeIds.has(e.sourceId) && internalNodeIds.has(e.targetId)
      );

      // Layout inner elements relative to group coordinate system
      const headerOffset = 30; // Dedicated space for group header/title
      this.layoutDagComponent(internalNodes, internalEdges, {
        gapX: cfg.nodeGapX,
        gapY: cfg.nodeGapY,
        originX: cfg.groupPadding,
        originY: cfg.groupPadding + headerOffset
      });

      // Calculate exact enclosing bounding box encompassing all child nodes
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      internalNodes.forEach(n => {
        const nx = n.x ?? cfg.groupPadding;
        const ny = n.y ?? (cfg.groupPadding + headerOffset);
        if (nx < minX) minX = nx;
        if (nx + n.width > maxX) maxX = nx + n.width;
        if (ny < minY) minY = ny;
        if (ny + n.height > maxY) maxY = ny + n.height;
      });

      const bboxWidth = (maxX - minX) + cfg.groupPadding * 2;
      const bboxHeight = (maxY - minY) + cfg.groupPadding * 2 + headerOffset;

      grp.width = Math.max(bboxWidth, 260);
      grp.height = Math.max(bboxHeight, 180);
      groupDimensions.set(grp.id, { width: grp.width, height: grp.height });
    });

    // 3. PHASE 2: Build Global Meta-Graph (Nodes = Groups + Ungrouped Tasks)
    interface MetaItem {
      id: string;
      isGroup: boolean;
      width: number;
      height: number;
      ref: TaskGroup | TaskNode;
    }

    const metaItems: MetaItem[] = [
      ...clonedGroups.map(g => ({
        id: g.id,
        isGroup: true,
        width: g.width!,
        height: g.height!,
        ref: g
      })),
      ...ungroupedNodes.map(n => ({
        id: n.id,
        isGroup: false,
        width: n.width,
        height: n.height,
        ref: n
      }))
    ];

    // Map internal node ID -> MetaItem ID
    const nodeToMetaId = new Map<string, string>();
    clonedNodes.forEach(n => {
      nodeToMetaId.set(n.id, n.groupId && groupDimensions.has(n.groupId) ? n.groupId : n.id);
    });

    // Translate global edges into inter-meta edges (filtering self-loops)
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

    // 4. PHASE 3: Layout Meta-Graph from Left to Right & Top to Down
    const metaNodesAdapter: TaskNode[] = metaItems.map(m => ({
      id: m.id,
      width: m.width,
      height: m.height
    }));

    this.layoutDagComponent(metaNodesAdapter, metaEdges, {
      gapX: cfg.groupGapX,
      gapY: cfg.groupGapY,
      originX: 60,
      originY: 60
    });

    // 5. PHASE 4: Apply Coordinates Back to Target Objects
    metaNodesAdapter.forEach(layoutMeta => {
      const meta = metaItems.find(m => m.id === layoutMeta.id)!;
      if (meta.isGroup) {
        const grp = meta.ref as TaskGroup;
        grp.x = layoutMeta.x;
        grp.y = layoutMeta.y;

        // Offset group children to absolute world coordinates
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
   * Core Sugiyama-Style Directed Acyclic Graph (DAG) 2D Layering Algorithm
   * - Step A: Strict Topological Leveling along X-axis (Level(u) = max(Level(v)) + 1)
   * - Step B: Column bucketing (Identical X for identical levels, distinct columns for successive levels)
   * - Step C: Vertical Ordering within Columns (Top-to-Down Barycentric Heuristic to minimize edge crossings)
   * - Step D: Coordinate Assignment with explicit non-zero buffers (nodeGapX, nodeGapY)
   */
  private layoutDagComponent(
    nodes: TaskNode[],
    edges: TaskEdge[],
    options: { gapX: number; gapY: number; originX: number; originY: number }
  ): { width: number; height: number } {
    if (nodes.length === 0) return { width: 0, height: 0 };

    const nodeMap = new Map<string, TaskNode>(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const outEdges = new Map<string, string[]>();
    const inEdges = new Map<string, string[]>();

    nodes.forEach(n => {
      inDegree.set(n.id, 0);
      outEdges.set(n.id, []);
      inEdges.set(n.id, []);
    });

    edges.forEach(e => {
      if (nodeMap.has(e.sourceId) && nodeMap.has(e.targetId)) {
        outEdges.get(e.sourceId)!.push(e.targetId);
        inEdges.get(e.targetId)!.push(e.sourceId);
        inDegree.set(e.targetId, (inDegree.get(e.targetId) || 0) + 1);
      }
    });

    // Step A: Strict Longest-Path Layering (Ranks / Levels along X-Axis)
    // Level(u) = max_{(v, u) in E} (Level(v)) + 1, with roots at Level 0
    const rankMap = new Map<string, number>();
    const rootNodes = nodes.filter(n => (inDegree.get(n.id) || 0) === 0).map(n => n.id);

    // If all nodes have in-degree > 0 due to an external cycle fallback, select lowest in-degree
    if (rootNodes.length === 0 && nodes.length > 0) {
      let minDeg = Infinity;
      let minId = nodes[0].id;
      nodes.forEach(n => {
        const deg = inDegree.get(n.id) || 0;
        if (deg < minDeg) {
          minDeg = deg;
          minId = n.id;
        }
      });
      rootNodes.push(minId);
    }

    rootNodes.forEach(id => rankMap.set(id, 0));

    // DFS / Longest-path traversal with cycle protection (max recursion depth = nodes.length)
    const computeLongestPathRank = (currId: string, currentDepth: number, visitedPath: Set<string>) => {
      if (currentDepth > nodes.length || visitedPath.has(currId)) return;
      visitedPath.add(currId);
      const currRank = rankMap.get(currId) || 0;

      for (const nextId of outEdges.get(currId) || []) {
        const currentNextRank = rankMap.get(nextId) ?? 0;
        if (currRank + 1 > currentNextRank) {
          rankMap.set(nextId, currRank + 1);
        }
        computeLongestPathRank(nextId, currentDepth + 1, new Set(visitedPath));
      }
    };

    rootNodes.forEach(id => computeLongestPathRank(id, 0, new Set()));

    // Assign rank 0 to any remaining unranked nodes
    nodes.forEach(n => {
      if (!rankMap.has(n.id)) rankMap.set(n.id, 0);
    });

    // Step B: Bucket Nodes by Rank into Vertical Columns (Levels)
    const maxRank = Math.max(...Array.from(rankMap.values()), 0);
    const layers: TaskNode[][] = Array.from({ length: maxRank + 1 }, () => []);

    nodes.forEach(n => {
      const r = rankMap.get(n.id)!;
      layers[r].push(n);
    });

    // Step C: Top-to-Down Slot Ordering within Columns (Barycentric Median Heuristic)
    // Sibling nodes are ordered vertically near the median/average vertical position of their incoming predecessors
    for (let r = 1; r < layers.length; r++) {
      const prevLayerOrder = new Map<string, number>();
      layers[r - 1].forEach((n, idx) => prevLayerOrder.set(n.id, idx));

      layers[r].sort((a, b) => {
        const aParents = inEdges.get(a.id) || [];
        const bParents = inEdges.get(b.id) || [];

        const aBary = aParents.length > 0
          ? aParents.reduce((sum, pId) => sum + (prevLayerOrder.get(pId) ?? 0), 0) / aParents.length
          : 0;

        const bBary = bParents.length > 0
          ? bParents.reduce((sum, pId) => sum + (prevLayerOrder.get(pId) ?? 0), 0) / bParents.length
          : 0;

        if (aBary !== bBary) {
          return aBary - bBary;
        }
        // Deterministic secondary sort by title/id
        return a.id.localeCompare(b.id);
      });
    }

    // Step D: Calculate Non-Overlapping Coordinates (Strict Straight Columns)
    // Each column has a uniform X coordinate. Parallel forks are stacked with nodeGapY.
    let currentX = options.originX;
    let totalMaxY = 0;

    layers.forEach(layer => {
      if (layer.length === 0) return;

      let layerMaxWidth = 0;
      let currentY = options.originY;

      layer.forEach(node => {
        node.x = currentX;
        node.y = currentY;

        layerMaxWidth = Math.max(layerMaxWidth, node.width);
        currentY += node.height + options.gapY;
      });

      if (currentY > totalMaxY) {
        totalMaxY = currentY;
      }

      currentX += layerMaxWidth + options.gapX;
    });

    return {
      width: Math.max(currentX - options.originX - options.gapX, 0),
      height: Math.max(totalMaxY - options.originY - options.gapY, 0)
    };
  }
}