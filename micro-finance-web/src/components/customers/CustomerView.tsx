import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Phone,
  Mail,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';
import type { Customer, CustomerLoan, Payment, Collateral } from '../../db/types';
import { db } from '../../db/db';
import { ExportService } from '../../services/exportService';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';

interface CustomerViewProps {
  customers: Customer[];
  customerLoans: CustomerLoan[];
  payments: Payment[];
  collaterals: Collateral[];
  onOpenNewLoanForCustomer: (customer: Customer) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  customerLoans,
  payments,
  collaterals,
  onOpenNewLoanForCustomer
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    id: '',
    name: '',
    nic: '',
    phoneNumber: '',
    email: '',
    address: '',
    monthlyIncome: 75000,
    employment: '',
    creditScore: 700,
    status: 'Active',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      id: '',
      name: '',
      nic: '',
      phoneNumber: '',
      email: '',
      address: '',
      monthlyIncome: 75000,
      employment: '',
      creditScore: 700,
      status: 'Active',
      notes: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Name Validation
    if (!formData.name?.trim()) {
      errors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Full name must be at least 3 characters.';
    }

    // 2. NIC Validation (Sri Lankan standard format)
    const nicToCheck = formData.nic?.trim() || formData.id?.trim() || '';
    const nicValidation = SecurityService.validateNIC(nicToCheck);
    if (!nicValidation.isValid) {
      errors.id = nicValidation.error || 'Invalid NIC format.';
      errors.nic = nicValidation.error || 'Invalid NIC format.';
    }

    // 3. Phone Validation
    const phoneValidation = SecurityService.validatePhone(formData.phoneNumber || '');
    if (!phoneValidation.isValid) {
      errors.phoneNumber = phoneValidation.error || 'Invalid phone number.';
    }

    // 4. Email Validation (if provided)
    if (formData.email?.trim()) {
      const emailValidation = SecurityService.validateEmail(formData.email.trim());
      if (!emailValidation.isValid) {
        errors.email = emailValidation.error || 'Invalid email address.';
      }
    }

    // 5. Monthly Income Validation
    if (formData.monthlyIncome !== undefined) {
      const incomeValidation = SecurityService.validateAmount(formData.monthlyIncome, 0, 100000000, 'Monthly Income');
      if (!incomeValidation.isValid) {
        errors.monthlyIncome = incomeValidation.error || 'Invalid income.';
      }
    }

    // 6. Credit Score Bounds (300 to 850)
    const score = Number(formData.creditScore);
    if (isNaN(score) || score < 300 || score > 850) {
      errors.creditScore = 'Credit score must be between 300 and 850.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const cleanId = (formData.nic || formData.id)!.trim().toUpperCase();
      const customerToSave: Customer = {
        id: cleanId,
        name: SecurityService.sanitizeString(formData.name),
        nic: cleanId,
        phoneNumber: formData.phoneNumber!.trim(),
        email: formData.email?.trim().toLowerCase() || '',
        address: SecurityService.sanitizeString(formData.address),
        monthlyIncome: Math.max(0, Number(formData.monthlyIncome) || 0),
        employment: SecurityService.sanitizeString(formData.employment) || 'Self-Employed',
        creditScore: Math.min(850, Math.max(300, Number(formData.creditScore) || 650)),
        status: (formData.status as any) || 'Active',
        createdAt: editingCustomer?.createdAt || new Date().toISOString().split('T')[0],
        notes: SecurityService.sanitizeString(formData.notes)
      };

      if (editingCustomer) {
        await db.customers.put(customerToSave);
        await SecurityService.logSecurityEvent(
          'Customer Updated',
          `Customer profile ${customerToSave.name} (${customerToSave.id}) modified`,
          'Admin',
          'Customer'
        );
        showToast('success', 'Customer Updated', `Customer ${customerToSave.name} updated successfully.`);
      } else {
        const existing = await db.customers.get(customerToSave.id);
        if (existing) {
          showToast('error', 'Duplicate Customer', `A customer with NIC/ID "${customerToSave.id}" already exists.`);
          return;
        }
        await db.customers.add(customerToSave);
        await SecurityService.logSecurityEvent(
          'Customer Registered',
          `New customer profile ${customerToSave.name} (${customerToSave.id}) created`,
          'Admin',
          'Customer'
        );
        showToast('success', 'Customer Registered', `New customer ${customerToSave.name} created successfully.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Error Saving Customer', err.message);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    const activeContracts = customerLoans.filter((cl) => cl.customerId === id && cl.paymentStatus !== 'Settled');
    if (activeContracts.length > 0) {
      showToast('error', 'Cannot Delete Customer', `This customer has ${activeContracts.length} active or overdue loan contract(s).`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete customer "${name}" (${id})?`)) {
      await db.customers.delete(id);
      await SecurityService.logSecurityEvent(
        'Customer Deleted',
        `Customer profile #${id} (${name}) was removed`,
        'Admin',
        'Customer'
      );
      showToast('info', 'Customer Deleted', `Customer profile #${id} has been removed.`);
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Customer Directory ({customers.length})</span>
          </h3>
          <p className="text-xs text-slate-500">Manage registered borrowers, credit scoring, and profile ledgers</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => ExportService.exportCustomersToExcel()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, NIC, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Active', 'Blacklisted', 'Inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards & Table View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const custLoans = customerLoans.filter((cl) => cl.customerId === cust.id);
          const activeLoan = custLoans.find((cl) => cl.paymentStatus === 'Active' || cl.paymentStatus === 'Overdue');
          const totalPaidSum = payments.filter((p) => p.customerId === cust.id).reduce((sum, p) => sum + p.amount, 0);

          return (
            <div
              key={cust.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                      {cust.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">NIC: {cust.nic || cust.id}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      cust.status === 'Active'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : cust.status === 'Blacklisted'
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cust.status}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.employment || 'Self-Employed'} • LKR {(cust.monthlyIncome || 0).toLocaleString()}/mo</span>
                  </div>
                </div>

                {/* Credit Score & Active Loan Indicator */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck
                      className={`w-4 h-4 ${
                        cust.creditScore >= 750
                          ? 'text-emerald-500'
                          : cust.creditScore >= 650
                          ? 'text-blue-500'
                          : 'text-amber-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Score: {cust.creditScore}
                    </span>
                  </div>

                  {activeLoan ? (
                    <span
                      className={`text-xs font-bold ${
                        activeLoan.paymentStatus === 'Overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {activeLoan.paymentStatus === 'Overdue' ? '⚠️ Overdue Loan' : `Active: LKR ${activeLoan.remainingBalance.toLocaleString()}`}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">No Active Loans</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedCustomer(cust)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>360° Profile</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cust)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer 360° Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Customer 360° Profile</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400">NIC/ID: {selectedCustomer.nic || selectedCustomer.id} • Joined {selectedCustomer.createdAt}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contact & Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-400">Phone Contact</span>
                <p className="font-bold text-sm text-slate-900 dark:text-white mt-1">{selectedCustomer.phoneNumber}</p>
                <a
                  href={`tel:${selectedCustomer.phoneNumber}`}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold mt-2 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Customer
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-400">Email Address</span>
                <p className="font-bold text-sm text-slate-900 dark:text-white mt-1 truncate">{selectedCustomer.email || 'None'}</p>
                {selectedCustomer.email && (
                  <a
                    href={`mailto:${selectedCustomer.email}`}
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold mt-2 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </a>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-400">Credit Rating</span>
                <p className="font-bold text-sm text-emerald-600 mt-1">{selectedCustomer.creditScore} Points</p>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {selectedCustomer.creditScore >= 750 ? 'Tier 1 (Prime)' : selectedCustomer.creditScore >= 650 ? 'Tier 2 (Good)' : 'Tier 3 (Supervised)'}
                </span>
              </div>
            </div>

            {/* Active & Historical Loans */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Loan Facilities Ledger</h4>
              <div className="space-y-2">
                {customerLoans.filter((cl) => cl.customerId === selectedCustomer.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No loan contracts on record for this customer.</p>
                ) : (
                  customerLoans
                    .filter((cl) => cl.customerId === selectedCustomer.id)
                    .map((cl, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">Facility #{cl.loanId}</span>
                          <span className="text-slate-400 ml-2">Issued {cl.dateIssued} • Due {cl.dateDue}</span>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Principal: LKR {cl.principalAmount.toLocaleString()} | Repayable: LKR {cl.totalAmountToPay.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              cl.paymentStatus === 'Settled'
                                ? 'bg-blue-100 text-blue-700'
                                : cl.paymentStatus === 'Overdue'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {cl.paymentStatus}
                          </span>
                          <p className="font-black text-slate-900 dark:text-white mt-1">
                            Bal: LKR {cl.remainingBalance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Actions in drawer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const cust = selectedCustomer;
                  setSelectedCustomer(null);
                  onOpenNewLoanForCustomer(cust);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Issue New Loan to {selectedCustomer.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Customer ID / NIC *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCustomer}
                    placeholder="e.g. 941234567V or 199512345678"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value, nic: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.id && <p className="text-rose-500 text-[10px] mt-1">{formErrors.id}</p>}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Shantha Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.name && <p className="text-rose-500 text-[10px] mt-1">{formErrors.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0771234567 or +94771234567"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.phoneNumber && <p className="text-rose-500 text-[10px] mt-1">{formErrors.phoneNumber}</p>}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. sunil.silva@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Monthly Income (LKR)</label>
                  <input
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Employment / Business</label>
                  <input
                    type="text"
                    placeholder="e.g. Retail Store Owner, Farmer"
                    value={formData.employment}
                    onChange={(e) => setFormData({ ...formData, employment: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. No 45, Temple Road, Kandy"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Blacklisted">Blacklisted</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Credit Score (300 - 850)</label>
                  <input
                    type="number"
                    min={300}
                    max={850}
                    value={formData.creditScore}
                    onChange={(e) => setFormData({ ...formData, creditScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
