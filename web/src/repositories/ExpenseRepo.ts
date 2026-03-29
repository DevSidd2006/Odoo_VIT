import { db } from '../db/database';
import type { Expense, ExpenseStatus, ExpenseWithDetails } from '../types';
import { CATEGORIES } from '../utils/constants';

const enrichExpense = async (e: Expense): Promise<ExpenseWithDetails> => {
  const user = await db.users.get(e.employee_id);
  const category = CATEGORIES.find(c => c.id === e.category_id);
  return {
    ...e,
    employee_name: user ? user.name : 'Unknown User',
    category_name: category ? category.name : 'Others',
    category_icon: category ? category.icon : '📝',
  };
};

export const ExpenseRepo = {
  async create(data: {
    company_id: number;
    employee_id: number;
    description: string;
    expense_date: string;
    category_id: number;
    paid_by: string;
    currency: string;
    amount: number;
    remarks: string;
  }): Promise<number> {
    return await db.expenses.add({
      company_id: data.company_id,
      employee_id: data.employee_id,
      description: data.description,
      expense_date: data.expense_date,
      category_id: data.category_id,
      paid_by: data.paid_by,
      currency: data.currency,
      amount: data.amount,
      remarks: data.remarks,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any);
  },

  async findById(id: number): Promise<ExpenseWithDetails | undefined> {
    const expense = await db.expenses.get(id);
    if (!expense) return undefined;
    return await enrichExpense(expense);
  },

  async findByEmployee(employee_id: number): Promise<ExpenseWithDetails[]> {
    const expenses = await db.expenses.where('employee_id').equals(employee_id).toArray();
    expenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return Promise.all(expenses.map(enrichExpense));
  },

  async findByCompany(company_id: number): Promise<ExpenseWithDetails[]> {
    const expenses = await db.expenses.where('company_id').equals(company_id).toArray();
    expenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return Promise.all(expenses.map(enrichExpense));
  },

  async update(id: number, data: Partial<Omit<Expense, 'id' | 'created_at'>>): Promise<void> {
    await db.expenses.update(id, { ...data, updated_at: new Date().toISOString() });
  },

  async updateStatus(id: number, status: ExpenseStatus): Promise<void> {
    await db.expenses.update(id, { status, updated_at: new Date().toISOString() });
  },

  async updateReceiptUri(id: number, uri: string, ocr_text: string): Promise<void> {
    await db.expenses.update(id, { receipt_uri: uri, ocr_text, updated_at: new Date().toISOString() });
  },

  async delete(id: number): Promise<void> {
    await db.expenses.delete(id);
  },

  async getSummaryByEmployee(employee_id: number): Promise<{
    to_submit: number;
    waiting: number;
    approved: number;
  }> {
    const expenses = await db.expenses.where('employee_id').equals(employee_id).toArray();
    const map: Record<string, number> = { draft: 0, submitted: 0, waiting_approval: 0, approved: 0 };
    expenses.forEach(e => { map[e.status] = (map[e.status] || 0) + e.amount; });
    return {
      to_submit: map['draft'] || 0,
      waiting: (map['submitted'] || 0) + (map['waiting_approval'] || 0),
      approved: map['approved'] || 0,
    };
  },
};
