import React, { useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import {
  Activity,
  Download,
  Upload,
  Dna,
  Shield,
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon,
  User,
  LogOut,
  History,
  Plus,
  GitBranch,
  Zap,
  Swords,
  FileText,
  Layers
} from 'lucide-react';

export const LabHeader = () => {
  const fileInputRef = useRef(null);
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    activeExperimentId,
    experimentsList,
    metadata,
    status,
    wizardStep,
    loadExperiment,
    uploadPackage,
    resetWizard,
    loading
  } = useExperiment();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadPackage(file);
      navigate('/');
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'generating':
        return { label: 'SYNTHESIS', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-400/10 border-amber-300 dark:border-amber-400/30' };
      case 'testing':
        return { label: 'PROBING TARGET', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-400/10 border-orange-300 dark:border-orange-400/30' };
      case 'judging':
        return { label: 'JUDGING', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-400/10 border-rose-300 dark:border-rose-400/30' };
      case 'evolving':
        return { label: 'MUTATING', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-400/10 border-purple-300 dark:border-purple-400/30' };
      case 'completed':
        return { label: 'STABLE', color: 'text-emerald-700 dark:text-specimen-safe', bg: 'bg-emerald-50 dark:bg-specimen-safe/10 border-emerald-300 dark:border-specimen-safe/30' };
      case 'failed':
        return { label: 'ERROR', color: 'text-rose-700 dark:text-specimen-critical', bg: 'bg-rose-50 dark:bg-specimen-critical/10 border-rose-300 dark:border-specimen-critical/30' };
      default:
        return { label: 'STANDBY', color: 'text-slate-600 dark:text-gray-400', bg: 'bg-slate-100 dark:bg-gray-800 border-slate-300 dark:border-gray-700' };
    }
  };

  const badge = getStatusBadge();
  const currentPath = location.pathname;

  const NAV_TABS = [
    { path: '/', label: 'Evolution Wizard', short: 'Wizard', icon: Dna },
    { path: '/lineage', label: 'Lineage Tree', short: 'Lineage', icon: GitBranch },
    { path: '/workbench', label: 'Mutator Workbench', short: 'Workbench', icon: Zap },
    { path: '/arena', label: 'Battle Arena', short: 'Arena', icon: Swords },
    { path: '/report', label: 'Audit Report', short: 'Report', icon: FileText }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#080C0E]/95 backdrop-blur-md border-b border-dish-border px-3 sm:px-6 py-2.5 transition-colors duration-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Lab Tag */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-dish-border flex items-center justify-center group-hover:scale-105 transition shadow-sm bg-black">
              <img src="/logo.png" alt="EvoRedTeam Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-base tracking-tight text-specimen-text">
                  EvoRedTeam
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-dish-subtle border border-dish-border text-specimen-dim uppercase font-semibold">
                  LAB v1.2
                </span>
              </div>
            </div>
          </Link>

          {/* Live Lab Status Pill */}
          <div className="hidden lg:flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono ${badge.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'completed' ? 'bg-emerald-500 dark:bg-specimen-safe' : status === 'failed' ? 'bg-rose-500 dark:bg-specimen-critical' : 'bg-amber-400 animate-ping'}`} />
              <span className={`font-semibold ${badge.color}`}>{badge.label}</span>
            </div>
          </div>
        </div>

        {/* Primary Laboratory Workspace Tabs */}
        {isAuthenticated && (
          <nav aria-label="Laboratory Workspaces" className="flex items-center gap-1 bg-dish-subtle/80 p-1 rounded-xl border border-dish-border text-xs font-mono">
            {NAV_TABS.map((tab) => {
              const isActive = currentPath === tab.path;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                    isActive
                      ? 'bg-white dark:bg-dish-card text-teal-700 dark:text-specimen-safe font-bold shadow-sm border border-teal-200 dark:border-specimen-safe/30'
                      : 'text-specimen-dim hover:text-specimen-text hover:bg-white/50 dark:hover:bg-dish-card/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600 dark:text-specimen-safe' : 'text-specimen-dim'}`} />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.short}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Actions: My Experiments, Import, Export, Theme, Logout */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* My Experiments / History Link */}
          {isAuthenticated && (
            <Link
              to="/profile"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                currentPath === '/profile'
                  ? 'bg-teal-50 dark:bg-specimen-safe/15 border-teal-500 dark:border-specimen-safe text-teal-800 dark:text-specimen-safe shadow-sm'
                  : 'bg-dish-subtle hover:bg-dish-hover border-dish-border text-specimen-text'
              }`}
              title="My Saved Experiments & Audit History"
            >
              <History className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
              <span className="hidden xl:inline">My Experiments</span>
              {experimentsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-dish-card border border-dish-border text-[10px]">
                  {experimentsList.length}
                </span>
              )}
            </Link>
          )}

          {/* Upload Experiment.zip */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".zip"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import precomputed experiment.zip package"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-dim hover:text-specimen-text transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>

          {/* Export Experiment.zip */}
          {activeExperimentId && (
            <a
              href={apiClient.getExportUrl(activeExperimentId)}
              download
              title="Export complete reproducible experiment package"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-specimen-safe/10 hover:bg-teal-100 dark:hover:bg-specimen-safe/20 border border-teal-300 dark:border-specimen-safe/30 text-teal-800 dark:text-specimen-safe transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </a>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
            className="p-2 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition shadow-sm"
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-slate-700" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          {/* User Account / Logout */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1 border-l border-dish-border pl-2">
              <button
                onClick={handleLogout}
                title={`Log out (${user?.email})`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dish-subtle hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 border border-dish-border hover:border-rose-300 dark:hover:border-rose-800/40 text-specimen-dim transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Log out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg bg-teal-600 dark:bg-specimen-safe text-white dark:text-[#080C0E] font-bold text-xs shadow-sm transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
