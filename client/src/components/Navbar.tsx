import React from 'react';
import { 
  ShieldAlert, 
  User, 
  Building2, 
  Truck, 
  Home, 
  Settings2, 
  Radio, 
  BookOpen,
  Sparkles
} from 'lucide-react';

export type UserRole = 'CITIZEN' | 'COUNCIL_OFFICER' | 'FIELD_CREW' | 'RELIEF_DESK' | 'SYSTEM_ADMIN';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeAlertCount: number;
  openTicketCount: number;
  unassignedReliefCount: number;
  onOpenTestingGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeAlertCount,
  openTicketCount,
  unassignedReliefCount,
  onOpenTestingGuide,
}) => {
  const roles: { id: UserRole; label: string; icon: any; badge?: number; color: string }[] = [
    {
      id: 'CITIZEN',
      label: 'Citizen Portal',
      icon: User,
      color: 'hover:bg-blue-600/20 text-blue-400',
    },
    {
      id: 'COUNCIL_OFFICER',
      label: 'Council Control',
      icon: Building2,
      badge: openTicketCount,
      color: 'hover:bg-amber-600/20 text-amber-400',
    },
    {
      id: 'FIELD_CREW',
      label: 'Field Crew',
      icon: Truck,
      badge: openTicketCount > 0 ? openTicketCount : undefined,
      color: 'hover:bg-emerald-600/20 text-emerald-400',
    },
    {
      id: 'RELIEF_DESK',
      label: 'Relief & Shelters',
      icon: Home,
      badge: unassignedReliefCount > 0 ? unassignedReliefCount : undefined,
      color: 'hover:bg-purple-600/20 text-purple-400',
    },
    {
      id: 'SYSTEM_ADMIN',
      label: 'Admin & AI Tuning',
      icon: Settings2,
      color: 'hover:bg-slate-600/20 text-slate-300',
    },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-white">RESQ<span className="text-cyan-400">CITY</span></span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                  Topic 04
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Urban Flood & Road Hazard Coordination System</p>
            </div>
          </div>

          {/* Role Navigation Switcher */}
          <nav className="flex items-center space-x-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onRoleChange(r.id)}
                  className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{r.label}</span>
                  {r.badge !== undefined && r.badge > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold leading-none text-white bg-rose-600 rounded-full">
                      {r.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & Guide Button */}
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={onOpenTestingGuide}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-700/60 px-3 py-1.5 rounded-xl font-medium transition shadow"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Testing Guide &amp; Postman</span>
            </button>
            {activeAlertCount > 0 && (
              <div className="hidden xl:flex items-center space-x-1 bg-rose-950/60 text-rose-300 px-2.5 py-1 rounded-full border border-rose-800/60 animate-pulse">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-semibold">{activeAlertCount} Alert{activeAlertCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
