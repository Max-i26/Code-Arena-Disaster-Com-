import React from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  CloudRain, 
  Waves, 
  AlertOctagon, 
  Clock,
  Zap
} from 'lucide-react';
import { SensorTelemetry, SimulationState } from '../types';
import { api } from '../services/api';

interface StormSimulatorBarProps {
  simulation: SimulationState;
  sensors: SensorTelemetry[];
  onRefresh: () => void;
}

export const StormSimulatorBar: React.FC<StormSimulatorBarProps> = ({
  simulation,
  sensors,
  onRefresh,
}) => {
  const handleStep = async (stepIndex: number) => {
    try {
      await api.setSimulationStep(stepIndex);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to change step:', err);
    }
  };

  const handleToggle = async () => {
    try {
      await api.toggleSimulationPlay();
      onRefresh();
    } catch (err: any) {
      console.error('Failed to toggle playback:', err);
    }
  };

  const stepNames = [
    '14:00 Clear',
    '15:30 Rain Surge',
    '17:00 Flash Flood (Peak)',
    '19:00 Receding',
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-xs sm:text-sm shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-cyan-950/80 border border-cyan-700/80 px-3 py-1.5 rounded-xl text-cyan-200 font-mono shadow">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Storm Stream Engine:</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
            <button
              onClick={() => handleStep((simulation.currentStepIndex - 1 + simulation.totalSteps) % simulation.totalSteps)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Previous Storm Phase"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggle}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition text-xs ${
                simulation.isAutoPlaying
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              {simulation.isAutoPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Auto Playing</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Auto Play</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleStep((simulation.currentStepIndex + 1) % simulation.totalSteps)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Next Storm Phase"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Step Pills */}
          <div className="hidden sm:flex items-center space-x-1.5">
            {stepNames.map((name, idx) => (
              <button
                key={idx}
                onClick={() => handleStep(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                  simulation.currentStepIndex === idx
                    ? 'bg-cyan-600 text-white shadow-md border border-cyan-400'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Live Sensor Gauges Snapshot */}
        <div className="flex items-center space-x-3 overflow-x-auto">
          {sensors.slice(0, 3).map((s) => {
            const isDanger = s.status === 'DANGER';
            return (
              <div
                key={s.stationId}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                  isDanger
                    ? 'bg-rose-950/80 border-rose-600 text-rose-200 animate-pulse'
                    : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              >
                {s.stationType === 'RAIN_GAUGE' ? (
                  <CloudRain className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Waves className="w-4 h-4 text-blue-400" />
                )}
                <span>{s.stationName.split(' ')[0]}:</span>
                <span className="text-white">
                  {s.stationType === 'RAIN_GAUGE' ? `${s.rainfallRateMmH.toFixed(0)}mm/h` : `${s.riverCapacityPct.toFixed(0)}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
