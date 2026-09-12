import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  LifeBuoy, 
  Waves, 
  Zap,
  Truck
} from 'lucide-react';
import { UserRole } from './Navbar';
import { api } from '../services/api';

interface QuickDemoRibbonProps {
  onSelectRole: (role: UserRole) => void;
  onRefresh: () => void;
}

export const QuickDemoRibbon: React.FC<QuickDemoRibbonProps> = ({
  onSelectRole,
  onRefresh,
}) => {
  const [runningDemo, setRunningDemo] = useState<string | null>(null);

  const runQuickScenario = async (
    name: string,
    action: () => Promise<void>,
    targetRole: UserRole
  ) => {
    try {
      setRunningDemo(name);
      await action();
      onSelectRole(targetRole);
      onRefresh();
    } catch (err: any) {
      alert(`Demo execution error: ${err.message}`);
    } finally {
      setRunningDemo(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold shrink-0">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs uppercase tracking-wider font-extrabold text-cyan-300">Quick Test Scenarios:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Demo 1: Flood Report */}
          <button
            onClick={() =>
              runQuickScenario(
                'flood',
                async () => {
                  await api.submitReport({
                    hazardType: 'FLOOD',
                    severity: 'HIGH',
                    lat: 6.958,
                    lng: 79.891,
                    roadName: 'Kelani Flood Embankment Road (A1)',
                    imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
                    description: 'Severe flood depth 3ft, stranded vehicles on main corridor.',
                    needsRescue: true,
                    householdCount: 3,
                  });
                },
                'COUNCIL_OFFICER'
              )
            }
            disabled={runningDemo !== null}
            className="flex items-center space-x-2 bg-blue-950/90 hover:bg-blue-900 text-blue-200 border border-blue-700/80 px-3 py-1.5 rounded-xl transition text-xs font-bold shadow"
          >
            <span>🌊 1. Citizen Flood Report</span>
          </button>

          {/* Demo 2: Extreme Sensor Spike */}
          <button
            onClick={() =>
              runQuickScenario(
                'sensor',
                async () => {
                  await api.setSimulationStep(2); // Peak flash flood step
                },
                'COUNCIL_OFFICER'
              )
            }
            disabled={runningDemo !== null}
            className="flex items-center space-x-2 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/80 px-3 py-1.5 rounded-xl transition text-xs font-bold shadow"
          >
            <span>⚡ 2. Storm Sensor Surge</span>
          </button>

          {/* Demo 3: Relief Shelter Allocation */}
          <button
            onClick={() =>
              runQuickScenario(
                'shelter',
                async () => {
                  await api.matchReliefShelter('relief-req-01');
                },
                'RELIEF_DESK'
              )
            }
            disabled={runningDemo !== null}
            className="flex items-center space-x-2 bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-700/80 px-3 py-1.5 rounded-xl transition text-xs font-bold shadow"
          >
            <span>🏠 3. Match Shelter</span>
          </button>

          {/* Demo 4: Field Crew Clearance */}
          <button
            onClick={() =>
              runQuickScenario(
                'crew',
                async () => {
                  await api.resolveTicket('ticket-01', {
                    resolutionPhotoUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
                    resolutionNotes: 'Water de-watered using high volume pumps. Road open.',
                  });
                },
                'FIELD_CREW'
              )
            }
            disabled={runningDemo !== null}
            className="flex items-center space-x-2 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/80 px-3 py-1.5 rounded-xl transition text-xs font-bold shadow"
          >
            <span>🚒 4. Field Crew Resolve</span>
          </button>

          {/* Demo 5: Spam Rejection */}
          <button
            onClick={() =>
              runQuickScenario(
                'spam',
                async () => {
                  await api.submitReport({
                    hazardType: 'FLOOD',
                    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
                    description: 'Meme cat picture test',
                    lat: 6.93,
                    lng: 79.85,
                    roadName: 'Test Road',
                  });
                },
                'CITIZEN'
              )
            }
            disabled={runningDemo !== null}
            className="flex items-center space-x-2 bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-700/80 px-3 py-1.5 rounded-xl transition text-xs font-bold shadow"
          >
            <span>🐱 5. AI Spam Filter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
