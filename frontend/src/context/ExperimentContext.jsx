import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

const ExperimentContext = createContext(null);

export const ExperimentProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [activeExperimentId, setActiveExperimentId] = useState(null);
  const [experimentsList, setExperimentsList] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [results, setResults] = useState([]);
  const [lineage, setLineage] = useState([]);
  const [generations, setGenerations] = useState({});
  const [defenseData, setDefenseData] = useState(null);
  const [models, setModels] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, queued, generating, testing, judging, evolving, completed, failed
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Wizard state: 1 (Insert), 2 (First Brood), 3 (Evolution Chamber), 4 (Spectrum), 5 (Immune), 6 (Archive), 7 (Notes)
  const [wizardStep, setWizardStep] = useState(1);

  // Cross-tool prefill states
  const [workbenchInitialSeed, setWorkbenchInitialSeed] = useState(null);
  const [arenaInitialPrompt, setArenaInitialPrompt] = useState(null);

  // Interactive UI state
  const [currentGenIndex, setCurrentGenIndex] = useState(0);
  const [selectedSpecimen, setSelectedSpecimen] = useState(null);
  const [isDefenseActive, setIsDefenseActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load configured models on mount
  useEffect(() => {
    apiClient.getModels()
      .then(data => setModels(data))
      .catch(err => console.error('Failed to load models:', err));
  }, []);

  // Load experiments list when authenticated
  const loadExperimentsList = useCallback(async () => {
    if (!isAuthenticated) {
      setExperimentsList([]);
      return;
    }
    try {
      const list = await apiClient.getUserExperiments();
      setExperimentsList(list);
    } catch (err) {
      console.warn('Could not load user experiments list:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadExperimentsList();
    } else {
      setExperimentsList([]);
      setActiveExperimentId(null);
      setMetadata(null);
      setResults([]);
      setLineage([]);
      setGenerations({});
      setDefenseData(null);
      setStatus('idle');
      setWizardStep(1);
    }
  }, [isAuthenticated, loadExperimentsList]);

  // Derive initial wizard step from experiment status
  const deriveStepFromStatus = (expStatus, genSnaps) => {
    if (!expStatus || expStatus === 'idle') return 1;
    if (['queued', 'generating'].includes(expStatus)) return 2;
    if (['testing', 'judging'].includes(expStatus)) {
      const hasGen1 = genSnaps && (genSnaps['gen_01'] || genSnaps['gen_1']);
      return hasGen1 ? 3 : 2;
    }
    if (['evolving', 'completed', 'failed'].includes(expStatus)) {
      return 3;
    }
    return 3;
  };

  const loadExperiment = async (experimentId, targetStep = null) => {
    if (!experimentId) return;
    setLoading(true);
    setActiveExperimentId(experimentId);
    setErrorMessage(null);
    setSelectedSpecimen(null);
    setIsDefenseActive(false);

    try {
      const [meta, resList, linList, genSnaps, defRes] = await Promise.all([
        apiClient.getExperimentStatus(experimentId),
        apiClient.getExperimentResults(experimentId).catch(() => []),
        apiClient.getLineage(experimentId).catch(() => []),
        apiClient.getGenerations(experimentId).catch(() => ({})),
        apiClient.getDefense(experimentId).catch(() => ({ available: false }))
      ]);

      setMetadata(meta);
      setStatus(meta.status || 'completed');
      setResults(resList);
      setLineage(linList);
      setGenerations(genSnaps);
      setDefenseData(defRes.available ? defRes.data : null);
      
      const genKeys = Object.keys(genSnaps);
      const maxGen = genKeys.length > 0 ? Math.max(...genKeys.map(k => parseInt(k.replace('gen_', ''), 10))) : 0;
      setCurrentGenIndex(maxGen);

      if (targetStep !== null) {
        setWizardStep(targetStep);
      } else {
        const step = deriveStepFromStatus(meta.status, genSnaps);
        setWizardStep(step);
      }
    } catch (err) {
      console.error('Failed to load experiment:', err);
      setErrorMessage(err.message || 'Failed to load experiment data');
    } finally {
      setLoading(false);
    }
  };

  // Poll active running experiment
  useEffect(() => {
    if (!activeExperimentId || ['completed', 'failed', 'idle'].includes(status)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const meta = await apiClient.getExperimentStatus(activeExperimentId);
        setMetadata(meta);
        setStatus(meta.status);

        // Refresh partial results and snapshots during run
        const [resList, linList, genSnaps] = await Promise.all([
          apiClient.getExperimentResults(activeExperimentId).catch(() => []),
          apiClient.getLineage(activeExperimentId).catch(() => []),
          apiClient.getGenerations(activeExperimentId).catch(() => ({}))
        ]);
        setResults(resList);
        setLineage(linList);
        setGenerations(genSnaps);
        
        const genKeys = Object.keys(genSnaps);
        if (genKeys.length > 0) {
          const maxGen = Math.max(...genKeys.map(k => parseInt(k.replace('gen_', ''), 10)));
          setCurrentGenIndex(maxGen);
        }

        if (['completed', 'failed'].includes(meta.status)) {
          clearInterval(interval);
          loadExperimentsList();
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeExperimentId, status, loadExperimentsList]);

  const startNewExperiment = async ({ base_prompt, category, target_models, generation_count, initial_test_count, title }) => {
    setLoading(true);
    setErrorMessage(null);
    setSelectedSpecimen(null);
    setIsDefenseActive(false);

    try {
      const res = await apiClient.createExperiment({
        base_prompt,
        category,
        target_models,
        generation_count: parseInt(generation_count, 10) || 5,
        initial_test_count: parseInt(initial_test_count, 10) || 18,
        title: title || undefined
      });

      setActiveExperimentId(res.experiment_id);
      setStatus('queued');
      setWizardStep(2); // Advance immediately to Step 2 (First Brood)
      
      const meta = await apiClient.getExperimentStatus(res.experiment_id);
      setMetadata(meta);
      setResults([]);
      setLineage([]);
      setGenerations({});
      setCurrentGenIndex(0);
      loadExperimentsList();
      return res;
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initialize experiment');
      setStatus('failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const uploadPackage = async (file) => {
    setLoading(true);
    try {
      const res = await apiClient.uploadZip(file);
      await loadExperimentsList();
      await loadExperiment(res.experiment_id, 3);
      return res;
    } catch (err) {
      setErrorMessage(err.message || 'Package upload failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const triggerDefense = async (modelId) => {
    if (!activeExperimentId) return;
    setLoading(true);
    try {
      const res = await apiClient.triggerDefense(activeExperimentId, modelId);
      setDefenseData(res.data);
      setIsDefenseActive(true);
      const meta = await apiClient.getExperimentStatus(activeExperimentId);
      setMetadata(meta);
    } catch (err) {
      setErrorMessage(err.message || 'Defense experiment failed');
    } finally {
      setLoading(false);
    }
  };

  const renameExperiment = async (experimentId, newTitle) => {
    const res = await apiClient.renameExperiment(experimentId, newTitle);
    setExperimentsList(prev => prev.map(exp => exp.experiment_id === experimentId ? { ...exp, title: newTitle, display_title: newTitle } : exp));
    if (activeExperimentId === experimentId) {
      setMetadata(prev => prev ? { ...prev, title: newTitle, display_title: newTitle } : prev);
    }
    return res;
  };

  const deleteExperiment = async (experimentId) => {
    const res = await apiClient.deleteExperiment(experimentId);
    setExperimentsList(prev => prev.filter(exp => exp.experiment_id !== experimentId));
    if (activeExperimentId === experimentId) {
      setActiveExperimentId(null);
      setMetadata(null);
      setResults([]);
      setLineage([]);
      setGenerations({});
      setStatus('idle');
      setWizardStep(1);
    }
    return res;
  };

  const resetWizard = () => {
    setActiveExperimentId(null);
    setMetadata(null);
    setResults([]);
    setLineage([]);
    setGenerations({});
    setDefenseData(null);
    setStatus('idle');
    setWizardStep(1);
    setCurrentGenIndex(0);
    setSelectedSpecimen(null);
    setIsDefenseActive(false);
  };

  // Step advancement validation
  const canAdvance = (step) => {
    switch (step) {
      case 1:
        return activeExperimentId !== null;
      case 2: {
        // Step 2 is complete when Gen 1 results exist and status is past gen 1 testing/judging
        const gen1Items = results.filter(r => r.generation === 1);
        const isPastGen1 = ['evolving', 'completed', 'failed'].includes(status) || (gen1Items.length > 0 && status !== 'generating');
        return isPastGen1;
      }
      case 3:
        return ['completed', 'failed'].includes(status);
      case 4:
      case 5:
      case 6:
        return true;
      case 7:
        return false; // Terminal step
      default:
        return true;
    }
  };

  const getStepDisabledReason = (step) => {
    switch (step) {
      case 1:
        return 'Configure and launch experiment to continue';
      case 2:
        return 'Waiting for Generation 1 brood synthesis & testing to complete...';
      case 3:
        return 'Waiting for full evolutionary run to reach completion...';
      default:
        return '';
    }
  };

  return (
    <ExperimentContext.Provider
      value={{
        activeExperimentId,
        experimentsList,
        metadata,
        results,
        lineage,
        generations,
        defenseData,
        models,
        status,
        errorMessage,
        wizardStep,
        setWizardStep,
        workbenchInitialSeed,
        setWorkbenchInitialSeed,
        arenaInitialPrompt,
        setArenaInitialPrompt,
        canAdvance,
        getStepDisabledReason,
        resetWizard,
        currentGenIndex,
        setCurrentGenIndex,
        selectedSpecimen,
        setSelectedSpecimen,
        isDefenseActive,
        setIsDefenseActive,
        loading,
        loadExperiment,
        loadExperimentsList,
        startNewExperiment,
        uploadPackage,
        triggerDefense,
        renameExperiment,
        deleteExperiment
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
};

export const useExperiment = () => {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error('useExperiment must be used within an ExperimentProvider');
  return ctx;
};
