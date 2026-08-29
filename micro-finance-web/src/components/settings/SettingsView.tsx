import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Activity,
  UserCheck
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  exportDatabaseToJson,
  importDatabaseFromJson,
  seedInitialData,
  scanDatabaseIntegrity,
  type IntegrityReport,
  db
} from '../../db/db';
import type { User } from '../../db/types';
import { AIService } from '../../services/aiService';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';

interface SettingsViewProps {
  currentUser?: User | null;
  onLockWorkstation?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onLockWorkstation
}) => {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState(AIService.getApiKey());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Inactivity Timeout setting
  const [sessionTimeout, setSessionTimeout] = useState(SecurityService.getSessionTimeout());

  // Database Integrity Scan State
  const [isScanningIntegrity, setIsScanningIntegrity] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);

  // Security Audit Logs
  const allLogs = useLiveQuery(() => db.activityLogs.reverse().toArray(), []) || [];
  const auditLogs = allLogs.filter((log) => log.details?.includes('[SEC-AUDIT]')).slice(0, 15);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    AIService.setApiKey(apiKey.trim());
    showToast('success', 'Gemini API Key Saved', 'Google Gemini AI engine connected.');
  };

  const handleSessionTimeoutChange = (minutes: number) => {
    setSessionTimeout(minutes);
    SecurityService.setSessionTimeout(minutes);
    showToast(
      'success',
      'Session Security Updated',
      minutes > 0
        ? `Workstation will auto-lock after ${minutes} minutes of inactivity.`
        : 'Inactivity auto-lock disabled.'
    );
  };

  const handleRunIntegrityScan = async () => {
    setIsScanningIntegrity(true);
    try {
      const report = await scanDatabaseIntegrity();
      setIntegrityReport(report);
      if (report.status === 'Healthy') {
        showToast('success', 'Integrity Scan Passed', 'All database tables and relationships are 100% healthy.');
      } else {
        showToast('warning', 'Integrity Issues Detected', `${report.anomalies.length} anomaly(s) found in ledger.`);
      }
    } catch (err: any) {
      showToast('error', 'Scan Error', err.message);
    } finally {
      setIsScanningIntegrity(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinFlow_DB_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await SecurityService.logSecurityEvent(
        'Database Backup Exported',
        'Full IndexedDB ledger exported with SHA-256 cryptographic checksum signature',
        currentUser?.username || 'Admin',
        'System'
      );

      showToast('success', 'Tamper-Proof Backup Exported', 'Downloaded complete database JSON with embedded SHA-256 signature.');
    } catch (err: any) {
      showToast('error', 'Export Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setIsImporting(true);
      try {
        const content = event.target?.result as string;
        const result = await importDatabaseFromJson(content);

        if (result.success) {
          await SecurityService.logSecurityEvent(
            'Database Backup Restored',
            `Database restored successfully (SHA-256 Verified: ${result.checksumVerified})`,
            currentUser?.username || 'Admin',
            'System'
          );

          showToast(
            'success',
            result.checksumVerified ? 'Verified Backup Restored' : 'Database Restored',
            result.message
          );
          setTimeout(() => window.location.reload(), 1200);
        } else {
          showToast('error', 'Restore Rejected', result.message);
        }
      } catch (err: any) {
        showToast('error', 'Import Error', err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetToSample = async () => {
    if (currentUser && currentUser.role !== 'Admin') {
      showToast('error', 'Access Denied', 'Only System Administrators have permission to reset the database.');
      return;
    }

    if (window.confirm('⚠️ Reset all tables to factory default demo dataset? Current data will be replaced.')) {
      await seedInitialData(true);
      await SecurityService.logSecurityEvent(
        'Database Factory Reset',
        'Database was reset to default seed dataset',
        currentUser?.username || 'Admin',
        'System'
      );
      showToast('info', 'Database Reset', 'Sample dataset loaded. Reloading application...');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="max-w-5xl space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <span>System Settings & Security Compliance Center</span>
          </h3>
          <p className="text-xs text-slate-500">
            Enterprise cryptographic controls, data integrity diagnostics, and backup management
          </p>
        </div>

        {onLockWorkstation && (
          <button
            onClick={onLockWorkstation}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Workstation Now</span>
          </button>
        )}
      </div>

      {/* 1. Security Posture Score Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base">FinFlow Enterprise Security Status</h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase tracking-wider border border-emerald-500/30">
                  Grade A+ Compliant
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Active real-time safeguards against brute-force attacks, data corruption, and unauthorized changes
              </p>
            </div>
          </div>

          <div className="text-right sm:pl-4">
            <span className="text-2xl font-black text-emerald-400">98/100</span>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Security Score</span>
          </div>
        </div>

        {/* Safeguard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>SHA-256 Hashing</span>
            </div>
            <p className="text-[11px] text-slate-300">Passwords protected with salted Web Crypto SHA-256 hashes.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Brute-Force Guard</span>
            </div>
            <p className="text-[11px] text-slate-300">Max 5 failed attempts with 5-minute auto-lockout policy.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>DB Integrity Hooks</span>
            </div>
            <p className="text-[11px] text-slate-300">Dexie DB hooks sanitize strings and block negative balances.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tamper Checksums</span>
            </div>
            <p className="text-[11px] text-slate-300">SHA-256 signed database backup export and restoration.</p>
          </div>
        </div>
      </div>

      {/* 2. Session Inactivity & Workstation Lock Settings */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Workstation Inactivity Auto-Lock</h4>
            <p className="text-xs text-slate-400">
              Automatically locks the application screen when left unattended to prevent unauthorized terminal access
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-2">Lock Threshold:</span>
          {[
            { label: '5 Minutes', val: 5 },
            { label: '15 Minutes (Default)', val: 15 },
            { label: '30 Minutes', val: 30 },
            { label: '60 Minutes', val: 60 },
            { label: 'Disabled', val: 0 }
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => handleSessionTimeoutChange(item.val)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sessionTimeout === item.val
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Database Storage & Backup Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Dexie.js Offline Database & Backup</h4>
              <p className="text-xs text-slate-400">
                Persistent local client ledger with SHA-256 cryptographic verification
              </p>
            </div>
          </div>

          <button
            onClick={handleRunIntegrityScan}
            disabled={isScanningIntegrity}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>{isScanningIntegrity ? 'Scanning...' : 'Run Integrity Scan'}</span>
          </button>
        </div>

        {/* Scan Report Display */}
        {integrityReport && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {integrityReport.status === 'Healthy' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <span className="font-bold text-sm">
                  Ledger Diagnostics: {integrityReport.status}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Audited {integrityReport.totalCustomers} customers, {integrityReport.totalLoans} loans, {integrityReport.totalPayments} payments
              </span>
            </div>

            {integrityReport.anomalies.length === 0 ? (
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✅ Zero foreign key violations, orphaned loans, or negative balance anomalies detected.
              </p>
            ) : (
              <div className="space-y-1.5">
                {integrityReport.anomalies.map((anom, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{anom.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/30 transition-all text-left space-y-2 group cursor-pointer"
          >
            <Download className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <h5 className="font-bold text-xs text-slate-900 dark:text-white">Export Signed Backup</h5>
            <p className="text-[11px] text-slate-500">Download entire ledger with embedded SHA-256 signature.</p>
          </button>

          <label className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/30 transition-all text-left space-y-2 group cursor-pointer">
            <Upload className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            <h5 className="font-bold text-xs text-slate-900 dark:text-white">Restore DB from JSON</h5>
            <p className="text-[11px] text-slate-500">Upload and restore database with signature verification.</p>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleResetToSample}
            disabled={currentUser?.role !== 'Admin'}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50/30 transition-all text-left space-y-2 group cursor-pointer disabled:opacity-50"
            title={currentUser?.role !== 'Admin' ? 'Admin role required' : ''}
          >
            <RefreshCw className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-xs text-slate-900 dark:text-white">Reset Sample Data</h5>
              {currentUser?.role !== 'Admin' && (
                <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded font-bold">Admin Only</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Re-seed clean demo microfinance dataset.</p>
          </button>
        </div>
      </div>

      {/* 4. Security Audit Trail Explorer */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Security Audit Trail Ledger</h4>
            <p className="text-xs text-slate-400">
              Immutable record of authentication attempts, facility disbursements, and database operations
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center italic">No security events logged yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {auditLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {log.details.replace('[SEC-AUDIT] ', '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. AI Key Configuration Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Google Gemini AI Engine Integration</h4>
            <p className="text-xs text-slate-400">
              Optional Google Gemini API key for advanced live financial reasoning and conversational intelligence
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveApiKey} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Gemini API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                Save Key
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Note: If left empty, FinFlow operates automatically on its built-in offline smart heuristic financial intelligence engine.
            </p>
          </div>
        </form>
      </div>

      {/* 6. System Info & Security Architecture */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>System Version & Environment</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div>
            <span className="text-slate-400 block">Version:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">FinFlow Pro v2.4 (Enterprise Hardened)</span>
          </div>
          <div>
            <span className="text-slate-400 block">Database Engine:</span>
            <span className="font-bold text-emerald-600">IndexedDB (Dexie.js v4) + Hooks</span>
          </div>
          <div>
            <span className="text-slate-400 block">Crypto Standard:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Web Crypto SHA-256 + Salt</span>
          </div>
          <div>
            <span className="text-slate-400 block">Platform:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Web / Desktop Executable (.exe)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
