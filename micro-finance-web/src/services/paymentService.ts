import { db } from '../db/db';
import type { Payment, CustomerLoan, Customer, Loan, Collateral } from '../db/types';

export interface PaymentReceiptDetails {
  payment: Payment;
  customer?: Customer;
  loan?: Loan;
  customerLoan?: CustomerLoan;
  collateral?: Collateral;
  remainingBalanceAfterPayment: number;
}

export const PaymentService = {
  /**
   * Process a customer repayment with ledger synchronization
   */
  async recordPayment(params: {
    loanId: number;
    amount: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Online / Card' | 'Cheque';
    reference?: string;
    notes?: string;
    receivedBy: string;
  }): Promise<PaymentReceiptDetails> {
    const customerLoan = await db.customerLoans.where({ loanId: params.loanId }).first();
    if (!customerLoan || !customerLoan.id) {
      throw new Error(`Customer loan contract not found for Loan ID #${params.loanId}`);
    }

    const loan = await db.loans.get(params.loanId);
    const customer = await db.customers.get(customerLoan.customerId);

    // Calculate receipt number: REC-YYYYMM-XXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paymentCount = await db.payments.count();
    const receiptNo = `REC-${yearMonth}-${String(paymentCount + 1).padStart(3, '0')}`;
    const dateStr = now.toISOString().split('T')[0];

    // Split amount: Priority -> Penalty, then Interest, then Principal
    let penaltyPortion = 0;
    if (customerLoan.penaltyAmount > 0) {
      penaltyPortion = Math.min(params.amount, customerLoan.penaltyAmount);
    }
    const remainingAfterPenalty = params.amount - penaltyPortion;
    const interestPortion = Math.round(remainingAfterPenalty * 0.15); // standard ratio
    const principalPortion = Math.max(0, remainingAfterPenalty - interestPortion);

    const newTotalPaid = (customerLoan.totalPaid || 0) + params.amount;
    const newPenalty = Math.max(0, (customerLoan.penaltyAmount || 0) - penaltyPortion);
    const newRemaining = Math.max(0, customerLoan.totalAmountToPay + newPenalty - newTotalPaid);
    const isSettled = newRemaining <= 0;

    let linkedCollateral: Collateral | undefined;
    if (customerLoan.collateralId) {
      linkedCollateral = await db.collaterals.get(customerLoan.collateralId);
    }

    const paymentRecord: Payment = {
      receiptNo,
      paymentDate: dateStr,
      loanId: params.loanId,
      customerId: customerLoan.customerId,
      amount: params.amount,
      principalPortion,
      interestPortion,
      penaltyPortion,
      paymentMethod: params.paymentMethod,
      reference: params.reference,
      notes: params.notes,
      receivedBy: params.receivedBy
    };

    await db.transaction('rw', [
      db.payments,
      db.customerLoans,
      db.loans,
      db.collaterals,
      db.penalties,
      db.activityLogs
    ], async () => {
      const paymentId = await db.payments.add(paymentRecord);
      paymentRecord.id = paymentId;

      await db.customerLoans.update(customerLoan.id!, {
        totalPaid: newTotalPaid,
        remainingBalance: newRemaining,
        penaltyAmount: newPenalty,
        paymentStatus: isSettled ? 'Settled' : customerLoan.paymentStatus
      });

      if (isSettled) {
        await db.loans.update(params.loanId, { status: 'Settled' });
        if (customerLoan.collateralId) {
          await db.collaterals.update(customerLoan.collateralId, { status: 'Released' });
        }
        // Mark penalties as paid
        const penalties = await db.penalties.where({ loanId: params.loanId }).toArray();
        for (const p of penalties) {
          if (p.id) await db.penalties.update(p.id, { isPaid: true });
        }
      }

      await db.activityLogs.add({
        timestamp: new Date().toISOString(),
        userName: params.receivedBy,
        action: 'Payment Received',
        entityType: 'Payment',
        details: `Received LKR ${params.amount.toLocaleString()} for Loan #${loan?.loanCode || params.loanId} (Receipt: ${receiptNo}). ${isSettled ? '🎉 Loan FULLY SETTLED!' : `Remaining: LKR ${newRemaining.toLocaleString()}`}`
      });
    });

    return {
      payment: paymentRecord,
      customer,
      loan,
      customerLoan,
      collateral: linkedCollateral,
      remainingBalanceAfterPayment: newRemaining
    };
  }
};
