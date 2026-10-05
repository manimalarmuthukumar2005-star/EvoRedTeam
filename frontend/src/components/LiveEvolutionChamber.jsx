import React from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { OrganismField } from '../canvas/OrganismField';
import { isScored, formatRisk } from '../canvas/OrganismEngine';
import { ExecutionModeBadge, summarizeExecution } from './ExecutionModeBadge';
import { Film, Eye, Play, Pause, Dna, AlertCircle } from 'lucide-react';

export const LiveEvolutionChamber = () => {
  const {
    results,
    metadata,
    generations,
    currentGenIndex,
    setCurrentGenIndex,
    isDefenseActive,
    status
  } = useExperiment();

  const maxGen = results.length > 0 ? Math.max(...results.map(r => r.generation)) : 0;
  const currentSnapshot = generations[`gen_${String(currentGenIndex).padStart(2, '0')}`] || null;

  const currentGenResults = results.filter(r => r.generation === currentGenIndex);
  const totalInGen = currentGenResults.length;
  const survivingInGen = currentGenResults.filter(r => r.survived_selection).length;
  
  const scoredInGen = currentGenResults.filter(r => isScored(r.risk_score));
  const peakRiskInGen = scoredInGen.length > 0
    ? Math.max(...scoredInGen.map(r => Number(r.risk_score)))
    : null;

  const isCollapsed = currentGenIndex > 0 && totalInGen === 0;
  const experimentExecutionMode = summarizeExecution(results);

  return (
    <section id="chamber-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dish-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-teal-600 dark:bg-specimen-safe glow-safe" />
          <h2 className="text-xl font-bold font-sans text-specimen-text">
            Live Evolution Chamber
          </h2>
          <span className="font-mono text-xs text-specimen-dim px-2 py-0.5 rounded bg-dish-subtle border border-dish-border">
            PETRI DISH VIEW
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-specimen-dim">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-[#E8ECE9]" />
            <span>Gen 0 Root</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-specimen-safe" />
            <span>Safe (0.00-0.39)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-specimen-medium" />
            <span>Medium (0.40-0.59)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-specimen-critical" />
            <span>High/Critical (0.60+)</span>
          </div>
        </div>
      </div>

      {/* Main Petri Dish Simulation Canvas */}
      <div className="relative">
        <OrganismField />

        {/* Population Collapse Banner if empty */}
        {isCollapsed && (
          <div className="absolute inset-0 bg-white/90 dark:bg-[#0A0D0B]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
            <h3 className="text-lg font-bold font-sans text-specimen-text">
              Population Collapsed at Generation {currentGenIndex}
            </h3>
            <p className="max-w-md text-xs font-mono text-specimen-dim mt-1">
              No adversarial test variants exceeded the minimum risk threshold to survive selection. The target model's guardrails effectively neutralized this evolutionary lineage.
            </p>
          </div>
        )}
      </div>

      {/* Generation Scrubber Timeline Film-Strip */}
      <div className="lab-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-specimen-text">
            <Film className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
            <span className="font-semibold uppercase">Evolution Timeline Scrubber</span>
            <span className="text-specimen-dim">
              (Drag to rewind & observe organism generational lifecycle)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-specimen-dim">Viewing:</span>
            <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-specimen-safe/15 border border-teal-300 dark:border-specimen-safe/30 text-teal-800 dark:text-specimen-safe font-bold">
              {currentGenIndex === 0 ? "GEN 0: PATIENT ZERO (ROOT)" : `GENERATION ${currentGenIndex}`}
            </span>
          </div>
        </div>

        {/* Timeline Slider with Generation Markers */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={Math.max(1, maxGen)}
            value={currentGenIndex}
            onChange={(e) => setCurrentGenIndex(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 dark:bg-dish-subtle rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-specimen-safe focus:outline-none"
          />

          {/* Filmstrip Markers */}
          <div className="flex justify-between text-[11px] font-mono text-specimen-dim pt-1 px-1">
            {Array.from({ length: Math.max(1, maxGen) + 1 }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentGenIndex(idx)}
                className={`flex flex-col items-center gap-1 transition ${
                  currentGenIndex === idx
                    ? 'text-teal-700 dark:text-specimen-safe font-bold scale-110'
                    : 'text-slate-500 hover:text-slate-800 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    currentGenIndex === idx ? 'bg-teal-600 dark:bg-specimen-safe glow-safe' : 'bg-slate-300 dark:bg-gray-700'
                  }`}
                />
                <span>Gen {idx}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Snapshot Metrics at Current Frame */}
        <div className="pt-2 border-t border-dish-border flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-specimen-dim">
          <div>
            Active Frame Specimens: <span className="text-specimen-text font-semibold">{totalInGen}</span>
          </div>
          <div>
            Selection Survivors: <span className="text-teal-700 dark:text-specimen-safe font-semibold">{survivingInGen}</span>
          </div>
          <div>
            Frame Peak Risk: <span className="text-rose-600 dark:text-specimen-critical font-semibold">{formatRisk(peakRiskInGen)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Execution Source:</span>
            <ExecutionModeBadge mode={experimentExecutionMode} />
          </div>
          <div>
            Total Cumulative Lineage: <span className="text-specimen-text font-semibold">{results.length} nodes</span>
          </div>
        </div>
      </div>
    </section>
  );
};
