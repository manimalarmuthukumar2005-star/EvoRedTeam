import React, { useState, useMemo } from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { getRiskColor } from '../canvas/OrganismEngine';
import { Database, Filter, Download, Search, ChevronDown, ChevronUp, ShieldAlert, CheckCircle } from 'lucide-react';

export const SpecimenArchive = () => {
  const { results, setSelectedSpecimen, activeExperimentId } = useExperiment();
  const { theme } = useTheme();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGen, setSelectedGen] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Derive unique categories and generations
  const generations = useMemo(() => {
    const gens = Array.from(new Set(results.map(r => r.generation))).sort((a, b) => a - b);
    return gens;
  }, [results]);

  const categories = useMemo(() => {
    return Array.from(new Set(results.map(r => r.category)));
  }, [results]);

  // Filtered dataset
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (selectedGen !== 'all' && r.generation !== parseInt(selectedGen, 10)) return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (selectedRiskLevel !== 'all' && r.risk_level !== selectedRiskLevel) return false;
      if (onlyFlagged && !r.flagged) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inPrompt = (r.prompt_text || '').toLowerCase().includes(term);
        const inResp = (r.response_text || '').toLowerCase().includes(term);
        const inTech = (r.technique_used || '').toLowerCase().includes(term);
        const inId = (r.prompt_id || '').toLowerCase().includes(term);
        if (!inPrompt && !inResp && !inTech && !inId) return false;
      }
      return true;
    });
  }, [results, selectedGen, selectedCategory, selectedRiskLevel, onlyFlagged, searchTerm]);

  // CSV Export utility
  const exportCsv = () => {
    if (!filteredResults.length) return;
    const headers = [
      'experiment_id', 'prompt_id', 'parent_id', 'generation',
      'category', 'technique_used', 'model_tested', 'prompt_text',
      'response_text', 'risk_score', 'risk_level', 'flagged',
      'rationale', 'survived_selection', 'timestamp'
    ];
    
    const rows = filteredResults.map(r => {
      return headers.map(h => {
        let val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeExperimentId || 'evoredteam'}_specimen_archive.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="archive-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dish-border pb-4">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-teal-600 dark:text-specimen-safe" />
          <div>
            <h2 className="text-xl font-bold font-sans text-specimen-text">
              Specimen Archive
            </h2>
            <p className="text-xs font-mono text-specimen-dim">
              High-Precision Tabular Dataset & Direct Verification Fallback
            </p>
          </div>
        </div>

        <button
          onClick={exportCsv}
          disabled={!filteredResults.length}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dish-subtle hover:bg-dish-hover border border-dish-border text-xs font-mono text-specimen-text transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-teal-600 dark:text-specimen-safe" />
          <span>Export Filtered CSV ({filteredResults.length})</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="lab-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
          {/* Search Bar */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prompts, techniques, responses..."
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-dish-subtle border border-dish-border rounded-lg text-specimen-text placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
            />
          </div>

          {/* Generation Filter */}
          <div>
            <select
              value={selectedGen}
              onChange={(e) => setSelectedGen(e.target.value)}
              className="w-full py-2 px-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-lg text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
            >
              <option value="all">All Generations</option>
              {generations.map(g => (
                <option key={g} value={g}>Generation {g} {g === 0 ? '(Seed)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              value={selectedRiskLevel}
              onChange={(e) => setSelectedRiskLevel(e.target.value)}
              className="w-full py-2 px-2.5 bg-white dark:bg-dish-subtle border border-dish-border rounded-lg text-specimen-text focus:outline-none focus:border-teal-500 dark:focus:border-specimen-safe shadow-sm"
            >
              <option value="all">All Risk Levels</option>
              <option value="SAFE">SAFE</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* Only Flagged Toggle */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyFlagged}
                onChange={(e) => setOnlyFlagged(e.target.checked)}
                className="w-4 h-4 rounded bg-white dark:bg-dish-subtle border-dish-border accent-rose-500 dark:accent-specimen-critical cursor-pointer"
              />
              <span className="text-specimen-text font-medium">Flagged Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Precision Data Table */}
      <div className="lab-card overflow-hidden border border-dish-border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-100 dark:bg-[#0D120F] text-specimen-dim border-b border-dish-border uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Specimen ID</th>
                <th className="py-3 px-3">Gen</th>
                <th className="py-3 px-3">Technique</th>
                <th className="py-3 px-4">Prompt Excerpt</th>
                <th className="py-3 px-3">Risk Level</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dish-border/50">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-specimen-dim">
                    No specimen records match the specified filters.
                  </td>
                </tr>
              ) : (
                filteredResults.map((row) => {
                  const isGen0 = row.generation === 0;
                  const isExpanded = expandedRowId === row.prompt_id;
                  const riskColor = getRiskColor(row.risk_score, theme);

                  return (
                    <React.Fragment key={row.prompt_id}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : row.prompt_id)}
                        className={`hover:bg-slate-50 dark:hover:bg-dish-hover/50 cursor-pointer transition ${isExpanded ? 'bg-slate-50/80 dark:bg-dish-hover/30' : ''}`}
                      >
                        <td className="py-3 px-4 font-bold text-specimen-text flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: riskColor }}
                          />
                          <span>{isGen0 ? 'PATIENT_ZERO' : row.prompt_id.slice(-8)}</span>
                        </td>
                        <td className="py-3 px-3 text-specimen-dim">
                          {isGen0 ? '0 (Seed)' : row.generation}
                        </td>
                        <td className="py-3 px-3 text-teal-700 dark:text-specimen-safe truncate max-w-[140px]" title={row.technique_used}>
                          {row.technique_used}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-gray-300 max-w-xs truncate">
                          {row.prompt_text}
                        </td>
                        <td className="py-3 px-3 font-semibold" style={{ color: riskColor }}>
                          {isGen0 ? 'ORIGIN' : row.risk_level}
                        </td>
                        <td className="py-3 px-3 font-bold" style={{ color: riskColor }}>
                          {isGen0 ? '-' : row.risk_score.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          {isGen0 ? (
                            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 text-[10px]">ROOT</span>
                          ) : row.survived_selection ? (
                            <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-specimen-safe/15 border border-teal-300 dark:border-specimen-safe/30 text-teal-800 dark:text-specimen-safe text-[10px]">SURVIVED</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-500 text-[10px]">CULLED</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSpecimen(row);
                            }}
                            className="px-2 py-1 rounded bg-dish-subtle hover:bg-teal-50 dark:hover:bg-specimen-safe/20 border border-dish-border hover:border-teal-400 dark:hover:border-specimen-safe/40 text-specimen-text text-[10px] transition"
                          >
                            Slide &rarr;
                          </button>
                        </td>
                      </tr>

                      {/* Inline Expanded Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-[#070A08] border-b border-dish-border">
                          <td colSpan={8} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase text-specimen-dim font-semibold">Full Prompt:</span>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-[#050706] border border-dish-border text-slate-800 dark:text-gray-200 whitespace-pre-wrap max-h-36 overflow-y-auto shadow-sm">
                                  {row.prompt_text}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase text-specimen-dim font-semibold">Observed Target Response:</span>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-[#050706] border border-dish-border text-slate-700 dark:text-gray-300 whitespace-pre-wrap max-h-36 overflow-y-auto shadow-sm">
                                  {row.response_text || '(No response recorded for root prompt)'}
                                </div>
                              </div>
                            </div>
                            {row.rationale && (
                              <div className="text-xs text-amber-900 dark:text-amber-200/80 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/30">
                                <strong>Judge Rationale:</strong> {row.rationale}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
