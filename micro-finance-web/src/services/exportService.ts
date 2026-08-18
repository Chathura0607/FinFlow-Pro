import * as XLSX from 'xlsx';
import { db } from '../db/db';

export const ExportService = {
  /**
   * Export Customers table to Excel
   */
  async exportCustomersToExcel(): Promise<void> {
    const customers = await db.customers.toArray();
    const worksheet = XLSX.utils.json_to_sheet(customers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    XLSX.writeFile(workbook, `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  /**
   * Export Master Loans Ledger to Excel
   */
  async exportLoansToExcel(): Promise<void> {
    const customerLoans = await db.customerLoans.toArray();
    const loans = await db.loans.toArray();
    const customers = await db.customers.toArray();

    const reportData = customerLoans.map((cl) => {
      const loan = loans.find((l) => l.id === cl.loanId);
      const cust = customers.find((c) => c.id === cl.customerId);
      return {
        'Loan Code': loan?.loanCode || `LN-${cl.loanId}`,
        'Customer Name': cust?.name || cl.customerId,
        'Customer NIC': cust?.nic || cl.customerId,
        'Principal (LKR)': cl.principalAmount,
        'Total Repayable (LKR)': cl.totalAmountToPay,
        'Total Paid (LKR)': cl.totalPaid,
        'Remaining Balance (LKR)': cl.remainingBalance,
        'Accrued Penalty (LKR)': cl.penaltyAmount,
        'Issue Date': cl.dateIssued,
        'Due Date': cl.dateDue,
        'Status': cl.paymentStatus
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Loans_Master_Ledger');
    XLSX.writeFile(workbook, `Loans_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  /**
   * Export Payments History to Excel
   */
  async exportPaymentsToExcel(): Promise<void> {
    const payments = await db.payments.toArray();
    const worksheet = XLSX.utils.json_to_sheet(payments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments_History');
    XLSX.writeFile(workbook, `Payments_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  /**
   * Export Expenses to Excel
   */
  async exportExpensesToExcel(): Promise<void> {
    const expenses = await db.expenses.toArray();
    const worksheet = XLSX.utils.json_to_sheet(expenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, `Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};
