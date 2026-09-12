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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center space-x-2.5">
                <span>AI Hazard Diagnostic & 5-Check Inspector</span>
                <span className={`px-3 py-1 text-xs font-mono font-bold rounded-lg ${
                  verdict.verdict === 'CONFIRMED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : verdict.verdict === 'REJECTED'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {verdict.verdict}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-mono mt-0.5">Case ID: {hazardCase.id} · {hazardCase.location.roadName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregator Overview Banner */}
        <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow">
          <div>
            <span className="text-xs text-slate-300 uppercase font-bold tracking-wider">Confidence Score</span>
            <div className="flex items-center space-x-3 mt-1.5">
              <div className="w-36 bg-slate-800 rounded-full h-3.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    verdict.confidenceScore >= 0.70 ? 'bg-emerald-500' : verdict.confidenceScore >= 0.45 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${verdict.confidenceScore * 100}%` }}
                />
              </div>
              <span className="text-xl font-extrabold font-mono text-white">{(verdict.confidenceScore * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-300 uppercase font-bold tracking-wider">Assessed Urgency</span>
            <div className="text-base font-extrabold text-rose-400 font-mono mt-1">
              {verdict.urgency}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-300 uppercase font-bold tracking-wider">Triggered Outcomes</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {verdict.triggeredOutcomes.map(o => (
                <span key={o} className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {o}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Image Preview if available */}
        {hazardCase.imageUrl && (
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex items-center space-x-4">
            <img 
              src={hazardCase.imageUrl} 
              alt="Hazard visual" 
              className="w-24 h-24 object-cover rounded-xl border border-slate-700 shadow-md flex-shrink-0"
            />
            <div className="flex-1 text-sm space-y-1.5">
              <span className="font-bold text-white">Submitted Photo & Description:</span>
              <p className="text-slate-200 italic">"{hazardCase.description || 'No description provided.'}"</p>
              <div className="text-xs text-slate-400 font-mono">
                Location: {hazardCase.location.lat.toFixed(4)}, {hazardCase.location.lng.toFixed(4)} ({hazardCase.location.wardName})
              </div>
            </div>
          </div>
        )}

        {/* The 5 Parallel Checks List */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            5 Parallel Stage Checks (2 SYSTEM + 3 AI)
          </h4>
          <div className="space-y-2.5">
            {checkItems.map((c) => {
              const Icon = c.icon;
              return (
                <div 
                  key={c.id}
                  className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-start justify-between gap-4 hover:border-slate-700 transition shadow"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${c.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-extrabold text-white">{c.name}</span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          c.isAi 
                            ? 'bg-purple-950 text-purple-300 border-purple-800' 
                            : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                        }`}>
                          {c.engine}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 mt-1 leading-relaxed font-normal">{c.data.summary}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end space-x-1.5">
                      {c.data.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <span className="text-sm font-mono font-extrabold text-white">
                        {(c.data.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      {c.data.passed ? 'PASSED' : 'FLAGGED'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Explainability Reasoning Chain */}
        <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-2.5">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Aggregator Reasoning Chain</span>
          </h4>
          <ul className="space-y-1.5 text-sm text-slate-200 list-disc list-inside leading-relaxed font-normal">
            {verdict.reasoningChain.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Recommended Actions */}
        {verdict.recommendedActions && verdict.recommendedActions.length > 0 && (
          <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Navigation className="w-4 h-4" />
              <span>Recommended Operational Next Steps</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {verdict.recommendedActions.map((act, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200">
                  {act}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Human-In-The-Loop Feedback & AI Retuning Section */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Stage 06 Human Feedback & AI Learning Loop
            </h4>
            <span className="text-xs text-slate-400 font-mono">Council Officer Decision</span>
          </div>

          <input
            type="text"
            placeholder="Add officer inspection notes or rationale for AI retuning..."
            value={officerNotes}
            onChange={(e) => setOfficerNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              onClick={() => handleFeedback('AGREED')}
              disabled={isSubmitting}
              className="flex-1 min-w-[140px] flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-xl transition disabled:opacity-50 shadow"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Confirm AI Diagnosis</span>
            </button>

            <button
              onClick={() => handleFeedback('OVERRIDDEN_VERIFIED')}
              disabled={isSubmitting}
              className="flex-1 min-w-[140px] flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-xl transition disabled:opacity-50 shadow"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Override: Force Verify</span>
            </button>

            <button
              onClick={() => handleFeedback('OVERRIDDEN_REJECTED')}
              disabled={isSubmitting}
              className="flex-1 min-w-[140px] flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-xl transition disabled:opacity-50 shadow"
            >
              <ThumbsDown className="w-4 h-4" />
              <span>Override: Reject &amp; Penalize</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
