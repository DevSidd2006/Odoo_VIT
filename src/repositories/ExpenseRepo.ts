import { getDb } from '../db/database';
import { Expense, ExpenseStatus, ExpenseWithDetails } from '../types';

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
    const db = getDb();
    const result = await db.runAsync(
      `INSERT INTO expenses (company_id, employee_id, description, expense_date, category_id, paid_by, currency, amount, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.company_id, data.employee_id, data.description, data.expense_date,
       data.category_id, data.paid_by, data.currency, data.amount, data.remarks]
    );
    return result.lastInsertRowId;
  },

  async findById(id: number): Promise<ExpenseWithDetails | null> {
    const db = getDb();
    return db.getFirstAsync<ExpenseWithDetails>(`
      SELECT e.*, u.name as employee_name, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN users u ON u.id = e.employee_id
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.id = ?
    `, [id]);
  },

  async findByEmployee(employee_id: number): Promise<ExpenseWithDetails[]> {
    const db = getDb();
    return db.getAllAsync<ExpenseWithDetails>(`
      SELECT e.*, u.name as employee_name, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN users u ON u.id = e.employee_id
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.employee_id = ?
      ORDER BY e.created_at DESC
    `, [employee_id]);
  },

  async findByCompany(company_id: number): Promise<ExpenseWithDetails[]> {
    const db = getDb();
    return db.getAllAsync<ExpenseWithDetails>(`
      SELECT e.*, u.name as employee_name, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN users u ON u.id = e.employee_id
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.company_id = ?
      ORDER BY e.created_at DESC
    `, [company_id]);
  },

  async update(id: number, data: Partial<Omit<Expense, 'id' | 'created_at'>>): Promise<void> {
    const db = getDb();
    const updates = { ...data, updated_at: new Date().toISOString() };
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    await db.runAsync(`UPDATE expenses SET ${fields} WHERE id = ?`, values);
  },

  async updateStatus(id: number, status: ExpenseStatus): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE expenses SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, id]
    );
  },

  async updateReceiptUri(id: number, uri: string, ocr_text: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE expenses SET receipt_uri = ?, ocr_text = ?, updated_at = datetime('now') WHERE id = ?`,
      [uri, ocr_text, id]
    );
  },

  async delete(id: number): Promise<void> {
    const db = getDb();
    await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
  },

  async getSummaryByEmployee(employee_id: number): Promise<{
    to_submit: number;
    waiting: number;
    approved: number;
  }> {
    const db = getDb();
    const rows = await db.getAllAsync<{ status: string; total: number }>(
      `SELECT status, SUM(amount) as total FROM expenses WHERE employee_id = ? GROUP BY status`,
      [employee_id]
    );
    const map: Record<string, number> = {};
    rows.forEach(r => { map[r.status] = r.total; });
    return {
      to_submit: (map['draft'] ?? 0),
      waiting: (map['submitted'] ?? 0) + (map['waiting_approval'] ?? 0),
      approved: (map['approved'] ?? 0),
    };
  },
};
