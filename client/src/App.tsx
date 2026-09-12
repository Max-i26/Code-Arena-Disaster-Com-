import React, { useEffect, useState, useCallback } from 'react';
import { Lock, ShieldAlert, LogIn, UserX, Clock } from 'lucide-react';
import { Navbar, UserRole } from './components/Navbar';
import { QuickDemoRibbon } from './components/QuickDemoRibbon';
import { MapComponent } from './components/MapComponent';
import { CitizenApp } from './components/CitizenApp';
import { CouncilDashboard } from './components/CouncilDashboard';
import { FieldCrewPortal } from './components/FieldCrewPortal';
import { ReliefDesk } from './components/ReliefDesk';
import { SystemAdmin } from './components/SystemAdmin';
import { LandingPage } from './components/LandingPage';
import { AiCheckModal } from './components/AiCheckModal';
import { TestingGuideModal } from './components/TestingGuideModal';
import { AuthModal } from './components/AuthModal';
import { AppState, HazardCase } from './types';
import { api } from './services/api';

export function App() {
  const [role, setRole] = useState<UserRole>('LANDING');
  const [state, setState] = useState<AppState | null>(null);
  const [selectedCaseForModal, setSelectedCaseForModal] = useState<HazardCase | null>(null);
  const [isTestingGuideOpen, setIsTestingGuideOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('resqcity_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('resqcity_token') || null;
  });

  const [activeDetourPath, setActiveDetourPath] = useState<[number, number][] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthSuccess = (user: any, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('resqcity_user', JSON.stringify(user));
    localStorage.setItem('resqcity_token', token);
    setIsAuthModalOpen(false);
    if (user.role) {
      setRole(user.role as UserRole);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) { }
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('resqcity_user');
    localStorage.removeItem('resqcity_token');
    setRole('LANDING');
  };

  const fetchState = useCallback(async () => {
    try {
      const data = await api.getState();
      setState(data);
    } catch (err) {
      console.error('Error fetching state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          console.log('[Live Stream Event]', parsed.type);
          fetchState();
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };
    } catch (err) {
      console.warn('WebSocket connection fallback:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [fetchState]);

  if (isLoading || !state) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4 font-mono relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/30 relative z-10" />
        <div className="text-center relative z-10 space-y-1">
          <p className="text-base font-bold text-slate-200 tracking-wide uppercase">ResQCity Urban Response Engine</p>
          <p className="text-xs text-slate-400">Loading live telemetry and municipal spatial grid...</p>
        </div>
      </div>
    );
  }

  const activeAlertCount = state.cases.filter(c => c.broadcastSent && c.status !== 'RESOLVED').length;
  const openTicketCount = state.tickets.filter(t => t.status === 'OPEN' || t.status === 'DISPATCHED').length;
  const unassignedReliefCount = state.reliefRequests.filter(r => r.status === 'QUEUED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient background glow orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/2 left-3/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Top Role-Switching Navbar */}
      <Navbar
        currentRole={role}
        onRoleChange={setRole}
        activeAlertCount={activeAlertCount}
        openTicketCount={openTicketCount}
        unassignedReliefCount={unassignedReliefCount}
        onOpenTestingGuide={() => setIsTestingGuideOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 1-Click Test Scenarios Ribbon */}
      <QuickDemoRibbon
        onSelectRole={setRole}
        onRefresh={fetchState}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {role === 'LANDING' ? (
          <LandingPage
            state={state}
            onSelectRole={setRole}
            onOpenTestingGuide={() => setIsTestingGuideOpen(true)}
            currentUser={currentUser}
            onOpenAuthModal={(r) => setIsAuthModalOpen(true)}
          />
        ) : !currentUser ? (
          /* 1. Unauthenticated Login Lock Banner */
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-cyan-950/20 text-center max-w-xl mx-auto space-y-6 animate-in fade-in my-10 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">Authentication Required</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                You must sign in or register to access the <span className="text-cyan-300 font-bold font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">{role.replace('_', ' ')}</span> portal and interact with disaster response features.
              </p>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-7 py-3.5 rounded-xl shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2.5 mx-auto text-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register Account</span>
            </button>
          </div>
        ) : currentUser.verificationStatus === 'PENDING' ? (
          /* 2. Pending Admin Verification Lock Banner */
          <div className="bg-slate-900/80 backdrop-blur-xl border border-amber-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-amber-950/20 text-center max-w-xl mx-auto space-y-6 animate-in fade-in my-10 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">Account Verification Pending</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Welcome, <span className="text-white font-bold">{currentUser.fullName}</span>! Your official <span className="text-amber-300 font-bold font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50">{currentUser.role.replace('_', ' ')}</span> account is currently <span className="text-amber-400 font-extrabold">PENDING</span> System Admin verification.
              </p>
              <p className="text-xs text-slate-400 font-mono">
                NIC #: <span className="text-cyan-300 font-bold">{currentUser.nicNumber || 'Submitted'}</span> | System Administrator is inspecting your uploaded NIC proof.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={fetchState}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold px-6 py-3 rounded-xl shadow-xl flex items-center justify-center space-x-2 text-xs transition"
              >
                <span>Check Verification Status</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-3 rounded-xl shadow text-xs transition"
              >
                <span>Log Out</span>
              </button>
            </div>
          </div>
        ) : currentUser.role !== role ? (
          /* 3. Role Permission Lock Banner */
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-amber-950/20 text-center max-w-xl mx-auto space-y-6 animate-in fade-in my-10 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">Role Permission Restricted</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                You are currently signed in as <span className="text-white font-bold">{currentUser.fullName}</span> (<span className="text-cyan-400 font-mono font-bold">{currentUser.role}</span>). Accessing the <span className="text-amber-300 font-bold font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50">{role.replace('_', ' ')}</span> portal requires matching system privileges.
              </p>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold px-7 py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2.5 mx-auto text-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <UserX className="w-4 h-4" />
              <span>Switch Account / Sign In as {role.replace('_', ' ')}</span>
            </button>
          </div>
        ) : (
          /* 3. Authenticated & Authorized Portal View */
          <>
            {/* Interactive GIS City Map Section */}
            <section className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
                    <span>Live Municipal GIS Hazard &amp; Safe Route Map</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">Showing confirmed flood cordons, road closures, telemetry sensors, and relief centers.</p>
                </div>
                {activeDetourPath && (
                  <button
                    onClick={() => setActiveDetourPath(undefined)}
                    className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 font-mono underline bg-cyan-950/60 border border-cyan-800/50 px-3 py-1.5 rounded-lg transition"
                  >
                    Clear Active Detour Route
                  </button>
                )}
              </div>

              <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-slate-800">
                <MapComponent
                  wards={state.wards}
                  cases={state.cases}
                  sensors={state.sensors}
                  shelters={state.shelters}
                  crews={state.fieldCrews}
                  activeDetourPath={activeDetourPath}
                  onSelectCase={(c) => setSelectedCaseForModal(c)}
                />
              </div>
            </section>

            {/* Dynamic Persona Views */}
            <section>
              {role === 'CITIZEN' && (
                <CitizenApp
                  state={state}
                  onRefresh={fetchState}
                  onSelectCase={(c) => setSelectedCaseForModal(c)}
                />
              )}

              {role === 'COUNCIL_OFFICER' && (
                <CouncilDashboard
                  state={state}
                  onRefresh={fetchState}
                  onSelectCase={(c) => setSelectedCaseForModal(c)}
                  onShowDetour={(path) => setActiveDetourPath(path)}
                />
              )}

              {role === 'FIELD_CREW' && (
                <FieldCrewPortal
                  state={state}
                  onRefresh={fetchState}
                  onShowDetour={(path) => setActiveDetourPath(path)}
                />
              )}

              {role === 'RELIEF_DESK' && (
                <ReliefDesk
                  state={state}
                  onRefresh={fetchState}
                  onShowDetour={(path) => setActiveDetourPath(path)}
                />
              )}

              {role === 'SYSTEM_ADMIN' && (
                <SystemAdmin
                  state={state}
                  onRefresh={fetchState}
                />
              )}
            </section>
          </>
        )}
      </main>

      {/* AI 5-Check Diagnostic Inspector Modal */}
      {selectedCaseForModal && (
        <AiCheckModal
          hazardCase={selectedCaseForModal}
          onClose={() => setSelectedCaseForModal(null)}
          onActionComplete={fetchState}
        />
      )}

      {/* Interactive Testing Guide & Postman Modal */}
      {isTestingGuideOpen && (
        <TestingGuideModal
          onClose={() => setIsTestingGuideOpen(false)}
          onSelectRole={(r) => setRole(r)}
        />
      )}

      {/* Login / Register Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          defaultRole={role}
        />
      )}
    </div>
  );
}

export default App;
