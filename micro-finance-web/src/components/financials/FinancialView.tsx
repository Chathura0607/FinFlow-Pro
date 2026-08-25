import React, { useState } from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  Printer,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import type { CustomerLoan, Loan, Customer, Collateral, Payment, Expense } from '../../db/types';
import { ExportService } from '../../services/exportService';
import { useToast } from '../layout/Toast';

interface FinancialViewProps {
  customerLoans: CustomerLoan[];
  loans: Loan[];
  customers: Customer[];
  collaterals: Collateral[];
  payments: Payment[];
  expenses: Expense[];
}

export const FinancialView: React.FC<FinancialViewProps> = ({
  customerLoans,
  loans,
  customers,
  collaterals,
  payments,
  expenses
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Financial Math
  const totalPrincipalDisbursed = customerLoans.reduce((sum, cl) => sum + cl.principalAmount, 0);
  const totalRepaymentsCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInterestEarned = payments.reduce((sum, p) => sum + (p.interestPortion || 0), 0);
  const totalPenaltiesCollected = payments.reduce((sum, p) => sum + (p.penaltyPortion || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const grossIncome = totalInterestEarned + totalPenaltiesCollected;
  const netOperatingProfit = totalRepaymentsCollected - totalExpenses;

  // Master Financials Row matching JavaFX FinancialDTO
  const masterLedger = customerLoans.map((cl) => {
    const cust = customers.find((c) => c.id === cl.customerId);
    const loan = loans.find((l) => l.id === cl.loanId);
    const col = collaterals.find((col) => col.id === cl.collateralId || col.loanId === cl.loanId);

    return {
      customerId: cl.customerId,
      customerName: cust?.name || 'Unknown',
      loanId: cl.loanId,
      loanCode: loan?.loanCode || `LN-${cl.loanId}`,
      loanAmount: cl.principalAmount,
      collateralName: col?.name || 'Unsecured',
      issueDate: cl.dateIssued,
      dueDate: cl.dateDue,
      status: cl.paymentStatus,
      totalDue: cl.remainingBalance + (cl.penaltyAmount || 0),
      totalPaid: cl.totalPaid
    };
  });

  const filteredLedger = masterLedger.filter((row) =>
    row.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.loanCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Master Financials & Profit/Loss Audit</span>
          </h3>
          <p className="text-xs text-slate-500">
            Comprehensive financial performance statement, income streams, and portfolio balance ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              ExportService.exportLoansToExcel();
              showToast('info', 'Exporting Master Ledger', 'Downloading Excel file...');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Master Ledger</span>
          </button>
        </div>
      </div>

      {/* Financial Statement Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Total Capital Disbursed</span>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            LKR {totalPrincipalDisbursed.toLocaleString()}
          </h4>
          <p className="text-xs text-slate-500 mt-1">Portfolio Principal Base</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Cash Inflows (Collected)</span>
          <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            LKR {totalRepaymentsCollected.toLocaleString()}
          </h4>
          <p className="text-xs text-emerald-600 mt-1">Interest: LKR {totalInterestEarned.toLocaleString()}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Operating Expenses</span>
          <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            LKR {totalExpenses.toLocaleString()}
          </h4>
          <p className="text-xs text-rose-500 mt-1">{expenses.length} expense postings</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/20">
          <span className="text-xs font-semibold opacity-90">Net Cash Operating Balance</span>
          <h4 className="text-2xl font-black mt-2 tracking-tight">
            LKR {netOperatingProfit.toLocaleString()}
          </h4>
          <p className="text-xs opacity-90 mt-1">Surplus Margin</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search master ledger..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Master Financial Ledger Table (Replicating FinancialFormController from JavaFX) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Customer Loan Master Ledger</h4>
          <span className="text-xs text-slate-400">{filteredLedger.length} Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Customer NIC/ID</th>
                <th className="px-4 py-3.5">Customer Name</th>
                <th className="px-4 py-3.5">Facility Code</th>
                <th className="px-4 py-3.5">Disbursed (LKR)</th>
                <th className="px-4 py-3.5">Pledged Collateral</th>
                <th className="px-4 py-3.5">Date Issued</th>
                <th className="px-4 py-3.5">Date Due</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Total Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredLedger.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-slate-500">{row.customerId}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{row.customerName}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-600">{row.loanCode}</td>
                  <td className="px-4 py-3.5 font-semibold">LKR {row.loanAmount.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{row.collateralName}</td>
                  <td className="px-4 py-3.5 text-slate-500">{row.issueDate}</td>
                  <td className="px-4 py-3.5 text-slate-500">{row.dueDate}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        row.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.status === 'Settled'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-black text-right text-slate-900 dark:text-white">
                    LKR {row.totalDue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
