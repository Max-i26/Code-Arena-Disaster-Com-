import React, { useState } from 'react';
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
  Download
} from 'lucide-react';
import { AppState, SystemConfig } from '../types';
import { api } from '../services/api';

interface SystemAdminProps {
  state: AppState;
  onRefresh: () => void;
}

export const SystemAdmin: React.FC<SystemAdminProps> = ({
  state,
  onRefresh,
}) => {
  const [config, setConfig] = useState<SystemConfig>({ ...state.config });
  const [banUserIdInput, setBanUserIdInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">System Admin & AI Retuning Console</h2>
            <p className="text-xs text-slate-400">Tune AI Aggregator strictness, configure telemetry thresholds, and inspect feedback loop logs.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Parameters & Rules */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>AI Aggregator & Operational Thresholds</span>
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* AI Confidence Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-300 font-semibold">AI Confidence Cutoff for Auto-Publishing:</label>
                <span className="font-mono text-cyan-400 font-bold text-sm">{(config.aiConfidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={config.aiConfidenceThreshold}
                onChange={(e) => setConfig({ ...config, aiConfidenceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Reports with confidence $\ge$ {config.aiConfidenceThreshold * 100}% are automatically published and trigger council work orders. Borderline cases loop back to community verification.
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
                onChange={(e) => setConfig({ ...config, weatherRainfallDangerMmH: parseFloat(e.target.value) })}
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
                onChange={(e) => setConfig({ ...config, riverLevelDangerPct: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Auto Close Road Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-300 font-semibold block">Auto-Close Road on CRITICAL Verdict</span>
                <span className="text-[11px] text-slate-500">Automatically sets traversal cost to $\infty$ on public routing.</span>
              </div>
              <input
                type="checkbox"
                checked={config.autoCloseRoadOnCritical}
                onChange={(e) => setConfig({ ...config, autoCloseRoadOnCritical: e.target.checked })}
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
              <span>False Reporter & Spam Ban Management</span>
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
                    <div key={u} className="bg-rose-950/60 border border-rose-800 px-2.5 py-1 rounded-lg flex items-center space-x-2 text-[11px] text-rose-300 font-mono">
                      <span>{u}</span>
                      <button onClick={() => handleUnbanUser(u)} className="text-slate-400 hover:text-white">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Continuous Learning & Tuning Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Stage 06 Continuous Learning Feedback Log</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {state.aiTuningLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No human overrides logged yet. Confirmed officer actions will appear here.
                </div>
              ) : (
                state.aiTuningLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-cyan-400 font-bold">{log.caseId}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                        {log.officerAction}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] italic">"{log.officerNotes}"</p>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      {log.promptAdjustment}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
