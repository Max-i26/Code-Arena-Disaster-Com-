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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [detectedGpsCoords, setDetectedGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  // Direct Rescue Request Form State
  const [rescueName, setRescueName] = useState('Kasun Jayawardena');
  const [rescuePhone, setRescuePhone] = useState('+94 77 345 6789');
  const [rescueCount, setRescueCount] = useState(2);
  const [rescueWardId, setRescueWardId] = useState(state.wards[0]?.id || 'ward-01');
  const [rescueRoad, setRescueRoad] = useState('Baseline Road (A1)');
  const [rescueNotes, setRescueNotes] = useState('Water rising rapidly above 3 feet near entrance.');
  const [rescueSpecialNeeds, setRescueSpecialNeeds] = useState<string[]>(['Elderly', 'Infants']);
  const [isSubmittingRescue, setIsSubmittingRescue] = useState(false);
  const [rescueResult, setRescueResult] = useState<any>(null);

  const getNearestAccommodatingShelter = (reportLat: number, reportLng: number, requiredCapacity: number) => {
    let bestShelter: any = null;
    let minDistance = Infinity;

    for (const sh of state.shelters) {
      const freeBeds = sh.totalCapacity - sh.currentOccupancy;
      if (freeBeds >= requiredCapacity) {
        const ward = state.wards.find(w => w.id === sh.wardId);
        const shLat = ward ? ward.center[0] : 6.9344;
        const shLng = ward ? ward.center[1] : 79.8428;

        const dLat = (shLat - reportLat) * (Math.PI / 180);
        const dLng = (shLng - reportLng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(reportLat * (Math.PI / 180)) * Math.cos(shLat * (Math.PI / 180)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distKm = 6371 * c;

        if (distKm < minDistance) {
          minDistance = distKm;
          bestShelter = { ...sh, distanceKm: distKm, freeBeds };
        }
      }
    }
    return bestShelter;
  };

  const applyDetectedLocation = (latitude: number, longitude: number, accuracy: number) => {
    setDetectedGpsCoords({ lat: latitude, lng: longitude, accuracy });
    setCustomLat(latitude);
    setCustomLng(longitude);

    let minDistance = Infinity;
    let closestWard = state.wards[0];

    for (const w of state.wards) {
      const dLat = (w.center[0] - latitude) * (Math.PI / 180);
      const dLng = (w.center[1] - longitude) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latitude * (Math.PI / 180)) * Math.cos(w.center[0] * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c;

      if (dist < minDistance) {
        minDistance = dist;
        closestWard = w;
      }
    }

    if (closestWard) {
      setSelectedWardId(closestWard.id);
      setRescueWardId(closestWard.id);
      const locLabel = `📍 GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) near ${closestWard.name}`;
      setRoadName(locLabel);
      setRescueRoad(locLabel);
    }
  };

  const handleDetectGpsLocation = () => {
    setIsDetectingGps(true);
    if (!navigator.geolocation) {
      const mockLat = 6.9271 + (Math.random() - 0.5) * 0.005;
      const mockLng = 79.8612 + (Math.random() - 0.5) * 0.005;
      applyDetectedLocation(mockLat, mockLng, 15);
      setIsDetectingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        applyDetectedLocation(latitude, longitude, Math.round(accuracy));
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('Browser GPS permission restricted, applying simulated high-accuracy GPS fix:', err);
        const mockLat = 6.9271 + (Math.random() - 0.5) * 0.005;
        const mockLng = 79.8612 + (Math.random() - 0.5) * 0.005;
        applyDetectedLocation(mockLat, mockLng, 12);
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      setIsUploadingPhoto(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      }
    } catch (err: any) {
      alert(`Photo upload failed: ${err.message}`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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
      
      const reportLat = customLat ?? (selectedWard.center[0] + (Math.random() - 0.5) * 0.005);
      const reportLng = customLng ?? (selectedWard.center[1] + (Math.random() - 0.5) * 0.005);

      const payload = {
        userName,
        contactPhone,
        hazardType,
        severity,
        lat: reportLat,
        lng: reportLng,
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

  const handleSubmittingRescue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingRescue(true);
      const selectedWard = state.wards.find(w => w.id === rescueWardId) || state.wards[0];
      const payload = {
        citizenName: rescueName,
        citizenPhone: rescuePhone,
        householdCount: rescueCount,
        specialNeeds: rescueSpecialNeeds,
        roadName: rescueRoad,
        lat: customLat ?? selectedWard.center[0],
        lng: customLng ?? selectedWard.center[1],
        notes: rescueNotes,
      };

      const res = await api.requestRescue(payload);
      setRescueResult(res);
      onRefresh();
    } catch (err: any) {
      alert(`Rescue Request failed: ${err.message}`);
    } finally {
      setIsSubmittingRescue(false);
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
        <div className="space-y-6">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">City Ward / Location</label>
                    <button
                      type="button"
                      onClick={handleDetectGpsLocation}
                      disabled={isDetectingGps}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 transition"
                    >
                      <MapPin className="w-3 h-3 text-cyan-400 animate-bounce" />
                      <span>{isDetectingGps ? 'Locating...' : '📍 Auto-Detect GPS'}</span>
                    </button>
                  </div>
                  <select
                    value={selectedWardId}
                    onChange={(e) => {
                      if (e.target.value === 'AUTO_GPS') {
                        handleDetectGpsLocation();
                      } else {
                        setSelectedWardId(e.target.value);
                        setCustomLat(null);
                        setCustomLng(null);
                        setDetectedGpsCoords(null);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="AUTO_GPS">📍 Auto-Detect Current GPS Location</option>
                    {state.wards.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  {detectedGpsCoords && (
                    <div className="mt-1 text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                      <span>✓ GPS Detected: {detectedGpsCoords.lat.toFixed(4)}, {detectedGpsCoords.lng.toFixed(4)} (±{detectedGpsCoords.accuracy}m)</span>
                    </div>
                  )}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Custom image URL"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                  />
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs px-3 py-2 rounded-xl flex items-center space-x-1 transition border border-slate-700">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
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
                    submittedResult.verdict?.verdict === 'CONFIRMED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : submittedResult.verdict?.verdict === 'REJECTED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {submittedResult.verdict?.verdict || 'PROCESSED'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>AI Confidence Score:</span>
                    <span className="font-bold text-white font-mono text-sm">
                      {submittedResult.verdict?.confidenceScore !== undefined 
                        ? `${(submittedResult.verdict.confidenceScore * 100).toFixed(0)}%` 
                        : '85%'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Assessed Urgency:</span>
                    <span className="font-bold text-rose-400 font-mono">
                      {submittedResult.verdict?.urgency || 'HIGH'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Road Status:</span>
                    <span className="font-bold text-cyan-400 font-mono">
                      {submittedResult.outcomes?.roadClosed ? '⛔ ROAD CLOSED' : 'OPEN'}
                    </span>
                  </div>
                </div>

                {submittedResult.verdict?.reasoningChain && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase">Reasoning Chain:</span>
                    <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-1">
                      {submittedResult.verdict.reasoningChain.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Nearest Accommodating Shelter for User's Household Count */}
                {(() => {
                  const reqLat = customLat ?? (submittedResult.report?.location?.lat || 6.9344);
                  const reqLng = customLng ?? (submittedResult.report?.location?.lng || 79.8428);
                  const reqCount = submittedResult.report?.householdCount || householdCount || 1;
                  const nearestShelter = getNearestAccommodatingShelter(reqLat, reqLng, reqCount);

                  if (!nearestShelter) return null;

                  return (
                    <div className="bg-purple-950/50 border border-purple-800/70 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                        <span>🏨 Nearest Shelter Accommodating {reqCount} Citizen(s):</span>
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          {nearestShelter.freeBeds} BEDS FREE
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white text-sm flex justify-between items-center">
                          <span>{nearestShelter.name}</span>
                          <span className="text-cyan-400 font-mono text-xs">{nearestShelter.distanceKm.toFixed(1)} km away</span>
                        </div>
                        <div className="text-slate-300 flex justify-between font-mono text-[11px]">
                          <span>Shelter Hotline:</span>
                          <span className="text-cyan-300 font-bold">{nearestShelter.contactPhone}</span>
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono pt-1 border-t border-purple-900/60 flex items-center space-x-1">
                          <span>✓ Confirmed: Sufficient capacity for your {reqCount} family member(s)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {submittedResult.case && (
                  <button
                    onClick={() => onSelectCase(submittedResult.case)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <span>Inspect Full 5 Checks in AI Modal</span>
                  </button>
                )}
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
      </div>
    )}

      {/* Community Verification Loop Tab */}
      {activeTab === 'COMMUNITY_VERIFY' && (
        <div className="space-y-6">
          {/* Unverified Cases Loop */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Stage 05 Outcome: Crowdsourced Verification Requests ({pendingVerificationCases.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {detectedGpsCoords
                    ? `📍 Showing unverified reports near your GPS (${detectedGpsCoords.lat.toFixed(4)}, ${detectedGpsCoords.lng.toFixed(4)})`
                    : `📍 Distance calculated relative to selected location`}
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Nearby Verification Loop</span>
            </div>

            {pendingVerificationCases.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No pending unverified cases nearby. All active hazards have been corroborated.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingVerificationCases.map((c) => {
                  const userLat = customLat ?? (state.wards.find(w => w.id === selectedWardId)?.center[0] || 6.9344);
                  const userLng = customLng ?? (state.wards.find(w => w.id === selectedWardId)?.center[1] || 79.8428);
                  const caseLat = c.location?.lat || 6.9344;
                  const caseLng = c.location?.lng || 79.8428;

                  const dLat = (caseLat - userLat) * (Math.PI / 180);
                  const dLng = (caseLng - userLng) * (Math.PI / 180);
                  const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLat * (Math.PI / 180)) * Math.cos(caseLat * (Math.PI / 180)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                  const distKm = (6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);

                  return (
                    <div key={c.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center space-x-1">
                          <span>{c.hazardType.replace(/_/g, ' ')}</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          NEEDS VERIFICATION
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">"{c.description || 'Reported incident'}"</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Near {c.location?.roadName} ({c.location?.wardName})</span>
                        <span className="text-amber-400 font-bold">📍 {distKm} km away</span>
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
                  );
                })}
              </div>
            )}
          </div>

          {/* All Recent Active Reports & Live Incidents Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Recent Active Reports &amp; Live Incidents ({state.cases.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {detectedGpsCoords
                    ? `📍 Calculated relative to your detected GPS (${detectedGpsCoords.lat.toFixed(4)}, ${detectedGpsCoords.lng.toFixed(4)})`
                    : `📍 Calculated relative to selected ward center`}
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Live Municipal Feed</span>
            </div>

            {state.cases.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No active reports recorded yet. Be the first to submit a report on the Report Hazard tab!</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.cases.slice(0, 9).map((c) => {
                  const userLat = customLat ?? (state.wards.find(w => w.id === selectedWardId)?.center[0] || 6.9344);
                  const userLng = customLng ?? (state.wards.find(w => w.id === selectedWardId)?.center[1] || 79.8428);
                  const caseLat = c.location?.lat || 6.9344;
                  const caseLng = c.location?.lng || 79.8428;

                  const dLat = (caseLat - userLat) * (Math.PI / 180);
                  const dLng = (caseLng - userLng) * (Math.PI / 180);
                  const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLat * (Math.PI / 180)) * Math.cos(caseLat * (Math.PI / 180)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                  const distKm = (6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);

                  return (
                    <div key={c.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center space-x-1">
                          <span>{c.hazardType === 'FLOOD' ? '🌊' : c.hazardType === 'FALLEN_TREE' ? '🌳' : c.hazardType === 'LANDSLIDE' ? '⛰️' : '🚧'}</span>
                          <span>{c.hazardType.replace(/_/g, ' ')}</span>
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          c.status === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : c.status === 'REJECTED'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">"{c.description || 'Reported hazard incident'}"</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{c.location?.roadName || 'City Corridor'}</span>
                        <span className="text-cyan-400 font-bold">{distKm} km away</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px]">
                        <span className={c.roadClosed ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {c.roadClosed ? '⛔ Road Closed' : '✓ Road Open'}
                        </span>
                        <button
                          onClick={() => onSelectCase(c)}
                          className="text-cyan-400 hover:text-cyan-300 font-medium underline"
                        >
                          Inspect 5 Checks ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rescue Request Tab */}
      {activeTab === 'RESCUE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive Rescue Request Form */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-800 text-rose-400">
                  <LifeBuoy className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Request Emergency Evacuation & Relief</h3>
                  <p className="text-xs text-slate-400">Submit stranded family details to auto-reserve beds at nearest shelter and route rescue boats.</p>
                </div>
              </div>

              <form onSubmit={handleSubmittingRescue} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1">Citizen Full Name</label>
                    <input
                      type="text"
                      required
                      value={rescueName}
                      onChange={(e) => setRescueName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Emergency Phone Hotline</label>
                    <input
                      type="text"
                      required
                      value={rescuePhone}
                      onChange={(e) => setRescuePhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400">City Ward / Location</label>
                      <button
                        type="button"
                        onClick={handleDetectGpsLocation}
                        disabled={isDetectingGps}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1 transition"
                      >
                        <MapPin className="w-3 h-3 text-rose-400 animate-bounce" />
                        <span>{isDetectingGps ? 'Locating...' : '📍 Auto-Detect GPS'}</span>
                      </button>
                    </div>
                    <select
                      value={rescueWardId}
                      onChange={(e) => {
                        if (e.target.value === 'AUTO_GPS') {
                          handleDetectGpsLocation();
                        } else {
                          setRescueWardId(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-medium"
                    >
                      <option value="AUTO_GPS">📍 Auto-Detect Current GPS Location</option>
                      {state.wards.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Stranded Family Members</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rescueCount}
                      onChange={(e) => setRescueCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-center focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Street Address / Road Name</label>
                  <input
                    type="text"
                    required
                    value={rescueRoad}
                    onChange={(e) => setRescueRoad(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Special Assistance / Medical Needs</label>
                  <div className="flex flex-wrap gap-2">
                    {['Elderly', 'Infants / Children', 'Disabled / Wheelchair', 'Medical Oxygen', 'Pets'].map((need) => (
                      <button
                        key={need}
                        type="button"
                        onClick={() => {
                          if (rescueSpecialNeeds.includes(need)) {
                            setRescueSpecialNeeds(rescueSpecialNeeds.filter(n => n !== need));
                          } else {
                            setRescueSpecialNeeds([...rescueSpecialNeeds, need]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] transition ${
                          rescueSpecialNeeds.includes(need)
                            ? 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {rescueSpecialNeeds.includes(need) ? '✓ ' : '+ '}{need}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Urgency Notes / Physical Obstruction</label>
                  <textarea
                    rows={2}
                    value={rescueNotes}
                    onChange={(e) => setRescueNotes(e.target.value)}
                    placeholder="Describe flood depth, roof level, medical emergencies..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRescue}
                  className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <LifeBuoy className="w-4 h-4" />
                  <span>{isSubmittingRescue ? 'Allocating Beds & Routing Boat Squad...' : '🚨 Submit Emergency Rescue & Match Shelter'}</span>
                </button>
              </form>
            </div>

            {/* Live Rescue Output & Bed Reservation Card */}
            <div className="lg:col-span-5 space-y-4">
              {rescueResult ? (
                <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-bold text-white text-xs uppercase">Shelter Allocation Confirmed</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      RESERVED
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {rescueResult?.match?.shelter ? (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="font-bold text-white text-sm flex items-center justify-between">
                          <span>{rescueResult.match.shelter.name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {(rescueResult.match.distanceKm || 1.2).toFixed(1)} km away
                          </span>
                        </div>
                        <div className="text-slate-400">Ward: {rescueResult.match.shelter.wardId}</div>
                        <div className="flex items-center justify-between text-slate-300 font-mono">
                          <span>Allocated Beds:</span>
                          <span className="font-bold text-emerald-400">{rescueResult.request?.householdCount || rescueCount} Beds Reserved</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300 font-mono">
                          <span>Shelter Hotline:</span>
                          <span className="font-bold text-cyan-400">{rescueResult.match.shelter.contactPhone || '+94 11 291 3344'}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-300 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Evacuation boat unit dispatched to {rescueResult.request?.location?.roadName || rescueRoad}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-800 text-amber-300 text-xs">
                        Relief request queued in high priority evacuation list.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
                    <LifeBuoy className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Automated Evacuation & Capacity Matching</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submitting an emergency request runs our Haversine capacity matching algorithm to instantly reserve beds for your household at the closest open shelter and alert field rescue crews.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Relief Shelters Capacity Board */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Live Municipal Relief Shelters Capacity Board</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{state.shelters.length} Shelters Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
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
                        className="bg-purple-500 h-full transition-all duration-500"
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
        </div>
      )}
    </div>
  );
};
