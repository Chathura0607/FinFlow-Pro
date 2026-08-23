import React, { useState } from 'react';
import {
  CreditCard,
  PlusCircle,
  Search,
  FileSpreadsheet,
  Printer,
  FileText,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';
import type { Payment, CustomerLoan, Loan, Customer, Collateral, User } from '../../db/types';
import { PaymentService, type PaymentReceiptDetails } from '../../services/paymentService';
import { PdfService } from '../../services/pdfService';
import { EmailService } from '../../services/emailService';
import { ExportService } from '../../services/exportService';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';
import confetti from 'canvas-confetti';

interface PaymentViewProps {
  payments: Payment[];
  customerLoans: CustomerLoan[];
  loans: Loan[];
  customers: Customer[];
  collaterals: Collateral[];
  currentUser: User | null;
  initialLoanIdForPayment?: number | null;
  onClearInitialLoanId?: () => void;
}

export const PaymentView: React.FC<PaymentViewProps> = ({
  payments,
  customerLoans,
  loans,
  customers,
  collaterals,
  currentUser,
  initialLoanIdForPayment,
  onClearInitialLoanId
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeReceiptModal, setActiveReceiptModal] = useState<PaymentReceiptDetails | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    loanId: number | string;
    amount: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Online / Card' | 'Cheque';
    reference: string;
    notes: string;
    sendEmailNotice: boolean;
  }>({
    loanId: customerLoans[0]?.loanId || '',
    amount: 25000,
    paymentMethod: 'Cash',
    reference: '',
    notes: '',
    sendEmailNotice: true
  });

  const selectedContract = customerLoans.find((cl) => cl.loanId === Number(formData.loanId));
  const selectedLoan = loans.find((l) => l.id === Number(formData.loanId));
  const selectedCustomer = selectedContract ? customers.find((c) => c.id === selectedContract.customerId) : undefined;

  // Contextual Trigger
  React.useEffect(() => {
    if (initialLoanIdForPayment) {
      setFormData((prev) => ({
        ...prev,
        loanId: initialLoanIdForPayment,
        amount: customerLoans.find((cl) => cl.loanId === initialLoanIdForPayment)?.monthlyInstallment || 50000
      }));
      setIsRecordModalOpen(true);
      if (onClearInitialLoanId) onClearInitialLoanId();
    }
  }, [initialLoanIdForPayment, customerLoans, onClearInitialLoanId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.loanId) {
      showToast('error', 'Validation Error', 'Please select a valid loan contract.');
      return;
    }

    if (!selectedContract) {
      showToast('error', 'Validation Error', 'Selected loan contract not found.');
      return;
    }

    const totalOutstanding = selectedContract.remainingBalance + (selectedContract.penaltyAmount || 0);

    if (totalOutstanding <= 0) {
      showToast('warning', 'Already Settled', 'This loan facility is already fully paid and settled.');
      return;
    }

    const amountCheck = SecurityService.validateAmount(formData.amount, 1, totalOutstanding, 'Payment Amount');
    if (!amountCheck.isValid) {
      showToast('error', 'Validation Error', `${amountCheck.error} (Max outstanding balance: LKR ${totalOutstanding.toLocaleString()})`);
      return;
    }

    try {
      const receiptDetails = await PaymentService.recordPayment({
        loanId: Number(formData.loanId),
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        reference: SecurityService.sanitizeString(formData.reference),
        notes: SecurityService.sanitizeString(formData.notes),
        receivedBy: currentUser?.username || 'Admin'
      });

      await SecurityService.logSecurityEvent(
        'Repayment Processed',
        `Payment of LKR ${formData.amount.toLocaleString()} received for Loan #${selectedLoan?.loanCode || formData.loanId} (Receipt: ${receiptDetails.payment.receiptNo})`,
        currentUser?.username || 'Admin',
        'Payment'
      );

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });

      // Trigger Email Notification
      if (formData.sendEmailNotice && receiptDetails.customer?.email && receiptDetails.loan) {
        await EmailService.sendPaymentReceiptNotice(
          receiptDetails.customer,
          receiptDetails.payment,
          receiptDetails.loan,
          receiptDetails.remainingBalanceAfterPayment
        );
      }

      showToast(
        'success',
        'Payment Recorded Successfully!',
        `Receipt #${receiptDetails.payment.receiptNo} (LKR ${receiptDetails.payment.amount.toLocaleString()})`
      );

      setIsRecordModalOpen(false);
      setActiveReceiptModal(receiptDetails);
    } catch (err: any) {
      showToast('error', 'Payment Processing Failed', err.message);
    }
  };

  // Filtered payments list
  const filteredPayments = payments.filter((p) => {
    const cust = customers.find((c) => c.id === p.customerId);
    const loan = loans.find((l) => l.id === p.loanId);
    const matchesSearch =
      p.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loan?.loanCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'All' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>Repayments Ledger & Receipts ({payments.length})</span>
          </h3>
          <p className="text-xs text-slate-500">Record customer loan installments, generate official PDF receipts, and balance accounts</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => ExportService.exportPaymentsToExcel()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Payments</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipt #, borrower, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Cash', 'Bank Transfer', 'Online / Card', 'Cheque'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                methodFilter === m
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Master Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Receipt #</th>
                <th className="px-4 py-3.5">Payment Date</th>
                <th className="px-4 py-3.5">Borrower</th>
                <th className="px-4 py-3.5">Facility</th>
                <th className="px-4 py-3.5">Amount (LKR)</th>
                <th className="px-4 py-3.5">Principal Credit</th>
                <th className="px-4 py-3.5">Channel</th>
                <th className="px-4 py-3.5">Cashier</th>
                <th className="px-4 py-3.5 text-right">Receipt PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                    No payment records match your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const cust = customers.find((c) => c.id === p.customerId);
                  const loan = loans.find((l) => l.id === p.loanId);
                  const cl = customerLoans.find((c) => c.loanId === p.loanId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {p.receiptNo}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                        {p.paymentDate}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{cust?.name || p.customerId}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.customerId}</p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        {loan?.loanCode || `LN-${p.loanId}`}
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 dark:text-white text-sm">
                        LKR {p.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        LKR {p.principalPortion.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {p.receivedBy || 'Admin'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            PdfService.generatePaymentReceipt({
                              payment: p,
                              customer: cust,
                              loan,
                              customerLoan: cl,
                              remainingBalance: cl?.remainingBalance || 0
                            });
                            showToast('info', 'Downloading Receipt PDF', `Receipt #${p.receiptNo}`);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          title="Download Official Receipt PDF"
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

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Cashier Repayments</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Record Loan Installment</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              {/* Select Loan Contract */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Active Facility *</label>
                <select
                  required
                  value={formData.loanId}
                  onChange={(e) => {
                    const loanId = Number(e.target.value);
                    const contract = customerLoans.find((cl) => cl.loanId === loanId);
                    setFormData({
                      ...formData,
                      loanId,
                      amount: contract?.monthlyInstallment || contract?.remainingBalance || 50000
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {customerLoans
                    .filter((cl) => cl.paymentStatus !== 'Settled')
                    .map((cl) => {
                      const loan = loans.find((l) => l.id === cl.loanId);
                      const cust = customers.find((c) => c.id === cl.customerId);
                      return (
                        <option key={cl.loanId} value={cl.loanId}>
                          {loan?.loanCode || `LN-${cl.loanId}`} • {cust?.name} (Remaining: LKR {cl.remainingBalance.toLocaleString()}) [{cl.paymentStatus}]
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Selected Contract Info Box */}
              {selectedContract && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Borrower Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedCustomer?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Current Outstanding Balance:</span>
                    <span className="font-black text-slate-900 dark:text-white">LKR {selectedContract.remainingBalance.toLocaleString()}</span>
                  </div>
                  {selectedContract.penaltyAmount > 0 && (
                    <div className="flex items-center justify-between text-rose-600 font-bold">
                      <span>Accrued Overdue Penalty:</span>
                      <span>+LKR {selectedContract.penaltyAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Standard Monthly Installment:</span>
                    <span className="font-semibold text-emerald-600">LKR {(selectedContract.monthlyInstallment || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Amount & Quick Fill Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Payment Amount (LKR) *</label>
                  {selectedContract && (
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, amount: selectedContract.monthlyInstallment || 50000 })}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                      >
                        Set Installment
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, amount: selectedContract.remainingBalance })}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                      >
                        Full Settle (LKR {selectedContract.remainingBalance.toLocaleString()})
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min={100}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="Bank Transfer">Bank Direct Transfer</option>
                    <option value="Online / Card">Online Gateway / Card</option>
                    <option value="Cheque">Cheque Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Transaction Ref / Cheque #</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmailNotice"
                  checked={formData.sendEmailNotice}
                  onChange={(e) => setFormData({ ...formData, sendEmailNotice: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="sendEmailNotice" className="text-slate-600 dark:text-slate-400 cursor-pointer">
                  Send digital payment receipt email to customer upon posting
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  Post Payment & Print Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Receipt Popup Modal */}
      {activeReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Repayment Successful!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Receipt <span className="font-mono font-bold text-emerald-600">{activeReceiptModal.payment.receiptNo}</span> has been issued.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-left text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeReceiptModal.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-black text-emerald-600">LKR {activeReceiptModal.payment.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className="font-bold text-slate-900 dark:text-white">LKR {activeReceiptModal.remainingBalanceAfterPayment.toLocaleString()}</span>
              </div>
              {activeReceiptModal.remainingBalanceAfterPayment <= 0 && (
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-center text-xs mt-2">
                  🎉 Facility Fully Settled & Discharged!
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setActiveReceiptModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  PdfService.generatePaymentReceipt({
                    payment: activeReceiptModal.payment,
                    customer: activeReceiptModal.customer,
                    loan: activeReceiptModal.loan,
                    customerLoan: activeReceiptModal.customerLoan,
                    remainingBalance: activeReceiptModal.remainingBalanceAfterPayment
                  });
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
