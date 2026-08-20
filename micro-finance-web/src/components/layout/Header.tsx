import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  PlusCircle,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { ActivityLog } from '../../db/types';

interface HeaderProps {
  activeTabTitle: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenNewLoan: () => void;
  onOpenNewPayment: () => void;
  onOpenAICopilot: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentActivities: ActivityLog[];
  overdueCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  theme,
  toggleTheme,
  onOpenNewLoan,
  onOpenNewPayment,
  onOpenAICopilot,
  searchQuery,
  setSearchQuery,
  recentActivities,
  overdueCount
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-20 h-18 px-6 flex items-center justify-between border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 transition-colors">
      {/* Title & Search */}
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
          {activeTabTitle}
        </h2>
        <div className="relative hidden md:block w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers, loans, receipts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Action Buttons & Controls */}
      <div className="flex items-center gap-3">
        {/* AI Assistant Quick Pill */}
        <button
          onClick={onOpenAICopilot}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>AI Copilot</span>
        </button>

        {/* Quick Action: New Loan */}
        <button
          onClick={onOpenNewLoan}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Disburse Loan</span>
        </button>

        {/* Quick Action: Record Payment */}
        <button
          onClick={onOpenNewPayment}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium text-xs shadow-sm transition-all"
        >
          <CreditCard className="w-4 h-4" />
          <span className="hidden sm:inline">Record Payment</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {overdueCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
            {overdueCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Activity Feed</span>
                {overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-semibold text-[10px]">
                    {overdueCount} Overdue
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {overdueCount > 0 && (
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-900 dark:text-rose-200">Attention Required</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                        {overdueCount} loan contract(s) have passed due date and are accruing penalties.
                      </p>
                    </div>
                  </div>
                )}
                {recentActivities.slice(0, 5).map((act, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{act.action}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{act.details}</p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {act.userName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
