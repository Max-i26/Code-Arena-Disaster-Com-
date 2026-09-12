import React, { useState, useCallback } from "react";
import {
  Truck, MapPin, Camera, CheckCircle2, AlertTriangle, Navigation,
  Phone, ShieldCheck, Compass, ListChecks, ExternalLink, ImageOff, History,
} from "lucide-react";
import { AppState, CouncilTicket, HazardType } from "../types";
import { api } from "../services/api";

// --- Equipment Manifest ---

const EQUIPMENT_MANIFEST: Record<HazardType, string[]> = {
  FLOOD: ["Water Pump (1200 GPM)","Hazmat Boots","Life Vests","Sandbags x50","Safety Barriers","Walkie-Talkie"],
  FALLEN_TREE: ["Chainsaw","Safety Goggles","Hard Hat","Winch Truck","Traffic Cones","High-Viz Vest"],
  LANDSLIDE: ["Excavator","Ropes & Harness","Soil Retainer Net","Safety Barriers","First Aid Kit"],
  BLOCKED_DRAIN: ["Drain Snake 40ft","High-Pressure Hose","Protective Gloves","Reflective Signs"],
  DOWNED_POWERLINE: ["Insulated Gloves Class 3","Voltage Detector","Fiberglass Poles","Barrier Tape","Call CEB 1987"],
};

// --- 4-Step Timeline Stepper ---

const TIMELINE_STEPS: Array<CouncilTicket["status"]> = ["OPEN","DISPATCHED","ON_SITE","RESOLVED"];

const STEP_LABELS: Record<CouncilTicket["status"], string> = {
  OPEN: "Open",
  DISPATCHED: "Dispatched",
  ON_SITE: "On-Site",
  RESOLVED: "Resolved",
};

interface TimelineStepperProps {
  currentStatus: CouncilTicket["status"];
}

const TimelineStepper: React.FC<TimelineStepperProps> = ({ currentStatus }) => {
  const currentIdx = TIMELINE_STEPS.indexOf(currentStatus);
  return (
    <div className="flex items-center w-full py-3">
      {TIMELINE_STEPS.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-none">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                  isPast
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : isCurrent
                    ? "bg-emerald-500 border-emerald-400 text-white ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-emerald-500/40"
                    : "bg-slate-800 border-slate-700 text-slate-500"
                }`}
              >
                {isPast ? <CheckCircle2 className="w-4 h-4" /> : <span>{idx + 1}</span>}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-semibold tracking-wide whitespace-nowrap ${
                  isCurrent ? "text-emerald-400" : isPast ? "text-emerald-600" : "text-slate-600"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1.5 mb-4 rounded-full overflow-hidden bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    idx < currentIdx ? "bg-emerald-600 w-full" : "w-0"
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// --- Equipment Checklist ---

interface EquipmentChecklistProps {
  hazardType: HazardType;
}

const EquipmentChecklist: React.FC<EquipmentChecklistProps> = ({ hazardType }) => {
  const items = EQUIPMENT_MANIFEST[hazardType] ?? [];
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggleItem = useCallback((item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  }, []);
  const checkedCount = items.filter((i) => checked[i]).length;

  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
          <ListChecks className="w-4 h-4" />
          <span>Equipment Pre-Check</span>
        </h4>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            checkedCount === items.length
              ? "bg-emerald-950 text-emerald-300 border-emerald-800"
              : "bg-amber-950 text-amber-300 border-amber-800"
          }`}
        >
          {checkedCount} / {items.length} Ready
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <label key={item} className="flex items-center space-x-2.5 cursor-pointer group">
            <div
              onClick={() => toggleItem(item)}
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                checked[item]
                  ? "bg-emerald-600 border-emerald-500"
                  : "bg-slate-900 border-slate-700 group-hover:border-slate-500"
              }`}
            >
              {checked[item] && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className={`text-xs transition-colors ${
                checked[item]
                  ? "text-emerald-400 line-through decoration-emerald-700"
                  : "text-slate-300 group-hover:text-white"
              }`}
            >
              {item}
            </span>
          </label>
        ))}
      </div>
      {checkedCount === items.length && items.length > 0 && (
        <div className="text-[10px] text-emerald-400 font-bold text-center pt-1 border-t border-slate-800">
          ✓ All equipment accounted for — crew ready to deploy!
        </div>
      )}
    </div>
  );
};

// --- Photo Preview ---

interface PhotoPreviewProps {
  url: string;
}

const PhotoPreview: React.FC<PhotoPreviewProps> = ({ url }) => {
  const [errored, setErrored] = useState(false);
  const handleError = useCallback(() => setErrored(true), []);
  React.useEffect(() => { setErrored(false); }, [url]);
  if (!url.trim()) return null;
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
      {errored ? (
        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs p-4">
          <ImageOff className="w-8 h-8 text-slate-600" />
          <span>Preview unavailable — check URL</span>
        </div>
      ) : (
        <img
          src={url}
          alt="Resolution photo preview"
          onError={handleError}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
};

// --- GPS Panel ---

interface GpsPanelProps {
  lat: number;
  lng: number;
}

const GpsPanel: React.FC<GpsPanelProps> = ({ lat, lng }) => {
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
        <MapPin className="w-4 h-4" />
        <span>GPS Site Coordinates</span>
      </h4>
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800">
          <div className="text-slate-500 text-[10px] mb-0.5">LATITUDE</div>
          <div className="text-cyan-300 font-bold">{lat.toFixed(6)}°</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800">
          <div className="text-slate-500 text-[10px] mb-0.5">LONGITUDE</div>
          <div className="text-cyan-300 font-bold">{lng.toFixed(6)}°</div>
        </div>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center space-x-2 w-full bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl py-2 text-xs font-bold transition"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Open in Google Maps</span>
      </a>
    </div>
  );
};

// --- Completed Jobs History ---

interface JobsHistoryProps {
  tickets: AppState["tickets"];
}

const JobsHistory: React.FC<JobsHistoryProps> = ({ tickets }) => {
  const resolved = tickets.filter((t) => t.status === "RESOLVED");
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
        <History className="w-4 h-4 text-emerald-400" />
        <span>Completed Jobs History</span>
        <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-950 text-emerald-300 border-emerald-800">
          {resolved.length} resolved
        </span>
      </h3>
      {resolved.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">
          No resolved tickets yet — completed jobs will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950">
                <th className="text-left text-slate-500 font-semibold px-3 py-2.5 font-mono">ID</th>
                <th className="text-left text-slate-500 font-semibold px-3 py-2.5">Type</th>
                <th className="text-left text-slate-500 font-semibold px-3 py-2.5">Ward</th>
                <th className="text-left text-slate-500 font-semibold px-3 py-2.5">Resolved At</th>
                <th className="text-left text-slate-500 font-semibold px-3 py-2.5">Crew</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((ticket, idx) => (
                <tr
                  key={ticket.id}
                  className={`border-b border-slate-800/60 hover:bg-slate-800/30 transition ${
                    idx % 2 === 0 ? "bg-slate-950/40" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-mono text-emerald-400 font-bold">{ticket.id}</td>
                  <td className="px-3 py-2.5 text-slate-300">{ticket.hazardType.replace("_", " ")}</td>
                  <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{ticket.wardId}</td>
                  <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                    {ticket.resolvedAt
                      ? new Date(ticket.resolvedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">
                    {ticket.assignedCrewName ?? (
                      <span className="text-slate-600 italic">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Main Portal ---

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
  const [selectedCrewId, setSelectedCrewId] = useState<string>(
    state.fieldCrews[0]?.id || "crew-01"
  );
  const [resolutionPhotoUrl, setResolutionPhotoUrl] = useState(
    "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80"
  );
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [isMarkingOnSite, setIsMarkingOnSite] = useState(false);

  const currentCrew = state.fieldCrews.find((c) => c.id === selectedCrewId) || state.fieldCrews[0];
  const assignedTicket = state.tickets.find(
    (t) => t.assignedCrewId === currentCrew?.id && t.status !== "RESOLVED"
  );
  const matchingCase = assignedTicket
    ? state.cases.find((c) => c.id === assignedTicket.caseId)
    : null;

  const handleResolve = async (ticketId: string) => {
    try {
      setIsResolving(ticketId);
      await api.resolveTicket(ticketId, {
        resolutionPhotoUrl,
        resolutionNotes:
          resolutionNotes || "Work order completed. Hazard cleared, road open to traffic.",
      });
      alert("Job marked as RESOLVED! Hazard cleared from live public map and road opened.");
      onRefresh();
    } catch (err: any) {
      alert(`Failed to resolve ticket: ${err.message}`);
    } finally {
      setIsResolving(null);
    }
  };

  const handleMarkOnSite = async () => {
    if (!assignedTicket) return;
    try {
      setIsMarkingOnSite(true);
      await api.submitCaseFeedback(assignedTicket.caseId, "AGREED", "Field crew arrived on site.");
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsMarkingOnSite(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Field Operations &amp; Crew Response Portal</h2>
            <p className="text-xs text-slate-400">Turn-by-turn safe detour routing and verified photographic closure.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Active Unit:</span>
          <select
            value={selectedCrewId}
            onChange={(e) => setSelectedCrewId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            {state.fieldCrews.map((cr) => (
              <option key={cr.id} value={cr.id}>
                {cr.name} ({cr.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Work Order */}
        <div className="lg:col-span-7 space-y-4">
          {assignedTicket ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              {/* Ticket header */}
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

              {/* 4-Step Timeline */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 px-4 pb-2">
                <div className="text-[10px] text-slate-500 font-mono uppercase pt-3 pb-1 tracking-widest">
                  Job Progress
                </div>
                <TimelineStepper currentStatus={assignedTicket.status} />
              </div>

              {/* Mark On-Site Button */}
              {assignedTicket.status === "DISPATCHED" && (
                <button
                  onClick={handleMarkOnSite}
                  disabled={isMarkingOnSite}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-green-700/20 flex items-center justify-center space-x-2 text-xs transition"
                >
                  <Navigation className="w-4 h-4" />
                  <span>
                    {isMarkingOnSite ? "Updating Status..." : "Mark On-Site — Crew Has Arrived"}
                  </span>
                </button>
              )}

              {/* Hazard Info */}
              {matchingCase && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{matchingCase.hazardType.replace("_", " ")}</span>
                    </span>
                    <span className="text-slate-400 font-mono">{matchingCase.location.wardName}</span>
                  </div>
                  <p className="text-slate-300 italic">"{matchingCase.description}"</p>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Site Target:{" "}
                    <span className="text-cyan-400 font-bold">{matchingCase.location.roadName}</span>
                  </div>
                </div>
              )}

              {/* Equipment Checklist */}
              {matchingCase && <EquipmentChecklist hazardType={matchingCase.hazardType} />}

              {/* GPS Coordinates */}
              {matchingCase && (
                <GpsPanel lat={matchingCase.location.lat} lng={matchingCase.location.lng} />
              )}

              {/* Safe Detour Navigation Panel */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase flex items-center space-x-1.5">
                    <Compass className="w-4 h-4" />
                    <span>Safe Navigation &amp; Detour Instructions</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    Bypassing Flooded Sectors
                  </span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  {assignedTicket.detourRoute && assignedTicket.detourRoute.length > 0 ? (
                    assignedTicket.detourRoute.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800"
                      >
                        <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>
                          Step {idx + 1}: {step.instruction}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400">Direct navigation route to site clear.</div>
                  )}
                </div>
              </div>

              {/* Resolution Form */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4" />
                  <span>Upload Resolution Photo to Clear Hazard</span>
                </h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Completion Photo Proof URL</label>
                    <input
                      type="text"
                      value={resolutionPhotoUrl}
                      onChange={(e) => setResolutionPhotoUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                    <PhotoPreview url={resolutionPhotoUrl} />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Crew Action Report &amp; Clearance Notes
                    </label>
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
                  <span>
                    {isResolving === assignedTicket.id
                      ? "Processing Clearance..."
                      : "Complete Job & Clear Public Map"}
                  </span>
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
                {currentCrew?.name ?? "This unit"} is currently idle and available for emergency dispatch.
              </p>
            </div>
          )}
        </div>

        {/* Right: Fleet Overview */}
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
                    ? "bg-slate-950 border-emerald-500 text-white shadow-md"
                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{cr.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      cr.status === "AVAILABLE"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : cr.status === "ON_SITE"
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                        : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {cr.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Specialization: <span className="text-cyan-400">{cr.specialization}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                  <Phone className="w-3 h-3" />
                  <span>{cr.contactPhone}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
            <div className="bg-emerald-950/50 rounded-lg p-2 border border-emerald-900">
              <div className="text-emerald-400 font-bold text-base">
                {state.fieldCrews.filter((c) => c.status === "AVAILABLE").length}
              </div>
              <div className="text-emerald-700">Available</div>
            </div>
            <div className="bg-amber-950/50 rounded-lg p-2 border border-amber-900">
              <div className="text-amber-400 font-bold text-base">
                {state.fieldCrews.filter((c) => c.status === "DISPATCHED").length}
              </div>
              <div className="text-amber-700">Dispatched</div>
            </div>
            <div className="bg-cyan-950/50 rounded-lg p-2 border border-cyan-900">
              <div className="text-cyan-400 font-bold text-base">
                {state.fieldCrews.filter((c) => c.status === "ON_SITE").length}
              </div>
              <div className="text-cyan-700">On-Site</div>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Jobs History */}
      <JobsHistory tickets={state.tickets} />
    </div>
  );
};
