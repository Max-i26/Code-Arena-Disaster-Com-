import React, { useState } from 'react';
import {
  Home,
  LifeBuoy,
  Users,
  Package,
  CheckCircle2,
  Compass,
  Phone,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertTriangle,
  RefreshCw,
  Clock,
  MapPin,
  Droplets,
  Utensils,
  Stethoscope,
  ShieldCheck,
  Navigation,
  X,
} from 'lucide-react';
import { AppState, ReliefRequest } from '../types';
import { api } from '../services/api';

interface ReliefDeskProps {
  state: AppState;
  onRefresh: () => void;
  onShowDetour: (path: [number, number][]) => void;
}

// Special-needs badge colours
const NEED_BADGE: Record<string, string> = {
  'Wheelchair':         'bg-blue-950 text-blue-300 border-blue-700',
  'Elderly (65+)':      'bg-amber-950 text-amber-300 border-amber-700',
  'Infant':             'bg-pink-950 text-pink-300 border-pink-700',
  'Medical Condition':  'bg-rose-950 text-rose-300 border-rose-700',
  'Pets':               'bg-teal-950 text-teal-300 border-teal-700',
};

const ALL_SPECIAL_NEEDS = Object.keys(NEED_BADGE);

// Urgency badge colours
const URGENCY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-rose-950 text-rose-300 border-rose-700',
  HIGH:     'bg-orange-950 text-orange-300 border-orange-700',
  MEDIUM:   'bg-amber-950 text-amber-300 border-amber-700',
  LOW:      'bg-slate-800 text-slate-300 border-slate-600',
};

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED:   'bg-indigo-950 text-indigo-300 border-indigo-700',
  DISPATCHED: 'bg-amber-950 text-amber-300 border-amber-700',
  SHELTERED:  'bg-emerald-950 text-emerald-300 border-emerald-700',
};

// Default form state
const DEFAULT_FORM = {
  citizenName:    '',
  citizenPhone:   '',
  householdCount: 1,
  roadName:       'Baseline Road, Colombo 07',
  lat:            6.9344,
  lng:            79.8428,
  specialNeeds:   [] as string[],
};

export const ReliefDesk: React.FC<ReliefDeskProps> = ({
  state,
  onRefresh,
  onShowDetour,
}) => {
  // Rescue-request form state
  const [formOpen,   setFormOpen]   = useState(false);
  const [form,       setForm]       = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Match-shelter state
  const [isMatching, setIsMatching] = useState<string | null>(null);

  // Restock panel state (one boolean per shelter id)
  const [restockOpen, setRestockOpen] = useState<Record<string, boolean>>({});

  // Derived data
  const sortedQueued: ReliefRequest[] = [...state.reliefRequests]
    .filter(r => r.status === 'QUEUED')
    .sort((a, b) => {
      const aHasNeeds = (a.specialNeeds?.length ?? 0) > 0 ? 0 : 1;
      const bHasNeeds = (b.specialNeeds?.length ?? 0) > 0 ? 0 : 1;
      return aHasNeeds - bHasNeeds;
    });

  const assignedRequests: ReliefRequest[] = state.reliefRequests.filter(
    r => r.status !== 'QUEUED',
  );

  const totalFreeBeds = state.shelters.reduce((acc, s) => acc + (s.totalCapacity - s.currentOccupancy), 0);
  const openShelters  = state.shelters.filter(s => s.isOpen).length;

  // Handlers
  const handleMatchShelter = async (reqId: string) => {
    try {
      setIsMatching(reqId);
      const res = await api.matchReliefShelter(reqId);
      alert(`Evacuation matched! → ${res.result.matchedShelter.name} (${res.result.availableCapacityAfter} beds left).`);
      if (res.result.safeRoute) onShowDetour(res.result.safeRoute);
      onRefresh();
    } catch (err: any) {
      alert(`Matching error: ${err.message}`);
    } finally {
      setIsMatching(null);
    }
  };

  const handleToggleNeed = (need: string) => {
    setForm(prev => ({
      ...prev,
      specialNeeds: prev.specialNeeds.includes(need)
        ? prev.specialNeeds.filter(n => n !== need)
        : [...prev.specialNeeds, need],
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);
    if (!form.citizenName.trim() || !form.citizenPhone.trim()) {
      setFormStatus({ type: 'error', msg: 'Citizen name and phone are required.' });
      return;
    }
    try {
      setSubmitting(true);
      await api.requestRescue({
        citizenName:    form.citizenName.trim(),
        citizenPhone:   form.citizenPhone.trim(),
        householdCount: form.householdCount,
        location: {
          lat:      form.lat,
          lng:      form.lng,
          roadName: form.roadName.trim(),
        },
        specialNeeds: form.specialNeeds,
      });
      setFormStatus({ type: 'success', msg: 'Rescue request submitted successfully. A team will be assigned shortly.' });
      setForm({ ...DEFAULT_FORM });
      onRefresh();
    } catch (err: any) {
      setFormStatus({ type: 'error', msg: err.message ?? 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestockItem = (shelterId: string, payload: object) => {
    fetch(`/api/shelters/${shelterId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(() => onRefresh());
  };

  return (
    <div className="space-y-6">

      {/* Stats Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Relief &amp; Shelter Coordination Desk</h2>
              <p className="text-xs text-slate-400">
                Match stranded citizens to nearest shelters by capacity, supplies, and safe transit routes.
              </p>
            </div>
          </div>

          {/* Toggle manual-request form */}
          <button
            onClick={() => { setFormOpen(v => !v); setFormStatus(null); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-700/30 hover:bg-purple-700/50 border border-purple-600/40 text-purple-300 text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Rescue Request</span>
            {formOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Stats pill row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Total Shelters</p>
            <p className="text-xl font-bold text-white">{state.shelters.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Open Shelters</p>
            <p className="text-xl font-bold text-emerald-400">{openShelters}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Free Beds</p>
            <p className="text-xl font-bold text-cyan-400">{totalFreeBeds}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Pending</p>
            <p className="text-xl font-bold text-amber-400">{sortedQueued.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Assigned</p>
            <p className="text-xl font-bold text-purple-400">{assignedRequests.length}</p>
          </div>
        </div>

        {/* Manual Rescue Request Form (collapsible) */}
        {formOpen && (
          <form
            onSubmit={handleFormSubmit}
            className="border border-purple-800/40 bg-slate-950 rounded-xl p-4 space-y-4 mt-1"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-2">
              <LifeBuoy className="w-4 h-4" />
              <span>New Manual Rescue Request</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Citizen Name */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Citizen Name *</label>
                <input
                  type="text"
                  value={form.citizenName}
                  onChange={e => setForm(f => ({ ...f, citizenName: e.target.value }))}
                  placeholder="e.g. Kasun Perera"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Contact Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="tel"
                    value={form.citizenPhone}
                    onChange={e => setForm(f => ({ ...f, citizenPhone: e.target.value }))}
                    placeholder="+94 71 234 5678"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
              {/* Household Count */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Household Count</label>
                <div className="relative">
                  <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="number"
                    min={1}
                    value={form.householdCount}
                    onChange={e => setForm(f => ({ ...f, householdCount: Math.max(1, Number(e.target.value)) }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
              {/* Road Name */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Road / Address</label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={form.roadName}
                    onChange={e => setForm(f => ({ ...f, roadName: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
              {/* Lat */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={e => setForm(f => ({ ...f, lat: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              {/* Lng */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={e => setForm(f => ({ ...f, lng: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            {/* Special Needs checkboxes */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">Special Needs</label>
              <div className="flex flex-wrap gap-2">
                {ALL_SPECIAL_NEEDS.map(need => {
                  const checked = form.specialNeeds.includes(need);
                  return (
                    <button
                      key={need}
                      type="button"
                      onClick={() => handleToggleNeed(need)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                        checked
                          ? `${NEED_BADGE[need]} ring-1 ring-purple-500/50`
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {checked ? '✓ ' : ''}{need}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status message */}
            {formStatus && (
              <div className={`flex items-start space-x-2 p-3 rounded-lg border text-xs ${
                formStatus.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}>
                {formStatus.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{formStatus.msg}</span>
                <button
                  type="button"
                  onClick={() => setFormStatus(null)}
                  className="ml-auto shrink-0 opacity-60 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Request…</span>
                </>
              ) : (
                <>
                  <LifeBuoy className="w-4 h-4" />
                  <span>Submit Rescue Request</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Shelter Grid Overview */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          City Relief Shelters — Live Capacity &amp; Logistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.shelters.map((sh) => {
            const occupancyPct  = Math.round((sh.currentOccupancy / sh.totalCapacity) * 100);
            const isFull        = occupancyPct >= 95 || !sh.isOpen;
            const freeBeds      = sh.totalCapacity - sh.currentOccupancy;
            const isRestockOpen = restockOpen[sh.id] ?? false;

            return (
              <div key={sh.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shadow">

                {/* Shelter name + status badge */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-white text-xs leading-snug">{sh.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border ${
                    isFull
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}>
                    {isFull ? 'FULL' : 'ACCEPTING'}
                  </span>
                </div>

                {/* Large occupancy % */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-3xl font-black leading-none ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {occupancyPct}<span className="text-sm font-normal text-slate-400">%</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Occupied · {freeBeds} beds free</p>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-500">
                    {sh.currentOccupancy} / {sh.totalCapacity}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                  />
                </div>

                {/* Supplies */}
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 space-y-1 text-[10px] font-mono text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-1">
                      <Utensils className="w-3 h-3 text-cyan-500" />
                      <span>Food Packs</span>
                    </span>
                    <span className="text-cyan-400">{sh.supplies.foodPacks}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-1">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <span>Clean Water</span>
                    </span>
                    <span className="text-cyan-400">{sh.supplies.waterLitres} L</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-1">
                      <Stethoscope className="w-3 h-3 text-rose-400" />
                      <span>Med Kits</span>
                    </span>
                    <span className="text-cyan-400">{sh.supplies.medicalKits}</span>
                  </div>
                </div>

                {/* Ward / phone */}
                <div className="text-[10px] text-slate-500 font-mono">
                  Ward: {sh.wardId} · {sh.contactPhone}
                </div>

                {/* Restock panel */}
                <div>
                  <button
                    type="button"
                    onClick={() => setRestockOpen(prev => ({ ...prev, [sh.id]: !isRestockOpen }))}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Package className="w-3.5 h-3.5 text-purple-400" />
                      <span>Restock Supplies</span>
                    </span>
                    {isRestockOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isRestockOpen && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleRestockItem(sh.id, { foodPacks: 50, waterLitres: 0, medicalKits: 0 })}
                        className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[10px] font-bold transition"
                      >
                        <Utensils className="w-3 h-3" />
                        <span>+50 Food</span>
                      </button>
                      <button
                        onClick={() => handleRestockItem(sh.id, { foodPacks: 0, waterLitres: 500, medicalKits: 0 })}
                        className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 text-[10px] font-bold transition"
                      >
                        <Droplets className="w-3 h-3" />
                        <span>+500L H2O</span>
                      </button>
                      <button
                        onClick={() => handleRestockItem(sh.id, { foodPacks: 0, waterLitres: 0, medicalKits: 5 })}
                        className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[10px] font-bold transition"
                      >
                        <Stethoscope className="w-3 h-3" />
                        <span>+5 Kits</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column: Triage Queue & Dispatched */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Queued requests */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <LifeBuoy className="w-4 h-4 text-rose-400" />
              <span>Pending Evacuation Requests ({sortedQueued.length})</span>
            </h3>
            {sortedQueued.some(r => (r.specialNeeds?.length ?? 0) > 0) && (
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-mono">
                Priority Sorted
              </span>
            )}
          </div>

          <div className="space-y-3">
            {sortedQueued.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No unassigned rescue requests in queue.
              </div>
            ) : (
              sortedQueued.map((req) => {
                const hasNeeds = (req.specialNeeds?.length ?? 0) > 0;
                return (
                  <div
                    key={req.id}
                    className={`bg-slate-950 border p-4 rounded-xl space-y-3 ${
                      hasNeeds ? 'border-amber-800/60 ring-1 ring-amber-700/20' : 'border-slate-800'
                    }`}
                  >
                    {/* Name + urgency */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-xs truncate">{req.citizenName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border shrink-0 ${URGENCY_COLOR[req.urgency] ?? URGENCY_COLOR.LOW}`}>
                        {req.urgency}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="text-xs text-slate-300 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{req.householdCount} person(s)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-cyan-400 truncate">{req.location.roadName}</span>
                        {req.location.wardName && (
                          <span className="text-slate-500 text-[10px]">({req.location.wardName})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono text-[11px] text-slate-400">{req.citizenPhone}</span>
                      </div>
                    </div>

                    {/* Special needs badges */}
                    {hasNeeds && (
                      <div className="flex flex-wrap gap-1.5">
                        {req.specialNeeds.map(need => (
                          <span
                            key={need}
                            className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${NEED_BADGE[need] ?? 'bg-slate-800 border-slate-600 text-slate-300'}`}
                          >
                            {need}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Match button */}
                    <button
                      onClick={() => handleMatchShelter(req.id)}
                      disabled={isMatching === req.id}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isMatching === req.id
                          ? 'Calculating Nearest Safe Shelter…'
                          : 'Auto-Match Nearest Available Shelter'}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Assigned / Dispatched / Sheltered */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Assigned Evacuations &amp; Safe Routes ({assignedRequests.length})</span>
          </h3>

          <div className="space-y-3">
            {assignedRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No assignments yet. Match a pending request above.
              </div>
            ) : (
              assignedRequests.map((req) => {
                const matchedShelter = state.shelters.find(s => s.id === req.matchedShelterId);
                const waypointCount  = req.safeRoute?.length ?? 0;
                const estimatedMins  = waypointCount * 4;

                return (
                  <div key={req.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                    {/* Name + status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white truncate">
                        {req.citizenName}
                        <span className="text-slate-400 font-normal ml-1">({req.householdCount} pax)</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border shrink-0 ${STATUS_COLOR[req.status] ?? 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                        {req.status}
                      </span>
                    </div>

                    {/* Special needs badges (assigned cards) */}
                    {(req.specialNeeds?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {req.specialNeeds.map(need => (
                          <span
                            key={need}
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${NEED_BADGE[need] ?? 'bg-slate-800 border-slate-600 text-slate-300'}`}
                          >
                            {need}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Shelter assignment */}
                    <div className="text-slate-400">
                      Shelter:{' '}
                      <span className="text-purple-300 font-bold">
                        {matchedShelter?.name ?? 'Assigned Relief Center'}
                      </span>
                    </div>

                    {/* Route info */}
                    {waypointCount > 0 && (
                      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-mono">
                          <Navigation className="w-3.5 h-3.5 text-purple-400" />
                          <span>{waypointCount} waypoints</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>~{estimatedMins} min ETA</span>
                        </div>
                      </div>
                    )}

                    {/* Show route button */}
                    {req.safeRoute && (
                      <button
                        onClick={() => onShowDetour(req.safeRoute!.map(p => [p.lat, p.lng]))}
                        className="text-cyan-400 hover:text-cyan-300 text-[11px] font-mono flex items-center space-x-1 transition"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Show Safe Evacuation Path on Map</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
