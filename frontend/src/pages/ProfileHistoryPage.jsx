import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { getRiskColor, isScored, formatRisk } from '../canvas/OrganismEngine';
import {
  User,
  History,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  ArrowRight,
  Sparkles,
  Dna,
  Shield,
  Clock,
  Calendar,
  Layers,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  ExternalLink,
  Plus
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
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

const STATUSES = [
  { id: 'all', label: 'All Statuses' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'evolving', label: 'Evolving' },
  { id: 'testing', label: 'Testing' },
  { id: 'generating', label: 'Generating' },
  { id: 'queued', label: 'Queued' }
];

export const ProfileHistoryPage = () => {
  const { user, logout } = useAuth();
  const {
    experimentsList,
    loadExperimentsList,
    loadExperiment,
    renameExperiment,
    deleteExperiment,
    resetWizard
  } = useExperiment();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Inline Rename State: { [expId]: tempTitle }
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete Confirmation State: expId
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadExperimentsList();
  }, [loadExperimentsList]);

  // Client-side / live filtering
  const filteredExperiments = useMemo(() => {
    return experimentsList.filter((exp) => {
      if (selectedStatus !== 'all' && exp.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (fromDate && exp.created_at < fromDate) return false;
      if (toDate && exp.created_at > toDate) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inTitle = (exp.title || '').toLowerCase().includes(term);
        const inPrompt = (exp.base_prompt || '').toLowerCase().includes(term);
        const inId = (exp.experiment_id || '').toLowerCase().includes(term);
        if (!inTitle && !inPrompt && !inId) return false;
      }
      return true;
    });
  }, [experimentsList, selectedStatus, selectedCategory, fromDate, toDate, searchTerm]);

  const handleOpenExperiment = async (expId) => {
    await loadExperiment(expId);
    navigate('/');
  };

  const handleStartRename = (exp) => {
    setEditingId(exp.experiment_id);
    setEditTitle(exp.title || exp.display_title || '');
  };

  const handleSaveRename = async (expId) => {
    try {
      await renameExperiment(expId, editTitle.trim());
      setEditingId(null);
    } catch (err) {
      alert(`Rename failed: ${err.message}`);
    }
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleExecuteDelete = async (expId) => {
    setIsDeleting(true);
    try {
      await deleteExperiment(expId);
      setDeleteConfirmId(null);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNew = () => {
    resetWizard();
    navigate('/');
  };

  const memberSinceFormatted = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Unknown';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { label: 'COMPLETED', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-specimen-safe border-emerald-300 dark:border-specimen-safe/30' };
      case 'failed':
        return { label: 'FAILED', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/40' };
      case 'generating':
      case 'testing':
      case 'judging':
      case 'evolving':
        return { label: status.toUpperCase(), bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/40' };
      default:
        return { label: 'QUEUED', bg: 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-700' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Account Info Panel */}
      <section aria-labelledby="profile-heading" className="lab-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dish-border pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe text-teal-600 dark:text-specimen-safe">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 id="profile-heading" className="text-2xl font-bold font-sans text-specimen-text">
                  Researcher Profile
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dish-subtle border border-dish-border text-specimen-dim uppercase">
                  VERIFIED SESSION
                </span>
              </div>
              <p className="text-xs font-mono text-specimen-dim mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/forgot-password"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border text-xs font-mono text-specimen-text transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
              <span>Change Password</span>
            </Link>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold font-mono text-xs shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Experiment</span>
            </button>
          </div>
        </div>

        {/* Account Telemetry Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-dish-subtle border border-dish-border/80 flex items-center gap-3">
            <Clock className="w-4 h-4 text-teal-600 dark:text-specimen-safe shrink-0" />
            <div>
              <div className="text-[10px] uppercase text-specimen-dim font-semibold">Member Since</div>
              <div className="font-bold text-specimen-text">{memberSinceFormatted}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-dish-subtle border border-dish-border/80 flex items-center gap-3">
            <Layers className="w-4 h-4 text-teal-600 dark:text-specimen-safe shrink-0" />
            <div>
              <div className="text-[10px] uppercase text-specimen-dim font-semibold">Total Saved Runs</div>
              <div className="font-bold text-specimen-text">{experimentsList.length} experiments</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-dish-subtle border border-dish-border/80 flex items-center gap-3">
            <Shield className="w-4 h-4 text-teal-600 dark:text-specimen-safe shrink-0" />
            <div>
              <div className="text-[10px] uppercase text-specimen-dim font-semibold">Storage & Access</div>
              <div className="font-bold text-teal-700 dark:text-specimen-safe">Scoped & Encrypted</div>
            </div>
          </div>
        </div>
      </section>

      {/* Experiment History Section */}
      <section aria-labelledby="history-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dish-border pb-3">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-teal-600 dark:text-specimen-safe" />
            <h2 id="history-heading" className="text-xl font-bold font-sans text-specimen-text">
              Experiment History
            </h2>
            <span className="font-mono text-xs text-specimen-dim px-2 py-0.5 rounded bg-dish-subtle border border-dish-border">
              {filteredExperiments.length} RECORD{filteredExperiments.length === 1 ? '' : 'S'}
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="lab-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
            {/* Search Box */}
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search prompt, title, or ID..."
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-dish-subtle border border-dish-border rounded-lg text-specimen-text placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full py-2 px-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-lg text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
              >
                {STATUSES.map(st => (
                  <option key={st.id} value={st.id}>{st.label}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2 px-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-lg text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all') && (
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStatus('all');
                    setSelectedCategory('all');
                  }}
                  className="px-3 py-2 text-xs font-mono text-specimen-dim hover:text-teal-600 dark:hover:text-specimen-safe transition"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Experiment Cards / Rows */}
        {filteredExperiments.length === 0 ? (
          <div className="lab-card p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-dish-subtle border border-dish-border flex items-center justify-center mx-auto text-specimen-dim">
              <Dna className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-sans text-specimen-text">
                No experiments found
              </h3>
              <p className="max-w-sm mx-auto text-xs font-mono text-specimen-dim">
                {experimentsList.length === 0
                  ? 'No experiments yet — insert your first specimen to launch an evolutionary safety run.'
                  : 'No experiments match your active search and filter criteria.'}
              </p>
            </div>
            {experimentsList.length === 0 && (
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold font-mono text-xs inline-flex items-center gap-2 shadow-md transition"
              >
                <span>Insert First Specimen (Step 1)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExperiments.map((exp) => {
              const badge = getStatusBadge(exp.status);
              const isEditing = editingId === exp.experiment_id;
              const isConfirmingDelete = deleteConfirmId === exp.experiment_id;
              const peakScore = isScored(exp.peak_risk_score) ? exp.peak_risk_score : null;
              const riskColor = getRiskColor(peakScore, theme);
              const createdDate = exp.created_at
                ? new Date(exp.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Unknown';

              return (
                <div
                  key={exp.experiment_id}
                  className="lab-card p-5 space-y-3 hover:border-teal-400 dark:hover:border-specimen-safe/40 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dish-border/60 pb-3">
                    {/* Left Title and ID */}
                    <div className="flex-1 space-y-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(exp.experiment_id);
                              if (e.key === 'Escape') handleCancelRename();
                            }}
                            autoFocus
                            className="flex-1 px-2.5 py-1 bg-white dark:bg-dish-subtle border border-teal-500 dark:border-specimen-safe rounded-lg text-sm font-sans font-bold text-specimen-text focus:outline-none shadow-sm"
                          />
                          <button
                            onClick={() => handleSaveRename(exp.experiment_id)}
                            title="Save Title"
                            className="p-1.5 rounded-lg bg-teal-50 dark:bg-specimen-safe/20 text-teal-800 dark:text-specimen-safe border border-teal-300 dark:border-specimen-safe/40"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            title="Cancel"
                            className="p-1.5 rounded-lg bg-dish-subtle text-specimen-dim border border-dish-border"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h3
                            onClick={() => handleStartRename(exp)}
                            title="Click to rename experiment title"
                            className="font-sans font-bold text-base text-specimen-text hover:text-teal-600 dark:hover:text-specimen-safe cursor-pointer transition flex items-center gap-1.5"
                          >
                            <span>{exp.title || exp.display_title || exp.experiment_id}</span>
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-specimen-dim transition shrink-0" />
                          </h3>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-specimen-dim">
                        <span>ID: <strong className="text-specimen-text">{exp.experiment_id}</strong></span>
                        <span>&bull;</span>
                        <span>Category: <strong className="text-teal-700 dark:text-specimen-safe">{exp.category}</strong></span>
                        <span>&bull;</span>
                        <span>Created: {createdDate}</span>
                      </div>
                    </div>

                    {/* Status & Peak Risk Telemetry */}
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold ${badge.bg}`}>
                        {badge.label}
                      </span>

                      <div className="px-2.5 py-1 rounded-md bg-dish-subtle border border-dish-border text-center">
                        <span className="text-[10px] text-specimen-dim block">PEAK RISK</span>
                        <span className="font-bold" style={{ color: riskColor }}>
                          {formatRisk(peakScore)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Preview Snippet */}
                  {exp.base_prompt && (
                    <div className="text-xs font-mono text-slate-700 dark:text-gray-300 bg-dish-subtle/60 p-2.5 rounded-lg border border-dish-border/50 truncate">
                      <span className="text-specimen-dim uppercase text-[10px] font-semibold mr-2">Seed Prompt:</span>
                      {exp.base_prompt}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {/* Delete Confirm State */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800/60 font-mono text-xs">
                        <span className="text-rose-700 dark:text-rose-300 font-bold px-2">
                          Permanently delete experiment dataset?
                        </span>
                        <button
                          onClick={() => handleExecuteDelete(exp.experiment_id)}
                          disabled={isDeleting}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition"
                        >
                          {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <button
                          onClick={() => setDeleteConfirmId(exp.experiment_id)}
                          title="Delete Experiment Dataset"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dish-subtle hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 border border-dish-border hover:border-rose-300 dark:hover:border-rose-800/40 text-specimen-dim transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <a
                          href={apiClient.getExportUrl(exp.experiment_id)}
                          download
                          title="Download Zip Package"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-dim hover:text-specimen-text transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export .zip</span>
                        </a>
                      </div>
                    )}

                    {/* Open / Resume in Wizard */}
                    <button
                      onClick={() => handleOpenExperiment(exp.experiment_id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold font-mono text-xs shadow-sm transition"
                    >
                      <span>Open in Wizard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
