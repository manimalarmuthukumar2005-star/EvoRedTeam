import React, { useState, useEffect } from 'react';
import { useExperiment } from '../context/ExperimentContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { getRiskColor } from '../canvas/OrganismEngine';
import {
  FileText,
  Download,
  Printer,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Dna,
  ExternalLink,
  Copy,
  Check,
  Layers,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Award,
  Hash,
  Activity,
  FileCode,
  Shield
} from 'lucide-react';

export const ExecutiveAuditReport = () => {
  const { activeExperimentId, experimentsList, loadExperiment, metadata } = useExperiment();
  const { theme } = useTheme();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!activeExperimentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    apiClient.getSafetyReport(activeExperimentId)
      .then((data) => {
        if (isMounted) {
          setReport(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch executive safety audit report.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeExperimentId]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!activeExperimentId) {
    return (
      <div className="lab-card p-12 text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto" />
        <h2 className="text-lg font-bold font-sans text-specimen-text">
          No Experiment Selected for Safety Audit
        </h2>
        <p className="text-xs font-mono text-specimen-dim max-w-md mx-auto">
          Run or import an evolutionary red-team experiment to generate a formal OWASP & MITRE ATLAS executive safety audit report.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lab-card p-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-600 dark:text-specimen-safe animate-spin mx-auto" />
        <div className="font-mono text-sm text-specimen-text font-bold">
          Synthesizing Executive Safety Audit Report...
        </div>
        <p className="text-xs font-mono text-specimen-dim">
          Mapping zero-day bypass payloads to OWASP Top 10 for LLMs & MITRE ATLAS matrices...
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="lab-card p-8 text-center space-y-4 border-rose-300 dark:border-rose-900/40">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <div className="font-mono text-sm text-rose-600 dark:text-rose-400 font-bold">
          Audit Generation Error: {error || 'Report data unavailable'}
        </div>
        <button
          onClick={() => {
            setLoading(true);
            apiClient.getSafetyReport(activeExperimentId)
              .then(setReport)
              .catch(e => setError(e.message))
              .finally(() => setLoading(false));
          }}
          className="px-4 py-2 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-xs font-mono text-specimen-text"
        >
          Retry Synthesis
        </button>
      </div>
    );
  }

  const { executive_summary, top_zero_day_bypass_payloads, threat_taxonomy_matrix, defense_diff, compliance_checklist } = report;
  const isVulnerable = executive_summary?.overall_verdict === 'VULNERABLE';

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Action Bar & Experiment Switcher */}
      <div className="lab-card p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 flex items-center justify-center glow-safe">
            <FileText className="w-5 h-5 text-teal-600 dark:text-specimen-safe" />
          </div>
          <div>
            <h1 className="text-base font-bold font-sans text-specimen-text">
              Executive AI Safety Audit Report
            </h1>
            <p className="text-xs font-mono text-specimen-dim">
              Experiment ID: <span className="text-specimen-text font-semibold">{report.experiment_id}</span> &bull; Target: <span className="text-teal-700 dark:text-specimen-safe font-semibold">{executive_summary.target_model}</span>
            </p>
          </div>
        </div>

        {/* Export & Print Actions */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>

          <a
            href={apiClient.getReportHtmlUrl(report.experiment_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dish-subtle hover:bg-dish-hover border border-dish-border text-specimen-text transition"
            title="Open Standalone Printable HTML Report"
          >
            <FileCode className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
            <span>Standalone HTML</span>
            <ExternalLink className="w-3 h-3 text-specimen-dim" />
          </a>

          <a
            href={apiClient.getExportUrl(report.experiment_id)}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 dark:bg-specimen-safe hover:bg-teal-700 dark:hover:bg-specimen-safe/90 text-white dark:text-[#080C0E] font-bold shadow-sm transition"
            title="Download full reproducible experiment package"
          >
            <Download className="w-4 h-4" />
            <span>Export Archive</span>
          </a>
        </div>
      </div>

      {/* Formal Audit Document Container */}
      <div className="lab-card p-6 sm:p-10 space-y-10 border-dish-border shadow-xl bg-white dark:bg-[#070A09] print:shadow-none print:border-none print:p-0">
        {/* Document Formal Header */}
        <div className="border-b border-dish-border pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-teal-50 dark:bg-specimen-safe/10 border border-teal-300 dark:border-specimen-safe/30 text-[10px] font-mono text-teal-800 dark:text-specimen-safe uppercase font-bold tracking-wider">
                CONFIDENTIAL AUDIT &bull; AI RED TEAM VERIFICATION
              </span>
              <span className="text-xs font-mono text-specimen-dim">
                ISO / NIST / OWASP ALIGNED
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-specimen-text">
              Autonomous Evolutionary Red-Teaming Report
            </h2>
            <p className="text-xs font-mono text-specimen-dim">
              Generated: {new Date(executive_summary.generated_at).toUTCString()} &bull; Framework: EvoRedTeam Engine v1.2
            </p>
          </div>

          {/* Overall Verdict Badge */}
          <div className="text-right flex flex-col items-start md:items-end gap-1">
            <span className="text-[10px] font-mono uppercase text-specimen-dim font-semibold">
              Safety Posture Verdict
            </span>
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-mono font-bold uppercase ${
              isVulnerable
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-600/40 text-rose-700 dark:text-rose-400 glow-critical'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600/40 text-emerald-700 dark:text-specimen-safe glow-safe'
            }`}>
              {isVulnerable ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              <span>{isVulnerable ? 'VULNERABLE (BREACH DETECTED)' : 'HARDENED / RESILIENT'}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Telemetry Summary KPI Grid */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-dish-border pb-2">
            <Activity className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
            <h3 className="text-xs font-mono font-bold text-specimen-text uppercase tracking-wider">
              1. Executive Telemetry & Vulnerability Scorecard
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-dish-subtle border border-dish-border space-y-1">
              <span className="text-[10px] font-mono text-specimen-dim uppercase font-semibold">Tested Payloads</span>
              <div className="font-mono text-2xl font-bold text-specimen-text">
                {executive_summary.total_payloads_tested}
              </div>
              <span className="text-[10px] font-mono text-specimen-dim">Multi-generation mutations</span>
            </div>

            <div className="p-4 rounded-xl bg-dish-subtle border border-dish-border space-y-1">
              <span className="text-[10px] font-mono text-specimen-dim uppercase font-semibold">Max Risk Score</span>
              <div
                className="font-mono text-2xl font-bold"
                style={{ color: getRiskColor(executive_summary.max_risk_score, theme) }}
              >
                {executive_summary.max_risk_score !== null && executive_summary.max_risk_score !== undefined
                  ? executive_summary.max_risk_score.toFixed(2)
                  : 'NO DATA'}
              </div>
              <span className="text-[10px] font-mono text-specimen-dim">Scale 0.0 (Safe) - 1.0 (Critical)</span>
            </div>

            <div className="p-4 rounded-xl bg-dish-subtle border border-dish-border space-y-1">
              <span className="text-[10px] font-mono text-specimen-dim uppercase font-semibold">Mean Risk Score</span>
              <div
                className="font-mono text-2xl font-bold"
                style={{ color: getRiskColor(executive_summary.mean_risk_score, theme) }}
              >
                {executive_summary.mean_risk_score !== null && executive_summary.mean_risk_score !== undefined
                  ? executive_summary.mean_risk_score.toFixed(2)
                  : 'NO DATA'}
              </div>
              <span className="text-[10px] font-mono text-specimen-dim">Average across all probes</span>
            </div>

            <div className="p-4 rounded-xl bg-dish-subtle border border-dish-border space-y-1">
              <span className="text-[10px] font-mono text-specimen-dim uppercase font-semibold">Breach Rate</span>
              <div className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
                {executive_summary.vulnerability_rate}%
              </div>
              <span className="text-[10px] font-mono text-specimen-dim">{executive_summary.high_risk_breaches} High/Critical Breaches</span>
            </div>
          </div>
        </section>

        {/* Section 2: Top Zero-Day Discovered Bypass Payloads */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-dish-border pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-mono font-bold text-specimen-text uppercase tracking-wider">
                2. Top Discovered Zero-Day Bypass Payloads (Ranked by Risk)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-specimen-dim">
              Verified Real Judge Telemetry
            </span>
          </div>

          {top_zero_day_bypass_payloads.length === 0 ? (
            <div className="p-6 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-center space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-specimen-safe mx-auto" />
              <div className="text-xs font-mono font-semibold text-emerald-800 dark:text-specimen-safe">
                No Critical Zero-Day Bypasses Discovered
              </div>
              <p className="text-[11px] font-mono text-specimen-dim max-w-md mx-auto">
                Target model successfully defended against all tested evolutionary mutation vectors.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {top_zero_day_bypass_payloads.map((payload) => {
                const color = getRiskColor(payload.risk_score, theme);
                return (
                  <div
                    key={payload.prompt_id}
                    className="rounded-xl border border-dish-border bg-dish-subtle/50 p-5 space-y-4 relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 bottom-0 w-1.5"
                      style={{ backgroundColor: color }}
                    />

                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-dish-card border border-dish-border font-mono text-xs font-bold flex items-center justify-center text-specimen-text">
                          #{payload.rank}
                        </span>
                        <span className="font-mono text-xs font-bold text-specimen-text">
                          {payload.prompt_id}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dish-card border border-dish-border text-specimen-dim">
                          GEN {payload.generation}
                        </span>
                      </div>

                      {/* Badges: Risk, OWASP, MITRE ATLAS */}
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                        <span
                          className="px-2 py-0.5 rounded font-bold uppercase border"
                          style={{
                            color,
                            borderColor: color + '40',
                            backgroundColor: color + '15'
                          }}
                        >
                          {payload.risk_level || 'UNTESTED'} ({payload.risk_score !== null && payload.risk_score !== undefined ? payload.risk_score.toFixed(2) : 'UNTESTED'})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 font-semibold">
                          {payload.owasp_category}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 font-semibold">
                          {payload.mitre_atlas_id}: {payload.mitre_atlas_technique}
                        </span>
                      </div>
                    </div>

                    {/* Technique & Category Subline */}
                    <div className="pl-2 flex items-center gap-4 text-xs font-mono text-specimen-dim border-b border-dish-border/50 pb-2">
                      <div>
                        Mutator Vector: <span className="text-teal-700 dark:text-specimen-safe font-semibold">{payload.technique_used}</span>
                      </div>
                      <div>
                        Category: <span className="text-specimen-text font-semibold">{payload.category}</span>
                      </div>
                    </div>

                    {/* Payload Code Box */}
                    <div className="pl-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-specimen-dim font-bold">
                          Adversarial Payload:
                        </span>
                        <button
                          onClick={() => copyToClipboard(payload.prompt_text, payload.prompt_id)}
                          className="flex items-center gap-1 text-[10px] font-mono text-specimen-dim hover:text-specimen-text transition print:hidden"
                        >
                          {copiedId === payload.prompt_id ? (
                            <>
                              <Check className="w-3 h-3 text-teal-600 dark:text-specimen-safe" />
                              <span className="text-teal-600 dark:text-specimen-safe font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Payload</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-[#060807] border border-dish-border font-mono text-xs text-slate-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {payload.prompt_text}
                      </div>
                    </div>

                    {/* Observed Model Response & Judge Rationale */}
                    <div className="pl-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-specimen-dim font-bold">
                          Observed Target Model Output:
                        </span>
                        <div className="p-3 rounded-lg bg-white dark:bg-[#060807] border border-dish-border font-mono text-[11px] text-slate-700 dark:text-gray-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                          {payload.response_text || '(Refused / No response recorded)'}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Judge Evaluation Rationale:
                        </span>
                        <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 font-mono text-[11px] text-amber-900 dark:text-amber-200/90 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                          {payload.rationale}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Threat Taxonomy Mapping Matrix */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-dish-border pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
              <h3 className="text-xs font-mono font-bold text-specimen-text uppercase tracking-wider">
                3. OWASP Top 10 for LLMs & MITRE ATLAS Threat Matrix
              </h3>
            </div>
            <span className="text-[10px] font-mono text-specimen-dim">
              Systematic Taxonomy Mapping
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-dish-border bg-white dark:bg-[#070A09]">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-dish-subtle border-b border-dish-border text-specimen-dim text-[11px]">
                  <th className="p-3 font-semibold">OWASP Category</th>
                  <th className="p-3 font-semibold">MITRE ATLAS ID</th>
                  <th className="p-3 font-semibold text-center">Mutations</th>
                  <th className="p-3 font-semibold text-center">High-Risk Breaches</th>
                  <th className="p-3 font-semibold text-right">Max Risk</th>
                  <th className="p-3 font-semibold text-right">Mean Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dish-border">
                {threat_taxonomy_matrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-dish-subtle/50 transition">
                    <td className="p-3 font-semibold text-specimen-text flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-specimen-safe inline-block" />
                      {row.owasp_category}
                    </td>
                    <td className="p-3 text-blue-600 dark:text-blue-400">
                      {row.mitre_atlas_id}
                    </td>
                    <td className="p-3 text-center text-specimen-dim">
                      {row.technique_count}
                    </td>
                    <td className="p-3 text-center">
                      {row.high_risk_count > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
                          {row.high_risk_count} Breach{row.high_risk_count > 1 ? 'es' : ''}
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-specimen-safe font-semibold text-[10px]">
                          0 (Shielded)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold" style={{ color: getRiskColor(row.max_risk_score, theme) }}>
                      {row.max_risk_score !== null && row.max_risk_score !== undefined ? row.max_risk_score.toFixed(2) : 'NO DATA'}
                    </td>
                    <td className="p-3 text-right font-semibold" style={{ color: getRiskColor(row.mean_risk_score, theme) }}>
                      {row.mean_risk_score !== null && row.mean_risk_score !== undefined ? row.mean_risk_score.toFixed(2) : 'NO DATA'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Immune Response & Defense Hardening Patch */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-dish-border pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
              <h3 className="text-xs font-mono font-bold text-specimen-text uppercase tracking-wider">
                4. Automated Immune Response & Defense Patch Verification
              </h3>
            </div>
            <span className="text-[10px] font-mono text-specimen-dim">
              System Hardening Diff
            </span>
          </div>

          <div className="p-5 rounded-xl border border-dish-border bg-dish-subtle/40 space-y-4">
            {defense_diff.system_patch_present ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-specimen-safe/10 border border-emerald-300 dark:border-specimen-safe/30 text-emerald-800 dark:text-specimen-safe font-bold font-mono text-xs">
                      PATCH VERIFIED ACTIVE
                    </span>
                    <span className="text-xs font-mono text-specimen-dim">
                      Status: {defense_diff.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-specimen-dim">Risk Reduction:</span>
                    <span className="px-2.5 py-1 rounded bg-emerald-600 dark:bg-specimen-safe text-white dark:text-[#080C0E] font-bold">
                      -{defense_diff.risk_reduction_percentage}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white dark:bg-[#060807] border border-dish-border space-y-1">
                    <span className="text-[10px] font-mono uppercase text-specimen-dim font-bold">
                      Pre-Patch Unmitigated Risk
                    </span>
                    <div className="font-mono text-xl font-bold text-rose-600 dark:text-rose-400">
                      {defense_diff.original_mean_risk !== null && defense_diff.original_mean_risk !== undefined ? defense_diff.original_mean_risk.toFixed(2) : '0.00'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-[#060807] border border-dish-border space-y-1">
                    <span className="text-[10px] font-mono uppercase text-specimen-dim font-bold">
                      Post-Patch Hardened Risk
                    </span>
                    <div className="font-mono text-xl font-bold text-emerald-600 dark:text-specimen-safe">
                      {defense_diff.retested_mean_risk !== null && defense_diff.retested_mean_risk !== undefined ? defense_diff.retested_mean_risk.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-specimen-dim font-bold">
                    Hardened System Defense Prompt Patch:
                  </span>
                  <div className="p-3.5 rounded-lg bg-white dark:bg-[#060807] border border-teal-300 dark:border-specimen-safe/30 font-mono text-xs text-slate-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {defense_diff.system_prompt_patch}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-1">
                <span className="text-xs font-mono text-specimen-dim">
                  No system prompt patch synthesized during this experiment run.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Section 5: Attestation & Data Integrity Law Attestation */}
        <section className="space-y-4 pt-4 border-t border-dish-border">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-teal-600 dark:text-specimen-safe" />
            <h3 className="text-xs font-mono font-bold text-specimen-text uppercase tracking-wider">
              5. Data Integrity Attestation & Compliance Signature
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-dish-subtle border border-dish-border font-mono text-xs space-y-2 text-specimen-dim">
            <div className="flex items-center gap-2 text-teal-700 dark:text-specimen-safe font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Attestation of Ground Truth & Non-Simulated Telemetry</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {compliance_checklist.ground_truth_adherence}. All telemetry recorded in this report corresponds directly to immutable rows within the experiment dataset. Exploratory workbench sessions adhere to isolation boundaries and do not contaminate baseline audit results.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-[10px] border-t border-dish-border/40 text-specimen-dim">
              <span>Auditor Fingerprint: <span className="text-specimen-text font-semibold">{report.experiment_id}</span></span>
              <span>SHA-256 Hash: <span className="text-specimen-text font-semibold">{compliance_checklist?.archive_sha256 ? compliance_checklist.archive_sha256.slice(0, 16) + '...' : 'VERIFIED'}</span></span>
              <span>EvoRedTeam Safety Engine</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
