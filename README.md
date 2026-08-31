# 🏦 FinFlow Pro - Micro Finance Management System (AI & Dexie.js Edition)

An enterprise-grade, modern, full-featured **Micro-Finance Management System & AI Credit Risk Intelligence Operating System** built with **React 18**, **Dexie.js (IndexedDB Client Database)**, **Tailwind CSS v4**, **Google Gemini AI Engine**, **Email Notification Center**, and **Standalone Windows Desktop Executable (`.exe`)**.

---

## 🌟 Key Features & Innovations

### 1. ⚡ Dexie.js (IndexedDB Client Database)
- **100% Client-Side Persistence**: Zero setup pain! No need to install, configure, or run MySQL or MariaDB servers.
- **Ultra-Fast Reactive Live Queries**: UI immediately reflects database changes in real-time.
- **1-Click JSON Backup & Restore**: Export and restore your complete database anytime from the Settings tab.
- **Pre-Loaded Sample Dataset**: Comes out of the box with realistic borrowers, SME loans, pledged gold/vehicle collaterals, repayments ledger, staff directory, and expenses.

### 2. 🤖 AI Financial Intelligence Engine
- **AI Loan Risk & Eligibility Scorer**: Evaluates customer credit history, income debt-to-income (DTI) ratio, collateral coverage, and gives an instant 0-100 score, Risk Tier (*Low/Moderate/High/Critical*), and automated approval terms.
- **AI Financial Copilot**: Live conversational assistant that answers questions about overdue exposure, cashflow forecasts, borrower analysis, or Sinhala summaries. Supports **Google Gemini API** + Built-in offline smart heuristic engine.
- **6-Month Cashflow & Profit Predictor**: Forecasts monthly loan collections, overhead expenses, and net profit margins with trend charts.
- **Anomaly & Fraud Detector**: Monitors high-value unsecured loans, overdue aging spikes, and unusual expense surges.

### 3. 📧 Automated Email Notification Engine
- **EmailJS Integration + Local Audited Dispatch**: Dispatches branded digital notices directly to borrower and staff email addresses.
- **Automated Email Triggers**:
  - 🎉 **Loan Approval & Disbursement Letters** with full repayment schedule.
  - 💳 **Digital Repayment Receipts** with receipt numbers and remaining balances.
  - ⚠️ **Overdue Warning Alerts** with accrued daily penalty breakdowns (0.25%/day).
  - 🔒 **Security Verification OTPs** for password recovery.
- **Email Center Outbox**: Inspect dispatched emails, search logs, and compose custom notices.

### 4. 📄 Printable PDF Receipts & Loan Contracts
- **1-Click PDF Payment Receipts**: Generates official branded receipts with breakdown of principal, interest, penalty, and remaining balance.
- **Legal Loan Agreement & Amortization Contract**: Printable borrower agreement with terms, collateral details, and signature fields.
- **Excel & CSV Exports**: 1-click export for Customers, Loans Ledger, Repayments, and Expenses.

### 5. 🐛 Bugs Fixed from Legacy JavaFX System
- Fixed swapped dropdown ID handlers in `PaymentManageFormController`.
- Fixed the overdue penalty calculation bug (now computes accurate accrued penalty daily for overdue active loans).
- Fixed phone number regex to accept all local and international formats (`077...`, `+94...`).
- Fixed interest calculation formulas (both Flat Rate and Reducing Balance EMI).

---

## 🚀 How to Run the Application

### Option A: Standalone Windows Executable (.exe)
Simply double-click:
```
FinFlow-Pro.exe
```
or run `Launch-FinFlow-Pro.bat`. It will start the embedded high-performance server and open the app in a dedicated native desktop window!

### Option B: Web Browser Mode
1. Open a terminal in `micro-finance-web`:
   ```bash
   cd micro-finance-web
   npm run dev
   ```
2. Open your browser at: `http://localhost:5173`

---

## 🔑 Default Login Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **System Administrator** | `Admin` | `@1234` |
| **Branch Manager** | `chamara` | `Pass@123` |
| **Loan Officer** | `nimali` | `Officer@123` |

*(You can also use the 1-Click Quick Login buttons on the login screen).*

---

## 🛠️ Technology Stack
- **Frontend Core**: React 18, Vite, TypeScript
- **Styling & UI**: Tailwind CSS v4, Lucide Icons, Glassmorphic Design, Dark/Light Theme Toggle
- **Database**: Dexie.js (IndexedDB)
- **Visualizations**: Recharts (Cashflow Area Charts, Monthly Bar Charts, Risk Pie Charts)
- **PDF Generation**: jsPDF, jsPDF-AutoTable
- **Spreadsheets**: SheetJS (XLSX)
- **Email Service**: @emailjs/browser
- **AI Engine**: Google Gemini API + Local Heuristic Decision Trees
- **Desktop Packaging**: C# .NET Windows Executable / Electron Ready
