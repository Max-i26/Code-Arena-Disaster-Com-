import React from 'react';
import { 
  ShieldAlert, 
  BookOpen,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';

export type UserRole = 'LANDING' | 'CITIZEN' | 'COUNCIL_OFFICER' | 'FIELD_CREW' | 'RELIEF_DESK' | 'SYSTEM_ADMIN';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeAlertCount: number;
  openTicketCount: number;
  unassignedReliefCount: number;
  onOpenTestingGuide: () => void;
  currentUser: any | null;
  onOpenAuthModal: (role?: UserRole) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeAlertCount,
  openTicketCount,
  unassignedReliefCount,
  onOpenTestingGuide,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {

  return (
    <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-50 shadow-2xl shadow-cyan-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Brand Logo & Title */}
          <button 
            onClick={() => onRoleChange('LANDING')}
            className="flex items-center space-x-3.5 shrink-0 text-left hover:opacity-95 transition group"
          >
            <div className="relative">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/50 group-hover:scale-105 transition-transform duration-200">
                <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-md" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-slate-900"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl sm:text-2xl tracking-wider text-white">
                  RESQ<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">CITY</span>
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-mono font-extrabold tracking-wide">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden md:block font-medium tracking-tight">Urban Flood &amp; Disaster Emergency Engine</p>
            </div>
          </button>

          {/* Active Portal Badge Indicator */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono font-bold text-slate-300 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
            <span className="text-slate-400">ACTIVE PORTAL:</span>
            <span className="text-cyan-300 font-extrabold uppercase tracking-wide">
              {currentRole === 'LANDING' ? 'OVERVIEW' : currentRole.replace('_', ' ')}
            </span>
          </div>

          {/* Actions & User Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-slate-950/90 px-3 py-2 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs sm:text-sm text-white hidden xl:inline truncate max-w-[130px]">{currentUser.fullName}</span>
                  <span className="text-[10px] sm:text-xs font-mono font-extrabold px-2 py-0.5 rounded-md bg-cyan-950/90 text-cyan-300 border border-cyan-800/80 uppercase">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Log out of session"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuthModal()}
                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}

            <button
              onClick={onOpenTestingGuide}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 hover:border-cyan-500/50 px-3.5 py-2.5 rounded-xl font-bold transition shadow-sm text-xs sm:text-sm"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
