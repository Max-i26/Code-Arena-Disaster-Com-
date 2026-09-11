import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Binary, 
  MapPin, 
  CloudRain, 
  Layers, 
  Sparkles,
  X,
  Send,
  ThumbsUp,
  ThumbsDown,
  Navigation
} from 'lucide-react';
import { AggregatorVerdict, HazardCase } from '../types';
import { api } from '../services/api';

interface AiCheckModalProps {
  hazardCase: HazardCase | null;
  onClose: () => void;
  onActionComplete: () => void;
}

export const AiCheckModal: React.FC<AiCheckModalProps> = ({
  hazardCase,
  onClose,
  onActionComplete,
}) => {
  if (!hazardCase || !hazardCase.verdictData) return null;

  const [officerNotes, setOfficerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verdict: AggregatorVerdict = hazardCase.verdictData;
  const checks = verdict.checks;

  const handleFeedback = async (action: 'AGREED' | 'OVERRIDDEN_VERIFIED' | 'OVERRIDDEN_REJECTED') => {
    try {
      setIsSubmitting(true);
      await api.submitCaseFeedback(hazardCase.id, action, officerNotes);
      alert(`Decision recorded. Feedback loop logged: ${action}`);
      onActionComplete();
      onClose();
    } catch (err: any) {
      alert(`Error saving feedback: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkItems = [
    {
      id: 'image',
      name: '1. IMAGE CHECK',
      engine: 'AI (Vision Multimodal)',
      isAi: true,
      data: checks.image,
      icon: Sparkles,
      iconColor: 'text-purple-400',
    },
    {
      id: 'weather',
      name: '2. WEATHER CHECK',
      engine: 'SYSTEM (Plain Code Rules)',
      isAi: false,
      data: checks.weather,
      icon: CloudRain,
      iconColor: 'text-cyan-400',
    },
    {
      id: 'cluster',
      name: '3. CLUSTER CHECK',
      engine: 'SYSTEM (200m / 3h Spatial Query)',
      isAi: false,
      data: checks.cluster,
      icon: Layers,
      iconColor: 'text-emerald-400',
    },
    {
      id: 'location',
      name: '4. LOCATION CHECK',
      engine: 'AI (Topography & Scene Alignment)',
      isAi: true,
      data: checks.location,
      icon: MapPin,
      iconColor: 'text-amber-400',
    },
    {
      id: 'risk',
      name: '5. RISK CHECK',
      engine: 'AI (Impact & Arterial Priority)',
      isAi: true,
      data: checks.risk,
      icon: ShieldCheck,
      iconColor: 'text-rose-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>AI Hazard Diagnostic & 5-Check Inspector</span>
                <span className={`px-2 py-0.5 text-xs font-mono rounded-full ${
                  verdict.verdict === 'CONFIRMED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : verdict.verdict === 'REJECTED'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {verdict.verdict}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">Case ID: {hazardCase.id} · {hazardCase.location.roadName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregator Overview Banner */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Confidence Score</span>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-32 bg-slate-800 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    verdict.confidenceScore >= 0.70 ? 'bg-emerald-500' : verdict.confidenceScore >= 0.45 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${verdict.confidenceScore * 100}%` }}
                />
              </div>
              <span className="text-lg font-bold font-mono text-white">{(verdict.confidenceScore * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Assessed Urgency</span>
            <div className="text-sm font-bold text-rose-400 font-mono mt-1">
              {verdict.urgency}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Triggered Outcomes</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {verdict.triggeredOutcomes.map(o => (
                <span key={o} className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {o}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Image Preview if available */}
        {hazardCase.imageUrl && (
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center space-x-4">
            <img 
              src={hazardCase.imageUrl} 
              alt="Hazard visual" 
              className="w-24 h-24 object-cover rounded-lg border border-slate-700 shadow-md"
            />
            <div className="flex-1 text-xs space-y-1">
              <span className="font-semibold text-slate-300">Submitted Photo & Description:</span>
              <p className="text-slate-400 italic">"{hazardCase.description || 'No description provided.'}"</p>
              <div className="text-[11px] text-slate-500 font-mono">
                Location: {hazardCase.location.lat.toFixed(4)}, {hazardCase.location.lng.toFixed(4)} ({hazardCase.location.wardName})
              </div>
            </div>
          </div>
        )}

        {/* The 5 Parallel Checks List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            5 Parallel Stage Checks (2 SYSTEM + 3 AI)
          </h4>
          <div className="space-y-2">
            {checkItems.map((c) => {
              const Icon = c.icon;
              return (
                <div 
                  key={c.id}
                  className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-start justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${c.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{c.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          c.isAi 
                            ? 'bg-purple-950/60 text-purple-300 border-purple-800/50' 
                            : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50'
                        }`}>
                          {c.engine}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{c.data.summary}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end space-x-1">
                      {c.data.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="text-xs font-mono font-bold text-white">
                        {(c.data.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {c.data.passed ? 'PASSED' : 'FLAGGED'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Explainability Reasoning Chain */}
        <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Aggregator Reasoning Chain</span>
          </h4>
          <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
            {verdict.reasoningChain.map((r, idx) => (
              <li key={idx} className="leading-relaxed">{r}</li>
            ))}
          </ul>
        </div>

        {/* Recommended Actions */}
        {verdict.recommendedActions && verdict.recommendedActions.length > 0 && (
          <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Navigation className="w-3.5 h-3.5" />
              <span>Recommended Operational Next Steps</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {verdict.recommendedActions.map((act, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-lg text-xs text-slate-200">
                  {act}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Human-In-The-Loop Feedback & AI Retuning Section */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Stage 06 Human Feedback & AI Learning Loop
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Council Officer Decision</span>
          </div>

          <input
            type="text"
            placeholder="Add officer inspection notes or rationale for AI retuning..."
            value={officerNotes}
            onChange={(e) => setOfficerNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={() => handleFeedback('AGREED')}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Confirm AI Diagnosis</span>
            </button>

            <button
              onClick={() => handleFeedback('OVERRIDDEN_VERIFIED')}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Override: Force Verify</span>
            </button>

            <button
              onClick={() => handleFeedback('OVERRIDDEN_REJECTED')}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>Override: Reject &amp; Penalize</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
