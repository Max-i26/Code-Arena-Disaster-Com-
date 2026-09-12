import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  UserCheck,
  UserPlus,
  FileCheck,
  Database,
  Server,
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
  <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
);

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}> = ({ icon, label, value, sub, accent = 'text-cyan-300' }) => (
  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col gap-1.5 min-w-0 shadow-md">
    <div className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-wider font-bold">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className={`text-3xl font-extrabold font-mono ${accent}`}>{value}</div>
    {sub && <div className="text-xs text-slate-400 truncate font-medium">{sub}</div>}
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

  // Verification Queue & Database State
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [dbMetrics, setDbMetrics] = useState<any>(null);

  // Create Admin Form State
  const [newAdminForm, setNewAdminForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminCreateSuccess, setAdminCreateSuccess] = useState('');

  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      if (data.success) {
        setDbMetrics(data.dbStatus);
      }
    } catch (err) {
      console.error('Failed to fetch DB status:', err);
    }
  }, []);

  const fetchPendingVerifications = useCallback(async () => {
    try {
      setIsLoadingPending(true);
      const res = await api.getPendingVerifications();
      if (res.success) {
        setPendingVerifications(res.pendingUsers || []);
      }
      fetchDbStatus();
    } catch (err) {
      console.error('Failed to fetch pending verifications:', err);
    } finally {
      setIsLoadingPending(false);
    }
  }, [fetchDbStatus]);

  useEffect(() => {
    fetchPendingVerifications();
  }, [fetchPendingVerifications]);

  const handleVerifyUser = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.verifyUser(userId, status);
      alert(`User account verification status set to ${status}!`);
      fetchPendingVerifications();
      onRefresh();
    } catch (err: any) {
      alert(`Failed to verify user: ${err.message}`);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCreateSuccess('');
    if (!newAdminForm.username || !newAdminForm.password || !newAdminForm.fullName) {
      alert('Username, password, and full name are required to create an Admin.');
      return;
    }
    try {
      setIsCreatingAdmin(true);
      const res = await api.createAdmin(newAdminForm);
      if (res.success) {
        setAdminCreateSuccess(`System Admin "${newAdminForm.username}" created successfully!`);
        setNewAdminForm({ username: '', password: '', fullName: '', email: '' });
      }
    } catch (err: any) {
      alert(`Failed to create admin: ${err.message}`);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-5 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-slate-800 text-slate-200 border border-slate-700 shadow">
            <Settings2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-wide">System Admin &amp; AI Retuning Console</h2>
            <p className="text-sm text-slate-300 mt-0.5 font-medium">
              Tune AI Aggregator strictness, configure telemetry thresholds, and inspect feedback loop logs.
            </p>
          </div>
        </div>
        <button
          onClick={handleExportAudit}
          className="bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-600 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition shadow-md"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Audit Trail (JSON)</span>
        </button>
      </div>

      {/* 1. OFFICIAL PERSONNEL VERIFICATION QUEUE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              Official Personnel Verification Queue
            </h3>
            <span className="text-xs font-mono font-extrabold px-3 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
              {pendingVerifications.length} Pending Approval
            </span>
          </div>
          <button
            onClick={fetchPendingVerifications}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPending ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {pendingVerifications.length === 0 ? (
          <div className="bg-slate-950/60 p-8 rounded-2xl border border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm text-slate-300 font-bold">All Official Personnel Verified!</p>
            <p className="text-xs text-slate-400 font-medium">New registrations for Council Officers, Field Crew, or Relief Desk requiring NIC verification will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingVerifications.map((user) => (
              <div
                key={user.id}
                className="bg-slate-950 border border-amber-700/60 p-5 rounded-2xl space-y-4 shadow-lg"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="font-extrabold text-white text-base">{user.fullName}</h4>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 uppercase">
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono">
                      Username: <span className="text-white font-bold">{user.username}</span> | Email: {user.email} | Phone: {user.phone}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleVerifyUser(user.id, 'APPROVED')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Access</span>
                    </button>
                    <button
                      onClick={() => handleVerifyUser(user.id, 'REJECTED')}
                      className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono border-t border-slate-800 pt-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-slate-400 font-bold flex items-center space-x-1">
                      <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>NATIONAL IDENTITY CARD (NIC) NUMBER</span>
                    </div>
                    <div className="text-amber-300 font-extrabold text-sm">{user.nicNumber || 'N/A'}</div>
                    <div className="text-slate-400 text-[11px] pt-1">
                      Official Detail: <span className="text-white">{user.officialDetails || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-slate-400 font-bold flex items-center space-x-1">
                      <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>NIC DOCUMENT PROOF PHOTO</span>
                    </div>
                    {user.nicDocumentUrl ? (
                      <a
                        href={user.nicDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block rounded-lg overflow-hidden h-24 bg-slate-950 border border-slate-700 relative group cursor-pointer"
                      >
                        <img
                          src={user.nicDocumentUrl}
                          alt="Uploaded NIC Proof"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[10px] text-cyan-300 font-bold bg-slate-900/90 px-2 py-1 rounded border border-cyan-500/50">
                            🔍 Click to View Full Image
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="text-slate-500 italic py-2">No document attached</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. ADMIN USER CREATION (ADMIN ONLY) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
          <UserPlus className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
            Create New System Admin Account
          </h3>
        </div>

        {adminCreateSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 p-3.5 rounded-xl text-xs font-mono font-bold">
            ✓ {adminCreateSuccess}
          </div>
        )}

        <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Admin Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Admin Ruwan Perera"
                value={newAdminForm.fullName}
                onChange={(e) => setNewAdminForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Admin Username *</label>
              <input
                type="text"
                required
                placeholder="e.g. sys_admin_ruwan"
                value={newAdminForm.username}
                onChange={(e) => setNewAdminForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newAdminForm.password}
                onChange={(e) => setNewAdminForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Official Email</label>
              <input
                type="email"
                placeholder="admin@resqcity.gov.lk"
                value={newAdminForm.email}
                onChange={(e) => setNewAdminForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isCreatingAdmin}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-cyan-950/50 flex items-center space-x-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isCreatingAdmin ? 'Creating Admin Account…' : '+ Add Admin Account'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SYSTEM HEALTH PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-extrabold text-white uppercase tracking-wider">System Health</h3>
          <span className="ml-auto flex items-center gap-2 bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-mono font-bold uppercase px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            API ONLINE
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          {/* Sensor health */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 col-span-2 sm:col-span-3 lg:col-span-2 space-y-2.5">
            <span className="text-slate-300 text-xs uppercase font-bold tracking-wider block">
              Sensor Health Snapshot
            </span>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <StatusDot color="bg-rose-500" />
                <span className="text-slate-200 font-mono text-sm">
                  DANGER: <span className="text-rose-400 font-extrabold">{sensorCounts.DANGER}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot color="bg-amber-400" />
                <span className="text-slate-200 font-mono text-sm">
                  WARNING: <span className="text-amber-400 font-extrabold">{sensorCounts.WARNING}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot color="bg-emerald-500" />
                <span className="text-slate-200 font-mono text-sm">
                  NORMAL: <span className="text-emerald-400 font-extrabold">{sensorCounts.NORMAL}</span>
                </span>
              </div>
            </div>
          </div>
          {/* Total cases processed */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-slate-300 text-xs uppercase font-bold tracking-wider block">
              Cases Processed
            </span>
            <span className="text-3xl font-extrabold font-mono text-cyan-300">{totalCases}</span>
          </div>
          {/* Resolved rate */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-slate-300 text-xs uppercase font-bold tracking-wider block">
              Resolved Rate
            </span>
            <span className="text-3xl font-extrabold font-mono text-emerald-400">{resolvedRate}</span>
          </div>
          {/* Active road closures */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-slate-300 text-xs uppercase font-bold tracking-wider block">
              Active Road Closures
            </span>
            <span className={`text-3xl font-extrabold font-mono ${activeRoadClosures > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {activeRoadClosures}
            </span>
          </div>
        </div>
      </div>

      {/* SQL DATABASE INFRASTRUCTURE & ACTIVE TABLES PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              SQL Database Infrastructure &amp; Live Tables Status
            </h3>
          </div>
          <span className={`flex items-center gap-2 text-xs font-mono font-bold uppercase px-3 py-1 rounded-full ${
            dbMetrics?.connectedToMysql
              ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
              : 'bg-cyan-950 border border-cyan-700 text-cyan-300'
          }`}>
            <Server className="w-3.5 h-3.5" />
            <span>{dbMetrics?.engine || 'SQL Database Engine Operational'}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs font-mono">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-bold uppercase">Database Host</div>
            <div className="text-cyan-300 font-extrabold text-sm">{dbMetrics?.host || 'localhost:3306'}</div>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-bold uppercase">Database Name</div>
            <div className="text-emerald-400 font-extrabold text-sm">{dbMetrics?.databaseName || 'resqcity_db'}</div>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-bold uppercase">User Accounts Table</div>
            <div className="text-amber-300 font-extrabold text-sm">{dbMetrics?.tableCounts?.users ?? 5} records</div>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-bold uppercase">Hazard Cases Table</div>
            <div className="text-cyan-300 font-extrabold text-sm">{dbMetrics?.tableCounts?.cases ?? state.cases.length} records</div>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-bold uppercase">Council Tickets Table</div>
            <div className="text-violet-300 font-extrabold text-sm">{dbMetrics?.tableCounts?.tickets ?? state.tickets.length} records</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
          <div className="bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Shelters Table:</span>
            <span className="text-emerald-400 font-bold">{dbMetrics?.tableCounts?.shelters ?? state.shelters.length} rows</span>
          </div>
          <div className="bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Field Crews Table:</span>
            <span className="text-cyan-400 font-bold">{dbMetrics?.tableCounts?.field_crews ?? state.fieldCrews.length} rows</span>
          </div>
          <div className="bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Relief Requests Table:</span>
            <span className="text-amber-400 font-bold">{dbMetrics?.tableCounts?.relief_requests ?? state.reliefRequests.length} rows</span>
          </div>
          <div className="bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">AI Feedback Logs Table:</span>
            <span className="text-violet-400 font-bold">{dbMetrics?.tableCounts?.ai_tuning_logs ?? state.aiTuningLogs.length} rows</span>
          </div>
        </div>
      </div>

      {/* PERFORMANCE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={<BarChart3 className="w-4 h-4 text-cyan-400" />}
          label="Total Cases"
          value={totalCases}
          sub="All hazard cases in system"
        />
        <KpiCard
          icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
          label="Confirmed by AI"
          value={confirmedByAi}
          sub={`of ${totalCases} total`}
          accent="text-emerald-400"
        />
        <KpiCard
          icon={<Cpu className="w-4 h-4 text-violet-400" />}
          label="Avg Confidence"
          value={avgConfidence}
          sub="Across all AI verdicts"
          accent="text-violet-300"
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-amber-400" />}
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
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>AI Aggregator &amp; Operational Thresholds</span>
            </h3>
          </div>

          <div className="space-y-4 text-sm">
            {/* AI Confidence Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-200 font-bold">AI Confidence Cutoff for Auto-Publishing:</label>
                <span className="font-mono text-cyan-300 font-extrabold text-base">
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
                className="w-full accent-cyan-400 bg-slate-950 rounded-lg cursor-pointer h-2.5"
              />
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Reports with confidence &gt;= {(config.aiConfidenceThreshold * 100).toFixed(0)}% are automatically published and trigger council work orders. Borderline cases loop back to community verification.
              </p>
            </div>

            {/* Weather Rain Limit */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-200 font-bold">Deterministic Rainfall Danger Threshold (SYSTEM):</label>
                <span className="font-mono text-cyan-300 font-extrabold text-base">{config.weatherRainfallDangerMmH} mm/h</span>
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
                className="w-full accent-cyan-400 bg-slate-950 rounded-lg cursor-pointer h-2.5"
              />
            </div>

            {/* River Gauge Limit */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-200 font-bold">River Crest Capacity Danger Threshold (SYSTEM):</label>
                <span className="font-mono text-cyan-300 font-extrabold text-base">{config.riverLevelDangerPct}%</span>
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
                className="w-full accent-cyan-400 bg-slate-950 rounded-lg cursor-pointer h-2.5"
              />
            </div>

            {/* Auto Close Road Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div>
                <span className="text-slate-200 font-bold text-sm block">Auto-Close Road on CRITICAL Verdict</span>
                <span className="text-xs text-slate-300">Automatically sets max traversal cost on public routing.</span>
              </div>
              <input
                type="checkbox"
                checked={config.autoCloseRoadOnCritical}
                onChange={(e) =>
                  setConfig({ ...config, autoCloseRoadOnCritical: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-3 px-5 rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2.5 text-sm transition disabled:opacity-50"
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
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5 border-b border-slate-800 pb-3">
              <UserX className="w-5 h-5 text-rose-400" />
              <span>False Reporter &amp; Spam Ban Management</span>
            </h3>
            <div className="flex space-x-2.5">
              <input
                type="text"
                placeholder="User ID or Phone to Ban..."
                value={banUserIdInput}
                onChange={(e) => setBanUserIdInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 font-medium"
              />
              <button
                onClick={handleBanUser}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow"
              >
                Ban User
              </button>
            </div>
            <div className="text-xs space-y-2">
              <span className="text-slate-300 font-bold text-xs block">Currently Banned Users:</span>
              {state.bannedUsers.length === 0 ? (
                <div className="text-slate-400 text-xs italic">No active user bans.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.bannedUsers.map((u) => (
                    <div
                      key={u}
                      className="bg-rose-950 border border-rose-800 px-3 py-1 rounded-xl flex items-center space-x-2 text-xs text-rose-200 font-mono font-bold"
                    >
                      <span>{u}</span>
                      <button onClick={() => handleUnbanUser(u)} className="text-slate-400 hover:text-white text-sm">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Continuous Learning & Tuning Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5">
                <History className="w-5 h-5 text-emerald-400" />
                <span>Stage 06 Feedback Log</span>
              </h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value as LogFilterAction)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-semibold"
                >
                  <option value="ALL" className="bg-slate-900">ALL</option>
                  <option value="AGREED" className="bg-slate-900">AGREED</option>
                  <option value="OVERRIDDEN_VERIFIED" className="bg-slate-900">OVERRIDDEN_VERIFIED</option>
                  <option value="OVERRIDDEN_REJECTED" className="bg-slate-900">OVERRIDDEN_REJECTED</option>
                </select>
              </div>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {logFilter === 'ALL'
                    ? 'No human overrides logged yet. Confirmed officer actions will appear here.'
                    : `No logs matching filter "${logFilter}".`}
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const actionColors: Record<string, string> = {
                    AGREED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                    OVERRIDDEN_VERIFIED: 'bg-blue-950 text-blue-300 border-blue-800',
                    OVERRIDDEN_REJECTED: 'bg-rose-950 text-rose-300 border-rose-800',
                  };
                  const colorClass =
                    actionColors[log.officerAction] ?? 'bg-slate-900 text-slate-300 border-slate-700';
                  return (
                    <div key={log.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1.5 text-xs shadow">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs text-cyan-300 font-bold">{log.caseId}</span>
                        <span className={`text-xs font-mono px-2.5 py-0.5 rounded font-bold border ${colorClass}`}>
                          {log.officerAction}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs italic">&quot;{log.officerNotes}&quot;</p>
                      <div className="text-xs text-emerald-400 font-mono font-bold">{log.promptAdjustment}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
