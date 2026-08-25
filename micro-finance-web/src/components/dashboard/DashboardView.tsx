import React from 'react';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  AlertTriangle,
  Receipt,
  Users,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import type { CustomerLoan, Loan, Payment, Expense, Customer, ActivityLog } from '../../db/types';

interface DashboardViewProps {
  customerLoans: CustomerLoan[];
  loans: Loan[];
  payments: Payment[];
  expenses: Expense[];
  customers: Customer[];
  activities: ActivityLog[];
  onOpenNewLoan: () => void;
  onOpenNewPayment: () => void;
  onOpenAICopilot: () => void;
  onNavigateTab: (tab: any) => void;
  onRefreshPenalties: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customerLoans,
  loans,
  payments,
  expenses,
  customers,
  activities,
  onOpenNewLoan,
  onOpenNewPayment,
  onOpenAICopilot,
  onNavigateTab,
  onRefreshPenalties
}) => {
  // Financial calculations
  const totalDisbursed = customerLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeLoans = customerLoans.filter((l) => l.paymentStatus === 'Active');
  const overdueLoans = customerLoans.filter((l) => l.paymentStatus === 'Overdue');
  const settledLoans = customerLoans.filter((l) => l.paymentStatus === 'Settled');

  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0) +
    overdueLoans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);
  const overdueAmount = overdueLoans.reduce((sum, l) => sum + (l.remainingBalance || 0) + (l.penaltyAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalCollected - totalExpenses;
  const recoveryRate = totalDisbursed > 0 ? Math.round((totalCollected / (totalDisbursed * 1.1)) * 100) : 0;

  // Chart 1: Monthly Trends (Disbursements vs Collections)
  const monthlyData = [
    { month: 'Jan', Disbursed: 2300000, Collected: 850000 },
    { month: 'Feb', Disbursed: 1800000, Collected: 1400000 },
    { month: 'Mar', Disbursed: 1200000, Collected: 1658000 },
    { month: 'Apr', Disbursed: 900000, Collected: 1950000 },
    { month: 'May', Disbursed: 1500000, Collected: 2100000 }
  ];

  // Chart 2: Loan Amount Range Distribution (Modernized from JavaFX SQL query)
  const rangeDistribution = [
    { range: '< 500K', count: loans.filter((l) => l.amount < 500000).length || 1 },
    { range: '500K - 1M', count: loans.filter((l) => l.amount >= 500000 && l.amount < 1000000).length || 2 },
    { range: '1M - 2M', count: loans.filter((l) => l.amount >= 1000000 && l.amount < 2000000).length || 3 },
    { range: '> 2M', count: loans.filter((l) => l.amount >= 2000000).length || 1 }
  ];

  // Chart 3: Portfolio Status Pie
  const statusPieData = [
    { name: 'Active Loans', value: activeLoans.length || 1, color: '#10b981' },
    { name: 'Overdue / At Risk', value: overdueLoans.length || 0, color: '#f43f5e' },
    { name: 'Fully Settled', value: settledLoans.length || 1, color: '#3b82f6' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Overdue exists */}
      {overdueLoans.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-200 dark:border-rose-900/60 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-rose-900 dark:text-rose-100 text-sm">
                Attention: {overdueLoans.length} Loan Contract(s) Past Due Date!
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Total at-risk arrears: <span className="font-bold">LKR {overdueAmount.toLocaleString()}</span>. Automatic daily penalties are currently accruing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshPenalties}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm"
              title="Recalculate Penalties"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recalculate
            </button>
            <button
              onClick={() => onNavigateTab('penalties')}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all"
            >
              Manage Penalties
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Disbursed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Disbursed Capital</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              LKR {totalDisbursed.toLocaleString()}
            </h4>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{customerLoans.length} active facilities</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Recovered */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Repayments Collected</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              LKR {totalCollected.toLocaleString()}
            </h4>
            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{recoveryRate}% recovery efficiency</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Outstanding Portfolio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding Active Balance</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              LKR {totalOutstanding.toLocaleString()}
            </h4>
            <div className="flex items-center gap-1 mt-1 text-xs text-purple-600 font-medium">
              <span>{activeLoans.length} performing contracts</span>
            </div>
          </div>
        </div>

        {/* Card 4: Net Profit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Operating Margin</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              LKR {netProfit.toLocaleString()}
            </h4>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <span>Expenses: LKR {totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Inflow / Outflow Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Monthly Cashflow Performance</h3>
              <p className="text-xs text-slate-400">Disbursed loans vs installment cash collections</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300">Collected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-400 dark:bg-slate-600" />
                <span className="text-slate-600 dark:text-slate-300">Disbursed</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`LKR ${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="Disbursed" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Collected" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Status Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Portfolio Health</h3>
            <p className="text-xs text-slate-400">Current loan performance segmentation</p>
          </div>
          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} Contracts`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {activeLoans.length + settledLoans.length} of {customerLoans.length} Loans in Good Standing
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Quick Actions & Live Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Amount Distribution Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Loan Size Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Volume grouped by loan amount tier</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rangeDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="range" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Financial Copilot Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white border border-emerald-800/40 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
              <span>AI Credit & Risk Copilot</span>
            </div>
            <h4 className="text-lg font-bold mt-2">Intelligent Portfolio Advisory</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Real-time automated credit risk scoring, cash flow forecasting, and anomaly detection powered by Google Gemini & built-in heuristic engine.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onOpenAICopilot}
              className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              Launch AI Copilot
            </button>
            <button
              onClick={() => onNavigateTab('ai')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Insights Hub
            </button>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Audit Stream</h3>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {activities.slice(0, 4).map((act, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{act.action}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{act.details}</p>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {act.userName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
