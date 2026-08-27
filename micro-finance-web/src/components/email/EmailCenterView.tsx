import React, { useState } from 'react';
import {
  Mail,
  Send,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  RefreshCw,
  X,
  Sparkles
} from 'lucide-react';
import type { EmailLog, Customer } from '../../db/types';
import { EmailService, type EmailConfig } from '../../services/emailService';
import { useToast } from '../layout/Toast';

interface EmailCenterViewProps {
  emailLogs: EmailLog[];
  customers: Customer[];
}

export const EmailCenterView: React.FC<EmailCenterViewProps> = ({
  emailLogs,
  customers
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<EmailLog | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // Email Config State
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(EmailService.getConfig());
  const [testEmailAddress, setTestEmailAddress] = useState(emailConfig.senderEmail || 'test@example.com');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatusMessage, setTestStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Composer State
  const [composeData, setComposeData] = useState({
    recipientEmail: customers[0]?.email || '',
    recipientName: customers[0]?.name || '',
    subject: 'Important Notification - Micro Finance System',
    type: 'Custom Notice' as const,
    body: 'Dear Customer,\n\nThis is a notification regarding your micro finance account.\n\nBest regards,\nMicro Finance Team'
  });

  const filteredLogs = emailLogs.filter((log) =>
    log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    EmailService.saveConfig(emailConfig);
    showToast('success', 'Email Settings Saved', 'EmailJS configuration updated.');
    setIsConfigModalOpen(false);
  };

  const handleRunTestEmail = async () => {
    if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
      setTestStatusMessage({
        type: 'error',
        text: 'Please enter your Public Key, Service ID, and Template ID first.'
      });
      return;
    }

    setIsTesting(true);
    setTestStatusMessage(null);
    EmailService.saveConfig({ ...emailConfig, enableLiveDispatch: true });

    try {
      const res = await EmailService.sendEmail({
        recipientEmail: testEmailAddress,
        recipientName: 'Test Administrator',
        subject: '🧪 FinFlow Pro: EmailJS Test Verification',
        type: 'Custom Notice',
        bodyContent: `Congratulations! Your EmailJS live email dispatch is working perfectly.\n\nService ID: ${emailConfig.serviceId}\nTemplate ID: ${emailConfig.templateId}\nTimestamp: ${new Date().toLocaleString()}`
      });

      if (res.success) {
        setTestStatusMessage({
          type: 'success',
          text: `Success! Test email was accepted and sent to ${testEmailAddress}. Please check your inbox & spam folder.`
        });
        showToast('success', 'Live Email Sent', `Verification email dispatched to ${testEmailAddress}`);
      } else {
        setTestStatusMessage({
          type: 'error',
          text: res.message || 'EmailJS returned a failure.'
        });
        showToast('error', 'Email Test Failed', res.message);
      }
    } catch (err: any) {
      setTestStatusMessage({
        type: 'error',
        text: err.message || 'Failed to dispatch test email.'
      });
      showToast('error', 'Test Failed', err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.recipientEmail || !composeData.subject || !composeData.body) {
      showToast('error', 'Validation Error', 'Recipient email, subject, and message are required.');
      return;
    }

    try {
      const res = await EmailService.sendEmail({
        recipientEmail: composeData.recipientEmail,
        recipientName: composeData.recipientName,
        subject: composeData.subject,
        type: composeData.type,
        bodyContent: composeData.body
      });

      showToast('success', 'Email Dispatched', res.message);
      setIsComposeModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Failed to Send Email', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600" />
            <span>Email Notification Center & Outbox ({emailLogs.length})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Automated loan approval letters, payment invoices, overdue notices, and EmailJS dispatch logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>EmailJS Settings</span>
          </button>

          <button
            onClick={() => setIsComposeModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
          >
            <Send className="w-4 h-4" />
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      {/* Mode Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 dark:text-slate-200 font-medium">
            Active Mode: <span className="font-bold">{emailConfig.enableLiveDispatch ? 'Live EmailJS Service' : 'Built-in Simulated & Audited Mailer'}</span>
          </span>
        </div>
        <button
          onClick={() => setIsConfigModalOpen(true)}
          className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
        >
          Configure Service Key
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search email logs by recipient, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Email Outbox Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Recipient</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5">Dispatch Status</th>
                <th className="px-4 py-3.5 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    No email logs found in outbox.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{log.recipientName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{log.recipientEmail}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-sm truncate">
                      {log.subject}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-700'
                            : log.status === 'Simulated'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedPreviewLog(log)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="View Email Body"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Body Preview Modal */}
      {selectedPreviewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Email Content Inspector</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{selectedPreviewLog.subject}</h3>
              </div>
              <button onClick={() => setSelectedPreviewLog(null)} className="p-1.5 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700">
              {selectedPreviewLog.contentPreview}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPreviewLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EmailJS Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">EmailJS Gateway Settings</h3>
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">EmailJS Public Key</label>
                <input
                  type="text"
                  placeholder="e.g. user_xxxxxxxxxxxx or public key"
                  value={emailConfig.publicKey}
                  onChange={(e) => setEmailConfig({ ...emailConfig, publicKey: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Service ID</label>
                  <input
                    type="text"
                    placeholder="e.g. service_xxxxxxx"
                    value={emailConfig.serviceId}
                    onChange={(e) => setEmailConfig({ ...emailConfig, serviceId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Template ID</label>
                  <input
                    type="text"
                    placeholder="e.g. template_xxxxxxx"
                    value={emailConfig.templateId}
                    onChange={(e) => setEmailConfig({ ...emailConfig, templateId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Sender Email</label>
                  <input
                    type="email"
                    value={emailConfig.senderEmail}
                    onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Sender Display Name</label>
                  <input
                    type="text"
                    value={emailConfig.senderName}
                    onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="enableLive"
                  checked={emailConfig.enableLiveDispatch}
                  onChange={(e) => setEmailConfig({ ...emailConfig, enableLiveDispatch: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="enableLive" className="text-slate-700 dark:text-slate-200 font-semibold cursor-pointer select-none">
                  Enable Live Internet Email Dispatch via EmailJS
                </label>
              </div>

              {/* Live Test Dispatcher */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Test EmailJS Connection</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Sends live verification test</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Enter email to receive test"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleRunTestEmail}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isTesting ? 'Sending...' : 'Send Test'}</span>
                  </button>
                </div>
                {testStatusMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] leading-snug ${
                      testStatusMessage.type === 'success'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
                    }`}
                  >
                    {testStatusMessage.text}
                  </div>
                )}
              </div>

              {/* Troubleshooting & Setup Checklist Guide */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2 text-[11px] text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Why do requests show Failed (Red) in EmailJS Statistics?</span>
                </div>
                <ul className="space-y-1.5 pl-4 list-disc marker:text-amber-500">
                  <li>
                    <strong>Template "To Email" Setting:</strong> In EmailJS Dashboard &rarr; <em>Email Templates</em> &rarr; Click your template &rarr; <em>Settings tab</em> &rarr; Set <strong>To Email</strong> to <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">{'{{to_email}}'}</code>.
                  </li>
                  <li>
                    <strong>Email Service Connection:</strong> In EmailJS Dashboard &rarr; <em>Email Services</em> &rarr; Click your Gmail/SMTP service &rarr; click <strong>"Test Connection"</strong> or <strong>"Re-connect"</strong> (Google tokens expire periodically).
                  </li>
                  <li>
                    <strong>Check Email History:</strong> In EmailJS Dashboard &rarr; click <em>Email History</em> (left menu) to view the exact failure reason returned by the mail server.
                  </li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {isComposeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Compose Direct Notice</h3>
              <button onClick={() => setIsComposeModalOpen(false)} className="p-1.5 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendCustomEmail} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={composeData.recipientName}
                    onChange={(e) => setComposeData({ ...composeData, recipientName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    required
                    value={composeData.recipientEmail}
                    onChange={(e) => setComposeData({ ...composeData, recipientEmail: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Message Body *</label>
                <textarea
                  rows={5}
                  required
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsComposeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
