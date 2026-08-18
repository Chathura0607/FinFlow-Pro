import { db } from '../db/db';
import type { CustomerLoan, Loan } from '../db/types';

export interface AmortizationRow {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingPrincipal: number;
}

export interface LoanCalculationResult {
  principalAmount: number;
  totalInterest: number;
  totalAmountToPay: number;
  monthlyInstallment: number;
  schedule: AmortizationRow[];
}

export const LoanService = {
  /**
   * Calculate loan total amount, interest, monthly installment and full schedule.
   * Duration in days or months.
   */
  calculateLoan(
    amount: number,
    interestRate: number,
    durationDays: number,
    interestType: 'Flat' | 'Reducing' = 'Flat'
  ): LoanCalculationResult {
    const months = Math.max(1, Math.round(durationDays / 30));
    const annualRate = interestRate / 100;
    const monthlyRate = annualRate / 12;

    let totalInterest = 0;
    let monthlyInstallment = 0;
    const schedule: AmortizationRow[] = [];

    if (interestType === 'Flat') {
      // Flat Rate: Interest = P * r * (days / 365)
      totalInterest = amount * annualRate * (durationDays / 365);
      const totalAmount = amount + totalInterest;
      monthlyInstallment = totalAmount / months;

      let remainingPrincipal = amount;
      const principalPerMonth = amount / months;
      const interestPerMonth = totalInterest / months;

      for (let i = 1; i <= months; i++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + i * 30);
        remainingPrincipal = Math.max(0, remainingPrincipal - principalPerMonth);

        schedule.push({
          installmentNumber: i,
          dueDate: dueDate.toISOString().split('T')[0],
          installmentAmount: Math.round(monthlyInstallment),
          principalPortion: Math.round(principalPerMonth),
          interestPortion: Math.round(interestPerMonth),
          remainingPrincipal: Math.round(remainingPrincipal)
        });
      }
    } else {
      // Reducing Balance: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
      if (monthlyRate === 0) {
        monthlyInstallment = amount / months;
      } else {
        monthlyInstallment =
          (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);
      }

      let remainingPrincipal = amount;
      for (let i = 1; i <= months; i++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + i * 30);

        const interestPortion = remainingPrincipal * monthlyRate;
        const principalPortion = monthlyInstallment - interestPortion;
        remainingPrincipal = Math.max(0, remainingPrincipal - principalPortion);
        totalInterest += interestPortion;

        schedule.push({
          installmentNumber: i,
          dueDate: dueDate.toISOString().split('T')[0],
          installmentAmount: Math.round(monthlyInstallment),
          principalPortion: Math.round(principalPortion),
          interestPortion: Math.round(interestPortion),
          remainingPrincipal: Math.round(remainingPrincipal)
        });
      }
    }

    const totalAmountToPay = Math.round(amount + totalInterest);

    return {
      principalAmount: Math.round(amount),
      totalInterest: Math.round(totalInterest),
      totalAmountToPay,
      monthlyInstallment: Math.round(monthlyInstallment),
      schedule
    };
  },

  /**
   * Check if a loan is overdue and calculate penalty (0.25% daily rate)
   */
  calculatePenalty(customerLoan: CustomerLoan): { isOverdue: boolean; daysOverdue: number; penaltyAmount: number } {
    if (customerLoan.paymentStatus === 'Settled' || customerLoan.remainingBalance <= 0) {
      return { isOverdue: false, daysOverdue: 0, penaltyAmount: 0 };
    }

    const dueDate = new Date(customerLoan.dateDue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysOverdue > 0) {
      // 0.25% per day on remaining unpaid balance
      const dailyPenaltyRate = 0.0025;
      const penaltyAmount = Math.round(customerLoan.remainingBalance * dailyPenaltyRate * daysOverdue);
      return { isOverdue: true, daysOverdue, penaltyAmount };
    }

    return { isOverdue: false, daysOverdue: 0, penaltyAmount: 0 };
  },

  /**
   * Create and disburse a new Loan
   */
  async disburseLoan(params: {
    customerId: string;
    description: string;
    amount: number;
    durationDays: number;
    interestRate: number;
    interestType?: 'Flat' | 'Reducing';
    collateralId?: string;
    approvedBy: string;
  }): Promise<{ loanId: number; customerLoanId: number }> {
    const calc = this.calculateLoan(
      params.amount,
      params.interestRate,
      params.durationDays,
      params.interestType || 'Flat'
    );

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + params.durationDays);

    const dateIssuedStr = issueDate.toISOString().split('T')[0];
    const dateDueStr = dueDate.toISOString().split('T')[0];

    const count = await db.loans.count();
    const loanCode = `LN-${1000 + count + 1}`;

    return await db.transaction('rw', [db.loans, db.customerLoans, db.collaterals, db.activityLogs], async () => {
      const loanId = await db.loans.add({
        loanCode,
        description: params.description,
        amount: params.amount,
        durationDays: params.durationDays,
        interestRate: params.interestRate,
        interestType: params.interestType || 'Flat',
        status: 'Active',
        collateralId: params.collateralId,
        createdAt: dateIssuedStr
      });

      const customerLoanId = await db.customerLoans.add({
        loanId,
        customerId: params.customerId,
        dateIssued: dateIssuedStr,
        dateDue: dateDueStr,
        principalAmount: params.amount,
        totalAmountToPay: calc.totalAmountToPay,
        totalPaid: 0,
        remainingBalance: calc.totalAmountToPay,
        paymentStatus: 'Active',
        penaltyAmount: 0,
        collateralId: params.collateralId,
        monthlyInstallment: calc.monthlyInstallment,
        approvedBy: params.approvedBy
      });

      if (params.collateralId) {
        await db.collaterals.update(params.collateralId, {
          loanId,
          customerId: params.customerId,
          status: 'Pledged'
        });
      }

      await db.activityLogs.add({
        timestamp: new Date().toISOString(),
        userName: params.approvedBy,
        action: 'Loan Disbursed',
        entityType: 'Loan',
        details: `Disbursed Loan #${loanCode} (LKR ${params.amount.toLocaleString()}) for Customer #${params.customerId}`
      });

      return { loanId, customerLoanId };
    });
  },

  /**
   * Scan all active loans and update overdue status and penalties
   */
  async updateOverduePenalties(): Promise<number> {
    const activeLoans = await db.customerLoans.where('paymentStatus').anyOf('Active', 'Overdue').toArray();
    let updatedCount = 0;

    for (const cl of activeLoans) {
      const penaltyInfo = this.calculatePenalty(cl);
      if (penaltyInfo.isOverdue && cl.id) {
        const newStatus = 'Overdue';
        await db.customerLoans.update(cl.id, {
          paymentStatus: newStatus,
          penaltyAmount: penaltyInfo.penaltyAmount
        });

        // Check if penalty log exists
        const existing = await db.penalties.where({ loanId: cl.loanId }).first();
        if (existing && existing.id) {
          await db.penalties.update(existing.id, {
            amount: penaltyInfo.penaltyAmount,
            daysOverdue: penaltyInfo.daysOverdue,
            dateApplied: new Date().toISOString().split('T')[0]
          });
        } else {
          await db.penalties.add({
            loanId: cl.loanId,
            customerId: cl.customerId,
            amount: penaltyInfo.penaltyAmount,
            dateApplied: new Date().toISOString().split('T')[0],
            reason: `Automatic overdue penalty (${penaltyInfo.daysOverdue} days past due)`,
            daysOverdue: penaltyInfo.daysOverdue,
            isPaid: false
          });
        }
        updatedCount++;
      }
    }
    return updatedCount;
  }
};
