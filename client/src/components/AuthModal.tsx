import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield, Database, Sparkles, KeyRound, User, Lock, Mail, Phone } from 'lucide-react';
import { UserRole } from './Navbar';
import { api } from '../services/api';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSuccess,
  initialMode = 'LOGIN',
  defaultRole = 'CITIZEN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(defaultRole === 'LANDING' ? 'CITIZEN' : defaultRole);
  const [phone, setPhone] = useState('+94 77 123 4567');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Demo Credentials for quick 1-click testing
  const demoAccounts = [
    { label: '🏛️ Council Officer', username: 'officer_kasun', role: 'COUNCIL_OFFICER' as UserRole },
    { label: '👤 Citizen', username: 'citizen_saman', role: 'CITIZEN' as UserRole },
    { label: '🚛 Field Crew', username: 'crew_unit1', role: 'FIELD_CREW' as UserRole },
    { label: '🏠 Relief Desk', username: 'relief_agent', role: 'RELIEF_DESK' as UserRole },
    { label: '⚙️ System Admin', username: 'sys_admin', role: 'SYSTEM_ADMIN' as UserRole },
  ];

  const handleDemoSelect = (acc: typeof demoAccounts[0]) => {
    setUsername(acc.username);
    setPassword('password123');
    setRole(acc.role);
    setMode('LOGIN');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const res = await api.login({ username, password });
        if (res.success) {
          onSuccess(res.user, res.token);
        } else {
          setErrorMessage(res.error || 'Login failed.');
        }
      } else {
        const res = await api.register({
          username,
          password,
          fullName,
          email,
          role,
          phone,
        });
        if (res.success) {
          onSuccess(res.user, res.token);
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                ResQCity Authentication
              </h3>
              <p className="text-xs text-slate-400">Database Role Access &amp; Security</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Indicator */}
        <div className="bg-slate-950/60 px-6 py-2 border-b border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Database className="w-3.5 h-3.5" />
            <span>XAMPP MySQL DB: localhost:3306 / resqcity_db</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Tabs: Login vs Register */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setMode('LOGIN'); setErrorMessage(null); }}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                mode === 'LOGIN' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              onClick={() => { setMode('REGISTER'); setErrorMessage(null); }}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                mode === 'REGISTER' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Quick Demo Credentials Ribbon */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              1-Click Demo Login (Pre-filled Accounts):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {demoAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDemoSelect(acc)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    username === acc.username
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs font-mono">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode === 'REGISTER' && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Jayawardena"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. officer_kasun"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            {mode === 'REGISTER' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@resqcity.lk"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Assign System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                  >
                    <option value="CITIZEN">👤 Citizen (Public Self-Care &amp; Reports)</option>
                    <option value="COUNCIL_OFFICER">🏛️ Municipal Council Officer (Command &amp; Dispatch)</option>
                    <option value="FIELD_CREW">🚛 Field Response Crew (Hazard Clearance)</option>
                    <option value="RELIEF_DESK">🏠 Relief Desk (Shelter Allocation &amp; Evacuation)</option>
                    <option value="SYSTEM_ADMIN">⚙️ System Admin (AI Tuning &amp; Configuration)</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-4"
            >
              <span>{isSubmitting ? 'Authenticating with XAMPP MySQL...' : mode === 'LOGIN' ? 'Sign In to Portal' : 'Register Account'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
