import React, { useEffect, useState, useCallback } from 'react';
import { Lock, ShieldAlert, LogIn, UserX } from 'lucide-react';
import { Navbar, UserRole } from './components/Navbar';
import { StormSimulatorBar } from './components/StormSimulatorBar';
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
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-3 font-mono">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading ResQCity Urban Response Engine...</p>
      </div>
    );
  }

  const activeAlertCount = state.cases.filter(c => c.broadcastSent && c.status !== 'RESOLVED').length;
  const openTicketCount = state.tickets.filter(t => t.status === 'OPEN' || t.status === 'DISPATCHED').length;
  const unassignedReliefCount = state.reliefRequests.filter(r => r.status === 'QUEUED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
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

      {/* Weather & River Stream Simulation Controller */}
      <StormSimulatorBar
        simulation={state.simulation}
        sensors={state.sensors}
        onRefresh={fetchState}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl text-center max-w-xl mx-auto space-y-5 animate-in fade-in my-8">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center mx-auto shadow-xl">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">Authentication Required</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                You must sign in or register to access the <span className="text-cyan-300 font-bold font-mono">{role.replace('_', ' ')}</span> portal and interact with disaster response features.
              </p>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-xl shadow-cyan-500/20 flex items-center justify-center space-x-2 mx-auto text-xs transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register Account</span>
            </button>
          </div>
        ) : currentUser.role !== role ? (
          /* 2. Role Permission Lock Banner */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl text-center max-w-xl mx-auto space-y-5 animate-in fade-in my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-800/60 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">Role Permission Restricted</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are currently signed in as <span className="text-white font-bold">{currentUser.fullName}</span> (<span className="text-cyan-400 font-mono font-bold">{currentUser.role}</span>). Accessing the <span className="text-amber-300 font-bold font-mono">{role.replace('_', ' ')}</span> portal requires matching system privileges.
              </p>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center justify-center space-x-2 mx-auto text-xs transition"
            >
              <UserX className="w-4 h-4" />
              <span>Switch Account / Sign In as {role.replace('_', ' ')}</span>
            </button>
          </div>
        ) : (
          /* 3. Authenticated & Authorized Portal View */
          <>
            {/* Interactive GIS City Map Section */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Live Municipal GIS Hazard &amp; Safe Route Map</span>
                  </h2>
                  <p className="text-xs text-slate-400">Showing confirmed flood cordons, road closures, telemetry sensors, and relief centers.</p>
                </div>
                {activeDetourPath && (
                  <button
                    onClick={() => setActiveDetourPath(undefined)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline"
                  >
                    Clear Active Detour Route
                  </button>
                )}
              </div>

              <div className="h-[460px] w-full">
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
