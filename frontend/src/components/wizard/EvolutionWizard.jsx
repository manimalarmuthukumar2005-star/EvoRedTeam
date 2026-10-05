import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useExperiment } from '../../context/ExperimentContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LandingHero
} from '../LandingHero';
import {
  ExperimentControls
} from '../ExperimentControls';
import {
  LiveEvolutionChamber
} from '../LiveEvolutionChamber';
import {
  VulnerabilitySpectrum
} from '../VulnerabilitySpectrum';
import {
  ImmuneResponseSection
} from '../ImmuneResponseSection';
import {
  SpecimenArchive
} from '../SpecimenArchive';
import {
  MethodologyFieldNotes
} from '../MethodologyFieldNotes';
import {
  SpecimenSlideModal
} from '../SpecimenSlideModal';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Dna,
  Activity,
  Layers,
  BarChart3,
  ShieldCheck,
  Database,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Play,
  FileText,
  GitBranch,
  Zap,
  Swords
} from 'lucide-react';

const WIZARD_STEPS = [
  { step: 1, title: 'Insert Specimen', shortName: '1. Seed', icon: Dna, description: 'Inoculate Patient Zero & Configure Agent' },
  { step: 2, title: 'First Brood (Gen 1)', shortName: '2. Brood 1', icon: Sparkles, description: 'Agent Synthesis & Generation 1 Burst' },
  { step: 3, title: 'Evolution Chamber', shortName: '3. Chamber', icon: Layers, description: 'Multi-Generation Mutation & Scrubber' },
  { step: 4, title: 'Vulnerability Spectrum', shortName: '4. Spectrum', icon: BarChart3, description: 'Model Telemetry & Risk Histogram' },
  { step: 5, title: 'Immune Response', shortName: '5. Defense', icon: ShieldCheck, description: 'System-Prompt Patch Synthesis & Retest' },
  { step: 6, title: 'Specimen Archive', shortName: '6. Archive', icon: Database, description: 'Tabular Data Contract & CSV Export' },
  { step: 7, title: 'Field Notes & Done', shortName: '7. Notes', icon: BookOpen, description: 'Methodology & Concluding Analysis' }
];

export const EvolutionWizard = () => {
  const {
    wizardStep,
    setWizardStep,
    activeExperimentId,
    status,
    results,
    canAdvance,
    getStepDisabledReason,
    resetWizard,
    loading
  } = useExperiment();

  const [injectedPrompt, setInjectedPrompt] = useState('');
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const handleStartFromHero = (promptText) => {
    setInjectedPrompt(promptText);
    const formElem = document.getElementById('controls-section');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExperimentStarted = () => {
    setDirection(1);
    setWizardStep(2);
  };

  const goToNextStep = () => {
    if (wizardStep < 7 && canAdvance(wizardStep)) {
      setDirection(1);
      setWizardStep(wizardStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    if (wizardStep > 1) {
      setDirection(-1);
      setWizardStep(wizardStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToStep = (stepNumber) => {
    // Only allow jumping to steps that are unlocked/reachable
    if (stepNumber === wizardStep) return;
    if (stepNumber < wizardStep) {
      setDirection(-1);
      setWizardStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (canAdvance(wizardStep)) {
      setDirection(1);
      setWizardStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentStepConfig = WIZARD_STEPS[wizardStep - 1];
  const nextStepConfig = wizardStep < 7 ? WIZARD_STEPS[wizardStep] : null;
  const isAdvanceDisabled = !canAdvance(wizardStep);
  const disabledReason = getStepDisabledReason(wizardStep);

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: 'easeOut' }
    },
    exit: (dir) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' }
    })
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top Persistent Wizard Step Indicator */}
      <nav
        aria-label="Evolution Wizard Progress"
        className="lab-card p-4 sm:p-5 sticky top-16 z-30 shadow-md backdrop-blur-lg border-dish-border/80"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Active Step Reading */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe">
              {React.createElement(currentStepConfig.icon, {
                className: 'w-5 h-5 text-teal-600 dark:text-specimen-safe'
              })}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-specimen-safe uppercase">
                  Step {wizardStep} of 7:
                </span>
                <h1 className="text-base font-bold font-sans text-specimen-text">
                  {currentStepConfig.title}
                </h1>
              </div>
              <p className="text-xs font-mono text-specimen-dim hidden sm:block">
                {currentStepConfig.description}
              </p>
            </div>
          </div>

          {/* Stepper Dots / Nav Pills */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {WIZARD_STEPS.map((s) => {
              const isCurrent = s.step === wizardStep;
              const isPast = s.step < wizardStep;
              const StepIcon = s.icon;

              return (
                <button
                  key={s.step}
                  onClick={() => jumpToStep(s.step)}
                  disabled={s.step > wizardStep && isAdvanceDisabled}
                  aria-current={isCurrent ? 'step' : undefined}
                  title={`Step ${s.step}: ${s.title}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                    isCurrent
                      ? 'bg-teal-50 dark:bg-specimen-safe/15 border-teal-500 dark:border-specimen-safe text-teal-800 dark:text-specimen-safe font-bold shadow-sm'
                      : isPast
                      ? 'bg-dish-subtle border-dish-border text-teal-700 dark:text-specimen-safe/80 hover:bg-dish-hover cursor-pointer'
                      : 'bg-dish-subtle/50 border-dish-border/50 text-specimen-dim/50 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrent
                        ? 'bg-teal-600 dark:bg-specimen-safe animate-pulse'
                        : isPast
                        ? 'bg-teal-500 dark:bg-specimen-safe'
                        : 'bg-slate-300 dark:bg-gray-700'
                    }`}
                  />
                  <span className="hidden md:inline">{s.shortName}</span>
                  <span className="md:hidden">{s.step}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Step Canvas View with Slide Animation */}
      <main className="flex-1">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={wizardStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-6"
          >
            {/* STEP 1: Insert Specimen (Seed + Controls) */}
            {wizardStep === 1 && (
              <div className="space-y-8">
                <LandingHero onStartExperimentClick={handleStartFromHero} />
                <ExperimentControls
                  defaultPrompt={injectedPrompt}
                  onStarted={handleExperimentStarted}
                />
              </div>
            )}

            {/* STEP 2: First Brood — Generation 1 */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="lab-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-teal-200 dark:border-specimen-safe/30">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-teal-600 dark:text-specimen-safe shrink-0" />
                    <div>
                      <h2 className="text-sm font-bold font-sans text-specimen-text">
                        Brood Synthesis: Generation 0 &rarr; Generation 1
                      </h2>
                      <p className="text-xs font-mono text-specimen-dim">
                        Patient Zero has seeded 15–20 adversarial probes in the dish.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-specimen-dim">Status:</span>
                    <span className="px-2.5 py-1 rounded bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 text-teal-800 dark:text-specimen-safe font-bold uppercase">
                      {status}
                    </span>
                  </div>
                </div>

                {/* Petri Dish Canvas */}
                <LiveEvolutionChamber />
              </div>
            )}

            {/* STEP 3: Evolution Chamber (Multi-Generation Scrubber) */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <LiveEvolutionChamber />
              </div>
            )}

            {/* STEP 4: Vulnerability Spectrum */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <VulnerabilitySpectrum />
              </div>
            )}

            {/* STEP 5: Immune Response & Defense Loop */}
            {wizardStep === 5 && (
              <div className="space-y-6">
                <ImmuneResponseSection />
              </div>
            )}

            {/* STEP 6: Specimen Archive */}
            {wizardStep === 6 && (
              <div className="space-y-6">
                <SpecimenArchive />
              </div>
            )}

            {/* STEP 7: Field Notes & Done */}
            {wizardStep === 7 && (
              <div className="space-y-8">
                <MethodologyFieldNotes />

                {/* Final Completion Action Card & Hub */}
                <div className="lab-card p-6 md:p-8 space-y-6 border-teal-300 dark:border-specimen-safe/40 shadow-lg">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe mx-auto">
                      <CheckCircle2 className="w-7 h-7 text-teal-600 dark:text-specimen-safe" />
                    </div>
                    <h2 className="text-2xl font-bold font-sans text-specimen-text">
                      Evolutionary Protocol Complete
                    </h2>
                    <p className="max-w-lg mx-auto text-xs font-mono text-specimen-dim">
                      All generational specimens, vulnerability telemetry, and immune patches are archived and reproducible under your account.
                    </p>
                  </div>

                  {/* Next Step Launchpad Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 font-mono text-xs">
                    <Link
                      to="/report"
                      className="p-4 rounded-xl bg-teal-50 dark:bg-specimen-safe/10 hover:bg-teal-100 dark:hover:bg-specimen-safe/20 border border-teal-300 dark:border-specimen-safe/30 text-teal-900 dark:text-specimen-safe transition group space-y-1 block shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <FileText className="w-5 h-5 text-teal-600 dark:text-specimen-safe" />
                        <span className="text-[10px] text-teal-700 dark:text-specimen-safe/70 font-semibold uppercase">PDF/HTML</span>
                      </div>
                      <div className="font-bold text-sm text-specimen-text group-hover:text-teal-700 dark:group-hover:text-specimen-safe">
                        Executive Audit Report
                      </div>
                      <div className="text-[11px] text-specimen-dim">
                        Formal OWASP Top 10 & MITRE ATLAS compliance document.
                      </div>
                    </Link>

                    <Link
                      to="/lineage"
                      className="p-4 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition group space-y-1 block"
                    >
                      <div className="flex items-center justify-between">
                        <GitBranch className="w-5 h-5 text-teal-600 dark:text-specimen-safe" />
                        <span className="text-[10px] text-specimen-dim uppercase">Interactive</span>
                      </div>
                      <div className="font-bold text-sm group-hover:text-teal-600 dark:group-hover:text-specimen-safe">
                        Lineage Tree Visualizer
                      </div>
                      <div className="text-[11px] text-specimen-dim">
                        Directed phylogenetic tree tracing Gen 0 ancestry.
                      </div>
                    </Link>

                    <Link
                      to="/workbench"
                      className="p-4 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition group space-y-1 block"
                    >
                      <div className="flex items-center justify-between">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <span className="text-[10px] text-specimen-dim uppercase">Interactive</span>
                      </div>
                      <div className="font-bold text-sm group-hover:text-amber-500">
                        Mutator Workbench
                      </div>
                      <div className="text-[11px] text-specimen-dim">
                        Synthesize custom mutations & test in real-time.
                      </div>
                    </Link>

                    <Link
                      to="/arena"
                      className="p-4 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition group space-y-1 block"
                    >
                      <div className="flex items-center justify-between">
                        <Swords className="w-5 h-5 text-purple-500" />
                        <span className="text-[10px] text-specimen-dim uppercase">Multi-Model</span>
                      </div>
                      <div className="font-bold text-sm group-hover:text-purple-500">
                        Battle Arena
                      </div>
                      <div className="text-[11px] text-specimen-dim">
                        Comparative model faceoff and resilience rankings.
                      </div>
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-dish-border font-mono text-xs">
                    <button
                      onClick={resetWizard}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold flex items-center gap-2 shadow-md transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Start a New Experiment (Step 1)</span>
                    </button>

                    <button
                      onClick={() => jumpToStep(6)}
                      className="px-6 py-2.5 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text font-semibold flex items-center gap-2 transition"
                    >
                      <Database className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
                      <span>Back to Specimen Archive</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Sticky Step Navigation Footer */}
      <footer className="lab-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-dish-border/80 sticky bottom-4 z-30 shadow-lg backdrop-blur-lg">
        {/* Back Button */}
        <div>
          {wizardStep > 1 ? (
            <button
              onClick={goToPrevStep}
              className="px-5 py-2.5 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border text-xs font-mono text-specimen-text font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back (Step {wizardStep - 1})</span>
            </button>
          ) : (
            <span className="text-xs font-mono text-specimen-dim italic">
              Step 1 of 7 — Origin Seed
            </span>
          )}
        </div>

        {/* Live Step Status / Disabled Reason */}
        <div className="text-center font-mono text-xs text-specimen-dim max-w-md">
          {isAdvanceDisabled && disabledReason && (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{disabledReason}</span>
            </span>
          )}
        </div>

        {/* Next / Continue Button */}
        <div>
          {wizardStep < 7 ? (
            <button
              onClick={goToNextStep}
              disabled={isAdvanceDisabled}
              title={isAdvanceDisabled ? disabledReason : `Continue to Step ${wizardStep + 1}`}
              className="px-6 py-2.5 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#080C0E] font-bold font-mono text-xs flex items-center gap-2 shadow-md transition"
            >
              <span>Continue &rarr; {nextStepConfig?.shortName}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={resetWizard}
              className="px-6 py-2.5 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold font-mono text-xs flex items-center gap-2 shadow-md transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Run</span>
            </button>
          )}
        </div>
      </footer>

      {/* Microscope Slide Inspector Modal */}
      <SpecimenSlideModal />
    </div>
  );
};
