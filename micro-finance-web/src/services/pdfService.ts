import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Customer, Loan, Payment, CustomerLoan, Collateral } from '../db/types';

export const PdfService = {
  /**
   * Official Payment Receipt PDF
   */
  generatePaymentReceipt(params: {
    payment: Payment;
    customer?: Customer;
    loan?: Loan;
    customerLoan?: CustomerLoan;
    remainingBalance: number;
  }): void {
    const { payment, customer, loan, remainingBalance } = params;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // Header Branding
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.rect(0, 0, 595, 80, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('MICRO FINANCE MANAGEMENT SYSTEM', 40, 42);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Transaction & Repayment Receipt', 40, 62);

    // Receipt Meta Badge
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECEIPT #: ${payment.receiptNo}`, 40, 115);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Issued: ${payment.paymentDate}`, 40, 132);
    doc.text(`Received By: ${payment.receivedBy || 'Cashier Desk'}`, 40, 147);
    doc.text(`Payment Channel: ${payment.paymentMethod}`, 40, 162);

    // Customer Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(320, 95, 235, 75, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CUSTOMER DETAILS', 332, 115);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${customer?.name || 'Valued Customer'}`, 332, 132);
    doc.text(`NIC/ID: ${customer?.id || 'N/A'}`, 332, 147);
    doc.text(`Phone: ${customer?.phoneNumber || 'N/A'}`, 332, 162);

    // Table of breakdown
    autoTable(doc, {
      startY: 190,
      head: [['Description / Allocation', 'Reference / Loan Code', 'Amount (LKR)']],
      body: [
        [
          `Principal Repayment (${loan?.description || 'Loan Repayment'})`,
          loan?.loanCode || `LN-${payment.loanId}`,
          `LKR ${payment.principalPortion.toLocaleString()}`
        ],
        [
          'Interest Accrual Credit',
          'Standard Finance Charge',
          `LKR ${payment.interestPortion.toLocaleString()}`
        ],
        [
          'Late Overdue Penalty Settled',
          payment.penaltyPortion > 0 ? 'Overdue Penalty' : 'None',
          `LKR ${payment.penaltyPortion.toLocaleString()}`
        ]
      ],
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 8 },
      theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 300;

    // Totals Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(300, finalY + 15, 255, 80, 4, 4, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`TOTAL PAID: LKR ${payment.amount.toLocaleString()}`, 315, finalY + 40);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Remaining Loan Balance: LKR ${remainingBalance.toLocaleString()}`, 315, finalY + 60);

    if (remainingBalance <= 0) {
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text('STATUS: LOAN FULLY SETTLED & CLOSED', 315, finalY + 80);
    }

    // Footer & Signature
    doc.setDrawColor(203, 213, 225);
    doc.line(40, finalY + 130, 200, finalY + 130);
    doc.line(350, finalY + 130, 510, finalY + 130);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Customer Signature', 75, finalY + 145);
    doc.text('Authorized Finance Officer', 370, finalY + 145);

    doc.setFontSize(8);
    doc.text('This is a computer-generated official receipt. Micro Finance Management System Pro.', 130, 800);

    doc.save(`${payment.receiptNo}.pdf`);
  },

  /**
   * Customer Loan Statement & Agreement PDF
   */
  generateLoanAgreement(params: {
    customer: Customer;
    loan: Loan;
    customerLoan: CustomerLoan;
    collateral?: Collateral;
  }): void {
    const { customer, loan, customerLoan, collateral } = params;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 595, 75, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MICRO FINANCE LOAN CONTRACT', 40, 42);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Facility Code: ${loan.loanCode} | Issue Date: ${customerLoan.dateIssued}`, 40, 60);

    // Customer & Loan Summary
    autoTable(doc, {
      startY: 95,
      head: [['Borrower Profile', 'Loan Terms & Security']],
      body: [
        [
          `Full Name: ${customer.name}\nNIC: ${customer.nic}\nPhone: ${customer.phoneNumber}\nAddress: ${customer.address}`,
          `Principal Amount: LKR ${loan.amount.toLocaleString()}\nTotal Repayable: LKR ${customerLoan.totalAmountToPay.toLocaleString()}\nDuration: ${loan.durationDays} Days\nInterest Rate: ${loan.interestRate}% p.a.\nDue Date: ${customerLoan.dateDue}\nCollateral: ${collateral ? `${collateral.name} (Valued: LKR ${collateral.estimatedValue.toLocaleString()})` : 'Unsecured'}`
        ]
      ],
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 8 },
      theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 250;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TERMS AND LEGAL CONDITIONS:', 40, finalY + 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const terms = [
      '1. The borrower agrees to repay the total debt in regular agreed installments on or before the due date.',
      '2. In the event of default or late payment, an overdue penalty of 0.25% per day will accrue on unpaid balances.',
      '3. Pledged collateral assets remain legally encumbered until the loan contract is fully settled and discharged.',
      '4. Any dispute arising under this agreement shall be governed under the laws of Sri Lanka.'
    ];

    let y = finalY + 45;
    terms.forEach((t) => {
      doc.text(t, 40, y);
      y += 18;
    });

    // Signatures
    doc.line(40, y + 60, 200, y + 60);
    doc.line(350, y + 60, 510, y + 60);

    doc.text('Borrower Signature', 75, y + 75);
    doc.text('Authorized Lender Officer', 370, y + 75);

    doc.save(`Loan_Agreement_${loan.loanCode}.pdf`);
  }
};
