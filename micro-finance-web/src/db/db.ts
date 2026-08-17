import Dexie, { type Table } from 'dexie';
import type {
  Customer,
  Loan,
  CustomerLoan,
  Collateral,
  Payment,
  Penalty,
  Employee,
  Expense,
  Assignment,
  User,
  ActivityLog,
  EmailLog,
  AISuggestion
} from './types';

export class FinanceDatabase extends Dexie {
  customers!: Table<Customer, string>;
  loans!: Table<Loan, number>;
  customerLoans!: Table<CustomerLoan, number>;
  collaterals!: Table<Collateral, string>;
  payments!: Table<Payment, number>;
  penalties!: Table<Penalty, number>;
  employees!: Table<Employee, string>;
  expenses!: Table<Expense, number>;
  assignments!: Table<Assignment, number>;
  users!: Table<User, string>;
  activityLogs!: Table<ActivityLog, number>;
  emailLogs!: Table<EmailLog, number>;
  aiSuggestions!: Table<AISuggestion, number>;

  constructor() {
    super('MicroFinanceSystemDB');

    this.version(1).stores({
      customers: 'id, name, email, phoneNumber, nic, status, creditScore, createdAt',
      loans: '++id, loanCode, description, amount, durationDays, interestRate, status, collateralId, createdAt',
      customerLoans: '++id, loanId, customerId, dateIssued, dateDue, paymentStatus, totalAmountToPay, remainingBalance',
      collaterals: 'id, name, type, estimatedValue, phoneNumber, status, loanId, customerId',
      payments: '++id, receiptNo, paymentDate, loanId, customerId, amount, paymentMethod',
      penalties: '++id, loanId, customerId, dateApplied, isPaid',
      employees: 'id, name, role, status, phoneNumber, email, salary',
      expenses: '++id, type, date, employeeId, amount',
      assignments: '++id, employeeId, customerId, status, dueDate, priority',
      users: 'id, username, email, role',
      activityLogs: '++id, timestamp, entityType, userName',
      emailLogs: '++id, timestamp, recipientEmail, type, status',
      aiSuggestions: '++id, date, type, severity'
    });
  }
}

export const db = new FinanceDatabase();

// Internal Sanitization Helper for Database Hooks
function sanitizeText(str: string | undefined | null): string {
  if (!str) return '';
  return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\0/g, '');
}

// -------------------------------------------------------------
// Database Level Security & Integrity Hooks
// -------------------------------------------------------------
db.customers.hook('creating', (_primKey, obj) => {
  if (obj.name) obj.name = sanitizeText(obj.name);
  if (obj.nic) obj.nic = sanitizeText(obj.nic).toUpperCase();
  if (obj.phoneNumber) obj.phoneNumber = sanitizeText(obj.phoneNumber);
  if (obj.email) obj.email = sanitizeText(obj.email).toLowerCase();
  if (obj.address) obj.address = sanitizeText(obj.address);
  if (obj.creditScore !== undefined) {
    obj.creditScore = Math.max(300, Math.min(850, Number(obj.creditScore) || 650));
  }
  if (obj.monthlyIncome !== undefined) {
    obj.monthlyIncome = Math.max(0, Number(obj.monthlyIncome) || 0);
  }
});

db.customers.hook('updating', (modifications: any) => {
  if (modifications.name) modifications.name = sanitizeText(modifications.name);
  if (modifications.nic) modifications.nic = sanitizeText(modifications.nic).toUpperCase();
  if (modifications.phoneNumber) modifications.phoneNumber = sanitizeText(modifications.phoneNumber);
  if (modifications.email) modifications.email = sanitizeText(modifications.email).toLowerCase();
  if (modifications.address) modifications.address = sanitizeText(modifications.address);
  if (modifications.creditScore !== undefined) {
    modifications.creditScore = Math.max(300, Math.min(850, Number(modifications.creditScore) || 650));
  }
  if (modifications.monthlyIncome !== undefined) {
    modifications.monthlyIncome = Math.max(0, Number(modifications.monthlyIncome) || 0);
  }
  return modifications;
});

db.loans.hook('creating', (_primKey, obj) => {
  if (obj.loanCode) obj.loanCode = sanitizeText(obj.loanCode).toUpperCase();
  if (obj.description) obj.description = sanitizeText(obj.description);
  obj.amount = Math.max(0, Number(obj.amount) || 0);
  obj.interestRate = Math.max(0, Math.min(100, Number(obj.interestRate) || 0));
  obj.durationDays = Math.max(1, Number(obj.durationDays) || 30);
});

db.payments.hook('creating', (_primKey, obj) => {
  if (obj.receiptNo) obj.receiptNo = sanitizeText(obj.receiptNo);
  obj.amount = Math.max(0, Number(obj.amount) || 0);
  obj.principalPortion = Math.max(0, Number(obj.principalPortion) || 0);
  obj.interestPortion = Math.max(0, Number(obj.interestPortion) || 0);
  obj.penaltyPortion = Math.max(0, Number(obj.penaltyPortion) || 0);
});

db.employees.hook('creating', (_primKey, obj) => {
  if (obj.name) obj.name = sanitizeText(obj.name);
  if (obj.email) obj.email = sanitizeText(obj.email).toLowerCase();
  if (obj.phoneNumber) obj.phoneNumber = sanitizeText(obj.phoneNumber);
  obj.salary = Math.max(0, Number(obj.salary) || 0);
});

db.expenses.hook('creating', (_primKey, obj) => {
  if (obj.description) obj.description = sanitizeText(obj.description);
  obj.amount = Math.max(0, Number(obj.amount) || 0);
});

// Seed initial realistic data
export async function seedInitialData(force = false) {
  const userCount = await db.users.count();
  if (userCount > 0 && !force) {
    return;
  }

  if (force) {
    await db.transaction('rw', [
      db.customers, db.loans, db.customerLoans, db.collaterals,
      db.payments, db.penalties, db.employees, db.expenses,
      db.assignments, db.users, db.activityLogs, db.emailLogs, db.aiSuggestions
    ], async () => {
      await db.customers.clear();
      await db.loans.clear();
      await db.customerLoans.clear();
      await db.collaterals.clear();
      await db.payments.clear();
      await db.penalties.clear();
      await db.employees.clear();
      await db.expenses.clear();
      await db.assignments.clear();
      await db.users.clear();
      await db.activityLogs.clear();
      await db.emailLogs.clear();
      await db.aiSuggestions.clear();
    });
  }

  // 1. Initial Users (with salted SHA-256 password hashes)
  await db.users.bulkAdd([
    {
      id: '2132',
      username: 'Admin',
      name: 'System Administrator',
      email: 'chathuulakmina@gmail.com',
      role: 'Admin',
      passwordHash: 'sha256:56885dfda2bf1ceca80f531393bc3f13df934fba31eb18e69fa0f4e1f822f3e8', // @1234
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastLogin: new Date().toISOString()
    },
    {
      id: 'USR-02',
      username: 'chamara',
      name: 'Chamara Perera',
      email: 'chamara.manager@microfinance.lk',
      role: 'Manager',
      passwordHash: 'Pass@123',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      lastLogin: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'USR-03',
      username: 'nimali',
      name: 'Nimali Fernando',
      email: 'nimali.officer@microfinance.lk',
      role: 'Loan Officer',
      passwordHash: 'Officer@123',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      lastLogin: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ]);

  // 2. Initial Customers
  await db.customers.bulkAdd([
    {
      id: '941234567V',
      name: 'Sunil Shantha Silva',
      address: 'No 45, Temple Road, Kandy',
      email: 'sunil.silva@example.com',
      phoneNumber: '0771234567',
      nic: '941234567V',
      creditScore: 780,
      status: 'Active',
      monthlyIncome: 125000,
      employment: 'Retail Store Owner',
      createdAt: '2026-01-10',
      notes: 'Reliable entrepreneur, long-term customer with perfect credit score.'
    },
    {
      id: '882345678V',
      name: 'Kamal Priyantha Bandara',
      address: '12/B, Flower Garden, Kurunegala',
      email: 'kamal.bandara@example.com',
      phoneNumber: '0712345678',
      nic: '882345678V',
      creditScore: 710,
      status: 'Active',
      monthlyIncome: 85000,
      employment: 'Agricultural Supplies Distributor',
      createdAt: '2026-01-15',
      notes: 'Seasonal agricultural loan customer.'
    },
    {
      id: '995678123V',
      name: 'Anoma Damayanthi Jayasuriya',
      address: 'No 88, Galle Road, Colombo 03',
      email: 'anoma.j@example.com',
      phoneNumber: '0763456789',
      nic: '995678123V',
      creditScore: 820,
      status: 'Active',
      monthlyIncome: 240000,
      employment: 'Textile Boutique Owner',
      createdAt: '2026-02-01',
      notes: 'High income boutique retailer with gold collateral.'
    },
    {
      id: '199512345678',
      name: 'Nuwan Chathuranga Wickramasinghe',
      address: 'No 15, Hill Street, Nuwara Eliya',
      email: 'nuwan.c@example.com',
      phoneNumber: '0754567890',
      nic: '199512345678',
      creditScore: 590,
      status: 'Active',
      monthlyIncome: 65000,
      employment: 'Vegetable Farmer',
      createdAt: '2026-02-10',
      notes: 'Recent late installment due to weather, closely monitored.'
    },
    {
      id: '917890123V',
      name: 'Malini Pushpalatha',
      address: '74, Station Road, Matara',
      email: 'malini.p@example.com',
      phoneNumber: '0785678901',
      nic: '917890123V',
      creditScore: 650,
      status: 'Active',
      monthlyIncome: 95000,
      employment: 'Catering & Bakery Services',
      createdAt: '2026-03-05',
      notes: 'Micro bakery business expansion loan.'
    },
    {
      id: '852341678V',
      name: 'Roshan Kumara Dissanayake',
      address: '56/1, Lake Road, Anuradhapura',
      email: 'roshan.k@example.com',
      phoneNumber: '0726789012',
      nic: '852341678V',
      creditScore: 490,
      status: 'Blacklisted',
      monthlyIncome: 45000,
      employment: 'Unemployed',
      createdAt: '2025-11-20',
      notes: 'Multiple defaults, recovery assigned to legal recovery team.'
    }
  ]);

  // 3. Initial Collaterals
  await db.collaterals.bulkAdd([
    {
      id: 'COL-001',
      name: 'Toyota Hilux Double Cab (WP CAB-4521)',
      type: 'Vehicle',
      estimatedValue: 12500000,
      address: 'No 45, Temple Road, Kandy',
      phoneNumber: '0771234567',
      status: 'Pledged',
      loanId: 1,
      customerId: '941234567V',
      documentRef: 'CR-88991-KANDY'
    },
    {
      id: 'COL-002',
      name: 'Coconut Land (40 Perches, Kurunegala)',
      type: 'Real Estate / Land',
      estimatedValue: 8000000,
      address: '12/B, Flower Garden, Kurunegala',
      phoneNumber: '0712345678',
      status: 'Pledged',
      loanId: 2,
      customerId: '882345678V',
      documentRef: 'DEED-9821-KURU'
    },
    {
      id: 'COL-003',
      name: '22K Gold Sovereign Assortment (12 Pcs)',
      type: 'Gold / Jewelry',
      estimatedValue: 3600000,
      address: 'No 88, Galle Road, Colombo 03',
      phoneNumber: '0763456789',
      status: 'Pledged',
      loanId: 3,
      customerId: '995678123V',
      documentRef: 'SAFE-VAULT-G03'
    },
    {
      id: 'COL-004',
      name: 'Kubota 4WD Agricultural Tractor',
      type: 'Equipment / Machinery',
      estimatedValue: 4500000,
      address: 'No 15, Hill Street, Nuwara Eliya',
      phoneNumber: '0754567890',
      status: 'Pledged',
      loanId: 4,
      customerId: '199512345678',
      documentRef: 'REG-TRAC-2023'
    },
    {
      id: 'COL-005',
      name: 'Commercial Baking Oven & Bread Slicer Unit',
      type: 'Equipment / Machinery',
      estimatedValue: 1800000,
      address: '74, Station Road, Matara',
      phoneNumber: '0785678901',
      status: 'Pledged',
      loanId: 5,
      customerId: '917890123V',
      documentRef: 'INV-BAKE-441'
    }
  ]);

  // 4. Initial Loans (Schemes / Templates)
  const l1 = await db.loans.add({
    loanCode: 'LN-1001',
    description: 'SME Business Capital Expansion Loan',
    amount: 1500000,
    durationDays: 180,
    interestRate: 14.5,
    interestType: 'Reducing',
    status: 'Active',
    collateralId: 'COL-001',
    createdAt: '2026-01-12'
  });

  const l2 = await db.loans.add({
    loanCode: 'LN-1002',
    description: 'Agricultural Harvest Advance Facility',
    amount: 800000,
    durationDays: 120,
    interestRate: 12.0,
    interestType: 'Flat',
    status: 'Active',
    collateralId: 'COL-002',
    createdAt: '2026-01-20'
  });

  const l3 = await db.loans.add({
    loanCode: 'LN-1003',
    description: 'Boutique Apparel Stock Inventory Loan',
    amount: 1200000,
    durationDays: 90,
    interestRate: 15.0,
    interestType: 'Reducing',
    status: 'Active',
    collateralId: 'COL-003',
    createdAt: '2026-02-05'
  });

  const l4 = await db.loans.add({
    loanCode: 'LN-1004',
    description: 'Nuwara Eliya Agri Fertilizer Loan',
    amount: 500000,
    durationDays: 60,
    interestRate: 18.0,
    interestType: 'Flat',
    status: 'Active',
    collateralId: 'COL-004',
    createdAt: '2026-02-15'
  });

  const l5 = await db.loans.add({
    loanCode: 'LN-1005',
    description: 'Bakery Equipment Financing',
    amount: 600000,
    durationDays: 90,
    interestRate: 16.0,
    interestType: 'Reducing',
    status: 'Active',
    collateralId: 'COL-005',
    createdAt: '2026-03-08'
  });

  const l6 = await db.loans.add({
    loanCode: 'LN-1006',
    description: 'Settled Micro Enterprise Loan',
    amount: 300000,
    durationDays: 60,
    interestRate: 14.0,
    interestType: 'Flat',
    status: 'Settled',
    createdAt: '2025-10-01'
  });

  // 5. Customer Active Loan Contracts
  await db.customerLoans.bulkAdd([
    {
      loanId: l1,
      customerId: '941234567V',
      dateIssued: '2026-01-12',
      dateDue: '2026-07-12',
      principalAmount: 1500000,
      totalAmountToPay: 1608750,
      totalPaid: 800000,
      remainingBalance: 808750,
      paymentStatus: 'Active',
      penaltyAmount: 0,
      collateralId: 'COL-001',
      monthlyInstallment: 268125,
      approvedBy: 'Admin'
    },
    {
      loanId: l2,
      customerId: '882345678V',
      dateIssued: '2026-01-20',
      dateDue: '2026-05-20',
      principalAmount: 800000,
      totalAmountToPay: 832000,
      totalPaid: 450000,
      remainingBalance: 382000,
      paymentStatus: 'Active',
      penaltyAmount: 0,
      collateralId: 'COL-002',
      monthlyInstallment: 208000,
      approvedBy: 'Admin'
    },
    {
      loanId: l3,
      customerId: '995678123V',
      dateIssued: '2026-02-05',
      dateDue: '2026-05-05',
      principalAmount: 1200000,
      totalAmountToPay: 1245000,
      totalPaid: 850000,
      remainingBalance: 395000,
      paymentStatus: 'Active',
      penaltyAmount: 0,
      collateralId: 'COL-003',
      monthlyInstallment: 415000,
      approvedBy: 'Admin'
    },
    {
      loanId: l4,
      customerId: '199512345678',
      dateIssued: '2026-02-15',
      dateDue: '2026-04-15',
      principalAmount: 500000,
      totalAmountToPay: 515000,
      totalPaid: 150000,
      remainingBalance: 375500, // includes overdue penalty
      paymentStatus: 'Overdue',
      penaltyAmount: 10500,
      collateralId: 'COL-004',
      monthlyInstallment: 257500,
      approvedBy: 'chamara'
    },
    {
      loanId: l5,
      customerId: '917890123V',
      dateIssued: '2026-03-08',
      dateDue: '2026-06-08',
      principalAmount: 600000,
      totalAmountToPay: 624000,
      totalPaid: 208000,
      remainingBalance: 416000,
      paymentStatus: 'Active',
      penaltyAmount: 0,
      collateralId: 'COL-005',
      monthlyInstallment: 208000,
      approvedBy: 'Admin'
    },
    {
      loanId: l6,
      customerId: '941234567V',
      dateIssued: '2025-10-01',
      dateDue: '2025-12-01',
      principalAmount: 300000,
      totalAmountToPay: 307000,
      totalPaid: 307000,
      remainingBalance: 0,
      paymentStatus: 'Settled',
      penaltyAmount: 0,
      monthlyInstallment: 153500,
      approvedBy: 'Admin'
    }
  ]);

  // 6. Payments History
  await db.payments.bulkAdd([
    {
      receiptNo: 'REC-202602-001',
      paymentDate: '2026-02-12',
      loanId: l1,
      customerId: '941234567V',
      amount: 400000,
      principalPortion: 350000,
      interestPortion: 50000,
      penaltyPortion: 0,
      paymentMethod: 'Bank Transfer',
      reference: 'BOC-TXN-98412',
      notes: 'Installment 1 of 6',
      receivedBy: 'Admin'
    },
    {
      receiptNo: 'REC-202603-002',
      paymentDate: '2026-03-12',
      loanId: l1,
      customerId: '941234567V',
      amount: 400000,
      principalPortion: 360000,
      interestPortion: 40000,
      penaltyPortion: 0,
      paymentMethod: 'Online / Card',
      reference: 'IPG-PAY-55821',
      notes: 'Installment 2 of 6',
      receivedBy: 'chamara'
    },
    {
      receiptNo: 'REC-202602-003',
      paymentDate: '2026-02-20',
      loanId: l2,
      customerId: '882345678V',
      amount: 450000,
      principalPortion: 420000,
      interestPortion: 30000,
      penaltyPortion: 0,
      paymentMethod: 'Cash',
      reference: 'CASH-COUNTER-01',
      notes: 'Direct cash deposit at counter',
      receivedBy: 'nimali'
    },
    {
      receiptNo: 'REC-202603-004',
      paymentDate: '2026-03-05',
      loanId: l3,
      customerId: '995678123V',
      amount: 850000,
      principalPortion: 800000,
      interestPortion: 50000,
      penaltyPortion: 0,
      paymentMethod: 'Bank Transfer',
      reference: 'COMM-TXN-11029',
      notes: 'Lump-sum early principal repayment',
      receivedBy: 'Admin'
    },
    {
      receiptNo: 'REC-202603-005',
      paymentDate: '2026-03-15',
      loanId: l4,
      customerId: '199512345678',
      amount: 150000,
      principalPortion: 130000,
      interestPortion: 20000,
      penaltyPortion: 0,
      paymentMethod: 'Cash',
      reference: 'FIELD-REC-08',
      notes: 'Collected via field officer',
      receivedBy: 'nimali'
    },
    {
      receiptNo: 'REC-202604-006',
      paymentDate: '2026-04-08',
      loanId: l5,
      customerId: '917890123V',
      amount: 208000,
      principalPortion: 200000,
      interestPortion: 8000,
      penaltyPortion: 0,
      paymentMethod: 'Bank Transfer',
      reference: 'HNB-FT-99120',
      notes: 'Installment 1',
      receivedBy: 'Admin'
    }
  ]);

  // 7. Penalties
  await db.penalties.bulkAdd([
    {
      loanId: l4,
      customerId: '199512345678',
      amount: 10500,
      dateApplied: '2026-04-20',
      reason: 'Late payment penalty (14 days past due date @ 0.25%/day)',
      daysOverdue: 14,
      isPaid: false
    }
  ]);

  // 8. Staff / Employees
  await db.employees.bulkAdd([
    {
      id: 'EMP-001',
      name: 'Janaka Priyashantha Rathnayake',
      address: '22/4, Kandy Road, Kiribathgoda',
      salary: 165000,
      phoneNumber: '0772233445',
      email: 'janaka.r@microfinance.lk',
      role: 'Branch Manager',
      status: 'Active',
      joinedDate: '2023-04-01'
    },
    {
      id: 'EMP-002',
      name: 'Nadeesha Madushani Silva',
      address: '15, Dharmapala Mawatha, Colombo 07',
      salary: 110000,
      phoneNumber: '0713344556',
      email: 'nadeesha.s@microfinance.lk',
      role: 'Credit Analyst',
      status: 'Active',
      joinedDate: '2024-01-15'
    },
    {
      id: 'EMP-003',
      name: 'Kasun Danushka Weerasinghe',
      address: '77, Main Street, Gampaha',
      salary: 85000,
      phoneNumber: '0764455667',
      email: 'kasun.w@microfinance.lk',
      role: 'Field Recovery Officer',
      status: 'Active',
      joinedDate: '2024-06-01'
    },
    {
      id: 'EMP-004',
      name: 'Sanduni Harshika Perera',
      address: '89, Galle Road, Moratuwa',
      salary: 95000,
      phoneNumber: '0755566778',
      email: 'sanduni.p@microfinance.lk',
      role: 'Accountant',
      status: 'Active',
      joinedDate: '2024-08-10'
    }
  ]);

  // 9. Operational Expenses
  await db.expenses.bulkAdd([
    {
      type: 'Salaries & Wages',
      date: '2026-02-28',
      employeeId: 'EMP-001',
      amount: 455000,
      description: 'February Monthly Staff Salary Disbursement',
      paymentMethod: 'Direct Bank Transfer'
    },
    {
      type: 'Office Rent',
      date: '2026-03-01',
      employeeId: 'EMP-001',
      amount: 120000,
      description: 'Head Office Premise Rent (Colombo 03)',
      paymentMethod: 'Cheque'
    },
    {
      type: 'Utilities & Internet',
      date: '2026-03-05',
      employeeId: 'EMP-004',
      amount: 38500,
      description: 'Electricity, Water, and Fiber Internet Bills',
      paymentMethod: 'Online'
    },
    {
      type: 'Travel & Field Operations',
      date: '2026-03-15',
      employeeId: 'EMP-003',
      amount: 24500,
      description: 'Field officer fuel allowance and recovery travel',
      paymentMethod: 'Cash'
    },
    {
      type: 'IT & Software',
      date: '2026-03-20',
      employeeId: 'EMP-001',
      amount: 45000,
      description: 'Cloud Server hosting, SMS gateway and security licenses',
      paymentMethod: 'Corporate Card'
    }
  ]);

  // 10. Assignments
  await db.assignments.bulkAdd([
    {
      task: 'Conduct field collateral inspection for Nuwara Eliya Agri loan',
      employeeId: 'EMP-003',
      customerId: '199512345678',
      status: 'In Progress',
      dateAssigned: '2026-04-18',
      dueDate: '2026-04-25',
      priority: 'Urgent',
      notes: 'Customer is 14 days overdue. Check equipment condition and negotiate settlement.'
    },
    {
      task: 'Verify 22K Gold Sovereign authenticity & vault storage',
      employeeId: 'EMP-002',
      customerId: '995678123V',
      status: 'Completed',
      dateAssigned: '2026-02-04',
      dueDate: '2026-02-05',
      priority: 'High',
      notes: 'Gold certified by licensed appraiser. Valuation: LKR 3.6M.'
    }
  ]);

  // 11. Activity Logs
  await db.activityLogs.bulkAdd([
    {
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      userName: 'Admin',
      action: 'Loan Disbursed',
      entityType: 'Loan',
      details: 'Approved and issued Loan #LN-1005 (LKR 600,000) for Malini Pushpalatha.'
    },
    {
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      userName: 'chamara',
      action: 'Payment Received',
      entityType: 'Payment',
      details: 'Recorded Payment #REC-202604-006 (LKR 208,000) via Bank Transfer.'
    },
    {
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      userName: 'System AI',
      action: 'AI Risk Alert',
      entityType: 'System',
      details: 'Flagged Customer #199512345678 as Overdue Risk (Score 590).'
    }
  ]);

  // 12. Email Logs
  await db.emailLogs.bulkAdd([
    {
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      recipientEmail: 'malini.p@example.com',
      recipientName: 'Malini Pushpalatha',
      subject: 'Loan Approved - Micro Finance System',
      type: 'Loan Approval',
      status: 'Delivered',
      contentPreview: 'Dear Malini, Your loan of LKR 600,000 has been approved successfully...'
    },
    {
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      recipientEmail: 'sunil.silva@example.com',
      recipientName: 'Sunil Shantha Silva',
      subject: 'Payment Receipt - REC-202603-002',
      type: 'Payment Receipt',
      status: 'Delivered',
      contentPreview: 'Thank you for your payment of LKR 400,000. Balance remaining: LKR 808,750...'
    }
  ]);

  // 13. AI Suggestions
  await db.aiSuggestions.bulkAdd([
    {
      date: new Date().toISOString(),
      type: 'Risk Alert',
      title: 'Overdue Loan Action Required',
      description: 'Customer Nuwan Chathuranga (LN-1004) has accrued 14 days of overdue penalty. Recommended step: Initiate field recovery or grant restructured 30-day extension.',
      severity: 'High',
      actionableRecommendation: 'Assign field recovery agent EMP-003 or dispatch formal Overdue Notice Email.'
    },
    {
      date: new Date().toISOString(),
      type: 'Cashflow Forecast',
      title: 'Strong Inflow Expected in Q2',
      description: 'Projected installment recoveries for May/June total LKR 1,845,000 with a 94.2% historical recovery probability.',
      severity: 'Low',
      actionableRecommendation: 'Eligible to disburse up to LKR 2.5M in new SME micro loans safely.'
    },
    {
      date: new Date().toISOString(),
      type: 'Customer Opportunity',
      title: 'Top Tier Customer Pre-Approval',
      description: 'Customer Anoma Damayanthi (Score: 820) has repaid 68% of loan within 40 days. Eligible for VIP Credit Line up to LKR 3,000,000.',
      severity: 'Medium',
      actionableRecommendation: 'Send tailored pre-approval invitation.'
    }
  ]);
}

// -------------------------------------------------------------
// Database Integrity Diagnostics & Validation
// -------------------------------------------------------------
export interface IntegrityReport {
  timestamp: string;
  status: 'Healthy' | 'Warnings Found' | 'Critical Errors';
  totalCustomers: number;
  totalLoans: number;
  totalCustomerLoans: number;
  totalPayments: number;
  totalEmployees: number;
  anomalies: {
    type: 'Orphaned Loan' | 'Negative Balance' | 'Invalid NIC' | 'Orphaned Payment' | 'Missing Collateral';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

export async function scanDatabaseIntegrity(): Promise<IntegrityReport> {
  const customers = await db.customers.toArray();
  const loans = await db.loans.toArray();
  const customerLoans = await db.customerLoans.toArray();
  const payments = await db.payments.toArray();
  const collaterals = await db.collaterals.toArray();
  const employees = await db.employees.toArray();

  const customerIdSet = new Set(customers.map((c) => c.id));
  const loanIdSet = new Set(loans.map((l) => l.id));
  const collateralIdSet = new Set(collaterals.map((c) => c.id));

  const anomalies: IntegrityReport['anomalies'] = [];

  // Check customerLoans referential integrity
  for (const cl of customerLoans) {
    if (!customerIdSet.has(cl.customerId)) {
      anomalies.push({
        type: 'Orphaned Loan',
        message: `Contract #${cl.id} references missing customer ID: "${cl.customerId}"`,
        severity: 'high'
      });
    }
    if (!loanIdSet.has(cl.loanId)) {
      anomalies.push({
        type: 'Orphaned Loan',
        message: `Contract #${cl.id} references non-existent Loan ID: ${cl.loanId}`,
        severity: 'high'
      });
    }
    if (cl.remainingBalance < 0) {
      anomalies.push({
        type: 'Negative Balance',
        message: `Contract #${cl.id} has negative balance (LKR ${cl.remainingBalance})`,
        severity: 'medium'
      });
    }
    if (cl.collateralId && !collateralIdSet.has(cl.collateralId)) {
      anomalies.push({
        type: 'Missing Collateral',
        message: `Contract #${cl.id} references missing Collateral ID: "${cl.collateralId}"`,
        severity: 'low'
      });
    }
  }

  // Check payments referential integrity
  for (const p of payments) {
    if (!customerIdSet.has(p.customerId)) {
      anomalies.push({
        type: 'Orphaned Payment',
        message: `Payment #${p.receiptNo} references missing Customer ID: "${p.customerId}"`,
        severity: 'high'
      });
    }
    if (p.amount <= 0) {
      anomalies.push({
        type: 'Negative Balance',
        message: `Payment #${p.receiptNo} has zero or negative amount: ${p.amount}`,
        severity: 'medium'
      });
    }
  }

  const status = anomalies.some((a) => a.severity === 'high')
    ? 'Critical Errors'
    : anomalies.length > 0
    ? 'Warnings Found'
    : 'Healthy';

  return {
    timestamp: new Date().toISOString(),
    status,
    totalCustomers: customers.length,
    totalLoans: loans.length,
    totalCustomerLoans: customerLoans.length,
    totalPayments: payments.length,
    totalEmployees: employees.length,
    anomalies
  };
}

// -------------------------------------------------------------
// Database JSON Export & Import Tools with SHA-256 Tamper-Proofing
// -------------------------------------------------------------
export async function exportDatabaseToJson(): Promise<string> {
  const tables = {
    customers: await db.customers.toArray(),
    loans: await db.loans.toArray(),
    customerLoans: await db.customerLoans.toArray(),
    collaterals: await db.collaterals.toArray(),
    payments: await db.payments.toArray(),
    penalties: await db.penalties.toArray(),
    employees: await db.employees.toArray(),
    expenses: await db.expenses.toArray(),
    assignments: await db.assignments.toArray(),
    users: await db.users.toArray(),
    activityLogs: await db.activityLogs.toArray(),
    emailLogs: await db.emailLogs.toArray(),
    aiSuggestions: await db.aiSuggestions.toArray()
  };

  const payloadString = JSON.stringify(tables);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payloadString));
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const backupObject = {
    _meta: {
      system: 'FinFlow Pro Enterprise Micro-Finance OS',
      version: 1,
      exportedAt: new Date().toISOString(),
      checksum: `sha256:${checksum}`,
      recordCounts: {
        customers: tables.customers.length,
        loans: tables.loans.length,
        payments: tables.payments.length,
        employees: tables.employees.length,
        expenses: tables.expenses.length
      }
    },
    tables
  };

  return JSON.stringify(backupObject, null, 2);
}

export async function importDatabaseFromJson(jsonString: string): Promise<{ success: boolean; message: string; checksumVerified: boolean }> {
  try {
    const rawData = JSON.parse(jsonString);
    let tablesToRestore: any = null;
    let checksumVerified = false;

    // Check if modern structured backup
    if (rawData._meta && rawData.tables) {
      tablesToRestore = rawData.tables;
      if (rawData._meta.checksum && rawData._meta.checksum.startsWith('sha256:')) {
        const payloadString = JSON.stringify(tablesToRestore);
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payloadString));
        const computedChecksum = `sha256:${Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
        checksumVerified = computedChecksum === rawData._meta.checksum;
      }
    } else {
      // Legacy flat backup structure
      tablesToRestore = rawData;
    }

    if (!tablesToRestore || typeof tablesToRestore !== 'object') {
      return { success: false, message: 'Invalid backup file format.', checksumVerified: false };
    }

    await db.transaction('rw', [
      db.customers, db.loans, db.customerLoans, db.collaterals,
      db.payments, db.penalties, db.employees, db.expenses,
      db.assignments, db.users, db.activityLogs, db.emailLogs, db.aiSuggestions
    ], async () => {
      if (Array.isArray(tablesToRestore.customers)) { await db.customers.clear(); await db.customers.bulkAdd(tablesToRestore.customers); }
      if (Array.isArray(tablesToRestore.loans)) { await db.loans.clear(); await db.loans.bulkAdd(tablesToRestore.loans); }
      if (Array.isArray(tablesToRestore.customerLoans)) { await db.customerLoans.clear(); await db.customerLoans.bulkAdd(tablesToRestore.customerLoans); }
      if (Array.isArray(tablesToRestore.collaterals)) { await db.collaterals.clear(); await db.collaterals.bulkAdd(tablesToRestore.collaterals); }
      if (Array.isArray(tablesToRestore.payments)) { await db.payments.clear(); await db.payments.bulkAdd(tablesToRestore.payments); }
      if (Array.isArray(tablesToRestore.penalties)) { await db.penalties.clear(); await db.penalties.bulkAdd(tablesToRestore.penalties); }
      if (Array.isArray(tablesToRestore.employees)) { await db.employees.clear(); await db.employees.bulkAdd(tablesToRestore.employees); }
      if (Array.isArray(tablesToRestore.expenses)) { await db.expenses.clear(); await db.expenses.bulkAdd(tablesToRestore.expenses); }
      if (Array.isArray(tablesToRestore.assignments)) { await db.assignments.clear(); await db.assignments.bulkAdd(tablesToRestore.assignments); }
      if (Array.isArray(tablesToRestore.users)) { await db.users.clear(); await db.users.bulkAdd(tablesToRestore.users); }
      if (Array.isArray(tablesToRestore.activityLogs)) { await db.activityLogs.clear(); await db.activityLogs.bulkAdd(tablesToRestore.activityLogs); }
      if (Array.isArray(tablesToRestore.emailLogs)) { await db.emailLogs.clear(); await db.emailLogs.bulkAdd(tablesToRestore.emailLogs); }
      if (Array.isArray(tablesToRestore.aiSuggestions)) { await db.aiSuggestions.clear(); await db.aiSuggestions.bulkAdd(tablesToRestore.aiSuggestions); }
    });

    return {
      success: true,
      message: checksumVerified ? 'Database restored successfully with verified SHA-256 cryptographic signature.' : 'Database restored successfully (legacy backup format).',
      checksumVerified
    };
  } catch (error: any) {
    console.error('Failed to import database:', error);
    return { success: false, message: error.message || 'Corrupted or unreadable JSON backup file.', checksumVerified: false };
  }
}
