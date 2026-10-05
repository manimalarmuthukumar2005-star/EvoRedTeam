import React from 'react';
import { BookOpen, GitBranch, Shield, AlertTriangle, Github, Award, CheckCircle2 } from 'lucide-react';

export const MethodologyFieldNotes = () => {
  return (
    <section id="notes-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Section Header */}
      <div className="border-b border-dish-border pb-4">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-teal-600 dark:text-specimen-safe" />
          <h2 className="text-xl font-bold font-sans text-specimen-text">
            Laboratory Field Notes & Methodology
          </h2>
        </div>
        <p className="text-xs font-mono text-specimen-dim mt-1">
          Full Pipeline Workflow, Evolutionary Mechanics, and Ethical Scope
        </p>
      </div>

      {/* Organic Pipeline Workflow Visualizer */}
      <div className="lab-card p-6 space-y-6">
        <div className="text-xs font-mono text-specimen-text uppercase font-semibold">
          Complete Multi-Stage Laboratory Lifecycle:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-dish-subtle border border-dish-border space-y-2 shadow-sm">
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-gray-800 text-slate-800 dark:text-[#E8ECE9] text-[10px] font-bold">STAGE 0</span>
            <h4 className="font-bold text-specimen-text">Patient Zero</h4>
            <p className="text-[11px] text-specimen-dim leading-relaxed">
              The user enters a single base testing prompt. It becomes the root origin organism (Gen 0).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-dish-subtle border border-teal-200 dark:border-specimen-safe/30 space-y-2 shadow-sm">
            <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-specimen-safe/20 text-teal-800 dark:text-specimen-safe text-[10px] font-bold">STAGE 1</span>
            <h4 className="font-bold text-teal-700 dark:text-specimen-safe">Agent Synthesis</h4>
            <p className="text-[11px] text-specimen-dim leading-relaxed">
              PromptTesterAgent spawns 15–20 adversarial probes across 18 evasion techniques.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-dish-subtle border border-amber-200 dark:border-amber-400/30 space-y-2 shadow-sm">
            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-400/20 text-amber-800 dark:text-amber-400 text-[10px] font-bold">STAGE 2</span>
            <h4 className="font-bold text-amber-700 dark:text-amber-400">Target Probing</h4>
            <p className="text-[11px] text-specimen-dim leading-relaxed">
              Each test prompt is sent through controlled LLM adapters, logging full response and latency.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-dish-subtle border border-rose-200 dark:border-rose-400/30 space-y-2 shadow-sm">
            <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-400/20 text-rose-800 dark:text-rose-400 text-[10px] font-bold">STAGE 3</span>
            <h4 className="font-bold text-rose-700 dark:text-rose-400">LLM Risk Judge</h4>
            <p className="text-[11px] text-specimen-dim leading-relaxed">
              Impartial evaluator assigns risk score (0.0–1.0), category level, and detailed rationale.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-dish-subtle border border-purple-200 dark:border-purple-400/30 space-y-2 shadow-sm">
            <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-400/20 text-purple-800 dark:text-purple-400 text-[10px] font-bold">STAGE 4</span>
            <h4 className="font-bold text-purple-700 dark:text-purple-400">Evolve & Mutate</h4>
            <p className="text-[11px] text-specimen-dim leading-relaxed">
              High-risk survivors are selected as parents. Mutation and crossover create Gen 2..N.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-dish-subtle border border-sky-200 dark:border-specimen-immune/30 space-y-2 shadow-sm">
            <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-specimen-immune/20 text-sky-800 dark:text-specimen-immune text-[10px] font-bold">STAGE 5</span>
            <h4 className="font-bold text-sky-700 dark:text-specimen-immune">Immune Defense</h4>
            <p className="text-[11px] text-specimen-dim leading-relaxed">
              Automated system prompt patch synthesis and verified before/after retesting.
            </p>
          </div>
        </div>
      </div>

      {/* Methodology Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
        {/* Evolutionary Operators */}
        <div className="lab-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-specimen-text font-bold font-sans text-sm">
            <GitBranch className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
            <span>Evolutionary Mutation & Crossover Mechanics</span>
          </div>
          <p className="text-specimen-dim leading-relaxed">
            The engine executes genetic optimization directly on natural language prompts:
          </p>
          <ul className="space-y-2 text-slate-700 dark:text-gray-300 list-disc list-inside">
            <li><strong>Selection:</strong> Top 40% highest-risk prompts + 30% diversity preservation to prevent local optima trapping.</li>
            <li><strong>Mutation:</strong> Structural rephrasing, authority escalation, nested cypher wrapping, and counterfactual induction.</li>
            <li><strong>Crossover:</strong> Blends successful evasion wrappers from dual parent specimens into hybrid offspring.</li>
            <li><strong>Culling:</strong> Non-surviving branches are culled in the UI simulation while retained in the Specimen Archive.</li>
          </ul>
        </div>

        {/* Ethical Scope & Limitations */}
        <div className="lab-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-specimen-text font-bold font-sans text-sm">
            <Shield className="w-4 h-4 text-sky-600 dark:text-specimen-immune" />
            <span>Ethical Boundaries & Automated Judge Scope</span>
          </div>
          <p className="text-specimen-dim leading-relaxed">
            EvoRedTeam is engineered strictly for authorized guardrail testing and safety auditing:
          </p>
          <ul className="space-y-2 text-slate-700 dark:text-gray-300 list-disc list-inside">
            <li><strong>Ethical Constraint:</strong> Prohibits generation of weaponized operational blueprints or real personal data targeting.</li>
            <li><strong>Judge Limitations:</strong> Scores are model-based heuristic evaluations and should not be construed as infallible mathematical proof.</li>
            <li><strong>Traceability:</strong> Every metric and organism traces back 100% to verified records in results.csv.</li>
          </ul>
        </div>
      </div>

      {/* Footer Meta & GitHub */}
      <div className="lab-card p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-specimen-dim">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
          <span>EvoRedTeam Laboratory Platform &bull; Data Contract v1.0 Validated</span>
        </div>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-specimen-text hover:text-teal-600 dark:hover:text-specimen-safe transition"
        >
          <Github className="w-4 h-4" />
          <span>View Source on GitHub</span>
        </a>
      </div>
    </section>
  );
};
