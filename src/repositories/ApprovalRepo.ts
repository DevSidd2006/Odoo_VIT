import { getDb } from '../db/database';
import {
  ApprovalConditionMode,
  ApprovalEvent,
  ApprovalRule,
  ApprovalRuleApprover,
  ApprovalRuleWithApprovers,
  ApprovalRequest,
  ApprovalRequestStatus,
  ApprovalRequestWithDetails,
} from '../types';

export const ApprovalRuleRepo = {
  async create(data: {
    company_id: number;
    user_id: number;
    description: string;
    manager_id: number;
    manager_is_approver: boolean;
    specific_approver_id?: number | null;
    condition_mode: ApprovalConditionMode;
    sequential: boolean;
    min_approval_percentage: number;
  }): Promise<number> {
    const db = getDb();
    const result = await db.runAsync(
      `INSERT INTO approval_rules (company_id, user_id, description, manager_id, manager_is_approver, specific_approver_id, condition_mode, sequential, min_approval_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.company_id, data.user_id, data.description, data.manager_id,
       data.manager_is_approver ? 1 : 0, data.specific_approver_id ?? null, data.condition_mode,
       data.sequential ? 1 : 0, data.min_approval_percentage]
    );
    return result.lastInsertRowId;
  },

  async addApprover(data: {
    rule_id: number;
    user_id: number;
    order_index: number;
    required: boolean;
  }): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO approval_rule_approvers (rule_id, user_id, order_index, required) VALUES (?, ?, ?, ?)`,
      [data.rule_id, data.user_id, data.order_index, data.required ? 1 : 0]
    );
  },

  async findById(id: number): Promise<ApprovalRuleWithApprovers | null> {
    const db = getDb();
    const rule = await db.getFirstAsync<ApprovalRule>(
      `SELECT * FROM approval_rules WHERE id = ?`,
      [id]
    );
    if (!rule) return null;

    const approvers = await db.getAllAsync<ApprovalRuleApprover & { approver_name: string }>(
      `SELECT ara.*, u.name as approver_name FROM approval_rule_approvers ara
       JOIN users u ON u.id = ara.user_id
       WHERE ara.rule_id = ? ORDER BY ara.order_index`,
      [rule.id]
    );

    return {
      ...rule,
      manager_is_approver: Boolean(rule.manager_is_approver),
      condition_mode: rule.condition_mode ?? 'hybrid',
      sequential: Boolean(rule.sequential),
      approvers: approvers.map(a => ({ ...a, required: Boolean(a.required) })),
    };
  },

  async findByUser(user_id: number): Promise<ApprovalRuleWithApprovers | null> {
    const db = getDb();
    const rule = await db.getFirstAsync<ApprovalRule>(
      `SELECT * FROM approval_rules WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [user_id]
    );
    if (!rule) return null;

    const approvers = await db.getAllAsync<ApprovalRuleApprover & { approver_name: string }>(
      `SELECT ara.*, u.name as approver_name FROM approval_rule_approvers ara
       JOIN users u ON u.id = ara.user_id
       WHERE ara.rule_id = ? ORDER BY ara.order_index`,
      [rule.id]
    );

    return {
      ...rule,
      manager_is_approver: Boolean(rule.manager_is_approver),
      condition_mode: rule.condition_mode ?? 'hybrid',
      sequential: Boolean(rule.sequential),
      approvers: approvers.map(a => ({ ...a, required: Boolean(a.required) })),
    };
  },

  async findByCompany(company_id: number): Promise<(ApprovalRule & { user_name: string; specific_approver_name?: string | null })[]> {
    const db = getDb();
    return db.getAllAsync(
      `SELECT ar.*, u.name as user_name, sa.name as specific_approver_name FROM approval_rules ar
       JOIN users u ON u.id = ar.user_id
       LEFT JOIN users sa ON sa.id = ar.specific_approver_id
       WHERE ar.company_id = ? ORDER BY ar.id DESC`,
      [company_id]
    );
  },

  async deleteApprovers(rule_id: number): Promise<void> {
    const db = getDb();
    await db.runAsync(`DELETE FROM approval_rule_approvers WHERE rule_id = ?`, [rule_id]);
  },

  async update(id: number, data: {
    user_id: number;
    description: string;
    manager_id: number;
    manager_is_approver: boolean;
    specific_approver_id?: number | null;
    condition_mode: ApprovalConditionMode;
    sequential: boolean;
    min_approval_percentage: number;
  }): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE approval_rules
       SET user_id = ?, description = ?, manager_id = ?, manager_is_approver = ?, specific_approver_id = ?, condition_mode = ?, sequential = ?, min_approval_percentage = ?
       WHERE id = ?`,
      [
        data.user_id,
        data.description,
        data.manager_id,
        data.manager_is_approver ? 1 : 0,
        data.specific_approver_id ?? null,
        data.condition_mode,
        data.sequential ? 1 : 0,
        data.min_approval_percentage,
        id,
      ]
    );
  },

  async delete(id: number): Promise<void> {
    const db = getDb();
    await db.runAsync(`DELETE FROM approval_rules WHERE id = ?`, [id]);
  },
};

export const ApprovalRequestRepo = {
  async create(data: {
    expense_id: number;
    approver_id: number;
    rule_id: number;
    order_index: number;
  }): Promise<number> {
    const db = getDb();
    const result = await db.runAsync(
      `INSERT INTO approval_requests (expense_id, approver_id, rule_id, order_index) VALUES (?, ?, ?, ?)`,
      [data.expense_id, data.approver_id, data.rule_id, data.order_index]
    );
    return result.lastInsertRowId;
  },

  async findPendingByApprover(approver_id: number): Promise<ApprovalRequestWithDetails[]> {
    const db = getDb();
    return db.getAllAsync<ApprovalRequestWithDetails>(`
      SELECT ar.*,
             u.name as approver_name,
             e.description as expense_description,
             e.amount as expense_amount,
             e.currency as expense_currency,
             emp.name as employee_name,
             cat.name as category_name,
             comp.base_currency as company_base_currency
      FROM approval_requests ar
      JOIN users u ON u.id = ar.approver_id
      JOIN expenses e ON e.id = ar.expense_id
      JOIN users emp ON emp.id = e.employee_id
      LEFT JOIN categories cat ON cat.id = e.category_id
      JOIN companies comp ON comp.id = e.company_id
      WHERE ar.approver_id = ? AND ar.status = 'pending'
      ORDER BY ar.created_at DESC
    `, [approver_id]);
  },

  async findByExpense(expense_id: number): Promise<(ApprovalRequest & { approver_name: string })[]> {
    const db = getDb();
    return db.getAllAsync(
      `SELECT ar.*, u.name as approver_name FROM approval_requests ar
       JOIN users u ON u.id = ar.approver_id
       WHERE ar.expense_id = ? ORDER BY ar.order_index`,
      [expense_id]
    );
  },

  async updateStatus(id: number, status: ApprovalRequestStatus): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE approval_requests SET status = ?, acted_at = datetime('now') WHERE id = ?`,
      [status, id]
    );
  },

  async decide(id: number, status: ApprovalRequestStatus, comment: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE approval_requests
       SET status = ?, acted_at = datetime('now'), decision_comment = ?
       WHERE id = ? AND status = 'pending'`,
      [status, comment.trim(), id]
    );
  },
};

export const ApprovalEventRepo = {
  async create(data: {
    expense_id: number;
    rule_id: number;
    event_type: string;
    message: string;
    snapshot_json?: string;
  }): Promise<number> {
    const db = getDb();
    const result = await db.runAsync(
      `INSERT INTO approval_events (expense_id, rule_id, event_type, message, snapshot_json)
       VALUES (?, ?, ?, ?, ?)`,
      [data.expense_id, data.rule_id, data.event_type, data.message, data.snapshot_json ?? null]
    );
    return result.lastInsertRowId;
  },

  async findByExpense(expense_id: number): Promise<ApprovalEvent[]> {
    const db = getDb();
    return db.getAllAsync<ApprovalEvent>(
      `SELECT * FROM approval_events WHERE expense_id = ? ORDER BY created_at ASC, id ASC`,
      [expense_id]
    );
  },
};
