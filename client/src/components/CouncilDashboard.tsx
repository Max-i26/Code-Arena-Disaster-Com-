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
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Archive,
  Image as ImageIcon,
} from 'lucide-react';
import { AppState, FieldCrew, HazardCase, SeverityLevel, CouncilTicket } from '../types';
import { api } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CouncilDashboardProps {
  state: AppState;
  onRefresh: () => void;
  onSelectCase: (c: HazardCase) => void;
  onShowDetour: (path: [number, number][]) => void;
}

type FeedbackAction = 'AGREED' | 'OVERRIDDEN_VERIFIED' | 'OVERRIDDEN_REJECTED';

// ─── Urgency Sort Order ───────────────────────────────────────────────────────

const URGENCY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function sortByUrgency(cases: HazardCase[]): HazardCase[] {
  return [...cases].sort((a, b) => {
    const ua = URGENCY_ORDER[a.verdictData?.urgency ?? 'LOW'] ?? 3;
    const ub = URGENCY_ORDER[b.verdictData?.urgency ?? 'LOW'] ?? 3;
    return ua - ub;
  });
}

// ─── Sub-component: Case Photo Thumbnail ─────────────────────────────────────

const CasePhoto: React.FC<{ url?: string; alt: string }> = ({ url, alt }) => {
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600">
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open full image" className="flex-shrink-0">
      <img
        src={url}
        alt={alt}
        width={56}
        height={56}
        onError={() => setErrored(true)}
        className="w-14 h-14 rounded-lg object-cover border border-slate-700 hover:border-cyan-500 transition cursor-pointer shadow"
      />
    </a>
  );
};

// ─── Sub-component: Officer Override Panel ────────────────────────────────────

interface OfficerOverridePanelProps {
  caseId: string;
  onRefresh: () => void;
}

const OfficerOverridePanel: React.FC<OfficerOverridePanelProps> = ({ caseId, onRefresh }) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState<FeedbackAction | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (action: FeedbackAction) => {
    try {
      setSubmitting(action);
      await api.submitCaseFeedback(caseId, action, notes);
      setSubmitted(true);
      onRefresh();
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    } finally {
      setSubmitting(null);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-3 text-xs text-emerald-400 flex items-center space-x-2">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span>Officer decision recorded. AI tuning log updated.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-1">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Officer notes (optional — provide reasoning for override)..."
        rows={2}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleSubmit('AGREED')}
          disabled={submitting !== null}
          className="flex-1 min-w-[120px] bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-600/50 text-emerald-300 text-xs font-semibold py-1.5 px-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
        >
          {submitting === 'AGREED' ? (
            <span className="animate-pulse">Submitting...</span>
          ) : (
            <span>Agree with AI</span>
          )}
        </button>
        <button
          onClick={() => handleSubmit('OVERRIDDEN_VERIFIED')}
          disabled={submitting !== null}
          className="flex-1 min-w-[120px] bg-amber-700/30 hover:bg-amber-700/50 border border-amber-600/50 text-amber-300 text-xs font-semibold py-1.5 px-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
        >
          {submitting === 'OVERRIDDEN_VERIFIED' ? (
            <span className="animate-pulse">Submitting...</span>
          ) : (
            <span>Override: Verify</span>
          )}
        </button>
        <button
          onClick={() => handleSubmit('OVERRIDDEN_REJECTED')}
          disabled={submitting !== null}
          className="flex-1 min-w-[120px] bg-rose-700/30 hover:bg-rose-700/50 border border-rose-600/50 text-rose-300 text-xs font-semibold py-1.5 px-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
        >
          {submitting === 'OVERRIDDEN_REJECTED' ? (
            <span className="animate-pulse">Submitting...</span>
          ) : (
            <span>Override: Reject</span>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Sub-component: Case Card ─────────────────────────────────────────────────

interface CaseCardProps {
  c: HazardCase;
  onSelectCase: (c: HazardCase) => void;
  onRefresh: () => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ c, onSelectCase, onRefresh }) => {
  const [showOverride, setShowOverride] = useState(false);

  const isClosed = c.roadClosed && c.status !== 'RESOLVED';
  const urgency = c.verdictData?.urgency ?? 'MEDIUM';
  const isCritical = urgency === 'CRITICAL';

  const urgencyBadgeClass =
    urgency === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
    urgency === 'HIGH'     ? 'bg-amber-950 text-amber-300 border border-amber-800' :
    urgency === 'MEDIUM'   ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                             'bg-slate-800 text-slate-400 border border-slate-700';

  return (
    <div className="relative">
      {/* CRITICAL pulsing red ring */}
      {isCritical && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-rose-500 animate-pulse pointer-events-none z-10" />
      )}

      <div className={`bg-slate-950 border ${isCritical ? 'border-rose-700/60' : 'border-slate-800/80 hover:border-slate-700'} p-4 rounded-xl space-y-3 transition shadow relative z-0`}>
        {/* Header row: thumbnail + meta */}
        <div className="flex items-start gap-3">
          <CasePhoto url={c.imageUrl} alt={c.hazardType} />

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-white text-xs">{c.hazardType.replace(/_/g, ' ')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${urgencyBadgeClass}`}>
                {urgency}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                c.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
              }`}>
                {c.status}
              </span>
              {c.verdictData && (
                <span className="ml-auto text-xs font-mono font-bold text-cyan-400">
                  AI {(c.verdictData.confidenceScore * 100).toFixed(0)}%
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
              {c.description || 'Hazard reported on road segment.'}
            </p>
          </div>
        </div>

        {/* Location info row */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 gap-2">
          <div>Road: <span className="text-cyan-300 font-semibold">{c.location.roadName}</span></div>
          <div>Ward: <span className="text-slate-300">{c.location.wardName.split(' ')[0]}</span></div>
          <div>
            Status:{' '}
            {isClosed
              ? <span className="text-rose-400 font-bold">CLOSED</span>
              : <span className="text-emerald-400 font-bold">OPEN</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onSelectCase(c)}
            className="flex-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Inspect AI Rationale</span>
          </button>

          <button
            onClick={() => setShowOverride((v) => !v)}
            className={`flex-shrink-0 border py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
              showOverride
                ? 'bg-violet-700/40 border-violet-500/60 text-violet-200'
                : 'bg-violet-600/20 border-violet-500/40 text-violet-300 hover:bg-violet-600/30'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Officer Decision</span>
            {showOverride ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expandable Officer Override Panel */}
        {showOverride && (
          <div className="border-t border-slate-800 pt-3">
            <p className="text-[11px] text-slate-500 uppercase font-semibold mb-2 tracking-wider flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Officer Override</span>
            </p>
            <OfficerOverridePanel caseId={c.id} onRefresh={onRefresh} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-component: Resolved Archive Panel ────────────────────────────────────

interface ResolvedArchivePanelProps {
  tickets: CouncilTicket[];
  cases: HazardCase[];
}

const ResolvedArchivePanel: React.FC<ResolvedArchivePanelProps> = ({ tickets, cases }) => {
  const [open, setOpen] = useState(false);

  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-600/15 text-emerald-400 border border-emerald-500/25">
            <Archive className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Resolved Tickets Archive
            </h3>
            <p className="text-xs text-slate-500">{resolvedTickets.length} resolved work orders</p>
          </div>
        </div>
        <div className="text-slate-400">
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-3">
          {resolvedTickets.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No resolved tickets yet.
            </div>
          ) : (
            resolvedTickets.map((t) => (
              <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                {t.resolutionPhotoUrl ? (
                  <a href={t.resolutionPhotoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0" title="Open resolution photo">
                    <img
                      src={t.resolutionPhotoUrl}
                      alt="Resolution"
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-lg object-cover border border-emerald-700/50 hover:border-emerald-400 transition shadow"
                    />
                  </a>
                ) : (
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{t.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                      RESOLVED
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {t.hazardType.replace(/_/g, ' ')} · Ward {t.wardId}
                    </span>
                  </div>

                  {t.resolutionNotes && (
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      {t.resolutionNotes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                    {t.resolvedAt && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(t.resolvedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {t.assignedCrewName && (
                      <div className="flex items-center space-x-1">
                        <Truck className="w-3 h-3" />
                        <span>{t.assignedCrewName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const filteredCases = sortByUrgency(
    state.cases.filter((c) => {
      if (selectedWard !== 'ALL' && c.location.wardId !== selectedWard) return false;
      if (selectedUrgency !== 'ALL' && c.verdictData?.urgency !== selectedUrgency) return false;
      return true;
    })
  );

  const openTickets = state.tickets.filter((t) => t.status === 'OPEN' || t.status === 'DISPATCHED');
  const availableCrews = state.fieldCrews.filter((c) => c.status === 'AVAILABLE');
  const resolvedCount = state.cases.filter((c) => c.status === 'RESOLVED').length;

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

  const handleShowDetour = (ticket: CouncilTicket) => {
    if (!ticket.detourRoute || ticket.detourRoute.length === 0) return;
    const coords: [number, number][] = ticket.detourRoute.map((pt) => [pt.lat, pt.lng]);
    onShowDetour(coords);
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
        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All City Wards ({state.wards.length})</option>
            {state.wards.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Urgencies</option>
            <option value="CRITICAL">CRITICAL Only</option>
            <option value="HIGH">HIGH Only</option>
            <option value="MEDIUM">MEDIUM Only</option>
            <option value="LOW">LOW Only</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Active Cases</span>
          <div className="text-2xl font-bold font-mono text-white">
            {state.cases.filter((c) => c.status !== 'RESOLVED').length}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Resolved Cases</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{resolvedCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Closed Roads</span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {state.cases.filter((c) => c.roadClosed && c.status !== 'RESOLVED').length}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Open Tickets</span>
          <div className="text-2xl font-bold font-mono text-amber-400">{openTickets.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Crews Available</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {availableCrews.length} / {state.fieldCrews.length}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Live Cases Feed */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Live Case Intelligence Feed ({filteredCases.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">CRITICAL to LOW</span>
          </div>
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No cases match the current filters.
              </div>
            ) : (
              filteredCases.map((c) => (
                <CaseCard key={c.id} c={c} onSelectCase={onSelectCase} onRefresh={onRefresh} />
              ))
            )}
          </div>
        </div>

        {/* Right: Dispatch Work Orders */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Council Dispatch Work Orders ({openTickets.length})</span>
            </h3>
          </div>
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
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
                      t.status === 'DISPATCHED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <div>Hazard: <span className="font-bold text-white">{t.hazardType.replace(/_/g, ' ')}</span></div>
                    <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                      Ward: {t.wardId} · Urgency:{' '}
                      <span className={
                        t.urgency === 'CRITICAL' ? 'text-rose-400' :
                        t.urgency === 'HIGH' ? 'text-amber-400' : 'text-blue-400'
                      }>
                        {t.urgency}
                      </span>
                    </div>
                  </div>

                  {t.assignedCrewName ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-lg text-xs space-y-2">
                      <div className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Assigned Unit: {t.assignedCrewName}</span>
                      </div>
                      {t.detourRoute && t.detourRoute.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-slate-300 italic">
                            Detour: {t.detourRoute[0].instruction}
                          </p>
                          {t.status === 'DISPATCHED' && (
                            <button
                              onClick={() => handleShowDetour(t)}
                              className="w-full bg-cyan-700/30 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition flex items-center justify-center space-x-1.5"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Show Route on Map</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] text-slate-400 block">Select Field Crew Squad:</label>
                      <select
                        value={selectedCrewForTicket[t.id] || ''}
                        onChange={(e) =>
                          setSelectedCrewForTicket({ ...selectedCrewForTicket, [t.id]: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Choose Available Squad --</option>
                        {state.fieldCrews.map((cr) => (
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

      {/* Resolved Tickets Archive Panel */}
      <ResolvedArchivePanel tickets={state.tickets} cases={state.cases} />
    </div>
  );
};
