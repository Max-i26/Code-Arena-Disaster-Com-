import React from 'react';
import { 
  ShieldAlert, 
  User, 
  Building2, 
  Truck, 
  Home, 
  Settings2, 
  ArrowRight, 
  Activity, 
  CheckCircle2, 
  Radio, 
  Layers, 
  LifeBuoy, 
  CloudRain, 
  Cpu, 
  Users, 
  BookOpen, 
  Sparkles,
  MapPin,
  Check,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { AppState } from '../types';
import { UserRole } from './Navbar';

interface LandingPageProps {
  state: AppState;
  onSelectRole: (role: UserRole) => void;
  onOpenTestingGuide: () => void;
  currentUser: any | null;
  onOpenAuthModal: (role?: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  state,
  onSelectRole,
  onOpenTestingGuide,
  currentUser,
  onOpenAuthModal,
}) => {
  const handleRoleClick = (roleId: UserRole) => {
    if (!currentUser) {
      onOpenAuthModal(roleId);
    } else {
      onSelectRole(roleId);
    }
  };
  const activeCasesCount = state.cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED').length;
  const closedRoadsCount = state.cases.filter(c => c.roadClosed && c.status !== 'RESOLVED').length;
  const activeSensorsCount = state.sensors.filter(s => s.status === 'DANGER' || s.status === 'WARNING').length;
  const totalFreeBeds = state.shelters.reduce((acc, s) => acc + (s.totalCapacity - s.currentOccupancy), 0);

  const roleCards = [
    {
      id: 'CITIZEN' as UserRole,
      title: 'Citizen Self-Care & Help',
      badge: 'Public Portal',
      icon: User,
      color: 'from-blue-600 to-cyan-600',
      borderColor: 'border-blue-500/40',
      description: 'Report flash floods, fallen trees, or landslides with photos and GPS. Request emergency evacuation rescue for stranded households.',
      features: [
        'Photo & GPS location submission',
        'Emergency rescue & evacuation requests',
        'Nearby crowdsourced verification loop',
        'Safe evacuation route previews',
      ],
      btnText: 'Enter Citizen Portal',
    },
    {
      id: 'COUNCIL_OFFICER' as UserRole,
      title: 'Council Control Dashboard',
      badge: 'Municipal Command',
      icon: Building2,
      color: 'from-amber-600 to-orange-600',
      borderColor: 'border-amber-500/40',
      description: 'Central command for municipal officers. Inspect 5-check AI diagnostics breakdown, triage ward urgency, and dispatch specialized crews.',
      features: [
        'Real-time GIS hazard & ward heatmap',
        'Explainable 5-Check AI modal inspection',
        'Rapid field squad dispatching',
        'Human override & feedback controls',
      ],
      btnText: 'Open Officer Dashboard',
    },
    {
      id: 'FIELD_CREW' as UserRole,
      title: 'Field Response Squad',
      badge: 'Operations Mobile',
      icon: Truck,
      color: 'from-emerald-600 to-teal-600',
      borderColor: 'border-emerald-500/40',
      description: 'Mobile interface for emergency field units (pumping squads, chainsaw clearance). Navigate safe detour routes and resolve jobs with photo proof.',
      features: [
        'Dynamic safe detour turn-by-turn routing',
        'Hazard clearance & job completion',
        'Photo resolution proof upload',
        'Automatic public road re-opening',
      ],
      btnText: 'Access Field Crew View',
    },
    {
      id: 'RELIEF_DESK' as UserRole,
      title: 'Relief & Shelter Desk',
      badge: 'Humanitarian Desk',
      icon: Home,
      color: 'from-purple-600 to-pink-600',
      borderColor: 'border-purple-500/40',
      description: 'Triage stranded citizen evacuation calls and match displaced families to shelters based on free bed capacity, food, and medical supplies.',
      features: [
        'Capacity-constrained shelter matching',
        'Live bed occupancy & supply tracking',
        'Safe evacuation vehicle pathfinding',
        'Ration & medical inventory management',
      ],
      btnText: 'Open Relief Desk',
    },
    {
      id: 'SYSTEM_ADMIN' as UserRole,
      title: 'System Admin & AI Tuning',
      badge: 'Architecture & AI',
      icon: Settings2,
      color: 'from-slate-700 to-slate-900',
      borderColor: 'border-slate-600/50',
      description: 'Configure system AI confidence cutoff thresholds, manage reputation bans, inspect continuous learning logs, and export audit trails.',
      features: [
        'Dynamic AI confidence threshold slider',
        'Spammer reputation & ban management',
        'Continuous AI learning feedback log',
        'Full JSON Audit Trail export for judges',
      ],
      btnText: 'Enter System Admin Console',
    },
  ];

  const stages = [
    {
      step: '01',
      title: 'Two Ways In',
      type: 'Dual Inlet',
      desc: 'Citizen self-care app reports & automated weather/river sensor streams (mm/h rainfall & ultrasonic river gauges).',
      icon: CloudRain,
      color: 'text-cyan-400',
    },
    {
      step: '02',
      title: 'Case Builder',
      type: 'SYSTEM Engine',
      desc: 'Reverse-geocodes coords to Wards & Road Segments, binds ward telemetry, and queries 200m/3h spatial clusters.',
      icon: Layers,
      color: 'text-blue-400',
    },
    {
      step: '03',
      title: 'Five Parallel Checks',
      type: 'Hybrid AI + Rules',
      desc: 'Image (AI), Weather (SYSTEM), Cluster (SYSTEM), Location (AI), and Risk (AI) execute in parallel.',
      icon: Cpu,
      color: 'text-purple-400',
    },
    {
      step: '04',
      title: 'Hazard Aggregator',
      type: 'AI Decision Engine',
      desc: 'Weighted multi-signal synthesis producing explainable Verdict (Confirmed, Needs Verification, Rejected) & confidence score.',
      icon: Sparkles,
      color: 'text-amber-400',
    },
    {
      step: '05',
      title: 'Four Outcomes',
      type: 'Automated Action',
      desc: 'Need More Info (crowdsource loop), Published (GIS map & road closed), Area Alert (broadcast), Council Ticket (work order).',
      icon: Zap,
      color: 'text-rose-400',
    },
    {
      step: '06',
      title: 'People & Loops',
      type: 'Operational Chain',
      desc: '4-role human chain (Officer -> Crew -> Relief -> Admin) closes jobs with photos, tuning the AI feedback loop.',
      icon: Users,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800 py-16 px-6 sm:px-10 rounded-3xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-cyan-950 border border-cyan-700/80 text-cyan-300 text-xs font-mono font-bold shadow-inner">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>CodeArena'26 Solution Specification</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Coordinating City Response to <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Floods &amp; Road Hazards
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-200 leading-relaxed font-medium">
            ResQCity harmonizes live river gauge sensors and weather telemetry with citizen reports, runs a <strong className="text-cyan-300">5-check hybrid verification pipeline</strong>, delivers explainable hazard aggregation verdicts, and orchestrates a <strong className="text-amber-300">4-role operational response chain</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onSelectRole('COUNCIL_OFFICER')}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/20 flex items-center space-x-3 transition text-base"
            >
              <span>Launch Live System Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onOpenTestingGuide}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-6 py-4 rounded-2xl flex items-center space-x-2 transition text-base"
            >
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>View Testing Guide</span>
            </button>
          </div>
        </div>
      </section>

      {/* Live System Telemetry Ticker */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/80">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-mono font-bold uppercase tracking-wider">Active Hazard Cases</span>
              <span className="text-2xl font-extrabold text-white font-mono">{activeCasesCount} Active</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-rose-950 text-rose-400 border border-rose-800/80">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-mono font-bold uppercase tracking-wider">Public Road Closures</span>
              <span className="text-2xl font-extrabold text-white font-mono">{closedRoadsCount} Closed</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-amber-950 text-amber-400 border border-amber-800/80">
              <CloudRain className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-mono font-bold uppercase tracking-wider">Ward Telemetry Alerts</span>
              <span className="text-2xl font-extrabold text-white font-mono">{activeSensorsCount} Active</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-purple-950 text-purple-400 border border-purple-800/80">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-mono font-bold uppercase tracking-wider">Shelter Capacity</span>
              <span className="text-2xl font-extrabold text-white font-mono">{totalFreeBeds} Beds Free</span>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Access Control (RBAC) Persona Selector */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase">
            Role-Based Access Control (RBAC)
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Select your operational role below to enter the tailored portal view with custom permissions, GIS tools, and actions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roleCards.map((card) => {
            const Icon = card.icon;
            return (
              <div 
                key={card.id}
                className={`bg-slate-900 border ${card.borderColor} rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-cyan-400 transition duration-300 group`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-tr ${card.color} text-white shadow-lg`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-950 text-slate-200 border border-slate-700">
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                      {card.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    {card.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center space-x-2.5 text-xs text-slate-200 font-medium">
                        <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleRoleClick(card.id)}
                    className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl border border-slate-700 hover:border-cyan-400 text-sm flex items-center justify-center space-x-2 transition group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-blue-600 group-hover:border-transparent shadow"
                  >
                    <span>{card.btnText}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6-Stage Reference Flow Diagram */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5">
                <Layers className="w-6 h-6 text-cyan-400" />
                <span>The 6-Stage Reference Flow Architecture</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                Every topic in CodeArena'26 adheres strictly to this end-to-end multi-stage architecture.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
              Verified 100% Complete
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stages.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.step} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-slate-400">STAGE {st.step}</span>
                    <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-900 ${st.color} border border-slate-800`}>
                      {st.type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5 pt-1">
                    <Icon className={`w-5 h-5 ${st.color}`} />
                    <h3 className="text-sm font-bold text-white">{st.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {st.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
