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
  Trash2,
  Building2,
  Edit3,
  Save,
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
  CRITICAL: 'bg-rose-950 text-rose-300 border-rose-700 font-bold',
  HIGH:     'bg-orange-950 text-orange-300 border-orange-700 font-bold',
  MEDIUM:   'bg-amber-950 text-amber-300 border-amber-700 font-bold',
  LOW:      'bg-slate-800 text-slate-300 border-slate-600 font-bold',
};

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED:   'bg-indigo-950 text-indigo-300 border-indigo-700 font-bold',
  DISPATCHED: 'bg-amber-950 text-amber-300 border-amber-700 font-bold',
  SHELTERED:  'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold',
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

  // Add Shelter State
  const [addShelterOpen, setAddShelterOpen] = useState(false);
  const [newShelter, setNewShelter] = useState({
    name: '',
    wardId: state.wards[0]?.id || 'ward-01',
    totalCapacity: 200,
    roadName: 'Main Community Road',
    contactPhone: '+94 11 234 5678',
    foodPacks: 300,
    waterLitres: 1500,
    medicalKits: 35,
    blankets: 200,
  });
  const [isCreatingShelter, setIsCreatingShelter] = useState(false);

  const handleCreateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelter.name.trim()) {
      alert('Shelter name is required');
      return;
    }
    try {
      setIsCreatingShelter(true);
      const ward = state.wards.find(w => w.id === newShelter.wardId) || state.wards[0];
      await api.addShelter({
        name: newShelter.name.trim(),
        wardId: newShelter.wardId,
        location: {
          lat: ward ? ward.center[0] : 6.9271,
          lng: ward ? ward.center[1] : 79.8612,
          roadName: newShelter.roadName,
          roadHierarchy: 'ARTERIAL_A1',
          wardId: newShelter.wardId,
          wardName: ward ? ward.name : 'City Ward',
        },
        totalCapacity: Number(newShelter.totalCapacity),
        supplies: {
          foodPacks: Number(newShelter.foodPacks),
          waterLitres: Number(newShelter.waterLitres),
          medicalKits: Number(newShelter.medicalKits),
          blankets: Number(newShelter.blankets),
        },
        contactPhone: newShelter.contactPhone,
        isOpen: true,
      });
      alert(`New shelter "${newShelter.name}" added successfully!`);
      setAddShelterOpen(false);
      setNewShelter({
        name: '',
        wardId: state.wards[0]?.id || 'ward-01',
        totalCapacity: 200,
        roadName: 'Main Community Road',
        contactPhone: '+94 11 234 5678',
        foodPacks: 300,
        waterLitres: 1500,
        medicalKits: 35,
        blankets: 200,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Failed to add shelter: ${err.message}`);
    } finally {
      setIsCreatingShelter(false);
    }
  };

  const handleDeleteShelter = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove shelter "${name}"?`)) return;
    try {
      await api.deleteShelter(id);
      alert(`Shelter "${name}" removed.`);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete shelter: ${err.message}`);
    }
  };

  // Edit Shelter Beds & Resources State
  const [editingShelterId, setEditingShelterId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    totalCapacity: 200,
    currentOccupancy: 0,
    foodPacks: 100,
    waterLitres: 500,
    medicalKits: 10,
    blankets: 50,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleStartEditShelter = (sh: any) => {
    setEditingShelterId(sh.id);
    setEditForm({
      totalCapacity: sh.totalCapacity,
      currentOccupancy: sh.currentOccupancy,
      foodPacks: sh.supplies.foodPacks,
      waterLitres: sh.supplies.waterLitres,
      medicalKits: sh.supplies.medicalKits,
      blankets: sh.supplies.blankets || 0,
    });
  };

  const handleSaveEditShelter = async (id: string) => {
    try {
      setIsSavingEdit(true);
      await api.updateShelter(id, {
        totalCapacity: Number(editForm.totalCapacity),
        currentOccupancy: Number(editForm.currentOccupancy),
        supplies: {
          foodPacks: Number(editForm.foodPacks),
          waterLitres: Number(editForm.waterLitres),
          medicalKits: Number(editForm.medicalKits),
          blankets: Number(editForm.blankets),
        },
      });
      alert('Shelter beds & resources updated successfully!');
      setEditingShelterId(null);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update shelter: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Auto-Detect GPS State & Handler
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const handleAutoDetectGPS = () => {
    setIsDetectingGps(true);
    if (!navigator.geolocation) {
      const mockLat = 6.9344 + (Math.random() - 0.5) * 0.005;
      const mockLng = 79.8428 + (Math.random() - 0.5) * 0.005;
      setForm(f => ({ ...f, lat: Number(mockLat.toFixed(4)), lng: Number(mockLng.toFixed(4)) }));
      setIsDetectingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm(f => ({
          ...f,
          lat: Number(latitude.toFixed(4)),
          lng: Number(longitude.toFixed(4)),
        }));
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('Geolocation restricted or unavailable, applying simulated GPS fix:', err);
        const mockLat = 6.9344 + (Math.random() - 0.5) * 0.005;
        const mockLng = 79.8428 + (Math.random() - 0.5) * 0.005;
        setForm(f => ({ ...f, lat: Number(mockLat.toFixed(4)), lng: Number(mockLng.toFixed(4)) }));
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

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

  // Normalize route coordinate formats safely
  const normalizePath = (path: any): [number, number][] => {
    if (!path || !Array.isArray(path)) return [];
    return path
      .map(p => {
        if (Array.isArray(p)) return [Number(p[0]), Number(p[1])];
        if (p && typeof p === 'object') return [Number(p.lat ?? p[0]), Number(p.lng ?? p[1])];
        return [0, 0];
      })
      .filter(p => !isNaN(p[0]) && !isNaN(p[1]) && (p[0] !== 0 || p[1] !== 0)) as [number, number][];
  };

  // Handlers
  const handleMatchShelter = async (reqId: string) => {
    try {
      setIsMatching(reqId);
      const res = await api.matchReliefShelter(reqId);
      alert(`Evacuation matched! → ${res.result.matchedShelter.name} (${res.result.availableCapacityAfter} beds left).`);
      if (res.result.safeRoute) onShowDetour(normalizePath(res.result.safeRoute));
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-wide">Relief &amp; Shelter Coordination Desk</h2>
              <p className="text-sm text-slate-300 mt-0.5 font-medium">
                Match stranded citizens to nearest shelters by capacity, supplies, and safe transit routes.
              </p>
            </div>
          </div>

          {/* Toggle manual-request form */}
          <button
            onClick={() => { setFormOpen(v => !v); setFormStatus(null); }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-700/40 hover:bg-purple-700/60 border border-purple-500/50 text-purple-200 text-xs sm:text-sm font-bold transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Rescue Request</span>
            {formOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Stats pill row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center shadow">
            <p className="text-xs uppercase tracking-wider text-slate-300 font-mono font-bold">Total Shelters</p>
            <p className="text-2xl font-extrabold text-white mt-1">{state.shelters.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center shadow">
            <p className="text-xs uppercase tracking-wider text-slate-300 font-mono font-bold">Open Shelters</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{openShelters}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center shadow">
            <p className="text-xs uppercase tracking-wider text-slate-300 font-mono font-bold">Free Beds</p>
            <p className="text-2xl font-extrabold text-cyan-400 mt-1">{totalFreeBeds}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center shadow">
            <p className="text-xs uppercase tracking-wider text-slate-300 font-mono font-bold">Pending</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{sortedQueued.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center shadow">
            <p className="text-xs uppercase tracking-wider text-slate-300 font-mono font-bold">Assigned</p>
            <p className="text-2xl font-extrabold text-purple-400 mt-1">{assignedRequests.length}</p>
          </div>
        </div>

        {/* Manual Rescue Request Form (collapsible) */}
        {formOpen && (
          <form
            onSubmit={handleFormSubmit}
            className="border border-purple-700/60 bg-slate-950 rounded-2xl p-5 space-y-4 shadow-lg"
          >
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-300 flex items-center space-x-2 border-b border-slate-800 pb-3">
              <LifeBuoy className="w-5 h-5 text-purple-400" />
              <span>New Manual Rescue Request</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Citizen Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">Citizen Name *</label>
                <input
                  type="text"
                  value={form.citizenName}
                  onChange={e => setForm(f => ({ ...f, citizenName: e.target.value }))}
                  placeholder="e.g. Kasun Perera"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-medium"
                />
              </div>
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">Contact Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={form.citizenPhone}
                    onChange={e => setForm(f => ({ ...f, citizenPhone: e.target.value }))}
                    placeholder="+94 71 234 5678"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-medium"
                  />
                </div>
              </div>
              {/* Household Count */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">Household Count</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min={1}
                    value={form.householdCount}
                    onChange={e => setForm(f => ({ ...f, householdCount: Math.max(1, Number(e.target.value)) }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
                  />
                </div>
              </div>
              {/* City Ward & GPS Auto-Detect Selector */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">
                    City Ward / Location Preset
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoDetectGPS}
                    disabled={isDetectingGps}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                    <span>{isDetectingGps ? 'Locating GPS…' : '📍 Auto-Detect GPS'}</span>
                  </button>
                </div>
                <select
                  onChange={(e) => {
                    const ward = state.wards.find(w => w.id === e.target.value);
                    if (ward) {
                      setForm(f => ({
                        ...f,
                        lat: ward.center[0],
                        lng: ward.center[1],
                        roadName: `${ward.name} Corridor`,
                      }));
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-400 font-medium"
                >
                  <option value="" className="bg-slate-900">-- Choose City Ward to Auto-Fill GPS --</option>
                  {state.wards.map(w => (
                    <option key={w.id} value={w.id} className="bg-slate-900">
                      📍 {w.name} ({w.center[0].toFixed(4)}, {w.center[1].toFixed(4)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Road Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">Road / Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.roadName}
                    onChange={e => setForm(f => ({ ...f, roadName: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-medium"
                  />
                </div>
              </div>

              {/* Lat & Lng Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={e => setForm(f => ({ ...f, lat: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-cyan-300 font-mono font-bold focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={e => setForm(f => ({ ...f, lng: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-cyan-300 font-mono font-bold focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Special Needs checkboxes */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-bold uppercase tracking-wide">Special Needs</label>
              <div className="flex flex-wrap gap-2">
                {ALL_SPECIAL_NEEDS.map(need => {
                  const checked = form.specialNeeds.includes(need);
                  return (
                    <button
                      key={need}
                      type="button"
                      onClick={() => handleToggleNeed(need)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                        checked
                          ? `${NEED_BADGE[need]} ring-1 ring-purple-400`
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
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
              <div className={`flex items-start space-x-2.5 p-3.5 rounded-xl border text-xs font-semibold ${
                formStatus.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-700 text-rose-200'
              }`}>
                {formStatus.type === 'success'
                  ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  : <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />}
                <span>{formStatus.msg}</span>
                <button
                  type="button"
                  onClick={() => setFormStatus(null)}
                  className="ml-auto shrink-0 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition flex items-center justify-center space-x-2.5 shadow-lg shadow-purple-900/40"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Submitting Request…</span>
                </>
              ) : (
                <>
                  <LifeBuoy className="w-5 h-5" />
                  <span>Submit Rescue Request</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Shelter Grid Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
            City Relief Shelters — Live Capacity &amp; Logistics ({state.shelters.length} Shelters)
          </h3>
          <button
            type="button"
            onClick={() => setAddShelterOpen(!addShelterOpen)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>{addShelterOpen ? 'Close Form' : '+ Add New Shelter'}</span>
          </button>
        </div>

        {addShelterOpen && (
          <form onSubmit={handleCreateShelter} className="bg-slate-900 border border-emerald-700/80 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Building2 className="w-5 h-5" />
              <span>Register New City Relief Shelter</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Shelter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal College Sports Complex"
                  value={newShelter.name}
                  onChange={e => setNewShelter(s => ({ ...s, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">City Ward *</label>
                <select
                  value={newShelter.wardId}
                  onChange={e => setNewShelter(s => ({ ...s, wardId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  {state.wards.map(w => (
                    <option key={w.id} value={w.id} className="bg-slate-900">{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Total Bed Capacity</label>
                <input
                  type="number"
                  min={10}
                  value={newShelter.totalCapacity}
                  onChange={e => setNewShelter(s => ({ ...s, totalCapacity: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Road / Address</label>
                <input
                  type="text"
                  value={newShelter.roadName}
                  onChange={e => setNewShelter(s => ({ ...s, roadName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Contact Phone</label>
                <input
                  type="text"
                  value={newShelter.contactPhone}
                  onChange={e => setNewShelter(s => ({ ...s, contactPhone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Initial Food Packs</label>
                <input
                  type="number"
                  value={newShelter.foodPacks}
                  onChange={e => setNewShelter(s => ({ ...s, foodPacks: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAddShelterOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingShelter}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow"
              >
                {isCreatingShelter ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{isCreatingShelter ? 'Saving…' : 'Save New Shelter'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {state.shelters.map((sh) => {
            const occupancyPct  = Math.round((sh.currentOccupancy / sh.totalCapacity) * 100);
            const isFull        = occupancyPct >= 95 || !sh.isOpen;
            const freeBeds      = sh.totalCapacity - sh.currentOccupancy;
            const isRestockOpen = restockOpen[sh.id] ?? false;

            return (
              <div key={sh.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg">

                {/* Shelter name + status badge + delete button */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-base leading-snug">{sh.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{sh.location.roadName}</p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
                      isFull
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {isFull ? 'FULL' : 'ACCEPTING'}
                    </span>
                    <button
                      type="button"
                      title="Edit Beds & Resources"
                      onClick={() => {
                        if (editingShelterId === sh.id) {
                          setEditingShelterId(null);
                        } else {
                          handleStartEditShelter(sh);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition ${
                        editingShelterId === sh.id
                          ? 'bg-purple-900 text-purple-300'
                          : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Remove Shelter"
                      onClick={() => handleDeleteShelter(sh.id, sh.name)}
                      className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingShelterId === sh.id ? (
                  <div className="bg-slate-950 p-4 rounded-xl border border-purple-700/80 space-y-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-purple-300 text-xs">
                      <span>✏️ Edit Beds &amp; Resources</span>
                      <button
                        type="button"
                        onClick={() => setEditingShelterId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-0.5 font-mono">Total Beds</label>
                        <input
                          type="number"
                          value={editForm.totalCapacity}
                          onChange={e => setEditForm(f => ({ ...f, totalCapacity: Number(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5 font-mono">Occupied Beds</label>
                        <input
                          type="number"
                          value={editForm.currentOccupancy}
                          onChange={e => setEditForm(f => ({ ...f, currentOccupancy: Number(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5 font-mono">Food Packs</label>
                        <input
                          type="number"
                          value={editForm.foodPacks}
                          onChange={e => setEditForm(f => ({ ...f, foodPacks: Number(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5 font-mono">Clean Water (L)</label>
                        <input
                          type="number"
                          value={editForm.waterLitres}
                          onChange={e => setEditForm(f => ({ ...f, waterLitres: Number(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5 font-mono">Med Kits</label>
                        <input
                          type="number"
                          value={editForm.medicalKits}
                          onChange={e => setEditForm(f => ({ ...f, medicalKits: Number(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5 font-mono font-sans">Blankets</label>
                        <input
                          type="number"
                          value={editForm.blankets}
                          onChange={e => setEditForm(f => ({ ...f, blankets: Number(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingShelterId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={() => handleSaveEditShelter(sh.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5"
                      >
                        {isSavingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{isSavingEdit ? 'Saving…' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Large occupancy % */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className={`text-4xl font-extrabold leading-none ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {occupancyPct}<span className="text-base font-normal text-slate-400">%</span>
                        </p>
                        <p className="text-xs text-slate-300 font-mono mt-1 font-bold">Occupied · {freeBeds} beds free</p>
                      </div>
                      <div className="text-right text-xs font-mono font-bold text-slate-400">
                        {sh.currentOccupancy} / {sh.totalCapacity}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      />
                    </div>

                    {/* Supplies */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono text-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-1.5">
                          <Utensils className="w-4 h-4 text-cyan-400" />
                          <span>Food Packs</span>
                        </span>
                        <span className="text-cyan-300 font-bold">{sh.supplies.foodPacks}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-1.5">
                          <Droplets className="w-4 h-4 text-blue-400" />
                          <span>Clean Water</span>
                        </span>
                        <span className="text-cyan-300 font-bold">{sh.supplies.waterLitres} L</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-1.5">
                          <Stethoscope className="w-4 h-4 text-rose-400" />
                          <span>Med Kits</span>
                        </span>
                        <span className="text-cyan-300 font-bold">{sh.supplies.medicalKits}</span>
                      </div>
                    </div>

                    {/* Ward / phone */}
                    <div className="text-xs text-slate-400 font-mono">
                      Ward: <span className="text-slate-200 font-bold">{sh.wardId}</span> · {sh.contactPhone}
                    </div>

                    {/* Restock panel */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setRestockOpen(prev => ({ ...prev, [sh.id]: !isRestockOpen }))}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                      >
                        <span className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-purple-400" />
                          <span>Quick Restock</span>
                        </span>
                        {isRestockOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isRestockOpen && (
                        <div className="mt-2.5 grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleRestockItem(sh.id, { foodPacks: 50, waterLitres: 0, medicalKits: 0 })}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold transition shadow"
                          >
                            <Utensils className="w-3.5 h-3.5 text-cyan-400" />
                            <span>+50 Food</span>
                          </button>
                          <button
                            onClick={() => handleRestockItem(sh.id, { foodPacks: 0, waterLitres: 500, medicalKits: 0 })}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-700 text-blue-200 text-xs font-bold transition shadow"
                          >
                            <Droplets className="w-3.5 h-3.5 text-blue-400" />
                            <span>+500L H2O</span>
                          </button>
                          <button
                            onClick={() => handleRestockItem(sh.id, { foodPacks: 0, waterLitres: 0, medicalKits: 5 })}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold transition shadow"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
                            <span>+5 Kits</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column: Triage Queue & Dispatched */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Queued requests */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5">
              <LifeBuoy className="w-5 h-5 text-rose-400" />
              <span>Pending Evacuation Requests ({sortedQueued.length})</span>
            </h3>
            {sortedQueued.some(r => (r.specialNeeds?.length ?? 0) > 0) && (
              <span className="text-xs bg-amber-950 text-amber-300 border border-amber-700 px-2.5 py-0.5 rounded font-mono font-bold">
                Priority Sorted
              </span>
            )}
          </div>

          <div className="space-y-4">
            {sortedQueued.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-400" />
                No unassigned rescue requests in queue.
              </div>
            ) : (
              sortedQueued.map((req) => {
                const hasNeeds = (req.specialNeeds?.length ?? 0) > 0;
                return (
                  <div
                    key={req.id}
                    className={`bg-slate-950 border p-5 rounded-2xl space-y-3.5 shadow ${
                      hasNeeds ? 'border-amber-700/80 ring-1 ring-amber-700/30' : 'border-slate-800'
                    }`}
                  >
                    {/* Name + urgency */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-base truncate">{req.citizenName}</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-mono border shrink-0 ${URGENCY_COLOR[req.urgency] ?? URGENCY_COLOR.LOW}`}>
                        {req.urgency}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="text-sm text-slate-200 space-y-1.5 font-medium">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{req.householdCount} person(s)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-cyan-300 font-bold truncate">{req.location.roadName}</span>
                        {req.location.wardName && (
                          <span className="text-slate-400 text-xs">({req.location.wardName})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-xs text-slate-300 font-bold">{req.citizenPhone}</span>
                      </div>
                    </div>

                    {/* Special needs badges */}
                    {hasNeeds && (
                      <div className="flex flex-wrap gap-2">
                        {req.specialNeeds.map(need => (
                          <span
                            key={need}
                            className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold ${NEED_BADGE[need] ?? 'bg-slate-800 border-slate-600 text-slate-300'}`}
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
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-purple-950/50"
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
          <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Assigned Evacuations &amp; Safe Routes ({assignedRequests.length})</span>
          </h3>

          <div className="space-y-4">
            {assignedRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <Navigation className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-400" />
                No assignments yet. Match a pending request above.
              </div>
            ) : (
              assignedRequests.map((req) => {
                const matchedShelter = state.shelters.find(s => s.id === req.matchedShelterId);
                const waypointCount  = req.safeRoute?.length ?? 0;
                const estimatedMins  = waypointCount * 4;

                return (
                  <div key={req.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 text-sm shadow">
                    {/* Name + status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-base truncate">
                        {req.citizenName}
                        <span className="text-slate-300 font-medium ml-1.5">({req.householdCount} pax)</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border shrink-0 ${STATUS_COLOR[req.status] ?? 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                        {req.status}
                      </span>
                    </div>

                    {/* Special needs badges (assigned cards) */}
                    {(req.specialNeeds?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {req.specialNeeds.map(need => (
                          <span
                            key={need}
                            className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${NEED_BADGE[need] ?? 'bg-slate-800 border-slate-600 text-slate-300'}`}
                          >
                            {need}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Shelter assignment */}
                    <div className="text-slate-300 font-medium">
                      Shelter:{' '}
                      <span className="text-purple-300 font-extrabold text-base">
                        {matchedShelter?.name ?? 'Assigned Relief Center'}
                      </span>
                    </div>

                    {/* Route info */}
                    {waypointCount > 0 && (
                      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
                        <div className="flex items-center space-x-2 text-xs text-slate-200 font-mono font-bold">
                          <Navigation className="w-4 h-4 text-purple-400" />
                          <span>{waypointCount} waypoints</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-emerald-400 font-mono font-bold">
                          <Clock className="w-4 h-4" />
                          <span>~{estimatedMins} min ETA</span>
                        </div>
                      </div>
                    )}

                    {/* Show route button */}
                    {req.safeRoute && (
                      <button
                        onClick={() => onShowDetour(normalizePath(req.safeRoute))}
                        className="text-cyan-400 hover:text-cyan-300 text-xs font-bold font-mono flex items-center space-x-1.5 transition pt-1"
                      >
                        <Compass className="w-4 h-4 text-cyan-400" />
                        <span>Show Safe Evacuation Path on Map</span>
                        <ArrowRight className="w-4 h-4" />
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
