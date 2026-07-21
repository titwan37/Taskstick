export const MINDMAP_STYLING_CSS = `
svg text, svg foreignObject, svg foreignObject div, svg foreignObject span, svg foreignObject p, svg .node text, svg .node div {
  color: #0f172a !important;
  fill: #0f172a !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  opacity: 1 !important;
  letter-spacing: 0.2px;
}
svg foreignObject div, svg .node-bkg {
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
}

/* Root / Head Node (Positive Coral Rose) */
svg .mindmap-node--root rect,
svg .mindmap-node--root circle,
svg .mindmap-node--root polygon,
svg .mindmap-node--root path,
svg .mindmap-node--root foreignObject div,
svg .mindmap-node--root div,
svg .effect rect, svg .effect circle, svg .effect div {
  fill: #ffe4e6 !important; 
  background: #ffe4e6 !important;
  background-color: #ffe4e6 !important;
  stroke: #e11d48 !important;
  border: 2px solid #e11d48 !important;
  color: #881337 !important;
}

/* Section 0 / Category 0: Mint Green */
svg .section-0 rect, svg .section-0 circle, svg .section-0 polygon, svg .section-0 path,
svg .section-0 foreignObject div, svg .section-0 div, svg .section-0 .node-bkg,
svg .category-0 rect, svg .category-0 circle, svg .category-0 polygon, svg .category-0 path, svg .category-0 div {
  fill: #dcfce7 !important;
  background: #dcfce7 !important;
  background-color: #dcfce7 !important;
  stroke: #16a34a !important;
  border: 1.5px solid #16a34a !important;
}
svg .section-0 path.mindmap-edge, svg path.section-0, svg .category-0 line, svg line.category-0 { stroke: #34d399 !important; stroke-width: 3px !important; }

/* Section 1 / Category 1: Ice Sky Blue */
svg .section-1 rect, svg .section-1 circle, svg .section-1 polygon, svg .section-1 path,
svg .section-1 foreignObject div, svg .section-1 div, svg .section-1 .node-bkg,
svg .category-1 rect, svg .category-1 circle, svg .category-1 polygon, svg .category-1 path, svg .category-1 div {
  fill: #e0f2fe !important;
  background: #e0f2fe !important;
  background-color: #e0f2fe !important;
  stroke: #0284c7 !important;
  border: 1.5px solid #0284c7 !important;
}
svg .section-1 path.mindmap-edge, svg path.section-1, svg .category-1 line, svg line.category-1 { stroke: #38bdf8 !important; stroke-width: 3px !important; }

/* Section 2 / Category 2: Warm Amber Gold */
svg .section-2 rect, svg .section-2 circle, svg .section-2 polygon, svg .section-2 path,
svg .section-2 foreignObject div, svg .section-2 div, svg .section-2 .node-bkg,
svg .category-2 rect, svg .category-2 circle, svg .category-2 polygon, svg .category-2 path, svg .category-2 div {
  fill: #fef3c7 !important;
  background: #fef3c7 !important;
  background-color: #fef3c7 !important;
  stroke: #d97706 !important;
  border: 1.5px solid #d97706 !important;
}
svg .section-2 path.mindmap-edge, svg path.section-2, svg .category-2 line, svg line.category-2 { stroke: #fbbf24 !important; stroke-width: 3px !important; }

/* Section 3 / Category 3: Soft Lavender Orchid */
svg .section-3 rect, svg .section-3 circle, svg .section-3 polygon, svg .section-3 path,
svg .section-3 foreignObject div, svg .section-3 div, svg .section-3 .node-bkg,
svg .category-3 rect, svg .category-3 circle, svg .category-3 polygon, svg .category-3 path, svg .category-3 div {
  fill: #f3e8ff !important;
  background: #f3e8ff !important;
  background-color: #f3e8ff !important;
  stroke: #9333ea !important;
  border: 1.5px solid #9333ea !important;
}
svg .section-3 path.mindmap-edge, svg path.section-3, svg .category-3 line, svg line.category-3 { stroke: #c084fc !important; stroke-width: 3px !important; }

/* Section 4 / Category 4: Soft Rose Coral */
svg .section-4 rect, svg .section-4 circle, svg .section-4 polygon, svg .section-4 path,
svg .section-4 foreignObject div, svg .section-4 div, svg .section-4 .node-bkg,
svg .category-4 rect, svg .category-4 circle, svg .category-4 polygon, svg .category-4 path, svg .category-4 div {
  fill: #ffe4e6 !important;
  background: #ffe4e6 !important;
  background-color: #ffe4e6 !important;
  stroke: #e11d48 !important;
  border: 1.5px solid #e11d48 !important;
}
svg .section-4 path.mindmap-edge, svg path.section-4, svg .category-4 line, svg line.category-4 { stroke: #fb7185 !important; stroke-width: 3px !important; }

/* Section 5 / Category 5: Warm Sunset Orange */
svg .section-5 rect, svg .section-5 circle, svg .section-5 polygon, svg .section-5 path,
svg .section-5 foreignObject div, svg .section-5 div, svg .section-5 .node-bkg,
svg .category-5 rect, svg .category-5 circle, svg .category-5 polygon, svg .category-5 path, svg .category-5 div {
  fill: #ffedd5 !important;
  background: #ffedd5 !important;
  background-color: #ffedd5 !important;
  stroke: #ea580c !important;
  border: 1.5px solid #ea580c !important;
}
svg .section-5 path.mindmap-edge, svg path.section-5, svg .category-5 line, svg line.category-5 { stroke: #fb923c !important; stroke-width: 3px !important; }

/* Section 6 / Category 6: Soft Turquoise */
svg .section-6 rect, svg .section-6 circle, svg .section-6 polygon, svg .section-6 path,
svg .section-6 foreignObject div, svg .section-6 div, svg .section-6 .node-bkg,
svg .category-6 rect, svg .category-6 circle, svg .category-6 polygon, svg .category-6 path, svg .category-6 div {
  fill: #ccfbf1 !important;
  background: #ccfbf1 !important;
  background-color: #ccfbf1 !important;
  stroke: #0d9488 !important;
  border: 1.5px solid #0d9488 !important;
}
svg .section-6 path.mindmap-edge, svg path.section-6, svg .category-6 line, svg line.category-6 { stroke: #2dd4bf !important; stroke-width: 3px !important; }
`;
