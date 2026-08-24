import React, { useState } from 'react';
import {
  Receipt,
  PlusCircle,
  Search,
  FileSpreadsheet,
  Trash2,
  Edit2,
  X,
  PieChart as PieIcon,
  TrendingDown
} from 'lucide-react';
import type { Expense, Employee } from '../../db/types';
import { db } from '../../db/db';
import { ExportService } from '../../services/exportService';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';

interface ExpenseViewProps {
  expenses: Expense[];
  employees: Employee[];
}

export const ExpenseView: React.FC<ExpenseViewProps> = ({
  expenses,
  employees
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Expense>>({
    type: 'Utilities & Internet',
    date: new Date().toISOString().split('T')[0],
    amount: 25000,
    employeeId: employees[0]?.id || '',
    description: '',
    paymentMethod: 'Direct Bank Transfer'
  });

  const categories = [
    'Salaries & Wages',
    'Office Rent',
    'Utilities & Internet',
    'Travel & Field Operations',
    'IT & Software',
    'Marketing',
    'Office Supplies',
    'Miscellaneous'
  ] as const;

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || exp.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      type: 'Utilities & Internet',
      date: new Date().toISOString().split('T')[0],
      amount: 25000,
      employeeId: employees[0]?.id || '',
      description: '',
      paymentMethod: 'Direct Bank Transfer'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({ ...exp });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description?.trim()) {
      showToast('error', 'Validation Error', 'Expense description is required.');
      return;
    }

    const amountCheck = SecurityService.validateAmount(formData.amount || 0, 1, 50000000, 'Expense Amount');
    if (!amountCheck.isValid) {
      showToast('error', 'Validation Error', amountCheck.error);
      return;
    }

    try {
      const record: Expense = {
        type: formData.type as any,
        date: formData.date || new Date().toISOString().split('T')[0],
        employeeId: formData.employeeId || undefined,
        amount: Math.max(0, Number(formData.amount)),
        description: SecurityService.sanitizeString(formData.description),
        paymentMethod: formData.paymentMethod || 'Bank Transfer'
      };

      if (editingExpense && editingExpense.id) {
        await db.expenses.update(editingExpense.id, record);
        await SecurityService.logSecurityEvent(
          'Expense Modified',
          `Expense item #${editingExpense.id} (${record.type} - LKR ${record.amount.toLocaleString()}) updated`,
          'Admin',
          'Expense'
        );
        showToast('success', 'Expense Updated', 'Expense posting updated successfully.');
      } else {
        const id = await db.expenses.add(record);
        await SecurityService.logSecurityEvent(
          'Expense Posted',
          `New expense of LKR ${record.amount.toLocaleString()} posted to ${record.type} (Ref #${id})`,
          'Admin',
          'Expense'
        );
        showToast('success', 'Expense Recorded', `LKR ${record.amount.toLocaleString()} posted to ${record.type}.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Error Saving Expense', err.message);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this expense posting?')) {
      await db.expenses.delete(id);
      await SecurityService.logSecurityEvent(
        'Expense Deleted',
        `Expense record #${id} removed from ledger`,
        'Admin',
        'Expense'
      );
      showToast('info', 'Expense Deleted', 'Record deleted from operational ledger.');
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            <span>Operational Expenses ({expenses.length})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Total Operational Expenditure: <span className="font-bold text-rose-600">LKR {totalExpenseAmount.toLocaleString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => ExportService.exportExpensesToExcel()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search description, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', ...categories.slice(0, 5)].map((cat) => (
            <button
              key={cat}
              onClick={() => setTypeFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                typeFilter === cat
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Posting Date</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Authorizing Staff</th>
                <th className="px-4 py-3.5">Channel</th>
                <th className="px-4 py-3.5">Amount (LKR)</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const emp = employees.find((e) => e.id === exp.employeeId);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 text-slate-500 font-mono">{exp.date}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {exp.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium max-w-sm">
                        {exp.description}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {emp?.name || exp.employeeId || 'General Office'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono">
                        {exp.paymentMethod || 'Bank Transfer'}
                      </td>
                      <td className="px-4 py-3.5 font-black text-rose-600 dark:text-rose-400">
                        LKR {exp.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingExpense ? 'Edit Expense Record' : 'Post Operational Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Expense Category *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Amount (LKR) *</label>
                  <input
                    type="number"
                    required
                    step={100}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Description / Bill Memo *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Electricity and Fiber Internet bills"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Authorizing Employee</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- General Office / Unassigned --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Posting Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
