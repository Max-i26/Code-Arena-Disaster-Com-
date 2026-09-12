import React, { useState, useMemo } from 'react';
import {
  Settings2,
  Sliders,
  UserX,
  History,
  ShieldCheck,
  AlertTriangle,
  Save,
  RefreshCw,
  Sparkles,
  Download,
  Activity,
  Search,
  ClipboardEdit,
  CheckCircle2,
  XCircle,
  Filter,
  Cpu,
  BarChart3,
  Clock,
} from 'lucide-react';
import { AppState, SystemConfig, AiTuningLog, HazardCase } from '../types';
import { api } from '../services/api';

interface SystemAdminProps {
  state: AppState;
  onRefresh: () => void;
}

type LogFilterAction = 'ALL' | 'AGREED' | 'OVERRIDDEN_VERIFIED' | 'OVERRIDDEN_REJECTED';
type FeedbackAction = 'AGREE' | 'OVERRIDE_VERIFY' | 'OVERRIDE_REJECT';

// --- Small helper components ---

const StatusDot: React.FC<{ color: string }> = ({ color }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
);

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}> = ({ icon, label, value, sub, accent = 'text-cyan-400' }) => (
  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-1 min-w-0">
    <div className="flex items-center gap-2 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className={`text-2xl font-extrabold font-mono ${accent}`}>{value}</div>
    {sub && <div className="text-[10px] text-slate-500 truncate">{sub}</div>}
  </div>
);

// --- Main component ---

export const SystemAdmin: React.FC<SystemAdminProps> = ({ state, onRefresh }) => {
  // Existing state
  const [config, setConfig] = useState<SystemConfig>({ ...state.config });
  const [banUserIdInput, setBanUserIdInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Case Override state
  const [overrideCaseIdInput, setOverrideCaseIdInput] = useState('');
  const [foundCase, setFoundCase] = useState<HazardCase | null>(null);
  const [caseSearchError, setCaseSearchError] = useState('');
  const [selectedAction, setSelectedAction] = useState<FeedbackAction | null>(null);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // AI Log filter state
  const [logFilter, setLogFilter] = useState<LogFilterAction>('ALL');

  // Derived / computed values
  const sensorCounts = useMemo(() => {
    const counts = { DANGER: 0, WARNING: 0, NORMAL: 0 };
    state.sensors.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    });
    return counts;
  }, [state.sensors]);

  const totalCases = state.cases.length;

  const resolvedCount = useMemo(
    () => state.cases.filter((c) => c.status === 'RESOLVED').length,
    [state.cases]
  );

  const resolvedRate =
    totalCases === 0 ? '—' : ((resolvedCount / totalCases) * 100).toFixed(1) + '%';

  const activeRoadClosures = useMemo(
    () => state.cases.filter((c) => c.roadClosed && c.status !== 'RESOLVED').length,
    [state.cases]
  );

  const confirmedByAi = useMemo(
    () => state.cases.filter((c) => c.verdictData?.verdict === 'CONFIRMED').length,
    [state.cases]
  );

  const avgConfidence = useMemo(() => {
    const withData = state.cases.filter((c) => c.verdictData?.confidenceScore != null);
    if (withData.length === 0) return '—';
    const avg =
      withData.reduce((sum, c) => sum + (c.verdictData!.confidenceScore * 100), 0) /
      withData.length;
    return avg.toFixed(1) + '%';
  }, [state.cases]);

  const pendingRescue = useMemo(
    () => state.reliefRequests.filter((r) => r.status === 'QUEUED').length,
    [state.reliefRequests]
  );

  const filteredLogs = useMemo<AiTuningLog[]>(() => {
    if (logFilter === 'ALL') return state.aiTuningLogs;
    return state.aiTuningLogs.filter((l) => l.officerAction === logFilter);
  }, [state.aiTuningLogs, logFilter]);

  // Handlers
  const handleExportAudit = () => {
    window.open('/api/audit/export', '_blank');
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      await api.updateConfig(config);
      alert('System AI thresholds and operational rules updated!');
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update config: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBanUser = async () => {
    if (!banUserIdInput.trim()) return;
    try {
      await api.banUser(banUserIdInput.trim());
      setBanUserIdInput('');
      alert(`User ${banUserIdInput} banned from reporting.`);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to ban user: ${err.message}`);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await api.unbanUser(userId);
      alert(`User ${userId} unbanned.`);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to unban user: ${err.message}`);
    }
  };

  const handleFindCase = () => {
    setCaseSearchError('');
    setFoundCase(null);
    setSelectedAction(null);
    setOverrideNotes('');
    setFeedbackSuccess('');
    const trimmed = overrideCaseIdInput.trim();
    if (!trimmed) {
      setCaseSearchError('Please enter a Case ID.');
      return;
    }
    const match = state.cases.find(
      (c) => c.id.toLowerCase() === trimmed.toLowerCase()
    );
    if (!match) {
      setCaseSearchError(`No case found with ID "${trimmed}".`);
    } else {
      setFoundCase(match);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!foundCase || !selectedAction) {
      alert('Select a case and an action first.');
      return;
    }
    const actionMap: Record<FeedbackAction, string> = {
      AGREE: 'AGREED',
      OVERRIDE_VERIFY: 'OVERRIDDEN_VERIFIED',
      OVERRIDE_REJECT: 'OVERRIDDEN_REJECTED',
    };
    try {
      setIsSubmittingFeedback(true);
      await api.submitCaseFeedback(foundCase.id, actionMap[selectedAction], overrideNotes);
      setFeedbackSuccess(
        `Feedback "${actionMap[selectedAction]}" submitted for case ${foundCase.id}.`
      );
      setFoundCase(null);
      setOverrideCaseIdInput('');
      setSelectedAction(null);
      setOverrideNotes('');
      onRefresh();
    } catch (err: any) {
      alert(`Failed to submit feedback: ${err.message}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">System Admin &amp; AI Retuning Console</h2>
            <p className="text-xs text-slate-400">
              Tune AI Aggregator strictness, configure telemetry thresholds, and inspect feedback loop logs.
            </p>
          </div>
        </div>
        <button
          onClick={handleExportAudit}
          className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition shadow-md"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Full Audit Trail (JSON)</span>
        </button>
      </div>

      {/* SYSTEM HEALTH PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">System Health</h3>
          <span className="ml-auto flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            API ONLINE
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Sensor health */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-3 lg:col-span-2 space-y-2">
            <span className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider block">
              Sensor Health
            </span>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <StatusDot color="bg-red-500" />
                <span className="text-slate-300 font-mono">
                  DANGER: <span className="text-red-400 font-bold">{sensorCounts.DANGER}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot color="bg-amber-400" />
                <span className="text-slate-300 font-mono">
                  WARNING: <span className="text-amber-400 font-bold">{sensorCounts.WARNING}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot color="bg-emerald-500" />
                <span className="text-slate-300 font-mono">
                  NORMAL: <span className="text-emerald-400 font-bold">{sensorCounts.NORMAL}</span>
                </span>
              </div>
            </div>
          </div>
          {/* Total cases processed */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <span className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider block">
              Cases Processed
            </span>
            <span className="text-2xl font-extrabold font-mono text-cyan-400">{totalCases}</span>
          </div>
          {/* Resolved rate */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <span className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider block">
              Resolved Rate
            </span>
            <span className="text-2xl font-extrabold font-mono text-emerald-400">{resolvedRate}</span>
          </div>
          {/* Active road closures */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <span className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider block">
              Active Road Closures
            </span>
            <span className={`text-2xl font-extrabold font-mono ${activeRoadClosures > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {activeRoadClosures}
            </span>
          </div>
        </div>
      </div>

      {/* PERFORMANCE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          label="Total Cases"
          value={totalCases}
          sub="All hazard cases in system"
        />
        <KpiCard
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Confirmed by AI"
          value={confirmedByAi}
          sub={`of ${totalCases} total`}
          accent="text-emerald-400"
        />
        <KpiCard
          icon={<Cpu className="w-3.5 h-3.5" />}
          label="Avg Confidence"
          value={avgConfidence}
          sub="Across all AI verdicts"
          accent="text-violet-400"
        />
        <KpiCard
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Pending Rescue"
          value={pendingRescue}
          sub="Queued relief requests"
          accent={pendingRescue > 0 ? 'text-amber-400' : 'text-slate-400'}
        />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: AI Parameters & Rules */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>AI Aggregator &amp; Operational Thresholds</span>
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* AI Confidence Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-300 font-semibold">AI Confidence Cutoff for Auto-Publishing:</label>
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {(config.aiConfidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={config.aiConfidenceThreshold}
                onChange={(e) =>
                  setConfig({ ...config, aiConfidenceThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Reports with confidence &gt;= {(config.aiConfidenceThreshold * 100).toFixed(0)}% are automatically published and trigger council work orders. Borderline cases loop back to community verification.
              </p>
            </div>

            {/* Weather Rain Limit */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-300 font-semibold">Deterministic Rainfall Danger Threshold (SYSTEM):</label>
                <span className="font-mono text-cyan-400 font-bold">{config.weatherRainfallDangerMmH} mm/h</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={config.weatherRainfallDangerMmH}
                onChange={(e) =>
                  setConfig({ ...config, weatherRainfallDangerMmH: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* River Gauge Limit */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-300 font-semibold">River Crest Capacity Danger Threshold (SYSTEM):</label>
                <span className="font-mono text-cyan-400 font-bold">{config.riverLevelDangerPct}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={config.riverLevelDangerPct}
                onChange={(e) =>
                  setConfig({ ...config, riverLevelDangerPct: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Auto Close Road Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-300 font-semibold block">Auto-Close Road on CRITICAL Verdict</span>
                <span className="text-[11px] text-slate-500">Automatically sets max traversal cost on public routing.</span>
              </div>
              <input
                type="checkbox"
                checked={config.autoCloseRoadOnCritical}
                onChange={(e) =>
                  setConfig({ ...config, autoCloseRoadOnCritical: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-700 text-cyan-600 focus:ring-0"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 text-xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Updating...' : 'Save AI Configuration'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Spam Management & AI Learning Logs */}
        <div className="lg:col-span-6 space-y-6">

          {/* False Reporter Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>False Reporter &amp; Spam Ban Management</span>
            </h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="User ID or Phone to Ban..."
                value={banUserIdInput}
                onChange={(e) => setBanUserIdInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={handleBanUser}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition"
              >
                Ban User
              </button>
            </div>
            <div className="text-xs space-y-1">
              <span className="text-slate-400 text-[11px] block">Currently Banned Users:</span>
              {state.bannedUsers.length === 0 ? (
                <div className="text-slate-500 text-[11px] italic">No active user bans.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.bannedUsers.map((u) => (
                    <div
                      key={u}
                      className="bg-rose-950/60 border border-rose-800 px-2.5 py-1 rounded-lg flex items-center space-x-2 text-[11px] text-rose-300 font-mono"
                    >
                      <span>{u}</span>
                      <button onClick={() => handleUnbanUser(u)} className="text-slate-400 hover:text-white">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Continuous Learning & Tuning Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Stage 06 Continuous Learning Feedback Log</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value as LogFilterAction)}
                  className="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-600"
                >
                  <option value="ALL">ALL</option>
                  <option value="AGREED">AGREED</option>
                  <option value="OVERRIDDEN_VERIFIED">OVERRIDDEN_VERIFIED</option>
                  <option value="OVERRIDDEN_REJECTED">OVERRIDDEN_REJECTED</option>
                </select>
              </div>
            </div>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  {logFilter === 'ALL'
                    ? 'No human overrides logged yet. Confirmed officer actions will appear here.'
                    : `No logs matching filter "${logFilter}".`}
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const actionColors: Record<string, string> = {
                    AGREED: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
                    OVERRIDDEN_VERIFIED: 'bg-blue-950/60 text-blue-300 border-blue-800',
                    OVERRIDDEN_REJECTED: 'bg-rose-950/60 text-rose-300 border-rose-800',
                  };
                  const colorClass =
                    actionColors[log.officerAction] ?? 'bg-slate-900 text-slate-300 border-slate-700';
                  return (
                    <div key={log.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-cyan-400 font-bold">{log.caseId}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${colorClass}`}>
                          {log.officerAction}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] italic">&quot;{log.officerNotes}&quot;</p>
                      <div className="text-[10px] text-emerald-400 font-mono">{log.promptAdjustment}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MANUAL CASE OVERRIDE PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ClipboardEdit className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Manual Case Override Panel
          </h3>
          <span className="ml-2 text-[10px] text-slate-500 font-normal normal-case tracking-normal">
            Submit officer feedback or override AI verdicts on any case
          </span>
        </div>

        {feedbackSuccess && (
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs px-4 py-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackSuccess}</span>
            <button className="ml-auto text-emerald-500 hover:text-white" onClick={() => setFeedbackSuccess('')}>&times;</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Case lookup */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-xs text-slate-300 font-semibold block">Enter Case ID to Look Up</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. CASE-001, case-abc-123..."
                value={overrideCaseIdInput}
                onChange={(e) => {
                  setOverrideCaseIdInput(e.target.value);
                  if (caseSearchError) setCaseSearchError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleFindCase()}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
              />
              <button
                onClick={handleFindCase}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Search className="w-3.5 h-3.5" />
                Find Case
              </button>
            </div>
            {caseSearchError && (
              <p className="text-rose-400 text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {caseSearchError}
              </p>
            )}
            {foundCase && (
              <div className="bg-slate-950 border border-violet-800/60 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-violet-300 font-bold text-[11px]">{foundCase.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      foundCase.status === 'RESOLVED'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                        : foundCase.status === 'REJECTED'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                        : 'bg-amber-950/60 text-amber-300 border-amber-800'
                    }`}
                  >
                    {foundCase.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div>
                    <span className="text-slate-500">Hazard:</span>{' '}
                    <span className="text-slate-200">{foundCase.hazardType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Verdict:</span>{' '}
                    <span className="text-slate-200">{foundCase.verdictData?.verdict ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Confidence:</span>{' '}
                    <span className="text-slate-200">
                      {foundCase.verdictData?.confidenceScore != null
                        ? (foundCase.verdictData.confidenceScore * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Road Closed:</span>{' '}
                    <span className={foundCase.roadClosed ? 'text-rose-400' : 'text-emerald-400'}>
                      {foundCase.roadClosed ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions & Notes */}
          <div className="lg:col-span-7 space-y-4">
            <label className="text-xs text-slate-300 font-semibold block">Officer Action</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                {
                  action: 'AGREE' as FeedbackAction,
                  label: 'Agree',
                  icon: <CheckCircle2 className="w-4 h-4" />,
                  colors: 'border-emerald-700 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60',
                  selectedColors: 'border-emerald-500 bg-emerald-900/80 text-white',
                },
                {
                  action: 'OVERRIDE_VERIFY' as FeedbackAction,
                  label: 'Override Verify',
                  icon: <ShieldCheck className="w-4 h-4" />,
                  colors: 'border-blue-700 text-blue-300 bg-blue-950/40 hover:bg-blue-900/60',
                  selectedColors: 'border-blue-500 bg-blue-900/80 text-white',
                },
                {
                  action: 'OVERRIDE_REJECT' as FeedbackAction,
                  label: 'Override Reject',
                  icon: <XCircle className="w-4 h-4" />,
                  colors: 'border-rose-700 text-rose-300 bg-rose-950/40 hover:bg-rose-900/60',
                  selectedColors: 'border-rose-500 bg-rose-900/80 text-white',
                },
              ]).map(({ action, label, icon, colors, selectedColors }) => (
                <button
                  key={action}
                  onClick={() => setSelectedAction(action)}
                  disabled={!foundCase}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                    selectedAction === action ? selectedColors : colors
                  }`}
                >
                  {icon}
                  <span className="text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">Officer Notes (optional)</label>
              <textarea
                rows={3}
                placeholder="Add context, observations, or justification for this action..."
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                disabled={!foundCase}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 resize-none disabled:opacity-40"
              />
            </div>
            <button
              onClick={handleSubmitFeedback}
              disabled={!foundCase || !selectedAction || isSubmittingFeedback}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-violet-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${isSubmittingFeedback ? 'animate-spin' : ''}`} />
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback to AI Loop'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
