import React from 'react';
import {
  LayoutDashboard,
  Users,
  Banknote,
  CreditCard,
  ShieldCheck,
  AlertOctagon,
  TrendingUp,
  UserCheck,
  Receipt,
  Sparkles,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { User } from '../../db/types';

export type NavigationTab =
  | 'dashboard'
  | 'customers'
  | 'loans'
  | 'payments'
  | 'collaterals'
  | 'penalties'
  | 'financials'
  | 'employees'
  | 'expenses'
  | 'ai'
  | 'email'
  | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currentUser: User | null;
  onLogout: () => void;
  overdueCount: number;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  overdueCount,
  collapsed,
  setCollapsed
}) => {
  const menuItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'loans', label: 'Loans & Approvals', icon: Banknote },
    { id: 'payments', label: 'Repayments Ledger', icon: CreditCard },
    { id: 'collaterals', label: 'Collateral Assets', icon: ShieldCheck },
    { id: 'penalties', label: 'Overdue & Penalties', icon: AlertOctagon, badge: overdueCount },
    { id: 'financials', label: 'Master Financials', icon: TrendingUp },
    { id: 'employees', label: 'Staff & Tasks', icon: UserCheck },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'ai', label: 'AI Intelligence Hub', icon: Sparkles },
    { id: 'email', label: 'Email Center', icon: Mail },
    { id: 'settings', label: 'Settings & Backup', icon: Settings }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-18 px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight text-base leading-tight">FinFlow <span className="text-emerald-400">Pro</span></h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Micro-Finance OS</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
            <Banknote className="w-6 h-6" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${collapsed ? 'hidden' : ''}`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 ${collapsed ? 'justify-center' : ''}`}>
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt="User"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/50 shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Administrator'}</p>
              <p className="text-[10px] text-emerald-400 font-medium truncate uppercase">{currentUser?.role || 'Admin'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full mt-2 py-1 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
