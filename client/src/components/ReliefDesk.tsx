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
  ArrowRight
} from 'lucide-react';
import { AppState, ReliefRequest } from '../types';
import { api } from '../services/api';

interface ReliefDeskProps {
  state: AppState;
  onRefresh: () => void;
  onShowDetour: (path: [number, number][]) => void;
}

export const ReliefDesk: React.FC<ReliefDeskProps> = ({
  state,
  onRefresh,
  onShowDetour,
}) => {
  const [isMatching, setIsMatching] = useState<string | null>(null);

  const handleMatchShelter = async (reqId: string) => {
    try {
      setIsMatching(reqId);
      const res = await api.matchReliefShelter(reqId);
      alert(`Evacuation matched successfully! Assigned to: ${res.result.matchedShelter.name} (${res.result.availableCapacityAfter} beds remaining).`);
      if (res.result.safeRoute) {
        onShowDetour(res.result.safeRoute);
      }
      onRefresh();
    } catch (err: any) {
      alert(`Matching error: ${err.message}`);
    } finally {
      setIsMatching(null);
    }
  };

  const queuedRequests = state.reliefRequests.filter(r => r.status === 'QUEUED');
  const assignedRequests = state.reliefRequests.filter(r => r.status !== 'QUEUED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Relief & Shelter Coordination Desk</h2>
            <p className="text-xs text-slate-400">Match stranded citizens to nearest shelters by capacity, supplies, and safe transit routes.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-3 py-1 bg-purple-950/60 text-purple-300 border border-purple-800/60 rounded-xl">
            {state.shelters.reduce((acc, s) => acc + (s.totalCapacity - s.currentOccupancy), 0)} Total Free Beds
          </span>
        </div>
      </div>

      {/* Shelter Grid Overview */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          City Relief Shelters Live Capacity & Logistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.shelters.map((sh) => {
            const occupancyPct = Math.round((sh.currentOccupancy / sh.totalCapacity) * 100);
            const isFull = occupancyPct >= 95;
            return (
              <div key={sh.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shadow">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-white text-xs leading-snug">{sh.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                    isFull ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {isFull ? 'FULL' : 'OPEN'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Occupancy:</span>
                    <span className="font-bold text-white">{sh.currentOccupancy} / {sh.totalCapacity} ({occupancyPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isFull ? 'bg-rose-500' : 'bg-purple-500'}`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 space-y-1 text-[10px] font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span>🍲 Food Rations:</span>
                    <span className="text-cyan-400">{sh.supplies.foodPacks} packs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💧 Clean Water:</span>
                    <span className="text-cyan-400">{sh.supplies.waterLitres} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🩺 Med Kits:</span>
                    <span className="text-cyan-400">{sh.supplies.medicalKits}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  Ward: {sh.wardId} · {sh.contactPhone}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Triage Queue & Dispatched Evacuations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Stranded Citizens Queue */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <LifeBuoy className="w-4 h-4 text-rose-400" />
              <span>Pending Evacuation Requests ({queuedRequests.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {queuedRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No unassigned rescue requests in queue.
              </div>
            ) : (
              queuedRequests.map((req) => (
                <div key={req.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{req.citizenName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                      {req.urgency}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1">
                    <div>Household: <span className="font-bold text-white">{req.householdCount} person(s)</span></div>
                    <div>Location: <span className="text-cyan-400">{req.location.roadName} ({req.location.wardName})</span></div>
                    {req.specialNeeds && req.specialNeeds.length > 0 && (
                      <div className="text-amber-300 text-[11px]">
                        Needs: {req.specialNeeds.join(', ')}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleMatchShelter(req.id)}
                    disabled={isMatching === req.id}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isMatching === req.id ? 'Calculating Nearest Safe Shelter...' : 'Auto-Match Nearest Available Shelter'}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Sheltered / In-Transit Logistics */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Assigned Evacuations & Safe Routes ({assignedRequests.length})</span>
          </h3>

          <div className="space-y-3">
            {assignedRequests.map((req) => {
              const matchedShelter = state.shelters.find(s => s.id === req.matchedShelterId);
              return (
                <div key={req.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{req.citizenName} ({req.householdCount} pax)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {req.status}
                    </span>
                  </div>

                  <div className="text-slate-400">
                    Assigned Shelter: <span className="text-purple-300 font-bold">{matchedShelter?.name || 'Assigned Relief Center'}</span>
                  </div>

                  {req.safeRoute && (
                    <button
                      onClick={() => onShowDetour(req.safeRoute!.map(p => [p.lat, p.lng]))}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-mono flex items-center space-x-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Show Safe Evacuation Path on Map</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
