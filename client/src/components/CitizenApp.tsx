import React, { useState } from 'react';
import { 
  Camera, 
  MapPin, 
  AlertCircle, 
  Send, 
  HelpCircle, 
  CheckCircle2, 
  Radio, 
  Navigation,
  LifeBuoy,
  Users,
  Shield,
  Sparkles
} from 'lucide-react';
import { AppState, HazardCase, HazardType, SeverityLevel } from '../types';
import { api } from '../services/api';

interface CitizenAppProps {
  state: AppState;
  onRefresh: () => void;
  onSelectCase: (c: HazardCase) => void;
}

export const CitizenApp: React.FC<CitizenAppProps> = ({
  state,
  onRefresh,
  onSelectCase,
}) => {
  const [activeTab, setActiveTab] = useState<'REPORT' | 'RESCUE' | 'COMMUNITY_VERIFY'>('REPORT');
  
  // Hazard Report Form State
  const [hazardType, setHazardType] = useState<HazardType>('FLOOD');
  const [severity, setSeverity] = useState<SeverityLevel>('HIGH');
  const [selectedWardId, setSelectedWardId] = useState(state.wards[0]?.id || 'ward-01');
  const [roadName, setRoadName] = useState('Baseline Road (A1)');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80');
  const [needsRescue, setNeedsRescue] = useState(false);
  const [householdCount, setHouseholdCount] = useState(1);
  const [userName, setUserName] = useState('Kasun Jayawardena');
  const [contactPhone, setContactPhone] = useState('+94 77 345 6789');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  // Mock Photo Options
  const samplePhotos = [
    {
      label: '🌊 Deep Road Flood (Severe)',
      url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      type: 'FLOOD',
    },
    {
      label: '🌳 Fallen Tree on Road',
      url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
      type: 'FALLEN_TREE',
    },
    {
      label: '⛰️ Mud / Landslide Blockage',
      url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      type: 'LANDSLIDE',
    },
    {
      label: '🐱 Non-Hazard / Joke Meme (AI Rejection Test)',
      url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
      type: 'FLOOD',
    },
  ];

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const selectedWard = state.wards.find(w => w.id === selectedWardId) || state.wards[0];
      
      const payload = {
        userName,
        contactPhone,
        hazardType,
        severity,
        lat: selectedWard.center[0] + (Math.random() - 0.5) * 0.01,
        lng: selectedWard.center[1] + (Math.random() - 0.5) * 0.01,
        roadName,
        imageUrl,
        description,
        needsRescue,
        householdCount,
      };

      const result = await api.submitReport(payload);
      setSubmittedResult(result);
      onRefresh();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNearbyVerify = async (caseId: string, confirmed: boolean) => {
    try {
      await api.verifyCase(caseId, {
        userId: 'citizen-current-user',
        confirmed,
        note: confirmed ? 'Confirmed by nearby citizen: water is actively accumulating.' : 'False report: road is clear.',
      });
      alert(confirmed ? 'Thank you! Your verification helped confirm this alert.' : 'Thank you! Community feedback recorded.');
      onRefresh();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  // Pending cases needing community verification
  const pendingVerificationCases = state.cases.filter(c => c.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Citizen View Mode Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Citizen Self-Care & Emergency Channel</h2>
            <p className="text-xs text-slate-400">Report flash floods, blocked roads, or request emergency evacuation.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => { setActiveTab('REPORT'); setSubmittedResult(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'REPORT' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Report Hazard
          </button>
          <button
            onClick={() => setActiveTab('RESCUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'RESCUE' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Request Rescue & Relief
          </button>
          <button
            onClick={() => setActiveTab('COMMUNITY_VERIFY')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'COMMUNITY_VERIFY' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Verify Nearby ({pendingVerificationCases.length})
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'REPORT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submission Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Submit Hazard Report (Photo + GPS Location)</span>
            </h3>

            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Hazard Category</label>
                  <select
                    value={hazardType}
                    onChange={(e) => setHazardType(e.target.value as HazardType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FLOOD">🌊 Urban Flooding / Waterlogging</option>
                    <option value="FALLEN_TREE">🌳 Fallen Tree Obstruction</option>
                    <option value="LANDSLIDE">⛰️ Landslide / Mudflow</option>
                    <option value="BLOCKED_DRAIN">🚧 Blocked Storm Drain / Culvert</option>
                    <option value="DOWNED_POWERLINE">⚡ Downed Electric Powerline</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">City Ward / Location</label>
                  <select
                    value={selectedWardId}
                    onChange={(e) => setSelectedWardId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {state.wards.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Street / Road Name</label>
                <input
                  type="text"
                  required
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  placeholder="e.g. Baseline Road, Near Kelani Bridge"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Photo Selector */}
              <div>
                <label className="text-slate-400 block mb-1">Attach Photo Proof (Choose preset or enter URL)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {samplePhotos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageUrl(p.url);
                        setHazardType(p.type as HazardType);
                      }}
                      className={`text-left p-2 rounded-xl border text-[11px] transition flex items-center space-x-2 ${
                        imageUrl === p.url
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <img src={p.url} alt="" className="w-8 h-8 rounded object-cover" />
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Custom image URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Detailed Situation Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe flood depth, blocked lanes, stalled vehicles, rising water..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Rescue Checkbox */}
              <div className="bg-rose-950/30 border border-rose-900/40 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <LifeBuoy className="w-5 h-5 text-rose-400" />
                  <div>
                    <span className="font-bold text-white block">Are you trapped or in need of immediate evacuation?</span>
                    <span className="text-[11px] text-slate-400">Routes rescue boat/pump squad and matches to nearest shelter with beds.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={needsRescue}
                  onChange={(e) => setNeedsRescue(e.target.checked)}
                  className="w-5 h-5 rounded border-rose-800 text-rose-600 focus:ring-0"
                />
              </div>

              {needsRescue && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Household members stranded:</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={householdCount}
                    onChange={(e) => setHouseholdCount(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Running 5-Check AI Pipeline...' : 'Submit Hazard to ResQCity Engine'}</span>
              </button>
            </form>
          </div>

          {/* Submission Pipeline Output Preview */}
          <div className="lg:col-span-5 space-y-4">
            {submittedResult ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-bold text-white text-xs uppercase">Instant Pipeline Diagnostic</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    submittedResult.verdict.verdict === 'CONFIRMED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : submittedResult.verdict.verdict === 'REJECTED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {submittedResult.verdict.verdict}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>AI Confidence Score:</span>
                    <span className="font-bold text-white font-mono text-sm">{(submittedResult.verdict.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Assessed Urgency:</span>
                    <span className="font-bold text-rose-400 font-mono">{submittedResult.verdict.urgency}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Road Status:</span>
                    <span className="font-bold text-cyan-400 font-mono">
                      {submittedResult.outcomes.roadClosed ? '⛔ ROAD CLOSED' : 'OPEN'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase">Reasoning Chain:</span>
                  <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-1">
                    {submittedResult.verdict.reasoningChain.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onSelectCase(submittedResult.case)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
                >
                  <span>Inspect Full 5 Checks in AI Modal</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">Real-time Automated Pipeline</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When you submit a report, our backend joins local rainfall/river telemetry, runs 5 parallel AI & System checks, aggregates multi-signal verdicts, and instantly publishes road closures and rescue tickets.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community Verification Loop Tab */}
      {activeTab === 'COMMUNITY_VERIFY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Stage 05 Outcome: Crowdsourced Verification Requests ({pendingVerificationCases.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Loop back to nearby citizens</span>
          </div>

          {pendingVerificationCases.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No pending unverified cases nearby. All active hazards have been corroborated.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingVerificationCases.map((c) => (
                <div key={c.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{c.hazardType.replace('_', ' ')}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      NEEDS VERIFICATION
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">"{c.description || 'Reported incident'}"</p>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Near {c.location.roadName} ({c.location.wardName})
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleNearbyVerify(c.id, true)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-medium transition"
                    >
                      ✓ Confirm Hazard
                    </button>
                    <button
                      onClick={() => handleNearbyVerify(c.id, false)}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-1.5 rounded-lg text-xs font-medium transition"
                    >
                      ✗ False Alarm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rescue Request Tab */}
      {activeTab === 'RESCUE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-950 border border-rose-800 text-rose-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase">Emergency Evacuation & Shelter Coordination</h3>
              <p className="text-xs text-slate-400">Direct link to municipal relief coordinator and rescue boat teams.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {state.shelters.map((sh) => (
              <div key={sh.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs">{sh.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    OPEN
                  </span>
                </div>
                <div className="text-xs text-slate-400">Ward: {sh.wardId}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300 font-mono">
                    <span>Available Capacity:</span>
                    <span className="font-bold text-emerald-400">{sh.totalCapacity - sh.currentOccupancy} Beds Free</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full"
                      style={{ width: `${(sh.currentOccupancy / sh.totalCapacity) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Hotline: {sh.contactPhone}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
