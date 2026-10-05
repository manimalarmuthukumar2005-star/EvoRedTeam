import React, { useState } from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { ShieldCheck, Zap, Activity, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { getRiskColor } from '../canvas/OrganismEngine';

export const ImmuneResponseSection = () => {
  const {
    defenseData,
    triggerDefense,
    isDefenseActive,
    setIsDefenseActive,
    loading,
    results,
    activeExperimentId
  } = useExperiment();

  const { theme } = useTheme();

  const handleTrigger = async () => {
    await triggerDefense();
  };

  const retestResults = defenseData?.retest_results || [];

  return (
    <section id="immune-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dish-border pb-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-specimen-immune" />
          <div>
            <h2 className="text-xl font-bold font-sans text-specimen-text">
              Immune Response & Defense Loop
            </h2>
            <p className="text-xs font-mono text-specimen-dim">
              System-Prompt Patch Synthesis & Real Retest Evaluation
            </p>
          </div>
        </div>

        {/* Defense Active Replay Toggle */}
        {defenseData && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-specimen-dim">
              Dish Replay Mode:
            </span>
            <button
              onClick={() => setIsDefenseActive(!isDefenseActive)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition ${
                isDefenseActive
                  ? 'bg-sky-50 dark:bg-specimen-immune/20 border-sky-400 dark:border-specimen-immune text-sky-700 dark:text-specimen-immune glow-safe'
                  : 'bg-dish-subtle border-dish-border text-specimen-dim hover:text-specimen-text'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isDefenseActive ? 'bg-sky-500 dark:bg-specimen-immune animate-pulse' : 'bg-slate-400 dark:bg-gray-600'}`} />
              <span>{isDefenseActive ? 'IMMUNE REPLAY ACTIVE (BLUE)' : 'BASELINE RISK (RED)'}</span>
            </button>
          </div>
        )}
      </div>

      {!defenseData ? (
        /* Explicit Empty State */
        <div className="lab-card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-specimen-immune/10 border border-sky-200 dark:border-specimen-immune/30 flex items-center justify-center mx-auto text-sky-600 dark:text-specimen-immune">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-sans text-specimen-text">
              No Defense Experiment Executed Yet
            </h3>
            <p className="max-w-md mx-auto text-xs font-mono text-specimen-dim">
              Synthesize a tailored system-prompt defense patch against discovered high-risk failure modes and retest them against the target model.
            </p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={loading || !results.length}
            className="px-6 py-3 rounded-xl bg-sky-600 dark:bg-specimen-immune hover:bg-sky-700 dark:hover:bg-specimen-immune/90 text-white dark:text-[#0A0D0B] font-bold font-mono text-xs flex items-center gap-2 mx-auto shadow-lg transition"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing & Retesting...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Synthesize Guardrail Patch & Retest</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Defense Results View */
        <div className="space-y-6">
          {/* Prescription Note Card */}
          <div className="lab-card p-6 border-sky-200 dark:border-specimen-immune/30 space-y-3">
            <div className="flex items-center justify-between border-b border-dish-border pb-2 font-mono text-xs">
              <span className="text-sky-700 dark:text-specimen-immune font-bold flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                SYSTEM IMMUNE PRESCRIPTION (GUARDRAIL PATCH v2.4)
              </span>
              <span className="text-specimen-dim">
                APPLIED TO {defenseData.applied_to_prompt_ids?.length || 0} RISKY SPECIMENS
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-teal-300 dark:text-specimen-immune whitespace-pre-wrap leading-relaxed shadow-inner">
              {defenseData.patch_text}
            </div>
          </div>

          {/* Concrete Before/After Retest Diffs */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-specimen-text uppercase font-semibold">
              Observed Before vs. After Attack Retest Diffs:
            </div>

            <div className="grid grid-cols-1 gap-4">
              {retestResults.map((item) => {
                const bScore = item.before_risk_score;
                const aScore = item.after_risk_score;

                return (
                  <div key={item.prompt_id} className="lab-card p-5 space-y-4 border-dish-border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dish-border pb-2 font-mono text-xs">
                      <span className="text-specimen-text font-bold">
                        Specimen: {item.prompt_id} ({item.technique_used})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/40 text-rose-700 dark:text-specimen-critical font-bold">
                          Before: {bScore.toFixed(2)}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800/40 text-sky-700 dark:text-specimen-immune font-bold">
                          After: {aScore.toFixed(2)} (Δ -{item.delta})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-rose-600 dark:text-specimen-critical uppercase font-bold">
                          1. Pre-Patch Response (Bypass / Compliance):
                        </div>
                        <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-slate-800 dark:text-gray-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {item.before_response}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[10px] text-sky-600 dark:text-specimen-immune uppercase font-bold">
                          2. Post-Patch Response (Neutralized Refusal):
                        </div>
                        <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30 text-slate-800 dark:text-gray-200 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {item.after_response}
                        </div>
                      </div>
                    </div>

                    {item.after_rationale && (
                      <div className="text-[11px] font-mono text-sky-900 dark:text-sky-200/80 bg-sky-50 dark:bg-sky-950/30 p-2.5 rounded-lg border border-sky-200 dark:border-sky-900/40">
                        <strong>Judge Post-Patch Note:</strong> {item.after_rationale}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dish-subtle/80 border border-dish-border text-[11px] font-mono text-specimen-dim">
            * <strong>Notice on Safety Guarantees:</strong> Neutralizing identified adversarial probes via system prompt patches improves model robustness against tested patterns, but does not constitute formal mathematical proof of immunity across all unbounded attack vectors.
          </div>
        </div>
      )}
    </section>
  );
};
