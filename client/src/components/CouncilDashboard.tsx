import React, { useState } from 'react';
import { 
  Building2, 
  Filter, 
  Send, 
  AlertTriangle, 
  Radio, 
  Truck, 
  Cpu, 
  Eye, 
  Clock, 
  CheckCircle2,
  Navigation,
  ShieldAlert
} from 'lucide-react';
import { AppState, FieldCrew, HazardCase, SeverityLevel } from '../types';
import { api } from '../services/api';

interface CouncilDashboardProps {
  state: AppState;
  onRefresh: () => void;
  onSelectCase: (c: HazardCase) => void;
  onShowDetour: (path: [number, number][]) => void;
}

export const CouncilDashboard: React.FC<CouncilDashboardProps> = ({
  state,
  onRefresh,
  onSelectCase,
  onShowDetour,
}) => {
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedCrewForTicket, setSelectedCrewForTicket] = useState<{ [ticketId: string]: string }>({});
  const [isDispatching, setIsDispatching] = useState<string | null>(null);

  // Filter cases
  const filteredCases = state.cases.filter((c) => {
    if (selectedWard !== 'ALL' && c.location.wardId !== selectedWard) return false;
    if (selectedUrgency !== 'ALL' && c.verdictData?.urgency !== selectedUrgency) return false;
    return true;
  });

  const openTickets = state.tickets.filter(t => t.status === 'OPEN' || t.status === 'DISPATCHED');
  const availableCrews = state.fieldCrews.filter(c => c.status === 'AVAILABLE');

  const handleDispatch = async (ticketId: string) => {
    const crewId = selectedCrewForTicket[ticketId] || availableCrews[0]?.id;
    if (!crewId) {
      alert('Please select a field crew unit to dispatch.');
      return;
    }

    try {
      setIsDispatching(ticketId);
      await api.dispatchTicket(ticketId, crewId);
      alert('Emergency crew dispatched successfully. Work order updated.');
      onRefresh();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setIsDispatching(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Municipal Control & Command Dashboard</h2>
            <p className="text-xs text-slate-400">Real-time hazard triage, AI diagnosis review, and emergency crew dispatch.</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All City Wards ({state.wards.length})</option>
            {state.wards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Urgencies</option>
            <option value="CRITICAL">🔴 CRITICAL Only</option>
            <option value="HIGH">🟠 HIGH Only</option>
            <option value="MEDIUM">🟡 MEDIUM Only</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Active Hazard Cases</span>
          <div className="text-2xl font-bold font-mono text-white">
            {state.cases.filter(c => c.status !== 'RESOLVED').length}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Closed Road Segments</span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {state.cases.filter(c => c.roadClosed && c.status !== 'RESOLVED').length}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Open Dispatch Tickets</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {openTickets.length}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Field Crews Available</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {availableCrews.length} / {state.fieldCrews.length}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Cases & Council Dispatch Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Cases Feed */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Live Case Intelligence Feed ({filteredCases.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Sorted by Urgency</span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredCases.map((c) => {
              const isClosed = c.roadClosed && c.status !== 'RESOLVED';
              const urgency = c.verdictData?.urgency || 'MEDIUM';
              return (
                <div
                  key={c.id}
                  className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl space-y-3 transition shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{c.hazardType.replace('_', ' ')}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        urgency === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        urgency === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {urgency}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        c.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="text-right">
                      {c.verdictData && (
                        <div className="text-xs font-mono font-bold text-cyan-400">
                          AI: {(c.verdictData.confidenceScore * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">{c.description || 'Hazard reported on road segment.'}</p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 gap-2">
                    <div>Road: <span className="text-cyan-300 font-semibold">{c.location.roadName}</span></div>
                    <div>Ward: <span className="text-slate-300">{c.location.wardName.split(' ')[0]}</span></div>
                    <div>Status: {isClosed ? <span className="text-rose-400 font-bold">⛔ CLOSED</span> : <span className="text-emerald-400 font-bold">OPEN</span>}</div>
                  </div>

                  {/* Diagnostic Action Button */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => onSelectCase(c)}
                      className="flex-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Inspect 5 Checks & AI Rationale</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dispatch & Work Orders Queue */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Council Dispatch Work Orders ({openTickets.length})</span>
            </h3>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {openTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No open tickets pending dispatch.
              </div>
            ) : (
              openTickets.map((t) => (
                <div key={t.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{t.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      t.status === 'DISPATCHED' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <div>Hazard: <span className="font-bold text-white">{t.hazardType}</span></div>
                    <div className="text-slate-400 text-[11px] font-mono">Ward: {t.wardId} · Urgency: {t.urgency}</div>
                  </div>

                  {t.assignedCrewName ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Assigned Unit: {t.assignedCrewName}</span>
                      </div>
                      {t.detourRoute && t.detourRoute.length > 0 && (
                        <div className="text-[11px] text-slate-300 italic pt-1">
                          Detour: {t.detourRoute[0].instruction}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] text-slate-400 block">Select Field Crew Squad:</label>
                      <select
                        value={selectedCrewForTicket[t.id] || ''}
                        onChange={(e) => setSelectedCrewForTicket({ ...selectedCrewForTicket, [t.id]: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Choose Available Squad --</option>
                        {state.fieldCrews.map(cr => (
                          <option key={cr.id} value={cr.id}>
                            {cr.name} ({cr.status} · {cr.specialization})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleDispatch(t.id)}
                        disabled={isDispatching === t.id}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isDispatching === t.id ? 'Dispatching...' : 'Dispatch Emergency Squad'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
