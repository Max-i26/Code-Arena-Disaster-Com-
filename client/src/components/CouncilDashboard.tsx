import React, { useState } from 'react';
import {
  Building2,
  Filter,
  Send,
  Truck,
  Clock,
  CheckCircle2,
  Navigation,
  ChevronDown,
  ChevronUp,
  Archive,
  ShieldAlert,
  Sparkles,
  Cpu,
  Trash2,
  User,
  Phone,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';
import { AppState, HazardCase, CouncilTicket } from '../types';
import { api } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CouncilDashboardProps {
  state: AppState;
  onRefresh: () => void;
  onSelectCase?: (c: HazardCase) => void;
  onShowDetour: (path: [number, number][]) => void;
}

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

const HAZARD_SPECIALIZATION_MAP: Record<string, string[]> = {
  FLOOD: ['WATER_PUMPING', 'RESCUE_BOAT'],
  FALLEN_TREE: ['TREE_CLEARANCE', 'ROAD_REPAIR'],
  LANDSLIDE: ['ROAD_REPAIR', 'TREE_CLEARANCE'],
  BLOCKED_DRAIN: ['WATER_PUMPING', 'ROAD_REPAIR'],
  DOWNED_POWERLINE: ['ROAD_REPAIR', 'TREE_CLEARANCE'],
};

// ─── Sub-component: Case Photo Thumbnail ─────────────────────────────────────

const CasePhoto: React.FC<{ url?: string; alt: string }> = ({ url, alt }) => {
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-1">
        <ImageIcon className="w-6 h-6 text-slate-500" />
        <span className="text-[10px] text-slate-500 font-mono">No Image</span>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open full image" className="flex-shrink-0">
      <img
        src={url}
        alt={alt}
        onError={() => setErrored(true)}
        className="w-20 h-20 rounded-xl object-cover border-2 border-slate-700 hover:border-cyan-400 transition cursor-pointer shadow-md"
      />
    </a>
  );
};

// ─── Sub-component: Case Card ─────────────────────────────────────────────────

interface CaseCardProps {
  c: HazardCase;
  onSelectCase?: (c: HazardCase) => void;
  onRefresh: () => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ c, onSelectCase, onRefresh }) => {
  const [deleting, setDeleting] = useState(false);

  const isClosed = c.roadClosed && c.status !== 'RESOLVED';
  const urgency = c.verdictData?.urgency ?? 'MEDIUM';
  const isCritical = urgency === 'CRITICAL';

  const urgencyBadgeClass =
    urgency === 'CRITICAL' ? 'bg-rose-950 text-rose-200 border-2 border-rose-600' :
    urgency === 'HIGH'     ? 'bg-amber-950 text-amber-200 border-2 border-amber-600' :
    urgency === 'MEDIUM'   ? 'bg-blue-950 text-blue-200 border-2 border-blue-600' :
                             'bg-slate-800 text-slate-300 border-2 border-slate-700';

  const handleDeleteCase = async () => {
    if (!window.confirm(`Are you sure you want to remove case "${c.id}" (${c.hazardType})?`)) {
      return;
    }
    try {
      setDeleting(true);
      await api.deleteCase(c.id);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to remove case: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative">
      {/* CRITICAL pulsing red ring */}
      {isCritical && (
        <div className="absolute -inset-0.5 rounded-2xl ring-2 ring-rose-500 animate-pulse pointer-events-none z-10" />
      )}

      <div className={`bg-slate-950 border ${isCritical ? 'border-rose-600/80 shadow-lg shadow-rose-950/40' : 'border-slate-800 hover:border-slate-700'} p-5 rounded-2xl space-y-4 transition shadow relative z-0`}>
        {/* Header row: thumbnail + title + urgency badge */}
        <div className="flex items-start gap-4">
          <CasePhoto url={c.imageUrl} alt={c.hazardType} />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-base tracking-wide">{c.hazardType.replace(/_/g, ' ')}</span>
              <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider ${urgencyBadgeClass}`}>
                {urgency}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold ${
                c.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {c.status}
              </span>
              {c.verdictData && (
                <span className="ml-auto text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  AI {(c.verdictData.confidenceScore * 100).toFixed(0)}%
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-cyan-300 font-bold bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800">
                CASE ID: {c.id}
              </span>
              {c.ticketId && (
                <span className="text-amber-300 font-bold bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-amber-400" />
                  WORK ORDER: {c.ticketId}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              {c.description || 'Hazard reported on road segment.'}
            </p>
          </div>
        </div>

        {/* Submitter / Reporter Identification Banner */}
        <div className="flex flex-wrap items-center justify-between text-xs bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-slate-300 gap-2.5">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <span className="text-slate-400">Reported By:</span>{' '}
              <strong className="text-white font-bold">
                {c.reporterName || (c.source === 'SENSOR_AUTO' ? 'Automated IoT Sensor Station' : 'Registered Citizen Submitter')}
              </strong>
            </span>
          </div>

          {(c.reporterPhone || c.source === 'CITIZEN') && (
            <div className="flex items-center space-x-1.5 font-mono text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{c.reporterPhone || 'Verified Account Phone'}</span>
            </div>
          )}

          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            c.source === 'CITIZEN' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800' : 'bg-purple-950/80 text-purple-300 border-purple-800'
          }`}>
            {c.source === 'CITIZEN' ? '👤 CITIZEN SUBMISSION' : '🤖 IOT SENSOR'}
          </span>
        </div>

        {/* Location info bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono bg-slate-900/90 p-3 rounded-xl border border-slate-800 gap-3">
          <div><span className="text-slate-400">Road:</span> <span className="text-cyan-300 font-bold">{c.location.roadName}</span></div>
          <div><span className="text-slate-400">Ward:</span> <span className="text-white font-semibold">{c.location.wardName.split(' ')[0]}</span></div>
          <div>
            <span className="text-slate-400">Road Access:</span>{' '}
            {isClosed
              ? <span className="text-rose-300 font-bold bg-rose-950 px-2.5 py-0.5 rounded-md border border-rose-800">CLOSED</span>
              : <span className="text-emerald-300 font-bold bg-emerald-950 px-2.5 py-0.5 rounded-md border border-emerald-800">OPEN</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {onSelectCase && (
            <button
              onClick={() => onSelectCase(c)}
              className="flex-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/60 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Inspect AI Rationale</span>
            </button>
          )}

          {/* Remove / Delete Case option */}
          <button
            onClick={handleDeleteCase}
            disabled={deleting}
            className="bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-200 hover:text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow disabled:opacity-50"
            title="Remove/Delete this case"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{deleting ? 'Removing...' : 'Remove Case'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-component: Resolved Archive Panel ────────────────────────────────────

interface ResolvedArchivePanelProps {
  tickets: CouncilTicket[];
}

const ResolvedArchivePanel: React.FC<ResolvedArchivePanelProps> = ({ tickets }) => {
  const [open, setOpen] = useState(false);

  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Archive className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-bold text-white tracking-wide">
              Resolved Work Orders Archive
            </h3>
            <p className="text-xs text-slate-400">{resolvedTickets.length} resolved tickets recorded</p>
          </div>
        </div>
        <div className="text-slate-300">
          {open ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-3.5">
          {resolvedTickets.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No resolved tickets yet in the archive.
            </div>
          ) : (
            resolvedTickets.map((t) => (
              <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                {t.resolutionPhotoUrl ? (
                  <a href={t.resolutionPhotoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0" title="Open resolution photo">
                    <img
                      src={t.resolutionPhotoUrl}
                      alt="Resolution"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-700/50 hover:border-emerald-400 transition shadow"
                    />
                  </a>
                ) : (
                  <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-white">{t.id}</span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      RESOLVED
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {t.hazardType.replace(/_/g, ' ')} · Ward {t.wardId}
                    </span>
                  </div>

                  {t.resolutionNotes && (
                    <p className="text-sm text-slate-200 italic leading-relaxed">
                      "{t.resolutionNotes}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                    {t.resolvedAt && (
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(t.resolvedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {t.assignedCrewName && (
                      <div className="flex items-center space-x-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
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

  const handleDispatch = async (ticket: CouncilTicket) => {
    let crewId = selectedCrewForTicket[ticket.id];
    if (!crewId) {
      const preferredSpecs = HAZARD_SPECIALIZATION_MAP[ticket.hazardType] || [];
      const match = availableCrews.find(c => preferredSpecs.includes(c.specialization)) || availableCrews[0];
      crewId = match?.id;
    }
    if (!crewId) {
      alert('No available field crew squad for dispatch.');
      return;
    }
    try {
      setIsDispatching(ticket.id);
      await api.dispatchTicket(ticket.id, crewId);
      alert('Specialized emergency squad dispatched successfully!');
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-5 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-wide">Municipal Control & Command Dashboard</h2>
            <p className="text-sm text-slate-300 mt-0.5">Real-time hazard case management, AI diagnosis review, and emergency crew dispatch.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Filter Ward:</span>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All City Wards ({state.wards.length})</option>
              {state.wards.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900">{w.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Urgency:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Urgencies</option>
              <option value="CRITICAL" className="bg-slate-900">CRITICAL Only</option>
              <option value="HIGH" className="bg-slate-900">HIGH Only</option>
              <option value="MEDIUM" className="bg-slate-900">MEDIUM Only</option>
              <option value="LOW" className="bg-slate-900">LOW Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-md">
          <span className="text-xs text-slate-300 uppercase font-bold tracking-wider block">Active Cases</span>
          <div className="text-3xl font-extrabold font-mono text-white">
            {state.cases.filter((c) => c.status !== 'RESOLVED').length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-md">
          <span className="text-xs text-slate-300 uppercase font-bold tracking-wider block">Resolved Cases</span>
          <div className="text-3xl font-extrabold font-mono text-emerald-400">{resolvedCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-md">
          <span className="text-xs text-slate-300 uppercase font-bold tracking-wider block">Closed Roads</span>
          <div className="text-3xl font-extrabold font-mono text-rose-400">
            {state.cases.filter((c) => c.roadClosed && c.status !== 'RESOLVED').length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-md">
          <span className="text-xs text-slate-300 uppercase font-bold tracking-wider block">Open Tickets</span>
          <div className="text-3xl font-extrabold font-mono text-amber-400">{openTickets.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-md">
          <span className="text-xs text-slate-300 uppercase font-bold tracking-wider block">Crews Available</span>
          <div className="text-3xl font-extrabold font-mono text-cyan-400">
            {availableCrews.length} / {state.fieldCrews.length}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Reported Cases Feed with Remove/Delete Option */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span>Reported Cases Feed ({filteredCases.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Sorted by Urgency</span>
          </div>

          <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
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
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5">
              <Truck className="w-5 h-5 text-amber-400" />
              <span>Dispatch Work Orders ({openTickets.length})</span>
            </h3>
          </div>

          <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
            {openTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No open work orders pending dispatch.
              </div>
            ) : (
              openTickets.map((t) => {
                const matchingCase = state.cases.find((c) => c.id === t.caseId);
                return (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3.5 shadow-md">
                    {/* Header: Ticket ID & Case ID Link */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">{t.id}</span>
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                          LINKED CASE: {t.caseId}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold uppercase ${
                        t.status === 'DISPATCHED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-rose-950 text-rose-300 border border-rose-700'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    {/* Linked Case Preview (Thumbnail, Road Name, Description, Submitter) */}
                    {matchingCase && (
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-start gap-3">
                          {matchingCase.imageUrl && (
                            <img
                              src={matchingCase.imageUrl}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-300 font-mono flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="text-cyan-300 font-bold truncate">{matchingCase.location.roadName}</span>
                            </div>
                            <p className="text-xs text-slate-200 line-clamp-1 mt-0.5 italic">
                              "{matchingCase.description || 'Hazard reported on road segment.'}"
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/60 text-slate-300 gap-1.5 font-mono">
                          <div className="flex items-center space-x-1 truncate">
                            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">Reporter: <strong className="text-white">{matchingCase.reporterName || 'Citizen Submitter'}</strong></span>
                          </div>
                          {(matchingCase.reporterPhone || matchingCase.source === 'CITIZEN') && (
                            <div className="flex items-center space-x-1 text-cyan-300">
                              <Phone className="w-3 h-3 text-cyan-400" />
                              <span>{matchingCase.reporterPhone || 'Verified Phone'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hazard Type, Ward & Urgency */}
                    <div className="text-xs font-mono flex flex-wrap items-center justify-between bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60 gap-2">
                      <div><span className="text-slate-400">Hazard:</span> <span className="font-bold text-amber-300">{t.hazardType.replace(/_/g, ' ')}</span></div>
                      <div><span className="text-slate-400">Ward:</span> <span className="text-white font-semibold">{t.wardId}</span></div>
                      <div>
                        <span className="text-slate-400">Urgency:</span>{' '}
                        <span className={
                          t.urgency === 'CRITICAL' ? 'text-rose-400 font-bold' :
                          t.urgency === 'HIGH' ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'
                        }>
                          {t.urgency}
                        </span>
                      </div>
                    </div>

                  {t.assignedCrewName ? (
                    <div className="bg-emerald-950/60 border border-emerald-700/60 p-3.5 rounded-xl text-sm space-y-2.5">
                      <div className="text-emerald-300 font-bold flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Assigned Unit: {t.assignedCrewName}</span>
                      </div>
                      {t.detourRoute && t.detourRoute.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-300 italic">
                            Detour: {t.detourRoute[0].instruction}
                          </p>
                          {t.status === 'DISPATCHED' && (
                            <button
                              onClick={() => handleShowDetour(t)}
                              className="w-full bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600 text-cyan-200 text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center space-x-2 shadow"
                            >
                              <Navigation className="w-4 h-4 text-cyan-400" />
                              <span>Show Route on Map</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <label className="text-slate-300">Select Field Response Squad:</label>
                        {(() => {
                          const preferredSpecs = HAZARD_SPECIALIZATION_MAP[t.hazardType] || [];
                          const selectedId = selectedCrewForTicket[t.id];
                          const selectedCrew = state.fieldCrews.find(c => c.id === selectedId);
                          if (selectedCrew && preferredSpecs.includes(selectedCrew.specialization)) {
                            return <span className="text-emerald-300 bg-emerald-950/80 border border-emerald-700 px-2 py-0.5 rounded text-xs font-bold">✓ Specialized Match</span>;
                          }
                          return null;
                        })()}
                      </div>
                      <select
                        value={selectedCrewForTicket[t.id] || ''}
                        onChange={(e) =>
                          setSelectedCrewForTicket({ ...selectedCrewForTicket, [t.id]: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      >
                        <option value="">-- Auto-Assign Best Match --</option>
                        {state.fieldCrews.map((cr) => {
                          const preferredSpecs = HAZARD_SPECIALIZATION_MAP[t.hazardType] || [];
                          const isMatch = preferredSpecs.includes(cr.specialization);
                          return (
                            <option key={cr.id} value={cr.id} className="bg-slate-900">
                              {isMatch ? '⭐ ' : ''}{cr.name} ({cr.status} · {cr.specialization}){isMatch ? ' [MATCH]' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={() => handleDispatch(t)}
                        disabled={isDispatching === t.id}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/50 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isDispatching === t.id ? 'Dispatching Unit...' : 'Dispatch Emergency Squad'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
              )}
          </div>
        </div>
      </div>

      {/* Resolved Tickets Archive Panel */}
      <ResolvedArchivePanel tickets={state.tickets} />
    </div>
  );
};
