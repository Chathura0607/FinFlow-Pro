import emailjs from '@emailjs/browser';
import { db } from '../db/db';
import type { Customer, Loan, Payment, CustomerLoan } from '../db/types';

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  senderEmail: string;
  senderName: string;
  enableLiveDispatch: boolean;
}

export const EmailService = {
  getConfig(): EmailConfig {
    return {
      serviceId: localStorage.getItem('EMAILJS_SERVICE_ID') || 'service_microfinance',
      templateId: localStorage.getItem('EMAILJS_TEMPLATE_ID') || 'template_notification',
      publicKey: localStorage.getItem('EMAILJS_PUBLIC_KEY') || '',
      senderEmail: localStorage.getItem('EMAIL_SENDER_EMAIL') || 'notifications@microfinance.lk',
      senderName: localStorage.getItem('EMAIL_SENDER_NAME') || 'Micro Finance System Pro',
      enableLiveDispatch: localStorage.getItem('EMAIL_ENABLE_LIVE') === 'true'
    };
  },

  saveConfig(config: Partial<EmailConfig>): void {
    if (config.serviceId !== undefined) localStorage.setItem('EMAILJS_SERVICE_ID', config.serviceId);
    if (config.templateId !== undefined) localStorage.setItem('EMAILJS_TEMPLATE_ID', config.templateId);
    if (config.publicKey !== undefined) localStorage.setItem('EMAILJS_PUBLIC_KEY', config.publicKey);
    if (config.senderEmail !== undefined) localStorage.setItem('EMAIL_SENDER_EMAIL', config.senderEmail);
    if (config.senderName !== undefined) localStorage.setItem('EMAIL_SENDER_NAME', config.senderName);
    if (config.enableLiveDispatch !== undefined) localStorage.setItem('EMAIL_ENABLE_LIVE', String(config.enableLiveDispatch));
  },

  async sendEmail(params: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    type: 'Loan Approval' | 'Payment Receipt' | 'Overdue Alert' | 'Password Reset' | 'Custom Notice';
    bodyContent: string;
    templateParams?: Record<string, any>;
  }): Promise<{ success: boolean; mode: 'Live EmailJS' | 'Simulated & Logged'; message: string; errorDetails?: string }> {
    const config = this.getConfig();
    let status: 'Sent' | 'Delivered' | 'Failed' | 'Simulated' = 'Simulated';
    let mode: 'Live EmailJS' | 'Simulated & Logged' = 'Simulated & Logged';
    let responseMsg = 'Email successfully recorded in System Dispatch Ledger.';
    let errorDetails: string | undefined;

    if (config.enableLiveDispatch && config.publicKey && config.serviceId && config.templateId) {
      try {
        // Comprehensive template parameter aliases to match any EmailJS template variable names
        const templatePayload = {
          // Recipient aliases
          to_email: params.recipientEmail,
          email: params.recipientEmail,
          user_email: params.recipientEmail,
          recipient_email: params.recipientEmail,
          to: params.recipientEmail,
          to_name: params.recipientName,
          recipient_name: params.recipientName,
          user_name: params.recipientName,
          name: params.recipientName,

          // Sender & Reply aliases
          from_name: config.senderName,
          from_email: config.senderEmail,
          reply_to: config.senderEmail,

          // Content & Subject aliases
          subject: params.subject,
          title: params.subject,
          message: params.bodyContent,
          body: params.bodyContent,
          content: params.bodyContent,
          message_html: params.bodyContent.replace(/\n/g, '<br/>'),

          // Specific metadata
          dispatch_date: new Date().toLocaleDateString(),
          dispatch_time: new Date().toLocaleTimeString(),

          // Any extra parameters
          ...params.templateParams
        };

        await emailjs.send(
          config.serviceId,
          config.templateId,
          templatePayload,
          config.publicKey
        );
        status = 'Delivered';
        mode = 'Live EmailJS';
        responseMsg = `Live Email dispatched via EmailJS to ${params.recipientEmail}`;
      } catch (err: any) {
        console.error('EmailJS live dispatch error:', err);
        status = 'Failed';
        errorDetails = err?.text || err?.message || JSON.stringify(err);
        responseMsg = `EmailJS delivery failed: ${errorDetails}`;
      }
    } else if (config.enableLiveDispatch && (!config.publicKey || !config.serviceId || !config.templateId)) {
      status = 'Failed';
      errorDetails = 'EmailJS Public Key, Service ID, or Template ID is missing in settings.';
      responseMsg = errorDetails;
    }

    // Save to Dexie emailLogs table for auditing & preview
    await db.emailLogs.add({
      timestamp: new Date().toISOString(),
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      subject: params.subject,
      type: params.type,
      status,
      contentPreview: params.bodyContent
    });

    return { 
      success: status !== 'Failed', 
      mode, 
      message: responseMsg,
      errorDetails 
    };
  },

  /**
   * Loan Approval Notification
   */
  async sendLoanApprovalNotice(
    customer: Customer,
    loan: Loan,
    customerLoan: CustomerLoan
  ): Promise<{ success: boolean; mode: string; message: string }> {
    const subject = `🎉 Loan Approved: ${loan.loanCode} - Micro Finance Management System`;
    const body = `Dear ${customer.name},

We are pleased to inform you that your loan application #${loan.loanCode} has been officially APPROVED and DISBURSED!

Loan Details:
- Facility Description: ${loan.description}
- Principal Amount: LKR ${loan.amount.toLocaleString()}
- Total Repayable Amount: LKR ${customerLoan.totalAmountToPay.toLocaleString()}
- Duration: ${loan.durationDays} Days
- Interest Rate: ${loan.interestRate}% p.a.
- Monthly Installment: LKR ${(customerLoan.monthlyInstallment || 0).toLocaleString()}
- Due Date: ${customerLoan.dateDue}

Thank you for choosing our Micro Finance services.

Best regards,
Credit Approval Team
Micro Finance Management System`;

    return await this.sendEmail({
      recipientEmail: customer.email,
      recipientName: customer.name,
      subject,
      type: 'Loan Approval',
      bodyContent: body,
      templateParams: {
        loan_code: loan.loanCode,
        amount: loan.amount,
        due_date: customerLoan.dateDue
      }
    });
  },

  /**
   * Payment Receipt Notification
   */
  async sendPaymentReceiptNotice(
    customer: Customer,
    payment: Payment,
    loan: Loan,
    remainingBalance: number
  ): Promise<{ success: boolean; mode: string; message: string }> {
    const subject = `💳 Payment Receipt: ${payment.receiptNo} - Micro Finance System`;
    const body = `Dear ${customer.name},

Thank you for your repayment. Your payment has been successfully recorded in our ledger.

Receipt Summary:
- Receipt Number: ${payment.receiptNo}
- Payment Date: ${payment.paymentDate}
- Loan Facility: ${loan.loanCode} (${loan.description})
- Amount Paid: LKR ${payment.amount.toLocaleString()}
- Payment Method: ${payment.paymentMethod}
- Principal Credited: LKR ${payment.principalPortion.toLocaleString()}
- Interest Credited: LKR ${payment.interestPortion.toLocaleString()}
- Remaining Outstanding Balance: LKR ${remainingBalance.toLocaleString()}

${remainingBalance <= 0 ? '🎉 Congratulations! This loan facility is now FULLY SETTLED!' : 'Please ensure your next installment is completed before the due date.'}

Best regards,
Accounts & Cashier Department
Micro Finance Management System`;

    return await this.sendEmail({
      recipientEmail: customer.email,
      recipientName: customer.name,
      subject,
      type: 'Payment Receipt',
      bodyContent: body,
      templateParams: {
        receipt_no: payment.receiptNo,
        amount_paid: payment.amount,
        remaining_balance: remainingBalance
      }
    });
  },

  /**
   * Overdue Notice & Penalty Alert
   */
  async sendOverdueNotice(
    customer: Customer,
    loan: Loan,
    daysOverdue: number,
    penaltyAmount: number,
    remainingBalance: number
  ): Promise<{ success: boolean; mode: string; message: string }> {
    const subject = `⚠️ URGENT: Overdue Payment Notice - Loan #${loan.loanCode}`;
    const body = `Dear ${customer.name},

Our records indicate that your loan installment for Loan #${loan.loanCode} is currently OVERDUE by ${daysOverdue} days.

Account Breakdown:
- Overdue Period: ${daysOverdue} Days
- Accrued Daily Penalty: LKR ${penaltyAmount.toLocaleString()}
- Total Balance Due: LKR ${(remainingBalance + penaltyAmount).toLocaleString()}

To prevent legal recovery escalation, adverse credit rating reporting, or collateral asset liquidation, please settle your overdue balance immediately.

Best regards,
Credit Recovery & Risk Control Unit
Micro Finance Management System`;

    return await this.sendEmail({
      recipientEmail: customer.email,
      recipientName: customer.name,
      subject,
      type: 'Overdue Alert',
      bodyContent: body
    });
  },

  /**
   * Password Reset OTP
   */
  async sendPasswordResetOtp(
    email: string,
    otpCode: string
  ): Promise<{ success: boolean; mode: string; message: string }> {
    const subject = `🔒 Security Verification Code: ${otpCode} - Micro Finance System`;
    const body = `Hello,

You requested a password reset for your Micro Finance System Account.

Your one-time security verification code is:
[ ${otpCode} ]

This code is valid for 10 minutes. If you did not request this reset, please ignore this email.

Micro Finance Security Team`;

    return await this.sendEmail({
      recipientEmail: email,
      recipientName: 'Valued Staff Member',
      subject,
      type: 'Password Reset',
      bodyContent: body
    });
  }
};
