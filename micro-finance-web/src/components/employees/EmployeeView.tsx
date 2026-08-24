import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  PlusCircle
} from 'lucide-react';
import type { Employee, Assignment, Customer } from '../../db/types';
import { db } from '../../db/db';
import { SecurityService } from '../../services/securityService';
import { useToast } from '../layout/Toast';

interface EmployeeViewProps {
  employees: Employee[];
  assignments: Assignment[];
  customers: Customer[];
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  employees,
  assignments,
  customers
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'tasks'>('staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Employee Form State
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({
    id: '',
    name: '',
    address: '',
    salary: 100000,
    phoneNumber: '',
    email: '',
    role: 'Loan Officer',
    status: 'Active',
    joinedDate: new Date().toISOString().split('T')[0]
  });

  // Task Form State
  const [taskForm, setTaskForm] = useState<Partial<Assignment>>({
    task: '',
    employeeId: employees[0]?.id || '',
    customerId: customers[0]?.id || '',
    status: 'In Progress',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: 'Medium',
    notes: ''
  });

  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      name: '',
      address: '',
      salary: 100000,
      phoneNumber: '',
      email: '',
      role: 'Loan Officer',
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0]
    });
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({ ...emp });
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.id?.trim() || !employeeForm.name?.trim()) {
      showToast('error', 'Validation Error', 'Employee ID and name are required.');
      return;
    }

    if (employeeForm.phoneNumber) {
      const phoneCheck = SecurityService.validatePhone(employeeForm.phoneNumber);
      if (!phoneCheck.isValid) {
        showToast('error', 'Validation Error', phoneCheck.error);
        return;
      }
    }

    if (employeeForm.email) {
      const emailCheck = SecurityService.validateEmail(employeeForm.email);
      if (!emailCheck.isValid) {
        showToast('error', 'Validation Error', emailCheck.error);
        return;
      }
    }

    const salaryCheck = SecurityService.validateAmount(employeeForm.salary || 0, 0, 10000000, 'Salary');
    if (!salaryCheck.isValid) {
      showToast('error', 'Validation Error', salaryCheck.error);
      return;
    }

    try {
      const record: Employee = {
        id: employeeForm.id!.trim().toUpperCase(),
        name: SecurityService.sanitizeString(employeeForm.name),
        address: SecurityService.sanitizeString(employeeForm.address),
        salary: Math.max(0, Number(employeeForm.salary) || 0),
        phoneNumber: employeeForm.phoneNumber?.trim() || '',
        email: employeeForm.email?.trim().toLowerCase() || '',
        role: employeeForm.role as any,
        status: (employeeForm.status as any) || 'Active',
        joinedDate: employeeForm.joinedDate || new Date().toISOString().split('T')[0]
      };

      if (editingEmployee) {
        await db.employees.put(record);
        await SecurityService.logSecurityEvent(
          'Staff Record Updated',
          `Employee record #${record.id} (${record.name}) modified`,
          'Admin',
          'Employee'
        );
        showToast('success', 'Staff Member Updated', `${record.name} details saved.`);
      } else {
        await db.employees.add(record);
        await SecurityService.logSecurityEvent(
          'Staff Registered',
          `New staff member #${record.id} (${record.name}) added`,
          'Admin',
          'Employee'
        );
        showToast('success', 'Staff Member Registered', `New employee #${record.id} registered.`);
      }
      setIsEmployeeModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Error Saving Employee', err.message);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove staff member "${name}"?`)) {
      await db.employees.delete(id);
      await SecurityService.logSecurityEvent(
        'Staff Removed',
        `Staff member #${id} (${name}) removed from records`,
        'Admin',
        'Employee'
      );
      showToast('info', 'Staff Member Removed', `Record #${id} deleted.`);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.task?.trim()) {
      showToast('error', 'Validation Error', 'Task description is required.');
      return;
    }

    try {
      await db.assignments.add({
        task: taskForm.task!.trim(),
        employeeId: taskForm.employeeId || employees[0]?.id || 'EMP-001',
        customerId: taskForm.customerId || customers[0]?.id || 'CUST-001',
        status: (taskForm.status as any) || 'Pending',
        dateAssigned: new Date().toISOString().split('T')[0],
        dueDate: taskForm.dueDate || new Date().toISOString().split('T')[0],
        priority: (taskForm.priority as any) || 'Medium',
        notes: taskForm.notes?.trim() || ''
      });
      showToast('success', 'Task Assigned', 'New recovery task assigned to officer.');
      setIsTaskModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Error Assigning Task', err.message);
    }
  };

  const handleUpdateTaskStatus = async (task: Assignment, newStatus: Assignment['status']) => {
    if (!task.id) return;
    await db.assignments.update(task.id, { status: newStatus });
    showToast('info', 'Task Status Updated', `Status changed to ${newStatus}`);
  };

  const totalPayroll = employees.reduce((sum, e) => sum + (e.salary || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>Staff Directory & Field Assignments</span>
          </h3>
          <p className="text-xs text-slate-500">
            Staff payroll: <span className="font-bold text-emerald-600">LKR {totalPayroll.toLocaleString()} / mo</span> • {employees.length} Active Officers
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'staff' ? (
            <button
              onClick={handleOpenAddEmployee}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          ) : (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Assign New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 w-fit">
        <button
          onClick={() => setActiveSubTab('staff')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'staff'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Staff Directory ({employees.length})
        </button>
        <button
          onClick={() => setActiveSubTab('tasks')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'tasks'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Task Tracker ({assignments.length})
        </button>
      </div>

      {/* View 1: Staff Directory */}
      {activeSubTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-600">{emp.id}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight mt-0.5">{emp.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{emp.role}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                    {emp.status}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Salary:</span>
                    <span className="font-bold text-slate-900 dark:text-white">LKR {emp.salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Joined Date:</span>
                    <span className="text-slate-700 dark:text-slate-300">{emp.joinedDate}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{emp.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEditEmployee(emp)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 2: Task Assignments */}
      {activeSubTab === 'tasks' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3.5">Task Description</th>
                  <th className="px-4 py-3.5">Assigned Officer</th>
                  <th className="px-4 py-3.5">Target Customer</th>
                  <th className="px-4 py-3.5">Due Date</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                      No active task assignments found.
                    </td>
                  </tr>
                ) : (
                  assignments.map((task) => {
                    const emp = employees.find((e) => e.id === task.employeeId);
                    const cust = customers.find((c) => c.id === task.customerId);

                    return (
                      <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-xs">
                          {task.task}
                          {task.notes && <span className="block text-[10px] text-slate-400 mt-0.5">{task.notes}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold">{emp?.name || task.employeeId}</p>
                          <p className="text-[10px] text-slate-400">{emp?.role}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold">{cust?.name || task.customerId}</p>
                          <p className="text-[10px] text-slate-400">{task.customerId}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">{task.dueDate}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              task.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-700'
                                : task.priority === 'High'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              task.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : task.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1">
                          {task.status !== 'Completed' && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task, 'Completed')}
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              title="Mark Completed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingEmployee ? 'Edit Staff Details' : 'Register New Staff Member'}
              </h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="p-1.5 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Role / Designation</label>
                  <select
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Branch Manager">Branch Manager</option>
                    <option value="Loan Officer">Loan Officer</option>
                    <option value="Credit Analyst">Credit Analyst</option>
                    <option value="Field Recovery Officer">Field Recovery Officer</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Monthly Basic Salary (LKR) *</label>
                  <input
                    type="number"
                    required
                    value={employeeForm.salary}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, salary: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={employeeForm.phoneNumber}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Address</label>
                <input
                  type="text"
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign Recovery / Inspection Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="p-1.5 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Task Action / Goal *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct field visit and inspect pledged tractor"
                  value={taskForm.task}
                  onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Assign To Officer</label>
                  <select
                    value={taskForm.employeeId}
                    onChange={(e) => setTaskForm({ ...taskForm, employeeId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Customer</label>
                  <select
                    value={taskForm.customerId}
                    onChange={(e) => setTaskForm({ ...taskForm, customerId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
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
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Detailed Briefing / Notes</label>
                <textarea
                  rows={2}
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
