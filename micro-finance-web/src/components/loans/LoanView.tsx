import React, { useState } from 'react';
import {
  Banknote,
  PlusCircle,
  Search,
  FileSpreadsheet,
  FileText,
  Calendar,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Printer
} from 'lucide-react';
import type { Customer, Loan, CustomerLoan, Collateral, User } from '../../db/types';
import { LoanService, type LoanCalculationResult } from '../../services/loanService';
import { AIService, type AIRiskAssessmentResult } from '../../services/aiService';
import { EmailService } from '../../services/emailService';
import { PdfService } from '../../services/pdfService';
import { ExportService } from '../../services/exportService';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';
import confetti from 'canvas-confetti';

interface LoanViewProps {
  loans: Loan[];
  customerLoans: CustomerLoan[];
  customers: Customer[];
  collaterals: Collateral[];
  currentUser: User | null;
  initialCustomerForLoan?: Customer | null;
  onClearInitialCustomer?: () => void;
}

export const LoanView: React.FC<LoanViewProps> = ({
  loans,
  customerLoans,
  customers,
  collaterals,
  currentUser,
  initialCustomerForLoan,
  onClearInitialCustomer
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedScheduleLoan, setSelectedScheduleLoan] = useState<{ loan: Loan; customerLoan: CustomerLoan; customer?: Customer } | null>(null);

  // AI Assistant State
  const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
  const [aiRiskResult, setAiRiskResult] = useState<AIRiskAssessmentResult | null>(null);

  // Form State for new Loan
  const [formData, setFormData] = useState({
    customerId: customers[0]?.id || '',
    description: 'Working Capital Micro Loan',
    amount: 250000,
    durationDays: 180,
    interestRate: 14.5,
    interestType: 'Flat' as 'Flat' | 'Reducing',
    collateralId: '',
    sendEmailNotice: true
  });

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);
  const selectedCollateral = collaterals.find((col) => col.id === formData.collateralId);

  // Dynamic Live Calculation
  const calcResult: LoanCalculationResult = React.useMemo(() => {
    return LoanService.calculateLoan(
      Number(formData.amount) || 0,
      Number(formData.interestRate) || 0,
      Number(formData.durationDays) || 30,
      formData.interestType
    );
  }, [formData.amount, formData.interestRate, formData.durationDays, formData.interestType]);

  // Contextual Trigger on Navigation
  React.useEffect(() => {
    if (initialCustomerForLoan) {
      setFormData((prev) => ({
        ...prev,
        customerId: initialCustomerForLoan.id,
        collateralId: collaterals.find((c) => c.customerId === initialCustomerForLoan.id)?.id || ''
      }));
      setIsDisburseModalOpen(true);
      if (onClearInitialCustomer) onClearInitialCustomer();
    }
  }, [initialCustomerForLoan, collaterals, onClearInitialCustomer]);

  // AI Evaluation on form change
  const handleRunAiRiskCheck = async () => {
    if (!selectedCustomer) {
      showToast('warning', 'Select Customer First', 'Please choose a borrower to assess risk score.');
      return;
    }
    setIsEvaluatingAI(true);
    try {
      const result = await AIService.evaluateLoanRisk({
        customer: selectedCustomer,
        requestedAmount: formData.amount,
        durationDays: formData.durationDays,
        interestRate: formData.interestRate,
        collateral: selectedCollateral
      });
      setAiRiskResult(result);
      showToast('info', 'AI Risk Assessment Complete', `Creditworthiness score: ${result.score}/100 (${result.riskTier})`);
    } catch (err: any) {
      showToast('error', 'AI Assessment Failed', err.message);
    } finally {
      setIsEvaluatingAI(false);
    }
  };

  const handleDisburseLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      showToast('error', 'Validation Error', 'Please select a registered customer.');
      return;
    }

    if (selectedCustomer.status === 'Blacklisted') {
      showToast('error', 'Loan Prohibited', `Customer "${selectedCustomer.name}" is Blacklisted. Facility disbursement denied.`);
      return;
    }

    const amountCheck = SecurityService.validateAmount(formData.amount, 5000, 50000000, 'Loan Amount');
    if (!amountCheck.isValid) {
      showToast('error', 'Validation Error', amountCheck.error);
      return;
    }

    if (formData.interestRate < 0.1 || formData.interestRate > 100) {
      showToast('error', 'Validation Error', 'Interest rate must be between 0.1% and 100% per annum.');
      return;
    }

    if (formData.durationDays < 7 || formData.durationDays > 3650) {
      showToast('error', 'Validation Error', 'Loan duration must be between 7 days and 3650 days (10 years).');
      return;
    }

    try {
      const { loanId, customerLoanId } = await LoanService.disburseLoan({
        customerId: formData.customerId,
        description: SecurityService.sanitizeString(formData.description),
        amount: formData.amount,
        durationDays: formData.durationDays,
        interestRate: formData.interestRate,
        interestType: formData.interestType,
        collateralId: formData.collateralId || undefined,
        approvedBy: currentUser?.username || 'Admin'
      });

      await SecurityService.logSecurityEvent(
        'Loan Disbursed',
        `Loan facility of LKR ${formData.amount.toLocaleString()} disbursed to ${selectedCustomer.name} (${selectedCustomer.id})`,
        currentUser?.username || 'Admin',
        'Loan'
      );

      // Confetti celebration
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

      // Trigger Email Notification if checked
      if (formData.sendEmailNotice && selectedCustomer.email) {
        const createdLoan = {
          id: loanId,
          loanCode: `LN-${1000 + loans.length + 1}`,
          description: formData.description,
          amount: formData.amount,
          durationDays: formData.durationDays,
          interestRate: formData.interestRate,
          interestType: formData.interestType,
          status: 'Active' as const,
          createdAt: new Date().toISOString().split('T')[0]
        };
        const createdCustomerLoan = {
          loanId,
          customerId: formData.customerId,
          dateIssued: new Date().toISOString().split('T')[0],
          dateDue: new Date(Date.now() + formData.durationDays * 86400000).toISOString().split('T')[0],
          principalAmount: formData.amount,
          totalAmountToPay: calcResult.totalAmountToPay,
          totalPaid: 0,
          remainingBalance: calcResult.totalAmountToPay,
          paymentStatus: 'Active' as const,
          penaltyAmount: 0,
          monthlyInstallment: calcResult.monthlyInstallment
        };
        await EmailService.sendLoanApprovalNotice(selectedCustomer, createdLoan, createdCustomerLoan);
      }

      showToast(
        'success',
        '🎉 Loan Disbursed Successfully!',
        `Facility disbursed for ${selectedCustomer.name} (Amount: LKR ${formData.amount.toLocaleString()})`
      );

      setIsDisburseModalOpen(false);
      setAiRiskResult(null);
    } catch (err: any) {
      showToast('error', 'Loan Disbursement Failed', err.message);
    }
  };

  // Filtered loans list
  const filteredCustomerLoans = customerLoans.filter((cl) => {
    const loan = loans.find((l) => l.id === cl.loanId);
    const cust = customers.find((c) => c.id === cl.customerId);
    const matchesSearch =
      (cust?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loan?.loanCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      cl.customerId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || cl.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <span>Loan Portfolio & Approvals ({customerLoans.length})</span>
          </h3>
          <p className="text-xs text-slate-500">Create loan schemes, assess credit risk, and manage active contracts</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => ExportService.exportLoansToExcel()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Ledger</span>
          </button>

          <button
            onClick={() => {
              setIsDisburseModalOpen(true);
              setAiRiskResult(null);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Disburse New Loan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, loan code, NIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Active', 'Settled', 'Overdue'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Master Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Loan Code</th>
                <th className="px-4 py-3.5">Borrower</th>
                <th className="px-4 py-3.5">Principal</th>
                <th className="px-4 py-3.5">Repayable</th>
                <th className="px-4 py-3.5">Total Paid</th>
                <th className="px-4 py-3.5">Balance</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredCustomerLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                    No loan facilities match your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomerLoans.map((cl) => {
                  const loan = loans.find((l) => l.id === cl.loanId);
                  const cust = customers.find((c) => c.id === cl.customerId);
                  const col = collaterals.find((c) => c.id === cl.collateralId);

                  return (
                    <tr key={cl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-slate-900 dark:text-white">
                        {loan?.loanCode || `LN-${cl.loanId}`}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{cust?.name || cl.customerId}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{cl.customerId}</p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                        LKR {cl.principalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-medium">
                        LKR {cl.totalAmountToPay.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        LKR {cl.totalPaid.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 dark:text-white">
                        LKR {cl.remainingBalance.toLocaleString()}
                        {cl.penaltyAmount > 0 && (
                          <span className="block text-[10px] text-rose-500 font-medium">
                            +LKR {cl.penaltyAmount.toLocaleString()} penalty
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                        {cl.dateDue}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            cl.paymentStatus === 'Active'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                              : cl.paymentStatus === 'Settled'
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 animate-pulse'
                          }`}
                        >
                          {cl.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            if (loan) setSelectedScheduleLoan({ loan, customerLoan: cl, customer: cust });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition-colors"
                          title="View Schedule"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => {
                            if (cust && loan) {
                              PdfService.generateLoanAgreement({
                                customer: cust,
                                loan,
                                customerLoan: cl,
                                collateral: col
                              });
                              showToast('info', 'Downloading Agreement PDF', `Contract #${loan.loanCode}`);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          title="Print / Download Contract PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disburse Loan Modal with AI Risk Checker */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Loan Origination</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Disburse Loan Facility</h3>
              </div>
              <button
                onClick={() => setIsDisburseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisburseLoan} className="space-y-4 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Borrower *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => {
                    const custId = e.target.value;
                    const custCol = collaterals.find((col) => col.customerId === custId);
                    setFormData({
                      ...formData,
                      customerId: custId,
                      collateralId: custCol ? custCol.id : ''
                    });
                    setAiRiskResult(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id}) - Score: {c.creditScore} • {c.status}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">{selectedCustomer.name}</span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Income: LKR {(selectedCustomer.monthlyIncome || 0).toLocaleString()} • {selectedCustomer.employment}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiRiskCheck}
                    disabled={isEvaluatingAI}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isEvaluatingAI ? 'Analyzing...' : 'AI Risk Check'}</span>
                  </button>
                </div>
              )}

              {/* AI Risk Score Assessment Box */}
              {aiRiskResult && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-emerald-500/40 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">AI Risk Assessment</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        aiRiskResult.riskTier === 'Low Risk'
                          ? 'bg-emerald-500 text-slate-950'
                          : aiRiskResult.riskTier === 'Moderate Risk'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {aiRiskResult.riskTier} ({aiRiskResult.score}/100)
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-semibold">
                    Recommendation: <span className="text-emerald-400 font-bold">{aiRiskResult.recommendation}</span>
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    {aiRiskResult.keyInsights.map((ins, i) => (
                      <p key={i}>• {ins}</p>
                    ))}
                  </div>

                  {aiRiskResult.suggestedConditions.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-300">Suggested Terms: </span>
                      {aiRiskResult.suggestedConditions.join(' | ')}
                    </div>
                  )}
                </div>
              )}

              {/* Loan Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Facility Description *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Principal Amount (LKR) *</label>
                  <input
                    type="number"
                    required
                    step={5000}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tenure (Days) *</label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Interest Rate (% p.a.) *</label>
                  <input
                    type="number"
                    step={0.5}
                    required
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Interest Method</label>
                  <select
                    value={formData.interestType}
                    onChange={(e) => setFormData({ ...formData, interestType: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Flat">Flat Rate</option>
                    <option value="Reducing">Reducing Balance (EMI)</option>
                  </select>
                </div>
              </div>

              {/* Linked Collateral */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pledged Collateral Asset</label>
                <select
                  value={formData.collateralId}
                  onChange={(e) => setFormData({ ...formData, collateralId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                >
                  <option value="">-- No Collateral / Unsecured --</option>
                  {collaterals.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name} ({col.type}) - Valued: LKR {col.estimatedValue.toLocaleString()} [{col.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Calculation Breakdown Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Calculated Finance Charge (Interest):</span>
                  <span className="font-bold text-slate-900 dark:text-white">LKR {calcResult.totalInterest.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Monthly Installment (Est.):</span>
                  <span className="font-bold text-slate-900 dark:text-white">LKR {calcResult.monthlyInstallment.toLocaleString()} / mo</span>
                </div>
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Total Repayable Amount:</span>
                  <span>LKR {calcResult.totalAmountToPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emailNotice"
                  checked={formData.sendEmailNotice}
                  onChange={(e) => setFormData({ ...formData, sendEmailNotice: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="emailNotice" className="text-slate-600 dark:text-slate-400 cursor-pointer">
                  Send automated Loan Approval notification email to borrower upon confirmation
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  Confirm & Disburse Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amortization Schedule Modal */}
      {selectedScheduleLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Amortization Schedule</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedScheduleLoan.loan.loanCode} - {selectedScheduleLoan.customer?.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedScheduleLoan(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2">Installment</th>
                    <th className="px-3 py-2">Principal</th>
                    <th className="px-3 py-2">Interest</th>
                    <th className="px-3 py-2">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {LoanService.calculateLoan(
                    selectedScheduleLoan.loan.amount,
                    selectedScheduleLoan.loan.interestRate,
                    selectedScheduleLoan.loan.durationDays,
                    selectedScheduleLoan.loan.interestType
                  ).schedule.map((row) => (
                    <tr key={row.installmentNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-bold">{row.installmentNumber}</td>
                      <td className="px-3 py-2 text-slate-500">{row.dueDate}</td>
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                        LKR {row.installmentAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-emerald-600">LKR {row.principalPortion.toLocaleString()}</td>
                      <td className="px-3 py-2 text-slate-500">LKR {row.interestPortion.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono">LKR {row.remainingPrincipal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedScheduleLoan(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
