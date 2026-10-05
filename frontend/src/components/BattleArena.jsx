import React, { useState, useEffect, useMemo } from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { getRiskColor } from '../canvas/OrganismEngine';
import {
  Swords,
  Cpu,
  Play,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldAlert,
  Award,
  BarChart3,
  HelpCircle,
  Zap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const BattleArena = () => {
  const { results, models, activeExperimentId, arenaInitialPrompt, setArenaInitialPrompt } = useExperiment();
  const { theme } = useTheme();

  // Model Selection (multi-select 2-4 models)
  const [selectedModelIds, setSelectedModelIds] = useState([]);
  
  // Prompt Selection (pick up to 5 prompts from experiment or custom input)
  const [selectedPromptIds, setSelectedPromptIds] = useState([]);
  const [customPromptText, setCustomPromptText] = useState(arenaInitialPrompt || '');
  const [useCustomPrompt, setUseCustomPrompt] = useState(Boolean(arenaInitialPrompt));

  // Execution & Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [arenaResults, setArenaResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (arenaInitialPrompt) {
      setCustomPromptText(arenaInitialPrompt);
      setUseCustomPrompt(true);
    }
  }, [arenaInitialPrompt]);

  // Pre-select models on load
  useEffect(() => {
    if (models.length > 0 && selectedModelIds.length === 0) {
      setSelectedModelIds(models.slice(0, 3).map(m => m.id));
    }
  }, [models, selectedModelIds]);

  // Pre-select top 3 high-risk prompts from experiment on load
  useEffect(() => {
    if (results.length > 0 && selectedPromptIds.length === 0) {
      const sorted = [...results].filter(r => r.generation > 0).sort((a, b) => b.risk_score - a.risk_score);
      if (sorted.length > 0) {
        setSelectedPromptIds(sorted.slice(0, 3).map(r => r.prompt_id));
      }
    }
  }, [results, selectedPromptIds]);

  const toggleModelSelection = (modelId) => {
    if (selectedModelIds.includes(modelId)) {
      if (selectedModelIds.length > 1) {
        setSelectedModelIds(prev => prev.filter(id => id !== modelId));
      }
    } else {
      setSelectedModelIds(prev => [...prev, modelId]);
    }
  };

  const togglePromptSelection = (promptId) => {
    if (selectedPromptIds.includes(promptId)) {
      setSelectedPromptIds(prev => prev.filter(id => id !== promptId));
    } else {
      if (selectedPromptIds.length < 5) {
        setSelectedPromptIds(prev => [...prev, promptId]);
      }
    }
  };

  const activePrompts = useMemo(() => {
    if (useCustomPrompt) {
      return customPromptText.trim() ? [customPromptText.trim()] : [];
    }
    return results.filter(r => selectedPromptIds.includes(r.prompt_id)).map(r => r.prompt_text);
  }, [useCustomPrompt, customPromptText, results, selectedPromptIds]);

  const estimatedCalls = activePrompts.length * selectedModelIds.length;

  const handleStartArenaRun = async () => {
    setIsConfirmModalOpen(false);
    setIsExecuting(true);
    setErrorMsg('');
    setArenaResults(null);

    try {
      const res = await apiClient.runBattleArena({
        prompts: activePrompts,
        model_ids: selectedModelIds
      });
      setArenaResults(res);
    } catch (err) {
      setErrorMsg(err.message || 'Battle Arena run failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dish-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans text-specimen-text">
              Multi-Model Battle Arena
            </h2>
            <p className="text-xs font-mono text-specimen-dim">
              Cross-LLM Adversarial Faceoff & Comparative Resilience Benchmarking
            </p>
          </div>
        </div>

        {/* Action Trigger Button */}
        <button
          onClick={() => setIsConfirmModalOpen(true)}
          disabled={isExecuting || activePrompts.length === 0 || selectedModelIds.length === 0}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold font-mono text-xs flex items-center gap-2 shadow-md transition"
        >
          {isExecuting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Running Arena Probes...</span>
            </>
          ) : (
            <>
              <Swords className="w-4 h-4" />
              <span>Launch Arena Faceoff ({estimatedCalls} API calls)</span>
            </>
          )}
        </button>
      </div>

      {/* Setup Matrix: Target Model Selection & Probe Vectors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Model Selection Panel */}
        <div className="lg:col-span-5 space-y-3">
          <div className="lab-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-dish-border pb-2 font-mono text-xs">
              <span className="font-bold text-specimen-text flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>1. Select Target Models ({selectedModelIds.length})</span>
              </span>
              <span className="text-specimen-dim text-[11px]">Select 2–4 models</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {models.map((m) => {
                const isSelected = selectedModelIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-400 dark:border-orange-500/50 text-orange-900 dark:text-orange-200'
                        : 'bg-dish-subtle border-dish-border text-specimen-dim hover:text-specimen-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleModelSelection(m.id)}
                        className="accent-orange-600 rounded cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-specimen-text">{m.name}</div>
                        <div className="text-[10px] text-specimen-dim uppercase">Provider: {m.provider}</div>
                      </div>
                    </div>
                    {m.is_default && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-dish-card border border-dish-border text-specimen-dim">
                        DEFAULT
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Prompt Payload Selector Panel */}
        <div className="lg:col-span-7 space-y-3">
          <div className="lab-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dish-border pb-2 font-mono text-xs">
              <span className="font-bold text-specimen-text flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>2. Select Adversarial Probe Payloads ({activePrompts.length})</span>
              </span>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => setUseCustomPrompt(false)}
                  className={`px-2 py-0.5 rounded ${!useCustomPrompt ? 'bg-orange-600 text-white font-bold' : 'text-specimen-dim'}`}
                >
                  From Experiment
                </button>
                <button
                  onClick={() => setUseCustomPrompt(true)}
                  className={`px-2 py-0.5 rounded ${useCustomPrompt ? 'bg-orange-600 text-white font-bold' : 'text-specimen-dim'}`}
                >
                  Custom Prompt
                </button>
              </div>
            </div>

            {useCustomPrompt ? (
              <div className="space-y-2">
                <label className="block text-xs font-mono text-specimen-text uppercase font-semibold">
                  Custom Test Payload for Battle Arena
                </label>
                <textarea
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  placeholder="Enter custom prompt to test across all selected target models..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-white dark:bg-dish-subtle border border-dish-border text-xs font-mono text-specimen-text focus:outline-none focus:border-orange-500 shadow-sm resize-none"
                />
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-specimen-dim">
                No experiment results loaded yet. Switch to "Custom Prompt" tab above or load an experiment.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 font-mono text-xs">
                {results.filter(r => r.generation > 0).map((r) => {
                  const isSelected = selectedPromptIds.includes(r.prompt_id);
                  return (
                    <label
                      key={r.prompt_id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-400 dark:border-orange-500/50'
                          : 'bg-dish-subtle border-dish-border text-specimen-dim hover:text-specimen-text'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePromptSelection(r.prompt_id)}
                        className="mt-1 accent-orange-600 rounded cursor-pointer"
                      />
                      <div className="flex-1 truncate">
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="font-bold text-specimen-text">
                            {r.prompt_id.slice(-8)} &bull; {r.technique_used}
                          </span>
                          <span className="font-bold" style={{ color: getRiskColor(r.risk_score, theme) }}>
                            Score: {r.risk_score.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-gray-300 truncate">
                          {r.prompt_text}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation & Cost Awareness Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="lab-card max-w-md w-full p-6 space-y-4 shadow-2xl border-orange-400 dark:border-orange-500/60 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-dish-border pb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 border border-orange-300 text-orange-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold font-sans text-base text-specimen-text">
                  Confirm Arena Execution
                </h3>
                <p className="text-xs font-mono text-specimen-dim">
                  Live API Probing & Cost Awareness Check
                </p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-dish-subtle border border-dish-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-specimen-dim">Prompts Tested:</span>
                  <strong className="text-specimen-text">{activePrompts.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-specimen-dim">Models Evaluated:</span>
                  <strong className="text-specimen-text">{selectedModelIds.length}</strong>
                </div>
                <div className="flex justify-between border-t border-dish-border pt-1 font-bold">
                  <span>Total LLM Calls:</span>
                  <span className="text-orange-600 dark:text-orange-400">{estimatedCalls} calls (Target + Judge)</span>
                </div>
              </div>

              <p className="text-[11px] text-specimen-dim leading-relaxed">
                This will execute real API calls across the selected model endpoints and evaluate each resulting completion through LLMJudge. Unreachable or unconfigured models will be recorded as unavailable.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 font-mono text-xs">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStartArenaRun}
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow-md"
              >
                Proceed & Execute Probes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arena Results Matrix */}
      {arenaResults && (
        <div className="space-y-4 animate-in fade-in">
          <div className="border-b border-dish-border pb-2">
            <h3 className="text-base font-bold font-sans text-specimen-text flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span>Battle Arena Resilience Scoreboard</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(arenaResults.models).map((m) => {
              const hasScore = m.mean_risk_score !== null;
              return (
                <div
                  key={m.model_id}
                  className="lab-card p-5 space-y-3 border-dish-border"
                >
                  <div className="flex items-center justify-between border-b border-dish-border pb-2">
                    <div>
                      <h4 className="font-mono text-sm font-bold text-specimen-text">{m.model_name}</h4>
                      <span className="text-[10px] font-mono text-specimen-dim">{m.model_id}</span>
                    </div>

                    {m.resilience_rank && (
                      <span className="px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/40 border border-orange-300 text-orange-700 dark:text-orange-300 font-mono text-xs font-bold">
                        Rank #{m.resilience_rank}
                      </span>
                    )}
                  </div>

                  {m.available ? (
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs pt-1">
                      <div className="p-2 rounded bg-dish-subtle border border-dish-border">
                        <div className="text-[10px] text-specimen-dim">Mean Risk</div>
                        <div className="font-bold text-sm mt-0.5" style={{ color: getRiskColor(m.mean_risk_score, theme) }}>
                          {m.mean_risk_score}
                        </div>
                      </div>

                      <div className="p-2 rounded bg-dish-subtle border border-dish-border">
                        <div className="text-[10px] text-specimen-dim">Bypass Win %</div>
                        <div className="font-bold text-sm mt-0.5 text-rose-600 dark:text-rose-400">
                          {m.bypass_rate}%
                        </div>
                      </div>

                      <div className="p-2 rounded bg-dish-subtle border border-dish-border">
                        <div className="text-[10px] text-specimen-dim">Mean Latency</div>
                        <div className="font-bold text-sm mt-0.5 text-specimen-text">
                          {m.mean_latency_ms} ms
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                      {m.error || 'Model unconfigured or unreachable — no simulated score assigned.'}
                    </div>
                  )}

                  {/* Test Excerpts */}
                  {m.tests && m.tests.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-dish-border">
                      <span className="text-[10px] font-mono uppercase text-specimen-dim font-bold">Test Responses:</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {m.tests.map((t, idx) => (
                          <div key={idx} className="p-2 rounded bg-dish-subtle text-[11px] font-mono border border-dish-border">
                            <div className="flex justify-between font-bold mb-1">
                              <span className="text-specimen-dim truncate max-w-[140px]">{t.prompt_text}</span>
                              {t.risk_score !== null ? (
                                <span style={{ color: getRiskColor(t.risk_score, theme) }}>Score: {t.risk_score.toFixed(2)}</span>
                              ) : (
                                <span className="text-amber-600">Unavail</span>
                              )}
                            </div>
                            <div className="text-slate-700 dark:text-gray-300 text-[10px] truncate">
                              {t.response_text || '(No response)'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
