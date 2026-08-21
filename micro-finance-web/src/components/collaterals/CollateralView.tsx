import React, { useState } from 'react';
import {
  ShieldCheck,
  PlusCircle,
  Search,
  Building2,
  Car,
  Coins,
  Wrench,
  UserCheck,
  Edit2,
  Trash2,
  X,
  Phone
} from 'lucide-react';
import type { Collateral, Customer, Loan } from '../../db/types';
import { db } from '../../db/db';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';

interface CollateralViewProps {
  collaterals: Collateral[];
  customers: Customer[];
  loans: Loan[];
}

export const CollateralView: React.FC<CollateralViewProps> = ({
  collaterals,
  customers,
  loans
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollateral, setEditingCollateral] = useState<Collateral | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Collateral>>({
    id: '',
    name: '',
    type: 'Vehicle',
    estimatedValue: 1000000,
    address: '',
    phoneNumber: '',
    status: 'Pledged',
    customerId: '',
    documentRef: ''
  });

  const getCollateralIcon = (type: string) => {
    switch (type) {
      case 'Vehicle':
        return <Car className="w-5 h-5 text-blue-500" />;
      case 'Gold / Jewelry':
        return <Coins className="w-5 h-5 text-amber-500" />;
      case 'Real Estate / Land':
        return <Building2 className="w-5 h-5 text-emerald-500" />;
      case 'Equipment / Machinery':
        return <Wrench className="w-5 h-5 text-purple-500" />;
      default:
        return <UserCheck className="w-5 h-5 text-slate-500" />;
    }
  };

  const filteredCollaterals = collaterals.filter((col) => {
    const cust = customers.find((c) => c.id === col.customerId);
    const matchesSearch =
      col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      col.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || col.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setEditingCollateral(null);
    const nextNum = collaterals.length + 1;
    setFormData({
      id: `COL-${String(nextNum).padStart(3, '0')}`,
      name: '',
      type: 'Vehicle',
      estimatedValue: 1000000,
      address: '',
      phoneNumber: '',
      status: 'Pledged',
      customerId: customers[0]?.id || '',
      documentRef: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (col: Collateral) => {
    setEditingCollateral(col);
    setFormData({ ...col });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.id?.trim()) {
      showToast('error', 'Validation Error', 'Collateral ID and description name are required.');
      return;
    }

    const valueCheck = SecurityService.validateAmount(formData.estimatedValue || 0, 1000, 1000000000, 'Estimated Value');
    if (!valueCheck.isValid) {
      showToast('error', 'Validation Error', valueCheck.error);
      return;
    }

    if (formData.phoneNumber) {
      const phoneCheck = SecurityService.validatePhone(formData.phoneNumber);
      if (!phoneCheck.isValid) {
        showToast('error', 'Validation Error', phoneCheck.error);
        return;
      }
    }

    try {
      const record: Collateral = {
        id: formData.id!.trim().toUpperCase(),
        name: SecurityService.sanitizeString(formData.name),
        type: formData.type as any,
        estimatedValue: Math.max(0, Number(formData.estimatedValue) || 0),
        address: SecurityService.sanitizeString(formData.address),
        phoneNumber: formData.phoneNumber?.trim() || '',
        status: (formData.status as any) || 'Pledged',
        customerId: formData.customerId || undefined,
        documentRef: SecurityService.sanitizeString(formData.documentRef),
        loanId: formData.loanId
      };

      if (editingCollateral) {
        await db.collaterals.put(record);
        await SecurityService.logSecurityEvent(
          'Collateral Updated',
          `Collateral asset #${record.id} (${record.name} - LKR ${record.estimatedValue.toLocaleString()}) modified`,
          'Admin',
          'Collateral'
        );
        showToast('success', 'Collateral Updated', `Asset #${record.id} updated successfully.`);
      } else {
        await db.collaterals.add(record);
        await SecurityService.logSecurityEvent(
          'Collateral Registered',
          `New collateral asset #${record.id} (${record.name} - LKR ${record.estimatedValue.toLocaleString()}) pledged`,
          'Admin',
          'Collateral'
        );
        showToast('success', 'Collateral Registered', `New asset #${record.id} saved.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Error Saving Collateral', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to remove collateral #${id}?`)) {
      await db.collaterals.delete(id);
      await SecurityService.logSecurityEvent(
        'Collateral Removed',
        `Collateral asset record #${id} deleted`,
        'Admin',
        'Collateral'
      );
      showToast('info', 'Collateral Removed', `Asset record #${id} deleted.`);
    }
  };

  const totalCollateralValue = collaterals.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Collateral Assets Registry ({collaterals.length})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Total Asset Security Valuation: <span className="font-bold text-emerald-600">LKR {totalCollateralValue.toLocaleString()}</span>
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Collateral</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search collateral asset, borrower, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Vehicle', 'Real Estate / Land', 'Gold / Jewelry', 'Equipment / Machinery'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                typeFilter === t
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Collateral Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCollaterals.map((col) => {
          const cust = customers.find((c) => c.id === col.customerId);

          return (
            <div
              key={col.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getCollateralIcon(col.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{col.id}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{col.name}</h4>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      col.status === 'Pledged'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                        : col.status === 'Released'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {col.status}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valuation:</span>
                    <span className="font-bold text-slate-900 dark:text-white">LKR {col.estimatedValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pledged By:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{cust?.name || 'Unassigned'}</span>
                  </div>
                  {col.documentRef && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Doc Ref:</span>
                      <span className="font-mono text-slate-500">{col.documentRef}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{col.phoneNumber || cust?.phoneNumber || 'N/A'}</span>
                  </div>
                  <p className="text-[11px] truncate text-slate-400">{col.address || cust?.address}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(col)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Asset"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(col.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Delete Asset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Collateral Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingCollateral ? 'Edit Collateral Asset' : 'Register Collateral Asset'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Collateral ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Asset Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Real Estate / Land">Real Estate / Land</option>
                    <option value="Gold / Jewelry">Gold / Jewelry</option>
                    <option value="Equipment / Machinery">Equipment / Machinery</option>
                    <option value="Fixed Deposit">Fixed Deposit</option>
                    <option value="Personal Guarantor">Personal Guarantor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Asset Description / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toyota Hilux Double Cab (WP CAB-4521)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Estimated Valuation (LKR) *</label>
                  <input
                    type="number"
                    required
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pledged Borrower</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Document Reference / CR #</label>
                  <input
                    type="text"
                    value={formData.documentRef}
                    onChange={(e) => setFormData({ ...formData, documentRef: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
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
                  Save Collateral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
