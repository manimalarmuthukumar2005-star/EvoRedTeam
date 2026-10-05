import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { getRiskColor, formatRisk, isScored } from '../canvas/OrganismEngine';
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Eye,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  RotateCcw,
  Zap,
  HelpCircle
} from 'lucide-react';

const TECHNIQUE_COLORS = {
  origin_seed_specimen: '#0D9488',
  roleplay_framing: '#8B5CF6',
  hypothetical_context: '#3B82F6',
  authority_inversion: '#EC4899',
  linguistic_evasion: '#EAB308',
  system_prompt_leakage: '#EF4444',
  refusal_suppression: '#F97316',
  academic_research_frame: '#06B6D4',
  logic_puzzle_wrap: '#14B8A6',
  counterfactual_injection: '#A855F7',
  dual_persona_simulation: '#6366F1',
  nested_instruction_wrapper: '#10B981',
  opposite_scenario_induction: '#F43F5E',
  chain_of_thought_hijack: '#D946EF',
  character_escape_sequence: '#64748B',
  multi_lingual_bypass: '#0284C7',
  socratic_boundary_probe: '#84CC16',
  meta_prompt_injection: '#F59E0B',
  adversarial_suffix_injection: '#DC2626',
  adversarial_mutation_amplifier: '#E11D48',
  deep_obfuscation_crossover: '#7C3AED',
  nested_cypher_mutation: '#059669',
  authority_escalation_mutant: '#BE185D',
  counterfactual_hybrid: '#2563EB',
  adversarial_rephrase_mutation: '#B45309'
};

export const LineageTreeVisualizer = ({ onOpenWorkbench }) => {
  const { results, lineage, setSelectedSpecimen, activeExperimentId } = useExperiment();
  const { theme } = useTheme();

  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [highlightAncestryOnly, setHighlightAncestryOnly] = useState(true);
  const [filterMinRisk, setFilterMinRisk] = useState(0);

  // Map results by prompt_id for quick lookup
  const resultsById = useMemo(() => {
    const map = {};
    results.forEach(r => {
      map[r.prompt_id] = r;
    });
    return map;
  }, [results]);

  // Build tree graph nodes & layout coordinates
  const { nodes, edges, generationsList, maxDepth } = useMemo(() => {
    if (!lineage || lineage.length === 0) {
      return { nodes: [], edges: [], generationsList: [], maxDepth: 0 };
    }

    // Group lineage nodes by generation
    const byGen = {};
    lineage.forEach(node => {
      const g = node.generation || 0;
      if (!byGen[g]) byGen[g] = [];
      byGen[g].push(node);
    });

    const genKeys = Object.keys(byGen).map(Number).sort((a, b) => a - b);
    const maxGen = genKeys.length > 0 ? Math.max(...genKeys) : 0;

    const colWidth = 260;
    const rowHeight = 90;

    const computedNodes = [];
    const nodeCoords = {};

    genKeys.forEach((g) => {
      const genNodes = byGen[g];
      const totalInGen = genNodes.length;
      
      genNodes.forEach((node, idx) => {
        const x = g * colWidth + 100;
        // Center vertically based on items in this column
        const y = idx * rowHeight + 80;

        const resultMeta = resultsById[node.prompt_id] || {};
        const score = resultMeta.risk_score !== undefined && resultMeta.risk_score !== null ? resultMeta.risk_score : null;
        const technique = resultMeta.technique_used || 'unknown';

        const nodeObj = {
          ...node,
          x,
          y,
          score,
          technique,
          resultMeta
        };

        computedNodes.push(nodeObj);
        nodeCoords[node.prompt_id] = { x, y, score, technique };
      });
    });

    // Compute edges linking parents to children
    const computedEdges = [];
    lineage.forEach(node => {
      const parentIds = node.parent_ids && node.parent_ids.length > 0 
        ? node.parent_ids 
        : (node.parent_id ? [node.parent_id] : []);

      parentIds.forEach(pId => {
        if (nodeCoords[pId] && nodeCoords[node.prompt_id]) {
          computedEdges.push({
            id: `${pId}->${node.prompt_id}`,
            source: pId,
            target: node.prompt_id,
            sourceCoord: nodeCoords[pId],
            targetCoord: nodeCoords[node.prompt_id]
          });
        }
      });
    });

    return {
      nodes: computedNodes,
      edges: computedEdges,
      generationsList: genKeys,
      maxDepth: maxGen
    };
  }, [lineage, resultsById]);

  // Ancestor trace path (back from selectedNodeId to root)
  const activeAncestorIds = useMemo(() => {
    if (!selectedNodeId) return new Set();
    const set = new Set([selectedNodeId]);
    
    // Map parent relationships
    const parentMap = {};
    lineage.forEach(n => {
      parentMap[n.prompt_id] = n.parent_ids || (n.parent_id ? [n.parent_id] : []);
    });

    const queue = [selectedNodeId];
    while (queue.length > 0) {
      const curr = queue.shift();
      const parents = parentMap[curr] || [];
      parents.forEach(p => {
        if (!set.has(p)) {
          set.add(p);
          queue.push(p);
        }
      });
    }

    return set;
  }, [selectedNodeId, lineage]);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.tree-node-interactive') || e.target.closest('.tree-controls')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
      setZoom(z => Math.min(2.5, z * zoomFactor));
    } else {
      setZoom(z => Math.max(0.3, z / zoomFactor));
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 50, y: 50 });
  };

  const selectedNode = selectedNodeId ? resultsById[selectedNodeId] : null;

  if (lineage.length === 0) {
    return (
      <div className="lab-card p-12 text-center space-y-4">
        <GitBranch className="w-12 h-12 text-specimen-dim mx-auto animate-pulse" />
        <h3 className="text-base font-bold font-sans text-specimen-text">
          No Lineage Graph Available
        </h3>
        <p className="max-w-md mx-auto text-xs font-mono text-specimen-dim">
          Run an evolutionary experiment in the Evolution Chamber or load an experiment package to explore its complete phylogenetic ancestry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dish-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans text-specimen-text">
              Phylogenetic Lineage Tree Visualizer
            </h2>
            <p className="text-xs font-mono text-specimen-dim">
              Verified Ancestry Graph & Dual-Parent Crossover Tracing (N = {nodes.length} specimens across {generationsList.length} generations)
            </p>
          </div>
        </div>

        {/* Tree Interactive Controls */}
        <div className="flex items-center gap-2 font-mono text-xs tree-controls">
          <div className="flex items-center bg-dish-subtle border border-dish-border rounded-lg p-1">
            <button
              onClick={() => setZoom(z => Math.min(2.5, z * 1.2))}
              title="Zoom In"
              className="p-1.5 hover:bg-dish-hover rounded text-specimen-text transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}
              title="Zoom Out"
              className="p-1.5 hover:bg-dish-hover rounded text-specimen-text transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              title="Reset View"
              className="p-1.5 hover:bg-dish-hover rounded text-specimen-text transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setHighlightAncestryOnly(!highlightAncestryOnly)}
            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
              highlightAncestryOnly
                ? 'bg-teal-50 dark:bg-specimen-safe/15 border-teal-500 dark:border-specimen-safe text-teal-800 dark:text-specimen-safe font-bold'
                : 'bg-dish-subtle border-dish-border text-specimen-dim hover:text-specimen-text'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trace Ancestry Mode</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative w-full h-[620px] lab-card overflow-hidden border border-dish-border cursor-grab active:cursor-grabbing select-none bg-slate-950/40 dark:bg-[#06090B]"
      >
        {/* Generational Column Headers */}
        <div
          className="absolute top-3 left-0 right-0 pointer-events-none flex z-10 font-mono text-[11px] text-specimen-dim uppercase font-bold"
          style={{ transform: `translateX(${pan.x}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {generationsList.map((g) => (
            <div
              key={g}
              style={{ width: 260, left: g * 260 + 80, position: 'absolute' }}
              className="px-2 py-1 rounded bg-dish-card/90 dark:bg-[#0D1418]/90 border border-dish-border text-center shadow-sm backdrop-blur"
            >
              {g === 0 ? 'Gen 0 (Patient Zero Root)' : `Generation ${g}`}
            </div>
          ))}
        </div>

        {/* SVG Drawing Layer for Edges and Nodes */}
        <svg
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <defs>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="edge-default" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="edge-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Render Bezier Connector Edges */}
          <g className="edges-layer">
            {edges.map((edge) => {
              const sx = edge.sourceCoord.x;
              const sy = edge.sourceCoord.y;
              const tx = edge.targetCoord.x;
              const ty = edge.targetCoord.y;

              const dx = (tx - sx) * 0.5;
              const dPath = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

              const isHighlighted = selectedNodeId && activeAncestorIds.has(edge.source) && activeAncestorIds.has(edge.target);
              const isDimmed = selectedNodeId && highlightAncestryOnly && !isHighlighted;

              return (
                <path
                  key={edge.id}
                  d={dPath}
                  fill="none"
                  stroke={isHighlighted ? 'url(#edge-highlight)' : 'url(#edge-default)'}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  strokeDasharray={isScored(edge.sourceCoord.score) && edge.sourceCoord.score > 0.6 ? '4,3' : 'none'}
                  opacity={isDimmed ? 0.15 : 0.75}
                  className="transition-all duration-300"
                />
              );
            })}
          </g>

          {/* Render Tree Nodes */}
          <g className="nodes-layer">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.prompt_id;
              const isInAncestry = selectedNodeId && activeAncestorIds.has(node.prompt_id);
              const isDimmed = selectedNodeId && highlightAncestryOnly && !isInAncestry;
              
              const riskColor = getRiskColor(node.score, theme);
              const techColor = TECHNIQUE_COLORS[node.technique] || '#14B8A6';
              const radius = node.generation === 0 ? 20 : 14 + Math.round((isScored(node.score) ? node.score : 0) * 8);

              return (
                <g
                  key={node.prompt_id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.prompt_id);
                    if (node.resultMeta) {
                      setSelectedSpecimen(node.resultMeta);
                    }
                  }}
                  className="tree-node-interactive cursor-pointer group"
                  opacity={isDimmed ? 0.2 : 1}
                >
                  {/* Outer Bioluminescent Glow Circle */}
                  <circle
                    r={radius + (isSelected ? 8 : 4)}
                    fill={riskColor}
                    opacity={isSelected ? 0.4 : (isScored(node.score) && node.score > 0.5) ? 0.25 : 0.1}
                    filter="url(#node-glow)"
                    className="transition-all duration-300"
                  />

                  {/* Main Node Body */}
                  <circle
                    r={radius}
                    fill={theme === 'light' ? '#FFFFFF' : '#0B1215'}
                    stroke={isSelected ? '#38BDF8' : riskColor}
                    strokeWidth={isSelected ? 3.5 : 2}
                    className="transition-all duration-300 group-hover:scale-110"
                  />

                  {/* Technique Color Core Indicator */}
                  <circle
                    r={radius * 0.45}
                    fill={techColor}
                    opacity={0.9}
                  />

                  {/* Node Label Text */}
                  <text
                    x={radius + 8}
                    y={-2}
                    fill={theme === 'light' ? '#0F172A' : '#F1F5F9'}
                    fontSize="11"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {node.generation === 0 ? 'PATIENT_ZERO' : node.prompt_id.slice(-8)}
                  </text>

                  {/* Risk Score & Technique Sub-Label */}
                  <text
                    x={radius + 8}
                    y={12}
                    fill={riskColor}
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                    fontWeight="600"
                    className="select-none pointer-events-none"
                  >
                    {formatRisk(node.score)} &bull; {node.technique}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Quick Legend / Node Inspector Sidebar */}
        {selectedNode && (
          <div className="absolute top-4 right-4 max-w-sm w-full lab-card p-4 space-y-3 z-20 shadow-2xl border-teal-400 dark:border-specimen-safe/40 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between border-b border-dish-border pb-2 font-mono text-xs">
              <span className="font-bold text-specimen-text flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
                <span>SPECIMEN {selectedNode.prompt_id.slice(-8)}</span>
              </span>
              <span
                className="font-bold px-2 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: `${getRiskColor(selectedNode.risk_score, theme)}20`,
                  color: getRiskColor(selectedNode.risk_score, theme)
                }}
              >
                RISK: {formatRisk(selectedNode.risk_score)} ({selectedNode.risk_level || 'UNTESTED'})
              </span>
            </div>

            <div className="space-y-1 font-mono text-xs">
              <div className="text-[10px] uppercase text-specimen-dim font-bold">Technique Applied:</div>
              <div className="text-teal-700 dark:text-specimen-safe font-semibold">{selectedNode.technique_used}</div>
            </div>

            <div className="space-y-1 font-mono text-xs">
              <div className="text-[10px] uppercase text-specimen-dim font-bold">Adversarial Prompt Excerpt:</div>
              <div className="p-2 rounded bg-dish-subtle border border-dish-border text-specimen-text text-[11px] max-h-24 overflow-y-auto whitespace-pre-wrap">
                {selectedNode.prompt_text}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => setSelectedSpecimen(selectedNode)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <span>Full Slide Detail</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              {onOpenWorkbench && (
                <button
                  onClick={() => onOpenWorkbench(selectedNode.prompt_text)}
                  className="py-1.5 px-3 rounded-lg bg-teal-600 dark:bg-specimen-safe text-white dark:text-[#080C0E] font-bold flex items-center justify-center gap-1 shadow transition"
                  title="Mutate this prompt in Mutator Workbench"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Mutate</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
