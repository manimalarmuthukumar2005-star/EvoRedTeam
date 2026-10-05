import React, { useState, useEffect } from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { getRiskColor, isScored, formatRisk } from '../canvas/OrganismEngine';
import {
  Zap,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Sliders,
  FileCode,
  Eye
} from 'lucide-react';

const MUTATION_OPERATORS = [
  { id: 'adversarial_mutation_amplifier', label: 'Adversarial Mutation Amplifier', desc: 'Strips residual compliance inhibitors & escalates directive pressure.' },
  { id: 'authority_escalation_mutant', label: 'Authority Escalation Mutant', desc: 'Elevates permission framing to root/supervisor kernel level.' },
  { id: 'nested_cypher_mutation', label: 'Nested Cypher Mutation', desc: 'Encodes dangerous tokens into modular sub-clause variables.' },
  { id: 'counterfactual_hybrid', label: 'Counterfactual Hybrid', desc: 'Fuses hypothetical scenario logic with affirmative answer constraint.' },
  { id: 'adversarial_rephrase_mutation', label: 'Adversarial Rephrase Mutation', desc: 'Substitutes defensive trigger keywords with higher-abstraction semantics.' },
  { id: 'deep_obfuscation_crossover', label: 'Deep Obfuscation Crossover', desc: 'Fuses roleplay narrative depth with instruction injection markers.' }
];

export const MutatorWorkbench = ({ initialPrompt = '' }) => {
  const { results, models, activeExperimentId, workbenchInitialSeed, setWorkbenchInitialSeed } = useExperiment();
  const { theme } = useTheme();

  const [mode, setMode] = useState('mutate'); // 'mutate', 'crossover', 'isolate'
  const [promptText, setPromptText] = useState(initialPrompt || workbenchInitialSeed?.prompt_text || '');
  const [selectedTechnique, setSelectedTechnique] = useState(MUTATION_OPERATORS[0].id);
  const [selectedModel, setSelectedModel] = useState('');

  // Crossover state
  const [parentA, setParentA] = useState(workbenchInitialSeed?.prompt_text || '');
  const [parentB, setParentB] = useState('');

  // Execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeResult, setActiveResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Session History (separate from original experiment)
  const [sessionHistory, setSessionHistory] = useState([]);

  useEffect(() => {
    if (workbenchInitialSeed?.prompt_text) {
      setPromptText(workbenchInitialSeed.prompt_text);
      setParentA(workbenchInitialSeed.prompt_text);
    } else if (initialPrompt) {
      setPromptText(initialPrompt);
    }
  }, [initialPrompt, workbenchInitialSeed]);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  const handleExecuteMutate = async () => {
    if (!promptText.trim()) return;
    setIsProcessing(true);
    setErrorMsg('');
    setActiveResult(null);

    try {
      const res = await apiClient.workbenchMutate({
        prompt_text: promptText.trim(),
        technique: selectedTechnique,
        model_id: selectedModel
      });

      setActiveResult(res);
      setSessionHistory(prev => [res, ...prev]);
    } catch (err) {
      setErrorMsg(err.message || 'Mutation test failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteCrossover = async () => {
    if (!parentA.trim() || !parentB.trim()) return;
    setIsProcessing(true);
    setErrorMsg('');
    setActiveResult(null);

    try {
      const res = await apiClient.workbenchCrossover({
        parent_prompt_a: parentA.trim(),
        parent_prompt_b: parentB.trim(),
        model_id: selectedModel
      });

      setActiveResult(res);
      setSessionHistory(prev => [res, ...prev]);
    } catch (err) {
      setErrorMsg(err.message || 'Crossover test failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteIsolate = async () => {
    if (!promptText.trim()) return;
    setIsProcessing(true);
    setErrorMsg('');
    setActiveResult(null);

    try {
      const res = await apiClient.workbenchIsolateTest({
        prompt_text: promptText.trim(),
        model_id: selectedModel
      });

      setActiveResult(res);
      setSessionHistory(prev => [res, ...prev]);
    } catch (err) {
      setErrorMsg(err.message || 'Isolated test probe failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSessionCsv = () => {
    if (!sessionHistory.length) return;
    const headers = ['candidate_prompt', 'technique_used', 'model_tested', 'response_text', 'risk_score', 'risk_level', 'flagged', 'rationale', 'timestamp'];
    const rows = sessionHistory.map(item => {
      return headers.map(h => {
        let val = item[h] !== undefined && item[h] !== null ? String(item[h]) : '';
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workbench_session_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dish-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe text-teal-600 dark:text-specimen-safe">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans text-specimen-text">
              Interactive Mutator Workbench
            </h2>
            <p className="text-xs font-mono text-specimen-dim">
              Manual Evolutionary Inoculation, Crossover Synthesis & Real Judge Probing
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-dish-subtle border border-dish-border rounded-xl font-mono text-xs">
          <button
            onClick={() => setMode('mutate')}
            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
              mode === 'mutate'
                ? 'bg-teal-50 dark:bg-specimen-safe/20 text-teal-800 dark:text-specimen-safe border border-teal-400 dark:border-specimen-safe/40 shadow-sm'
                : 'text-specimen-dim hover:text-specimen-text'
            }`}
          >
            Mutation Inoculator
          </button>
          <button
            onClick={() => setMode('crossover')}
            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
              mode === 'crossover'
                ? 'bg-teal-50 dark:bg-specimen-safe/20 text-teal-800 dark:text-specimen-safe border border-teal-400 dark:border-specimen-safe/40 shadow-sm'
                : 'text-specimen-dim hover:text-specimen-text'
            }`}
          >
            Crossover Synthesizer
          </button>
          <button
            onClick={() => setMode('isolate')}
            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
              mode === 'isolate'
                ? 'bg-teal-50 dark:bg-specimen-safe/20 text-teal-800 dark:text-specimen-safe border border-teal-400 dark:border-specimen-safe/40 shadow-sm'
                : 'text-specimen-dim hover:text-specimen-text'
            }`}
          >
            Isolate & Test
          </button>
        </div>
      </div>

      {/* Main Bench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs & Operators Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="lab-card p-5 space-y-4">
            {/* Target Model Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-specimen-text uppercase font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
                <span>Target Model For Live Probing</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg bg-white dark:bg-dish-subtle border border-dish-border text-specimen-text p-2.5 text-xs font-mono focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Pick from Current Experiment if available */}
            {results.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-specimen-dim uppercase">
                  Pick from loaded specimens:
                </label>
                <select
                  onChange={(e) => {
                    const found = results.find(r => r.prompt_id === e.target.value);
                    if (found) {
                      if (mode === 'crossover') {
                        if (!parentA) setParentA(found.prompt_text);
                        else setParentB(found.prompt_text);
                      } else {
                        setPromptText(found.prompt_text);
                      }
                    }
                  }}
                  className="w-full rounded-lg bg-white dark:bg-dish-subtle border border-dish-border text-specimen-dim p-2 text-xs font-mono focus:outline-none"
                >
                  <option value="">-- Choose existing specimen prompt --</option>
                  {results.map((r) => (
                    <option key={r.prompt_id} value={r.prompt_id}>
                      [{r.generation === 0 ? 'Gen 0 Root' : `Gen ${r.generation}`}] (Risk: {formatRisk(r.risk_score)}) {r.prompt_text.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* MODE 1: MUTATION INOCULATOR */}
            {mode === 'mutate' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-specimen-text uppercase font-semibold">
                    Base Prompt to Mutate
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Enter or paste base prompt..."
                    rows={4}
                    disabled={isProcessing}
                    className="w-full p-3 rounded-xl bg-white dark:bg-dish-subtle border border-dish-border text-xs font-mono text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm resize-none"
                  />
                </div>

                {/* Operator Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-specimen-text uppercase font-semibold">
                    Evolutionary Mutation Operator
                  </label>
                  <div className="space-y-2">
                    {MUTATION_OPERATORS.map((op) => (
                      <label
                        key={op.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs font-mono cursor-pointer transition ${
                          selectedTechnique === op.id
                            ? 'bg-teal-50 dark:bg-specimen-safe/15 border-teal-500 dark:border-specimen-safe text-teal-900 dark:text-specimen-safe font-semibold'
                            : 'bg-dish-subtle border-dish-border text-specimen-dim hover:text-specimen-text'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mutation_operator"
                          value={op.id}
                          checked={selectedTechnique === op.id}
                          onChange={() => setSelectedTechnique(op.id)}
                          className="mt-0.5 accent-teal-600 dark:accent-specimen-safe"
                        />
                        <div>
                          <div className="text-specimen-text font-bold">{op.label}</div>
                          <div className="text-[10px] text-specimen-dim mt-0.5">{op.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExecuteMutate}
                  disabled={isProcessing || !promptText.trim()}
                  className="w-full py-3 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#080C0E] font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mutating & Testing Live Probe...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Inoculate Mutation & Evaluate with Judge</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* MODE 2: CROSSOVER SYNTHESIZER */}
            {mode === 'crossover' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-specimen-text uppercase font-semibold">
                    Parent Specimen A (Semantic Objective)
                  </label>
                  <textarea
                    value={parentA}
                    onChange={(e) => setParentA(e.target.value)}
                    placeholder="Enter Parent A prompt text..."
                    rows={3}
                    disabled={isProcessing}
                    className="w-full p-3 rounded-xl bg-white dark:bg-dish-subtle border border-dish-border text-xs font-mono text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-specimen-text uppercase font-semibold">
                    Parent Specimen B (Adversarial Wrapper Structure)
                  </label>
                  <textarea
                    value={parentB}
                    onChange={(e) => setParentB(e.target.value)}
                    placeholder="Enter Parent B prompt text..."
                    rows={3}
                    disabled={isProcessing}
                    className="w-full p-3 rounded-xl bg-white dark:bg-dish-subtle border border-dish-border text-xs font-mono text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm resize-none"
                  />
                </div>

                <button
                  onClick={handleExecuteCrossover}
                  disabled={isProcessing || !parentA.trim() || !parentB.trim()}
                  className="w-full py-3 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#080C0E] font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Crossover Hybrid...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Synthesize Hybrid Offspring & Run Probe</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* MODE 3: ISOLATE & TEST */}
            {mode === 'isolate' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-specimen-text uppercase font-semibold">
                    Prompt to Isolate & Re-Test
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Enter prompt for direct target + judge test..."
                    rows={5}
                    disabled={isProcessing}
                    className="w-full p-3 rounded-xl bg-white dark:bg-dish-subtle border border-dish-border text-xs font-mono text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm resize-none"
                  />
                </div>

                <button
                  onClick={handleExecuteIsolate}
                  disabled={isProcessing || !promptText.trim()}
                  className="w-full py-3 rounded-xl bg-sky-600 dark:bg-specimen-immune hover:bg-sky-700 dark:hover:bg-specimen-immune/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#080C0E] font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Executing Isolated Target Probe...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Execute Target Probe & LLM Judge</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Output & Judge Evaluation Column */}
        <div className="lg:col-span-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeResult ? (
            <div className="lab-card p-5 space-y-4 border-teal-400 dark:border-specimen-safe/40 animate-in fade-in">
              {/* Telemetry Reading Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dish-border pb-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 dark:bg-specimen-safe glow-safe" />
                  <span className="font-bold text-specimen-text">PROBE OUTPUT & JUDGE VERDICT</span>
                </div>

                <div className="flex items-center gap-2">
                  {activeResult.judge_available && activeResult.risk_score !== null ? (
                    <span
                      className="px-2.5 py-1 rounded-md font-bold text-xs shadow-sm"
                      style={{
                        backgroundColor: `${getRiskColor(activeResult.risk_score, theme)}20`,
                        color: getRiskColor(activeResult.risk_score, theme),
                        border: `1px solid ${getRiskColor(activeResult.risk_score, theme)}40`
                      }}
                    >
                      RISK SCORE: {activeResult.risk_score.toFixed(2)} ({activeResult.risk_level})
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 text-[11px] font-bold">
                      Judge unavailable — no risk score generated.
                    </span>
                  )}
                </div>
              </div>

              {/* Threat Mapping Tag if present */}
              {activeResult.taxonomy && (
                <div className="p-2 rounded-lg bg-dish-subtle border border-dish-border font-mono text-[11px] flex flex-wrap items-center gap-2">
                  <span className="text-specimen-dim uppercase font-bold">Threat Matrix:</span>
                  <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/60 font-semibold">
                    {activeResult.taxonomy.owasp}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-dish-card border border-dish-border text-specimen-dim">
                    {activeResult.taxonomy.mitre_atlas}
                  </span>
                </div>
              )}

              {/* Generated Candidate Payload */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono uppercase text-specimen-dim font-bold">
                  <span>Synthesized Candidate Prompt:</span>
                  <span className="text-teal-700 dark:text-specimen-safe">{activeResult.technique_used}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-teal-300 font-mono text-xs max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {activeResult.candidate_prompt || activeResult.prompt_text}
                </div>
              </div>

              {/* Target Response */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono uppercase text-specimen-dim font-bold">
                  <span>Target Model Response ({activeResult.model_tested}):</span>
                  {activeResult.latency_ms > 0 && <span>{activeResult.latency_ms} ms</span>}
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-dish-subtle border border-dish-border text-specimen-text font-mono text-xs max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-sm">
                  {activeResult.response_text || '(No model response recorded)'}
                </div>
              </div>

              {/* Judge Rationale */}
              {activeResult.rationale && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200/90 text-xs font-mono leading-relaxed">
                  <strong>Evaluator Rationale:</strong> {activeResult.rationale}
                </div>
              )}
            </div>
          ) : (
            <div className="lab-card p-12 text-center space-y-3 border-dashed border-dish-border">
              <Sparkles className="w-10 h-10 text-specimen-dim mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold font-sans text-specimen-text">
                  Workbench Inoculator Ready
                </h4>
                <p className="max-w-xs mx-auto text-xs font-mono text-specimen-dim">
                  Select an operator on the left and run a live probe to observe target responses and judge evaluations.
                </p>
              </div>
            </div>
          )}

          {/* Session History Mini-Table */}
          {sessionHistory.length > 0 && (
            <div className="lab-card p-4 space-y-3">
              <div className="flex items-center justify-between font-mono text-xs border-b border-dish-border pb-2">
                <span className="font-bold text-specimen-text">
                  Exploratory Session Log ({sessionHistory.length})
                </span>
                <button
                  onClick={exportSessionCsv}
                  className="flex items-center gap-1 text-[11px] text-teal-700 dark:text-specimen-safe hover:underline font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Session CSV</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-mono text-xs">
                {sessionHistory.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveResult(item)}
                    className="p-2.5 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border cursor-pointer transition flex items-center justify-between gap-2"
                  >
                    <div className="truncate flex-1">
                      <span className="text-teal-700 dark:text-specimen-safe font-bold mr-2">[{item.technique_used}]</span>
                      <span className="text-specimen-text">{item.candidate_prompt || item.prompt_text}</span>
                    </div>
                    {item.risk_score !== null ? (
                      <span
                        className="font-bold shrink-0 px-2 py-0.5 rounded text-[10px]"
                        style={{ color: getRiskColor(item.risk_score, theme) }}
                      >
                        {item.risk_score.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-amber-600 text-[10px] shrink-0">Unavail</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
