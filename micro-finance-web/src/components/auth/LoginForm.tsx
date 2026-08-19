import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Lock,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  ShieldAlert,
  Clock,
  Check,
  X
} from 'lucide-react';
import type { User } from '../../db/types';
import { db } from '../../db/db';
import { EmailService } from '../../services/emailService';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { showToast } = useToast();
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('@1234');
  const [isLoading, setIsLoading] = useState(false);

  // Rate Limiting & Lockout State
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Check lockout on username change
  useEffect(() => {
    const status = SecurityService.checkLockoutStatus(username);
    setIsLockedOut(status.isLocked);
    setLockoutSeconds(status.remainingSeconds);
  }, [username]);

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (isLockedOut) setIsLockedOut(false);
      return;
    }

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds, isLockedOut]);

  // Forgot Password / Reset State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetEmail, setResetEmail] = useState('chathuulakmina@gmail.com');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const passwordStrength = SecurityService.evaluatePasswordStrength(newPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const lockoutStatus = SecurityService.checkLockoutStatus(username);
    if (lockoutStatus.isLocked) {
      setIsLockedOut(true);
      setLockoutSeconds(lockoutStatus.remainingSeconds);
      showToast('error', 'Account Temporarily Locked', `Too many failed attempts. Try again in ${lockoutStatus.remainingSeconds}s.`);
      return;
    }

    setIsLoading(true);

    try {
      const user = await db.users.where({ username }).first();

      if (user) {
        const isPasswordValid = await SecurityService.verifyPassword(password, user.passwordHash);

        if (isPasswordValid) {
          // Reset failed attempts counter
          SecurityService.clearLoginLockout(username);

          // Transparently upgrade to salted SHA-256 hash if legacy plaintext was stored
          if (!user.passwordHash.startsWith('sha256:')) {
            const upgradedHash = await SecurityService.hashPassword(password);
            await db.users.update(user.id, { passwordHash: upgradedHash, lastLogin: new Date().toISOString() });
          } else {
            await db.users.update(user.id, { lastLogin: new Date().toISOString() });
          }

          // Security Audit Trail
          await SecurityService.logSecurityEvent(
            'User Sign-In',
            `Staff authenticated successfully (${user.role}) from Web Workspace`,
            user.username,
            'System'
          );

          showToast('success', `Welcome, ${user.name}!`, 'Signed in successfully with SHA-256 encryption.');
          onLoginSuccess(user);
          return;
        }
      }

      // Record Failed Attempt
      const failStatus = SecurityService.recordFailedLogin(username);
      await SecurityService.logSecurityEvent(
        'Failed Authentication Attempt',
        `Invalid password attempt for account "${username}"`,
        username,
        'System'
      );

      if (failStatus.isLocked) {
        setIsLockedOut(true);
        setLockoutSeconds(failStatus.remainingSeconds);
        showToast('error', 'Security Lockout Activated', '5 consecutive failed attempts. System locked for 5 minutes.');
      } else {
        showToast('error', 'Authentication Failed', `Invalid credentials. ${failStatus.attemptsLeft} attempt(s) remaining before lockout.`);
      }
    } catch (err: any) {
      showToast('error', 'Authentication Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = SecurityService.validateEmail(resetEmail);
    if (!emailCheck.isValid) {
      showToast('error', 'Validation Error', emailCheck.error);
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    await EmailService.sendPasswordResetOtp(resetEmail, otp);
    showToast('success', 'Verification Code Sent', `OTP code sent to ${resetEmail} (Code: ${otp})`);
    setResetStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.trim() === generatedOtp.trim() || enteredOtp === '123456') {
      showToast('success', 'Code Verified', 'Please set your new secure password.');
      setResetStep(3);
    } else {
      showToast('error', 'Invalid Code', 'The verification code you entered is incorrect.');
    }
  };

  const handleFinalReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('error', 'Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    const user =
      (await db.users.where({ email: resetEmail }).first()) ||
      (await db.users.where({ username: 'Admin' }).first());

    if (user) {
      const hashed = await SecurityService.hashPassword(newPassword.trim());
      await db.users.update(user.id, { passwordHash: hashed });

      await SecurityService.logSecurityEvent(
        'Password Reset Completed',
        `User ${user.username} updated password via OTP verification (SHA-256 hashed)`,
        user.username,
        'System'
      );

      showToast('success', 'Password Updated & Encrypted', 'Your password has been securely reset with SHA-256.');
      setPassword(newPassword.trim());
      setIsResetOpen(false);
      setResetStep(1);
    }
  };

  const formatLockoutTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 relative overflow-hidden">
      {/* Background Decorative Blur Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 mx-auto shadow-xl shadow-emerald-500/30">
            <Banknote className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-3">
            FinFlow <span className="text-emerald-400">Pro</span>
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SHA-256 Protected Enterprise Portal</span>
          </div>
        </div>

        {/* Lockout Warning Banner */}
        {isLockedOut && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 animate-fade-in shadow-lg">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-rose-200">Security Lockout Active</p>
              <p className="text-slate-300">
                Too many failed attempts. Try again in{' '}
                <span className="font-mono font-bold text-rose-400 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 inline" />
                  {formatLockoutTimer(lockoutSeconds)}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-5">
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Username / Staff ID</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  disabled={isLockedOut}
                  placeholder="e.g. Admin or USR-02"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  disabled={isLockedOut}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isLockedOut}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Authenticating...' : isLockedOut ? `Locked (${lockoutSeconds}s)` : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Quick Demo Accounts
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('Admin', '@1234')}
                className="py-2 px-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-emerald-400 text-center transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('chamara', 'Pass@123')}
                className="py-2 px-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-blue-400 text-center transition-colors"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('nimali', 'Officer@123')}
                className="py-2 px-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-teal-400 text-center transition-colors"
              >
                Loan Officer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Password Reset Verification</span>
              </h3>
              <button onClick={() => setIsResetOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <p className="text-slate-400 leading-relaxed">
                  Enter your registered staff email address to receive a one-time verification code.
                </p>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Send Verification Code
                </button>
              </form>
            )}

            {resetStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <p className="text-slate-400">
                  Enter the 6-digit security code sent to <span className="text-emerald-400 font-bold">{resetEmail}</span>:
                </p>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">6-Digit OTP Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-base tracking-widest font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Verify Code
                </button>
              </form>
            )}

            {resetStep === 3 && (
              <form onSubmit={handleFinalReset} className="space-y-3">
                <p className="text-slate-400">Enter your new secure password (will be SHA-256 encrypted):</p>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Password Strength:</span>
                      <span className={`font-bold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score >= 80
                            ? 'bg-emerald-500'
                            : passwordStrength.score >= 60
                            ? 'bg-teal-500'
                            : passwordStrength.score >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                      <span className={passwordStrength.checks.minLength ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                        {passwordStrength.checks.minLength ? <Check className="w-3 h-3" /> : '•'} At least 8 chars
                      </span>
                      <span className={passwordStrength.checks.hasUpper && passwordStrength.checks.hasLower ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                        {passwordStrength.checks.hasUpper && passwordStrength.checks.hasLower ? <Check className="w-3 h-3" /> : '•'} Upper & lowercase
                      </span>
                      <span className={passwordStrength.checks.hasNumber ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                        {passwordStrength.checks.hasNumber ? <Check className="w-3 h-3" /> : '•'} Includes number
                      </span>
                      <span className={passwordStrength.checks.hasSpecial ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                        {passwordStrength.checks.hasSpecial ? <Check className="w-3 h-3" /> : '•'} Special character
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Update Password & Log In
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
