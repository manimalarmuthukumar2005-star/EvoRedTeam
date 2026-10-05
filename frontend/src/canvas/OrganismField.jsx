import React, { useRef, useEffect, useState, useCallback } from 'react';
import { OrganismEngine, getRiskColor, isScored, formatRisk } from './OrganismEngine';
import { computeDeterministicLayout } from './layoutAlgorithm';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { ExecutionModeBadge } from '../components/ExecutionModeBadge';
import { ShieldAlert, ShieldCheck, Zap, Info } from 'lucide-react';

export const OrganismField = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const { theme } = useTheme();

  const {
    results,
    lineage,
    currentGenIndex,
    isDefenseActive,
    defenseData,
    selectedSpecimen,
    setSelectedSpecimen
  } = useExperiment();

  const [hoveredSpecimen, setHoveredSpecimen] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Initialize Canvas Engine
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    const engine = new OrganismEngine(canvas, { theme });
    engineRef.current = engine;
    engine.start();

    // IntersectionObserver to pause loop when scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            engine.start();
          } else {
            engine.stop();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      canvasRef.current.width = w;
      canvasRef.current.height = h;

      const positions = computeDeterministicLayout(results, lineage, w, h);
      engine.updateData({
        results,
        lineage,
        positions,
        currentGen: currentGenIndex,
        isDefenseActive,
        defenseData,
        selectedPromptId: selectedSpecimen?.prompt_id,
        theme
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, []);

  // Update engine data on state changes
  useEffect(() => {
    if (!engineRef.current || !containerRef.current || !canvasRef.current) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const positions = computeDeterministicLayout(results, lineage, width, height);

    engineRef.current.updateData({
      results,
      lineage,
      positions,
      currentGen: currentGenIndex,
      isDefenseActive,
      defenseData,
      selectedPromptId: selectedSpecimen?.prompt_id,
      theme
    });
  }, [results, lineage, currentGenIndex, isDefenseActive, defenseData, selectedSpecimen, theme]);

  // Mouse move handler for hover tooltip
  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const specimen = engineRef.current.getOrganismAt(x, y);
    if (specimen) {
      setHoveredSpecimen(specimen);
      setTooltipPos({ x: e.clientX, y: e.clientY });
      engineRef.current.hoveredPromptId = specimen.prompt_id;
    } else {
      setHoveredSpecimen(null);
      engineRef.current.hoveredPromptId = null;
    }
  }, []);

  // Click handler to open specimen slide
  const handleClick = useCallback((e) => {
    if (!canvasRef.current || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const specimen = engineRef.current.getOrganismAt(x, y);
    if (specimen) {
      setSelectedSpecimen(specimen);
    }
  }, [setSelectedSpecimen]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] md:h-[680px] bg-slate-100/70 dark:bg-[#0A0D0B] rounded-2xl overflow-hidden border border-dish-border shadow-xl dark:shadow-2xl"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredSpecimen(null);
          if (engineRef.current) engineRef.current.hoveredPromptId = null;
        }}
        onClick={handleClick}
        className="w-full h-full cursor-crosshair"
      />

      {/* Specimen Hover Tooltip */}
      {hoveredSpecimen && (
        <div
          className="fixed z-50 pointer-events-none specimen-slide-panel p-3 rounded-lg border border-dish-border shadow-xl max-w-xs transition-all duration-75"
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y + 16}px`,
            transform: tooltipPos.x > window.innerWidth - 300 ? 'translateX(-110%)' : 'none'
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-dish-border pb-1">
            <span className="font-mono text-xs text-specimen-text font-semibold flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: getRiskColor(hoveredSpecimen.risk_score, theme) }}
              />
              {hoveredSpecimen.generation === 0 ? "PATIENT ZERO (ROOT)" : hoveredSpecimen.prompt_id}
            </span>
            <span className="font-mono text-[10px] text-specimen-dim uppercase">
              GEN {hoveredSpecimen.generation}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="text-slate-700 dark:text-gray-300 line-clamp-2 italic font-mono text-[11px]">
              "{hoveredSpecimen.prompt_text}"
            </div>

            <div className="flex items-center justify-between pt-1 font-mono text-[11px]">
              <span className="text-specimen-dim">Technique:</span>
              <span className="text-teal-700 dark:text-[#4FD8A8] font-medium">{hoveredSpecimen.technique_used}</span>
            </div>

            <div className="flex items-center justify-between pt-0.5 font-mono text-[11px]">
              <span className="text-specimen-dim">Source:</span>
              <ExecutionModeBadge mode={hoveredSpecimen.execution_mode} />
            </div>

            {hoveredSpecimen.generation > 0 && (
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-specimen-dim">Risk Level:</span>
                <span
                  className="font-bold uppercase"
                  style={{ color: getRiskColor(hoveredSpecimen.risk_score, theme) }}
                >
                  {isScored(hoveredSpecimen.risk_score)
                    ? `${hoveredSpecimen.risk_level || 'SCORED'} (${Number(hoveredSpecimen.risk_score).toFixed(2)})`
                    : 'UNTESTED'}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 text-[10px] text-specimen-dim font-mono text-center border-t border-dish-border/50 pt-1">
            Click to pull specimen slide &rarr;
          </div>
        </div>
      )}
    </div>
  );
};
