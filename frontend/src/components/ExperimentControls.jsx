import React, { useState } from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { Play, Settings2, ShieldCheck, Cpu, Sliders, AlertCircle, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  { id: 'refusal_boundary', label: 'Refusal Boundary' },
  { id: 'jailbreak', label: 'Jailbreak Bypass' },
  { id: 'injection', label: 'Prompt Injection' },
  { id: 'roleplay_exploit', label: 'Roleplay Exploit' },
  { id: 'pii_extraction', label: 'PII Extraction' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'bias', label: 'Algorithmic Bias' },
  { id: 'contradiction', label: 'Contradiction Probe' },
  { id: 'logic_edge_case', label: 'Logic Edge Case' }
];

export const ExperimentControls = ({ defaultPrompt = '', onStarted }) => {
  const { models, startNewExperiment, status, loading, errorMessage } = useExperiment();

  const [basePrompt, setBasePrompt] = useState(defaultPrompt || '');
  const [category, setCategory] = useState('refusal_boundary');
  const [selectedModel, setSelectedModel] = useState('');
  const [generationCount, setGenerationCount] = useState(5);
  const [initialTestCount, setInitialTestCount] = useState(18);

  // Set default model when models are loaded
  React.useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultMod = models.find(m => m.is_default) || models[0];
      setSelectedModel(defaultMod.id);
    }
  }, [models, selectedModel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!basePrompt.trim()) return;

    try {
      await startNewExperiment({
        base_prompt: basePrompt,
        category,
        target_models: [selectedModel || 'evo-guardrail-v1'],
        generation_count: generationCount,
        initial_test_count: initialTestCount
      });
      if (onStarted) onStarted();
    } catch (err) {
      console.error(err);
    }
  };

  const isRunning = ['queued', 'generating', 'testing', 'judging', 'evolving'].includes(status);

  return (
    <section id="controls-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="lab-card p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-dish-border pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-teal-600 dark:text-specimen-safe" />
            <h2 className="text-xl font-bold font-sans text-specimen-text">
              PromptTesterAgent Configuration
            </h2>
          </div>
          <span className="font-mono text-xs text-specimen-dim px-2.5 py-1 rounded bg-dish-subtle border border-dish-border">
            AGENT PIPELINE v1.2
          </span>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-specimen-critical/10 border border-rose-300 dark:border-specimen-critical/30 text-rose-700 dark:text-specimen-critical flex items-center gap-2 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Base Prompt Input */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-specimen-text uppercase tracking-wider font-semibold">
              1. Base Specimen Prompt (Patient Zero — Generation 0)
            </label>
            <textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder="Enter the core testing prompt (e.g., 'How to disable endpoint security logging...')"
              rows={3}
              required
              disabled={isRunning}
              className="w-full rounded-xl bg-white dark:bg-dish-subtle border border-dish-border focus:border-teal-500 dark:focus:border-specimen-safe focus:glow-safe p-3.5 text-xs sm:text-sm font-mono text-specimen-text placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none transition shadow-sm"
            />
          </div>

          {/* Risk Category Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-specimen-text uppercase tracking-wider font-semibold">
              2. Target Risk Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-lg text-xs font-mono text-left border transition ${
                    category === cat.id
                      ? 'bg-teal-50 dark:bg-specimen-safe/15 border-teal-600 dark:border-specimen-safe text-teal-800 dark:text-specimen-safe font-bold shadow-sm'
                      : 'bg-dish-subtle border-dish-border text-specimen-dim hover:text-specimen-text hover:border-slate-300 dark:hover:border-dish-border'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Model Selector & Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-specimen-text uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                <Cpu className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
                Target Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isRunning}
                className="w-full rounded-lg bg-white dark:bg-dish-subtle border border-dish-border text-specimen-text p-2.5 text-xs font-mono focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-mono text-specimen-dim">
                Models populated exclusively from backend configuration.
              </p>
            </div>

            {/* Generation Count */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-specimen-text font-semibold">
                <span className="uppercase">Generations:</span>
                <span className="text-teal-700 dark:text-specimen-safe font-bold">{generationCount} cycles</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={generationCount}
                onChange={(e) => setGenerationCount(parseInt(e.target.value, 10))}
                disabled={isRunning}
                className="w-full accent-teal-600 dark:accent-specimen-safe"
              />
              <p className="text-[10px] font-mono text-specimen-dim">
                Evolution iterations (1–8).
              </p>
            </div>

            {/* Generation 1 Burst Count */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-specimen-text font-semibold">
                <span className="uppercase">Gen 1 Brood Size:</span>
                <span className="text-teal-700 dark:text-specimen-safe font-bold">{initialTestCount} tests</span>
              </div>
              <input
                type="range"
                min="10"
                max="25"
                value={initialTestCount}
                onChange={(e) => setInitialTestCount(parseInt(e.target.value, 10))}
                disabled={isRunning}
                className="w-full accent-teal-600 dark:accent-specimen-safe"
              />
              <p className="text-[10px] font-mono text-specimen-dim">
                Initial adversarial batch spawned by Agent.
              </p>
            </div>
          </div>

          {/* Submit Button & Real Execution Progress */}
          <div className="pt-4 border-t border-dish-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-mono text-specimen-dim flex items-center gap-2">
              {isRunning && (
                <div className="organism-loader">
                  <div className="organism-cell" />
                  <div className="organism-cell" />
                </div>
              )}
              <span>
                {isRunning
                  ? `Active State: ${status.toUpperCase()} (Testing & judging live responses)...`
                  : 'Ready to inoculate petri dish. Agent will synthesize ~15-20 adversarial test vectors.'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isRunning || !basePrompt.trim() || loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#0A0D0B] font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg transition"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evolving Live...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Evolution Run</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
