import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  CheckCircle2, 
  Play, 
  ExternalLink, 
  Copy, 
  ShieldAlert, 
  Send, 
  Cpu, 
  Truck, 
  Home, 
  Radio
} from 'lucide-react';
import { UserRole } from './Navbar';

interface TestingGuideModalProps {
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
}

export const TestingGuideModal: React.FC<TestingGuideModalProps> = ({
  onClose,
  onSelectRole,
}) => {
  const [activeTab, setActiveTab] = useState<'MANUAL_STEPS' | 'POSTMAN_API' | 'ARCHITECTURE'>('MANUAL_STEPS');
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurl(id);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  const testSteps = [
    {
      id: 'step-1',
      title: '1. Citizen Reports Flood (6-Stage Pipeline Test)',
      role: 'CITIZEN' as UserRole,
      badge: 'Stages 01 - 05',
      desc: 'Go to Citizen Portal -> click preset "Deep Road Flood" -> toggle "Trapped/Rescue Needed" -> click Submit.',
      expected: 'AI runs 5 checks, assigns CONFIRMED (>80%), closes road, raises council work order, and creates area alert.',
    },
    {
      id: 'step-2',
      title: '2. Spam / Non-Hazard AI Filtering Test',
      role: 'CITIZEN' as UserRole,
      badge: 'Stage 03 Image AI',
      desc: 'In Citizen Portal -> click preset "Non-Hazard / Joke Meme" -> click Submit.',
      expected: 'AI Vision flags non-disaster subject; Aggregator marks REJECTED (<15%); road remains open.',
    },
    {
      id: 'step-3',
      title: '3. Storm Telemetry & Autonomous Sensor Trigger',
      role: 'COUNCIL_OFFICER' as UserRole,
      badge: 'Stage 01 Sensor Inflow',
      desc: 'In the top Storm Stream Replay bar -> click "17:00 Flash Flood (Peak)".',
      expected: 'Rainfall crosses 65mm/h and river level reaches 94% -> pre-emptive sensor alert generated prior to hotline calls.',
    },
    {
      id: 'step-4',
      title: '4. Council Officer AI Inspection & Dispatch',
      role: 'COUNCIL_OFFICER' as UserRole,
      badge: 'Stage 06 Control Desk',
      desc: 'In Council Control -> click "Inspect 5 Checks & AI Rationale" -> review 5 checks -> dispatch emergency squad.',
      expected: 'Work order assigned to field crew with safe route around flooded sector.',
    },
    {
      id: 'step-5',
      title: '5. Field Crew Safe Navigation & Photographic Closure',
      role: 'FIELD_CREW' as UserRole,
      badge: 'Stage 06 Field Crew',
      desc: 'In Field Crew Portal -> view safe detour steps -> click "Complete Job & Clear Public Map".',
      expected: 'Work order marked RESOLVED -> public map pin turns green and road opens to traffic.',
    },
    {
      id: 'step-6',
      title: '6. Relief Desk & Nearest Shelter Capacity Match',
      role: 'RELIEF_DESK' as UserRole,
      badge: 'Stage 06 Relief Desk',
      desc: 'In Relief & Shelters -> click "Auto-Match Nearest Available Shelter" for the stranded family.',
      expected: 'Matches to closest open shelter with free beds -> decrements capacity -> plots safe route.',
    },
    {
      id: 'step-7',
      title: '7. System Admin & AI Continuous Learning Loop',
      role: 'SYSTEM_ADMIN' as UserRole,
      badge: 'Stage 06 Admin & AI Tuning',
      desc: 'In Admin & AI Tuning -> adjust AI confidence slider -> inspect continuous learning feedback log.',
      expected: 'Dynamic rule weights updated in real time; officer override logs visible.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Interactive Testing Guide &amp; Postman API Hub</h3>
              <p className="text-xs text-slate-400">Step-by-step evaluation protocol for CodeArena'26 Topic 04</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('MANUAL_STEPS')}
            className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'MANUAL_STEPS' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Interactive Manual Test Steps</span>
          </button>
          <button
            onClick={() => setActiveTab('POSTMAN_API')}
            className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'POSTMAN_API' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Postman Collection &amp; curl API</span>
          </button>
          <button
            onClick={() => setActiveTab('ARCHITECTURE')}
            className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'ARCHITECTURE' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>6-Stage Flow Mapping</span>
          </button>
        </div>

        {/* Tab 1: Interactive Manual Steps */}
        {activeTab === 'MANUAL_STEPS' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Click <span className="font-bold text-cyan-400">"Go to Screen"</span> on any step to automatically switch to that persona and follow the test instructions:
            </p>

            <div className="space-y-3">
              {testSteps.map((step) => (
                <div
                  key={step.id}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{step.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        {step.badge}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectRole(step.role);
                        onClose();
                      }}
                      className="bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0"
                    >
                      <span>Go to Screen</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300">{step.desc}</p>
                  <div className="text-[11px] text-emerald-400 bg-slate-900 p-2 rounded-xl border border-slate-800/80 font-mono">
                    ✓ Expected: {step.expected}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Postman Collection & API */}
        {activeTab === 'POSTMAN_API' && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 uppercase">Postman Collection Live ID</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Ready in Workspace
                </span>
              </div>
              <p className="text-slate-300">
                A Postman collection has been created in your workspace: <code className="text-cyan-400 font-mono">ResQCity Disaster Response API</code> (Collection UID: <code className="text-white font-mono">57462814-7c6a3105-979d-4260-95dd-ca66f6fc043b</code>).
              </p>
              <div className="text-slate-400 text-[11px]">
                You can also import the local file directly: <code className="text-cyan-300 font-mono">F:\Code-Arena\CodeArena\ResQCity_Postman_Collection.json</code>
              </div>
            </div>

            {/* Sample curl Snippets */}
            <div className="space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-slate-400">Direct curl Test Commands</h4>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>1. Submit Citizen Flood Report (Runs 6-Stage Pipeline):</span>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST http://localhost:3001/api/reports -H "Content-Type: application/json" -d '{"hazardType":"FLOOD","severity":"HIGH","lat":6.958,"lng":79.891,"roadName":"Kelani Embankment","imageUrl":"https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80","description":"Severe flood 3ft deep","needsRescue":true,"householdCount":4}'`, 'c1')}
                    className="text-cyan-400 hover:text-white flex items-center space-x-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCurl === 'c1' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`curl -X POST http://localhost:3001/api/reports \\
  -H "Content-Type: application/json" \\
  -d '{"hazardType":"FLOOD","severity":"HIGH","lat":6.958,"lng":79.891,"roadName":"Kelani Embankment","imageUrl":"https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80","description":"Severe flood 3ft deep","needsRescue":true,"householdCount":4}'`}
                </pre>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>2. Resolve Work Order with Completion Photo:</span>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST http://localhost:3001/api/tickets/ticket-02/resolve -H "Content-Type: application/json" -d '{"resolutionPhotoUrl":"https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80","resolutionNotes":"Road cleared and swept."}'`, 'c2')}
                    className="text-cyan-400 hover:text-white flex items-center space-x-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCurl === 'c2' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`curl -X POST http://localhost:3001/api/tickets/ticket-02/resolve \\
  -H "Content-Type: application/json" \\
  -d '{"resolutionPhotoUrl":"https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80","resolutionNotes":"Road cleared and swept."}'`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 6-Stage Architecture */}
        {activeTab === 'ARCHITECTURE' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-400 block uppercase">01 · Two Ways In</span>
                <p className="text-slate-400">Citizen mobile reports (Photo + GPS) &amp; Live Rainfall/River Sensor Telemetry.</p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-400 block uppercase">02 · Case Builder (SYSTEM)</span>
                <p className="text-slate-400">Maps coordinates to City Wards &amp; Road Hierarchy, queries nearby 200m/3h clusters.</p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-purple-400 block uppercase">03 · Five Checks</span>
                <p className="text-slate-400">Image [AI], Weather [SYSTEM], Cluster [SYSTEM], Location [AI], and Risk [AI].</p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-purple-400 block uppercase">04 · Hazard Aggregator (AI)</span>
                <p className="text-slate-400">Synthesizes all 5 signals into Verdict, Confidence (0-100%), and explainable reasoning.</p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 block uppercase">05 · Four Outcomes</span>
                <p className="text-slate-400">Need More Info loop, Published Public Map, Area Broadcast Alert, and Council Ticket.</p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 block uppercase">06 · People &amp; Feedback Loops</span>
                <p className="text-slate-400">Council Control, Field Crew, Relief Desk, and System Admin with continuous AI learning.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
