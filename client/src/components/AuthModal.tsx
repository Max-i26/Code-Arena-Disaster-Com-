import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield, Database, User, Lock, Upload, CheckCircle2, Clock, FileCheck } from 'lucide-react';
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
  const [role, setRole] = useState<UserRole>(
    defaultRole === 'LANDING' || defaultRole === 'SYSTEM_ADMIN' ? 'CITIZEN' : defaultRole
  );
  const [phone, setPhone] = useState('+94 77 123 4567');

  // Official Personnel NIC Verification Fields
  const [nicNumber, setNicNumber] = useState('199483720191V');
  const [nicDocumentUrl, setNicDocumentUrl] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
  );
  const [officialDetails, setOfficialDetails] = useState('');
  const [isUploadingNicDoc, setIsUploadingNicDoc] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

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
    setPendingNotice(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNicDoc(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNicDocumentUrl(event.target.result as string);
      }
      setIsUploadingNicDoc(false);
    };
    reader.onerror = () => {
      alert("Failed to read NIC document image");
      setIsUploadingNicDoc(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPendingNotice(null);
    setIsSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const res = await api.login({ username, password });
        if (res.success) {
          if (res.user?.verificationStatus === 'PENDING') {
            setPendingNotice(`Your account (${res.user.role}) is currently PENDING Admin verification. System Administrator must inspect your NIC (#${res.user.nicNumber || 'Submitted'}) and official credentials before portal access is granted.`);
          } else {
            onSuccess(res.user, res.token);
          }
        } else {
          setErrorMessage(res.error || 'Login failed.');
        }
      } else {
        // Validation for official roles
        const isOfficialRole = role === 'COUNCIL_OFFICER' || role === 'FIELD_CREW' || role === 'RELIEF_DESK';
        if (isOfficialRole) {
          if (!nicNumber.trim()) {
            setErrorMessage("NIC (National Identity Card) Number is required for official personnel verification.");
            setIsSubmitting(false);
            return;
          }
          if (!nicDocumentUrl.trim()) {
            setErrorMessage("Please upload or attach your NIC Document Proof photo.");
            setIsSubmitting(false);
            return;
          }
        }

        const res = await api.register({
          username,
          password,
          fullName,
          email,
          role,
          phone,
          nicNumber,
          nicDocumentUrl,
          officialDetails: officialDetails || `${role.replace('_', ' ')} Registered Personnel`,
        });

        if (res.success) {
          if (res.user?.verificationStatus === 'PENDING') {
            setPendingNotice('Registration Submitted Successfully! Your official account is currently PENDING Admin verification. A System Administrator will review your NIC card and credentials before portal access is activated.');
          } else {
            onSuccess(res.user, res.token);
          }
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

  const isOfficialRole = role === 'COUNCIL_OFFICER' || role === 'FIELD_CREW' || role === 'RELIEF_DESK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg tracking-wide">
                ResQCity Access Portal
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Role Authorization &amp; Identity Verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Indicator */}
        <div className="bg-slate-950/80 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono font-bold shrink-0">
          <div className="flex items-center space-x-2 text-cyan-300">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>XAMPP MySQL DB: localhost:3306 / resqcity_db</span>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => { setMode('LOGIN'); setErrorMessage(null); setPendingNotice(null); }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 ${
                mode === 'LOGIN' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </button>
            <button
              onClick={() => { setMode('REGISTER'); setErrorMessage(null); setPendingNotice(null); }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 ${
                mode === 'REGISTER' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Quick Demo Credentials Ribbon */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 block">
              1-Click Pre-Verified Demo Accounts:
            </span>
            <div className="flex flex-wrap gap-2">
              {demoAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDemoSelect(acc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    username === acc.username
                      ? 'bg-cyan-950 text-cyan-200 border-cyan-500 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-700 text-rose-200 p-3.5 rounded-xl text-xs font-mono font-bold">
              {errorMessage}
            </div>
          )}

          {pendingNotice && (
            <div className="bg-amber-950/80 border border-amber-600 p-4 rounded-2xl space-y-2 text-amber-200 text-xs">
              <div className="flex items-center space-x-2 font-bold text-amber-300 text-sm">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Verification Pending Admin Approval</span>
              </div>
              <p className="leading-relaxed">{pendingNotice}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {mode === 'REGISTER' && (
              <div>
                <label className="text-slate-300 block mb-1.5 font-semibold">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Jayawardena"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Username *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. officer_kasun"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {mode === 'REGISTER' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1.5 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@resqcity.lk"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1.5 font-semibold">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Account Role Selector */}
                <div>
                  <label className="text-slate-300 block mb-1.5 font-semibold">Select Registration Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="CITIZEN" className="bg-slate-900">👤 Citizen (Instant Public Access)</option>
                    <option value="COUNCIL_OFFICER" className="bg-slate-900">🏛️ Municipal Council Officer (Requires NIC &amp; Admin Verification)</option>
                    <option value="FIELD_CREW" className="bg-slate-900">🚛 Field Response Crew (Requires NIC &amp; Admin Verification)</option>
                    <option value="RELIEF_DESK" className="bg-slate-900">🏠 Relief Desk (Requires NIC &amp; Admin Verification)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    * System Admin accounts cannot be created publicly; they can only be added by an existing Admin.
                  </p>
                </div>

                {/* Tailored NIC Verification Fields for Official Roles */}
                {isOfficialRole && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-amber-700/60 space-y-3 animate-in fade-in">
                    <div className="flex items-center space-x-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
                      <FileCheck className="w-4 h-4" />
                      <span>Official Identity Verification Required</span>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold text-xs">National Identity Card (NIC) Number *</label>
                      <input
                        type="text"
                        required
                        value={nicNumber}
                        onChange={(e) => setNicNumber(e.target.value)}
                        placeholder="e.g. 199483720191V"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold text-xs">
                        {role === 'COUNCIL_OFFICER' && 'Department ID & Council Division Details'}
                        {role === 'FIELD_CREW' && 'Squad Unit Name & Specialization'}
                        {role === 'RELIEF_DESK' && 'Relief Station / Shelter Designation'}
                      </label>
                      <input
                        type="text"
                        value={officialDetails}
                        onChange={(e) => setOfficialDetails(e.target.value)}
                        placeholder={
                          role === 'COUNCIL_OFFICER'
                            ? 'e.g. CMC Command Division — Senior Officer ID #8841'
                            : role === 'FIELD_CREW'
                            ? 'e.g. Rapid Chainsaw Squad 04 (Tree Clearance)'
                            : 'e.g. Viharamahadevi Park Primary Relief Center'
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-medium text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1.5 font-semibold text-xs">Upload NIC Document / Photo Proof *</label>
                      <label className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-850 border border-dashed border-amber-500/60 hover:border-amber-400 text-amber-300 font-bold px-3 py-2.5 rounded-xl cursor-pointer transition text-xs">
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>{isUploadingNicDoc ? 'Processing File...' : 'Upload NIC Image File or Take Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {nicDocumentUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 h-24 bg-slate-900 flex items-center justify-center">
                          <img src={nicDocumentUrl} alt="NIC Proof" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-xl shadow-cyan-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-4 text-sm"
            >
              <span>{isSubmitting ? 'Authenticating with XAMPP MySQL...' : mode === 'LOGIN' ? 'Sign In to Portal' : 'Register Account'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

