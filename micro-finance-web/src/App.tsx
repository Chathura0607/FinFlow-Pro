import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialData } from './db/db';
import type { User, Customer } from './db/types';
import { LoanService } from './services/loanService';
import { ToastProvider, useToast } from './components/layout/Toast';
import { Sidebar, type NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginForm } from './components/auth/LoginForm';
import { DashboardView } from './components/dashboard/DashboardView';
import { CustomerView } from './components/customers/CustomerView';
import { LoanView } from './components/loans/LoanView';
import { PaymentView } from './components/payments/PaymentView';
import { CollateralView } from './components/collaterals/CollateralView';
import { PenaltyView } from './components/penalties/PenaltyView';
import { FinancialView } from './components/financials/FinancialView';
import { EmployeeView } from './components/employees/EmployeeView';
import { ExpenseView } from './components/expenses/ExpenseView';
import { AIIntelligenceView } from './components/ai/AIIntelligenceView';
import { EmailCenterView } from './components/email/EmailCenterView';
import { SettingsView } from './components/settings/SettingsView';
import { SessionLockModal } from './components/auth/SessionLockModal';
import { Sparkles, Bot, X, Send } from 'lucide-react';
import { AIService } from './services/aiService';
import { SecurityService } from './services/securityService';

const MainAppContent: React.FC = () => {
  const { showToast } = useToast();

  // Reactive DB Subscriptions via Dexie useLiveQuery
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const loans = useLiveQuery(() => db.loans.toArray(), []) || [];
  const customerLoans = useLiveQuery(() => db.customerLoans.toArray(), []) || [];
  const collaterals = useLiveQuery(() => db.collaterals.toArray(), []) || [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) || [];
  const penalties = useLiveQuery(() => db.penalties.toArray(), []) || [];
  const employees = useLiveQuery(() => db.employees.toArray(), []) || [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) || [];
  const assignments = useLiveQuery(() => db.assignments.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const activities = useLiveQuery(() => db.activityLogs.reverse().toArray(), []) || [];
  const emailLogs = useLiveQuery(() => db.emailLogs.reverse().toArray(), []) || [];

  // Application State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Workstation Inactivity & Lock State
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  // Inactivity Detection Listener
  useEffect(() => {
    if (!currentUser || isSessionLocked) return;

    const timeoutMinutes = SecurityService.getSessionTimeout();
    if (timeoutMinutes <= 0) return; // Inactivity lock disabled

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsSessionLocked(true);
        SecurityService.logSecurityEvent(
          'Workstation Auto-Locked',
          `Workstation auto-locked after ${timeoutMinutes}m of inactivity (${currentUser.role})`,
          currentUser.username,
          'System'
        );
      }, timeoutMinutes * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [currentUser, isSessionLocked]);

  // Contextual modal transfer states
  const [initialCustomerForLoan, setInitialCustomerForLoan] = useState<Customer | null>(null);
  const [initialLoanIdForPayment, setInitialLoanIdForPayment] = useState<number | null>(null);

  // Floating AI Chat Drawer
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [floatingChatMessages, setFloatingChatMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your FinFlow AI Financial Copilot. How can I assist your loan underwriting or portfolio review today?'
    }
  ]);
  const [floatingPrompt, setFloatingPrompt] = useState('');
  const [isFloatingAiLoading, setIsFloatingAiLoading] = useState(false);

  // Initialize Seed Data and check overdue loans on mount
  useEffect(() => {
    seedInitialData().then(() => {
      LoanService.updateOverduePenalties();
    });
  }, []);

  // Theme Sync
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleRefreshPenalties = async () => {
    const count = await LoanService.updateOverduePenalties();
    showToast('info', 'Penalties Recalculated', `${count} overdue loan contract(s) updated with daily interest penalty.`);
  };

  const handleOpenLoanForCust = (cust: Customer) => {
    setInitialCustomerForLoan(cust);
    setActiveTab('loans');
  };

  const handleOpenPaymentForLoan = (loanId: number) => {
    setInitialLoanIdForPayment(loanId);
    setActiveTab('payments');
  };

  const handleSendFloatingChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floatingPrompt.trim()) return;

    const userText = floatingPrompt.trim();
    setFloatingChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setFloatingPrompt('');
    setIsFloatingAiLoading(true);

    try {
      const reply = await AIService.askAIAssistant(userText);
      setFloatingChatMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch (err: any) {
      showToast('error', 'AI Assistant Error', err.message);
    } finally {
      setIsFloatingAiLoading(false);
    }
  };

  // Overdue count
  const overdueCount = customerLoans.filter((cl) => {
    const penaltyInfo = LoanService.calculatePenalty(cl);
    return penaltyInfo.isOverdue || cl.paymentStatus === 'Overdue';
  }).length;

  // Render Login Screen if not authenticated
  if (!currentUser) {
    return <LoginForm onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const tabTitles: Record<NavigationTab, string> = {
    dashboard: 'Executive Dashboard',
    customers: 'Customer Directory',
    loans: 'Loan Center & Approvals',
    payments: 'Repayments & Receipts Ledger',
    collaterals: 'Collateral Assets Registry',
    penalties: 'Overdue Arrears & Penalties',
    financials: 'Master Financials & P/L Audit',
    employees: 'Staff Management & Field Tasks',
    expenses: 'Operational Expenses',
    ai: 'AI Financial Intelligence Hub',
    email: 'Email Notification Center',
    settings: 'Settings & Data Backup'
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        overdueCount={overdueCount}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Viewport Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Header */}
        <Header
          activeTabTitle={tabTitles[activeTab]}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenNewLoan={() => setActiveTab('loans')}
          onOpenNewPayment={() => setActiveTab('payments')}
          onOpenAICopilot={() => setIsAIChatOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          recentActivities={activities}
          overdueCount={overdueCount}
        />

        {/* Dynamic Viewport Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-16">
          {activeTab === 'dashboard' && (
            <DashboardView
              customerLoans={customerLoans}
              loans={loans}
              payments={payments}
              expenses={expenses}
              customers={customers}
              activities={activities}
              onOpenNewLoan={() => setActiveTab('loans')}
              onOpenNewPayment={() => setActiveTab('payments')}
              onOpenAICopilot={() => setIsAIChatOpen(true)}
              onNavigateTab={setActiveTab}
              onRefreshPenalties={handleRefreshPenalties}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerView
              customers={customers}
              customerLoans={customerLoans}
              payments={payments}
              collaterals={collaterals}
              onOpenNewLoanForCustomer={handleOpenLoanForCust}
            />
          )}

          {activeTab === 'loans' && (
            <LoanView
              loans={loans}
              customerLoans={customerLoans}
              customers={customers}
              collaterals={collaterals}
              currentUser={currentUser}
              initialCustomerForLoan={initialCustomerForLoan}
              onClearInitialCustomer={() => setInitialCustomerForLoan(null)}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentView
              payments={payments}
              customerLoans={customerLoans}
              loans={loans}
              customers={customers}
              collaterals={collaterals}
              currentUser={currentUser}
              initialLoanIdForPayment={initialLoanIdForPayment}
              onClearInitialLoanId={() => setInitialLoanIdForPayment(null)}
            />
          )}

          {activeTab === 'collaterals' && (
            <CollateralView
              collaterals={collaterals}
              customers={customers}
              loans={loans}
            />
          )}

          {activeTab === 'penalties' && (
            <PenaltyView
              customerLoans={customerLoans}
              loans={loans}
              customers={customers}
              penalties={penalties}
              onOpenPaymentForLoan={handleOpenPaymentForLoan}
              onRefreshPenalties={handleRefreshPenalties}
            />
          )}

          {activeTab === 'financials' && (
            <FinancialView
              customerLoans={customerLoans}
              loans={loans}
              customers={customers}
              collaterals={collaterals}
              payments={payments}
              expenses={expenses}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeeView
              employees={employees}
              assignments={assignments}
              customers={customers}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpenseView
              expenses={expenses}
              employees={employees}
            />
          )}

          {activeTab === 'ai' && (
            <AIIntelligenceView
              customers={customers}
              collaterals={collaterals}
            />
          )}

          {activeTab === 'email' && (
            <EmailCenterView
              emailLogs={emailLogs}
              customers={customers}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onLockWorkstation={() => setIsSessionLocked(true)}
            />
          )}
        </main>
      </div>

      {/* Session Inactivity Lock Screen */}
      {isSessionLocked && currentUser && (
        <SessionLockModal
          currentUser={currentUser}
          onUnlock={() => setIsSessionLocked(false)}
          onLogout={() => {
            setIsSessionLocked(false);
            setCurrentUser(null);
          }}
        />
      )}

      {/* Floating AI Copilot Drawer */}
      {isAIChatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[90vw] h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="font-bold text-xs tracking-wide">FinFlow AI Copilot</span>
            </div>
            <button
              onClick={() => setIsAIChatOpen(false)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {floatingChatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isFloatingAiLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <Bot className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>AI is analyzing portfolio data...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <form onSubmit={handleSendFloatingChat} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask financial question..."
                value={floatingPrompt}
                onChange={(e) => setFloatingPrompt(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isFloatingAiLoading || !floatingPrompt.trim()}
                className="p-2 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <MainAppContent />
    </ToastProvider>
  );
}

export default App;
