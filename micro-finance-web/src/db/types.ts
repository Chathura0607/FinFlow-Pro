export interface Customer {
  id: string; // NIC or custom ID e.g. "987654321V" or "CUST-001"
  name: string;
  address: string;
  email: string;
  phoneNumber: string;
  nic: string;
  creditScore: number; // 300 - 850
  status: 'Active' | 'Blacklisted' | 'Inactive';
  monthlyIncome?: number;
  employment?: string;
  createdAt: string;
  notes?: string;
}

export interface Loan {
  id?: number;
  loanCode: string; // e.g. "LN-1001"
  description: string;
  amount: number;
  durationDays: number;
  interestRate: number; // Annual or monthly rate percentage
  interestType: 'Flat' | 'Reducing';
  status: 'Draft' | 'Approved' | 'Active' | 'Settled' | 'Defaulted' | 'Rejected';
  collateralId?: string;
  createdAt: string;
}

export interface CustomerLoan {
  id?: number;
  loanId: number;
  customerId: string;
  dateIssued: string;
  dateDue: string;
  principalAmount: number;
  totalAmountToPay: number;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: 'Active' | 'Settled' | 'Overdue' | 'Defaulted';
  penaltyAmount: number;
  collateralId?: string;
  monthlyInstallment?: number;
  approvedBy?: string;
}

export interface Collateral {
  id: string; // e.g. "COL-001"
  name: string;
  type: 'Vehicle' | 'Real Estate / Land' | 'Gold / Jewelry' | 'Fixed Deposit' | 'Equipment / Machinery' | 'Personal Guarantor';
  estimatedValue: number;
  address: string;
  phoneNumber: string;
  status: 'Pledged' | 'Released' | 'Liquidated';
  loanId?: number;
  customerId?: string;
  documentRef?: string;
}

export interface Payment {
  id?: number;
  receiptNo: string;
  paymentDate: string;
  loanId: number;
  customerId: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  penaltyPortion: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Online / Card' | 'Cheque';
  reference?: string;
  notes?: string;
  receivedBy?: string;
}

export interface Penalty {
  id?: number;
  loanId: number;
  customerId: string;
  amount: number;
  dateApplied: string;
  reason: string;
  daysOverdue: number;
  isPaid: boolean;
  isWaived?: boolean;
}

export interface Employee {
  id: string; // e.g. "EMP-001"
  name: string;
  address: string;
  salary: number;
  phoneNumber: string;
  email: string;
  role: 'Branch Manager' | 'Loan Officer' | 'Credit Analyst' | 'Field Recovery Officer' | 'Accountant';
  status: 'Active' | 'On Leave' | 'Terminated';
  joinedDate: string;
}

export interface Expense {
  id?: number;
  type: 'Salaries & Wages' | 'Office Rent' | 'Utilities & Internet' | 'Travel & Field Operations' | 'IT & Software' | 'Marketing' | 'Office Supplies' | 'Miscellaneous';
  date: string;
  employeeId?: string;
  amount: number;
  description: string;
  paymentMethod?: string;
  receiptRef?: string;
}

export interface Assignment {
  id?: number;
  task: string;
  employeeId: string;
  customerId: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Escalated';
  dateAssigned: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  notes?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Loan Officer' | 'Auditor';
  passwordHash: string;
  avatar?: string;
  lastLogin?: string;
}

export interface ActivityLog {
  id?: number;
  timestamp: string;
  userName: string;
  action: string;
  entityType: 'Customer' | 'Loan' | 'Payment' | 'Collateral' | 'Penalty' | 'Employee' | 'Expense' | 'System';
  details: string;
}

export interface EmailLog {
  id?: number;
  timestamp: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  type: 'Loan Approval' | 'Payment Receipt' | 'Overdue Alert' | 'Password Reset' | 'Custom Notice';
  status: 'Sent' | 'Delivered' | 'Failed' | 'Simulated';
  contentPreview: string;
}

export interface AISuggestion {
  id?: number;
  date: string;
  type: 'Risk Alert' | 'Cashflow Forecast' | 'Customer Opportunity' | 'Anomaly';
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  actionableRecommendation?: string;
}

export interface FinancialSummary {
  totalDisbursed: number;
  totalCollected: number;
  activeLoanPrincipal: number;
  totalInterestEarned: number;
  totalPenaltiesCollected: number;
  totalExpenses: number;
  netProfit: number;
  activeLoansCount: number;
  overdueLoansCount: number;
  totalCustomersCount: number;
  recoveryRatePercentage: number;
}
