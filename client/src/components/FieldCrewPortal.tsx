import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Navigation, 
  Phone,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { AppState, CouncilTicket } from '../types';
import { api } from '../services/api';

interface FieldCrewPortalProps {
  state: AppState;
  onRefresh: () => void;
  onShowDetour: (path: [number, number][]) => void;
}

export const FieldCrewPortal: React.FC<FieldCrewPortalProps> = ({
  state,
  onRefresh,
  onShowDetour,
}) => {
  const [selectedCrewId, setSelectedCrewId] = useState<string>(state.fieldCrews[0]?.id || 'crew-01');
  const [resolutionPhotoUrl, setResolutionPhotoUrl] = useState('https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState<string | null>(null);

  const currentCrew = state.fieldCrews.find(c => c.id === selectedCrewId) || state.fieldCrews[0];
  const assignedTicket = state.tickets.find(t => t.assignedCrewId === currentCrew?.id && t.status !== 'RESOLVED');
  const matchingCase = assignedTicket ? state.cases.find(c => c.id === assignedTicket.caseId) : null;

  const handleResolve = async (ticketId: string) => {
    try {
      setIsResolving(ticketId);
      await api.resolveTicket(ticketId, {
        resolutionPhotoUrl,
        resolutionNotes: resolutionNotes || 'Work order completed. Hazard cleared, road open to traffic.',
      });
      alert('Job marked as RESOLVED! Hazard cleared from live public map and road opened.');
      onRefresh();
    } catch (err: any) {
      alert(`Failed to resolve ticket: ${err.message}`);
    } finally {
      setIsResolving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Crew Profile Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Field Operations & Crew Response Portal</h2>
            <p className="text-xs text-slate-400">Turn-by-turn safe detour routing and verified photographic closure.</p>
          </div>
        </div>

        {/* Crew Switcher */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Active Unit:</span>
          <select
            value={selectedCrewId}
            onChange={(e) => setSelectedCrewId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            {state.fieldCrews.map(cr => (
              <option key={cr.id} value={cr.id}>
                {cr.name} ({cr.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Active Work Order Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          {assignedTicket ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-slate-400 font-mono">Assigned Work Order</span>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>{assignedTicket.id}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-950 text-amber-300 border border-amber-800">
                      {assignedTicket.status}
                    </span>
                  </h3>
                </div>
                <div className="text-right font-mono text-xs text-rose-400 font-bold">
                  Urgency: {assignedTicket.urgency}
                </div>
              </div>

              {/* Hazard Info */}
              {matchingCase && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase">{matchingCase.hazardType.replace('_', ' ')}</span>
                    <span className="text-slate-400 font-mono">{matchingCase.location.wardName}</span>
                  </div>
                  <p className="text-slate-300 italic">"{matchingCase.description}"</p>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Site Target: <span className="text-cyan-400 font-bold">{matchingCase.location.roadName}</span>
                  </div>
                </div>
              )}

              {/* Safe Detour Navigation Panel */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase flex items-center space-x-1.5">
                    <Compass className="w-4 h-4" />
                    <span>Safe Navigation & Detour Instructions</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    Bypassing Flooded Sectors
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {assignedTicket.detourRoute && assignedTicket.detourRoute.length > 0 ? (
                    assignedTicket.detourRoute.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>Step {idx + 1}: {step.instruction}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400">Direct navigation route to site clear.</div>
                  )}
                </div>
              </div>

              {/* Resolution Form (Stage 06 Crew Resolution) */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4" />
                  <span>Upload Resolution Photo to Clear Hazard</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Completion Photo Proof URL</label>
                    <input
                      type="text"
                      value={resolutionPhotoUrl}
                      onChange={(e) => setResolutionPhotoUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Crew Action Report & Clearance Notes</label>
                    <textarea
                      rows={2}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="e.g. Pumped 1,200 gal/min floodwater, cleared fallen banyan branches, flushed road surface."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleResolve(assignedTicket.id)}
                  disabled={isResolving === assignedTicket.id}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 text-xs transition disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isResolving === assignedTicket.id ? 'Processing Clearance...' : 'Complete Job & Clear Public Map'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 shadow-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Unit Standby / Available</h3>
              <p className="text-xs text-slate-400">
                {currentCrew.name} is currently idle and available for emergency dispatch.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Fleet Overview */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>Municipal Emergency Fleet Status</span>
          </h3>

          <div className="space-y-3">
            {state.fieldCrews.map((cr) => (
              <div
                key={cr.id}
                onClick={() => setSelectedCrewId(cr.id)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition space-y-1.5 ${
                  cr.id === selectedCrewId
                    ? 'bg-slate-950 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{cr.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    cr.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {cr.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Specialization: <span className="text-cyan-400">{cr.specialization}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Radio Hotline: {cr.contactPhone}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
