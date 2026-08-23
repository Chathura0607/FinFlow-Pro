import React, { useState } from 'react';
import {
  AlertOctagon,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Search,
  Phone,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import type { CustomerLoan, Loan, Customer, Penalty } from '../../db/types';
import { LoanService } from '../../services/loanService';
import { EmailService } from '../../services/emailService';
import { db } from '../../db/db';
import { useToast } from '../layout/Toast';

interface PenaltyViewProps {
  customerLoans: CustomerLoan[];
  loans: Loan[];
  customers: Customer[];
  penalties: Penalty[];
  onOpenPaymentForLoan: (loanId: number) => void;
  onRefreshPenalties: () => void;
}

export const PenaltyView: React.FC<PenaltyViewProps> = ({
  customerLoans,
  loans,
  customers,
  penalties,
  onOpenPaymentForLoan,
  onRefreshPenalties
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState<number | null>(null);

  // Active or overdue contracts
  const overdueContracts = customerLoans.filter((cl) => {
    const penaltyInfo = LoanService.calculatePenalty(cl);
    return penaltyInfo.isOverdue || cl.paymentStatus === 'Overdue';
  });

  const filteredOverdue = overdueContracts.filter((cl) => {
    const cust = customers.find((c) => c.id === cl.customerId);
    const loan = loans.find((l) => l.id === cl.loanId);
    return (
      (cust?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loan?.loanCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      cl.customerId.includes(searchQuery)
    );
  });

  const handleSendOverdueNotice = async (cl: CustomerLoan) => {
    const cust = customers.find((c) => c.id === cl.customerId);
    const loan = loans.find((l) => l.id === cl.loanId);
    if (!cust?.email || !loan) {
      showToast('warning', 'No Customer Email', 'Customer does not have a registered email address.');
      return;
    }

    setIsSendingEmail(cl.loanId);
    try {
      const penaltyInfo = LoanService.calculatePenalty(cl);
      await EmailService.sendOverdueNotice(
        cust,
        loan,
        penaltyInfo.daysOverdue,
        penaltyInfo.penaltyAmount,
        cl.remainingBalance
      );
      showToast('success', 'Overdue Notice Dispatched', `Overdue warning email sent to ${cust.email}`);
    } catch (err: any) {
      showToast('error', 'Failed to Send Notice', err.message);
    } finally {
      setIsSendingEmail(null);
    }
  };

  const handleWaivePenalty = async (cl: CustomerLoan) => {
    if (!cl.id) return;
    if (window.confirm(`Waive all accrued penalties for Loan #${cl.loanId}?`)) {
      await db.customerLoans.update(cl.id, { penaltyAmount: 0 });
      const penaltyRecords = await db.penalties.where({ loanId: cl.loanId }).toArray();
      for (const p of penaltyRecords) {
        if (p.id) await db.penalties.update(p.id, { isWaived: true, isPaid: true });
      }
      showToast('info', 'Penalty Waived', `Penalty waived for Loan #${cl.loanId}`);
    }
  };

  const totalOverdueBalance = overdueContracts.reduce((sum, cl) => sum + (cl.remainingBalance || 0), 0);
  const totalAccruedPenalties = overdueContracts.reduce((sum, cl) => {
    const p = LoanService.calculatePenalty(cl);
    return sum + p.penaltyAmount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <span>Overdue Loans & Penalty Control ({overdueContracts.length})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Daily dynamic penalty calculation (0.25% daily rate), recovery follow-ups, and email alerts
          </p>
        </div>

        <button
          onClick={onRefreshPenalties}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          <span>Recalculate Accruals</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
          <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">Total Overdue Contracts</span>
          <h4 className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-2">
            {overdueContracts.length} Accounts
          </h4>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
          <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">Total At-Risk Principal & Interest</span>
          <h4 className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-2">
            LKR {totalOverdueBalance.toLocaleString()}
          </h4>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Total Accrued Penalties</span>
          <h4 className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-2">
            LKR {totalAccruedPenalties.toLocaleString()}
          </h4>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search overdue borrowers, loan codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Overdue Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Loan Code</th>
                <th className="px-4 py-3.5">Borrower</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5">Days Overdue</th>
                <th className="px-4 py-3.5">Unpaid Balance</th>
                <th className="px-4 py-3.5">Penalty (0.25%/day)</th>
                <th className="px-4 py-3.5">Total Claim</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredOverdue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-emerald-600 font-semibold italic">
                    🎉 Excellent! Zero overdue loan facilities found in the system.
                  </td>
                </tr>
              ) : (
                filteredOverdue.map((cl) => {
                  const loan = loans.find((l) => l.id === cl.loanId);
                  const cust = customers.find((c) => c.id === cl.customerId);
                  const penaltyInfo = LoanService.calculatePenalty(cl);
                  const totalClaim = cl.remainingBalance + penaltyInfo.penaltyAmount;

                  return (
                    <tr key={cl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-rose-600">
                        {loan?.loanCode || `LN-${cl.loanId}`}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{cust?.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{cust?.phoneNumber}</p>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-500">
                        {cl.dateDue}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                          {penaltyInfo.daysOverdue} Days Late
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        LKR {cl.remainingBalance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-rose-600 dark:text-rose-400">
                        LKR {penaltyInfo.penaltyAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 dark:text-white">
                        LKR {totalClaim.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleSendOverdueNotice(cl)}
                          disabled={isSendingEmail === cl.loanId}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors"
                          title="Dispatch Overdue Notice Email"
                        >
                          <Mail className="w-3.5 h-3.5 inline mr-1" />
                          <span>{isSendingEmail === cl.loanId ? 'Sending...' : 'Notice'}</span>
                        </button>
                        <button
                          onClick={() => onOpenPaymentForLoan(cl.loanId)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                          title="Record Payment"
                        >
                          Settle
                        </button>
                        <button
                          onClick={() => handleWaivePenalty(cl)}
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-[10px] font-semibold"
                          title="Waive Accrued Penalties"
                        >
                          Waive
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
    </div>
  );
};
