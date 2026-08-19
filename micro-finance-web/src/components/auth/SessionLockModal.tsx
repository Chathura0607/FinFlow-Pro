import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, LogOut, KeyRound } from 'lucide-react';
import type { User } from '../../db/types';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';

interface SessionLockModalProps {
  currentUser: User;
  onUnlock: () => void;
  onLogout: () => void;
}

export const SessionLockModal: React.FC<SessionLockModalProps> = ({
  currentUser,
  onUnlock,
  onLogout
}) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter your password to resume.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const isValid = await SecurityService.verifyPassword(password, currentUser.passwordHash);
      if (isValid) {
        await SecurityService.logSecurityEvent(
          'Session Unlocked',
          `Staff resumed workstation session (${currentUser.role})`,
          currentUser.username,
          'System'
        );
        showToast('success', 'Workstation Unlocked', `Welcome back, ${currentUser.name}!`);
        onUnlock();
      } else {
        setErrorMsg('Invalid password. Please verify your credentials.');
        await SecurityService.logSecurityEvent(
          'Failed Session Unlock Attempt',
          `Incorrect password entered during workstation unlock for ${currentUser.username}`,
          currentUser.username,
          'System'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unlock error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in text-slate-100">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-center">
        {/* Lock Icon & Avatar */}
        <div className="relative inline-block mx-auto">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-800 shadow-xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-black ring-4 ring-slate-800 shadow-xl">
              {currentUser.name.charAt(0)}
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-amber-500 text-slate-950 shadow-md">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Header Details */}
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">{currentUser.name}</h3>
          <p className="text-xs text-slate-400">
            Workstation Auto-Locked due to Inactivity ({currentUser.role})
          </p>
        </div>

        {/* Security Notification */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Enter your password to resume your secure financial session.</span>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-4 text-xs text-left">
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Account Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>
            {errorMsg && (
              <p className="text-[11px] text-rose-400 font-semibold mt-1.5">{errorMsg}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch User</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying...' : 'Unlock Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
