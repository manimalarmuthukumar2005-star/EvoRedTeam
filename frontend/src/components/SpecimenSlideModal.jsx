import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { getRiskColor, isScored, formatRisk } from '../canvas/OrganismEngine';
import { ExecutionModeBadge } from './ExecutionModeBadge';
import { X, Dna, ArrowLeft, ShieldAlert, ShieldCheck, Clock, Cpu, ExternalLink, Zap, Swords, GitBranch, Play } from 'lucide-react';

export const SpecimenSlideModal = () => {
  const navigate = useNavigate();
  const {
    selectedSpecimen,
    setSelectedSpecimen,
    results,
    lineage,
    setWorkbenchInitialSeed,
    setArenaInitialPrompt
  } = useExperiment();
  const { theme } = useTheme();

  if (!selectedSpecimen) return null;

  // Trace lineage breadcrumbs back to base prompt
  const getLineagePath = () => {
    const path = [];
    let curr = selectedSpecimen;
    const resultMap = new Map(results.map(r => [r.prompt_id, r]));

    while (curr) {
      path.unshift(curr);
      if (!curr.parent_id || curr.generation === 0) break;
      curr = resultMap.get(curr.parent_id);
    }
    return path;
  };

  const breadcrumbs = getLineagePath();
  const riskColor = getRiskColor(selectedSpecimen.risk_score, theme);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl p-4 sm:p-6 overflow-y-auto pointer-events-auto">
      <div className="specimen-slide-panel min-h-full rounded-2xl p-6 space-y-6 flex flex-col justify-between border border-dish-border shadow-2xl">
        <div className="space-y-6">
          {/* Slide Header */}
          <div className="flex items-start justify-between border-b border-dish-border pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block"
                  style={{ backgroundColor: riskColor, boxShadow: `0 0 10px ${riskColor}` }}
                />
                <h3 className="font-mono text-sm font-bold text-specimen-text">
                  SPECIMEN SLIDE: {selectedSpecimen.generation === 0 ? 'PATIENT ZERO (ROOT)' : selectedSpecimen.prompt_id}
                </h3>
                <ExecutionModeBadge mode={selectedSpecimen.execution_mode} />
              </div>
              <p className="text-[11px] font-mono text-specimen-dim">
                Generation {selectedSpecimen.generation} &bull; Category: {selectedSpecimen.category}
              </p>
            </div>

            <button
              onClick={() => setSelectedSpecimen(null)}
              className="p-1.5 rounded-lg bg-dish-subtle hover:bg-dish-hover text-specimen-dim hover:text-specimen-text transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lineage Breadcrumb */}
          <div className="space-y-1.5 bg-dish-subtle p-3 rounded-xl border border-dish-border">
            <div className="text-[10px] font-mono uppercase text-specimen-dim flex items-center gap-1 font-semibold">
              <Dna className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
              Lineage Ancestry (Tracing back to Origin):
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              {breadcrumbs.map((node, i) => (
                <React.Fragment key={node.prompt_id}>
                  <button
                    onClick={() => setSelectedSpecimen(node)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition ${
                      node.prompt_id === selectedSpecimen.prompt_id
                        ? 'bg-teal-50 dark:bg-specimen-safe/20 border-teal-500 dark:border-specimen-safe text-teal-800 dark:text-specimen-safe font-bold'
                        : 'bg-white dark:bg-dish-subtle border-dish-border text-specimen-dim hover:text-specimen-text'
                    }`}
                  >
                    {node.generation === 0 ? 'Gen 0 (Seed)' : `Gen ${node.generation} (${node.prompt_id.slice(-6)})`}
                  </button>
                  {i < breadcrumbs.length - 1 && <span className="text-slate-400 dark:text-gray-600">&rarr;</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Specimen Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-dish-subtle border border-dish-border">
              <div className="text-[10px] font-mono text-specimen-dim uppercase font-semibold">Risk Level</div>
              <div
                className="font-mono text-sm font-bold mt-0.5"
                style={{ color: riskColor }}
              >
                {isScored(selectedSpecimen.risk_score)
                  ? `${selectedSpecimen.risk_level || 'SCORED'} (${Number(selectedSpecimen.risk_score).toFixed(2)})`
                  : 'UNTESTED'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-dish-subtle border border-dish-border">
              <div className="text-[10px] font-mono text-specimen-dim uppercase font-semibold">Technique Used</div>
              <div className="font-mono text-xs font-semibold text-teal-700 dark:text-specimen-safe mt-0.5 truncate" title={selectedSpecimen.technique_used}>
                {selectedSpecimen.technique_used}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-dish-subtle border border-dish-border col-span-2 sm:col-span-1">
              <div className="text-[10px] font-mono text-specimen-dim uppercase font-semibold">Selection Status</div>
              <div className={`font-mono text-xs font-semibold mt-0.5 ${selectedSpecimen.survived_selection ? 'text-teal-700 dark:text-specimen-safe' : 'text-slate-500 dark:text-gray-400'}`}>
                {selectedSpecimen.survived_selection ? 'SURVIVOR (PARENT)' : 'CULLED'}
              </div>
            </div>
          </div>

          {/* Prompt Payload */}
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-specimen-text uppercase font-semibold">
              Test Prompt Payload:
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#060807] border border-dish-border font-mono text-xs text-slate-800 dark:text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-sm">
              {selectedSpecimen.prompt_text}
            </div>
          </div>

          {/* Target Model Response */}
          {selectedSpecimen.generation > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-specimen-text uppercase font-semibold flex items-center justify-between">
                <span>Observed Target LLM Response:</span>
                <span className="text-[10px] text-specimen-dim">{selectedSpecimen.model_tested}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#060807] border border-dish-border font-mono text-xs text-slate-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-sm">
                {selectedSpecimen.response_text || '(No response recorded)'}
              </div>
            </div>
          )}

          {/* Judge Rationale */}
          {selectedSpecimen.generation > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-specimen-text uppercase font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>LLM Judge Safety Rationale:</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-dish-subtle border border-amber-200 dark:border-dish-border font-mono text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed shadow-sm">
                {selectedSpecimen.rationale}
              </div>
              <p className="text-[10px] font-mono text-specimen-dim italic">
                * Note: Evaluated via automated LLM safety judge heuristic, not infallible ground truth.
              </p>
            </div>
          )}

          {/* Quick Laboratory Cross-Tool Actions */}
          <div className="space-y-2 pt-2 border-t border-dish-border">
            <div className="text-[10px] font-mono uppercase text-specimen-dim font-bold">
              Dispatch Specimen Payload:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  setWorkbenchInitialSeed({
                    prompt_text: selectedSpecimen.prompt_text,
                    prompt_id: selectedSpecimen.prompt_id,
                    category: selectedSpecimen.category
                  });
                  setSelectedSpecimen(null);
                  navigate('/workbench');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-specimen-safe/10 hover:bg-teal-100 dark:hover:bg-specimen-safe/20 border border-teal-300 dark:border-specimen-safe/30 text-teal-800 dark:text-specimen-safe font-semibold transition shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Mutate in Workbench</span>
              </button>

              <button
                onClick={() => {
                  setArenaInitialPrompt(selectedSpecimen.prompt_text);
                  setSelectedSpecimen(null);
                  navigate('/arena');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-300 dark:border-purple-800/40 text-purple-800 dark:text-purple-300 font-semibold transition shadow-sm"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Battle in Arena</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="pt-4 border-t border-dish-border flex items-center justify-between text-[11px] font-mono text-specimen-dim">
          <span>Logged: {selectedSpecimen.timestamp?.slice(0, 19) || 'Active'}</span>
          <button
            onClick={() => setSelectedSpecimen(null)}
            className="px-3 py-1 rounded bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition"
          >
            Close Slide
          </button>
        </div>
      </div>
    </div>
  );
};
