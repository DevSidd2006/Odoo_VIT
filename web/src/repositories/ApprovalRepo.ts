import { db } from '../db/database';
import type { ApprovalRule, ApprovalRuleApprover, ApprovalRuleWithApprovers, ApprovalRequest, ApprovalRequestStatus, ApprovalRequestWithDetails } from '../types';
import { CATEGORIES } from '../utils/constants';

export const ApprovalRuleRepo = {
  async create(data: {
    company_id: number;
    user_id: number;
    description: string;
    manager_id: number;
    manager_is_approver: boolean;
    specific_approver_id?: number | null;
    sequential: boolean;
    min_approval_percentage: number;
  }): Promise<number> {
    return await db.approval_rules.add({
      company_id: data.company_id,
      user_id: data.user_id,
      description: data.description,
      manager_id: data.manager_id,
      manager_is_approver: data.manager_is_approver,
      specific_approver_id: data.specific_approver_id ?? null,
      sequential: data.sequential,
      min_approval_percentage: data.min_approval_percentage
    } as any);
  },

  async addApprover(data: {
    rule_id: number;
    user_id: number;
    order_index: number;
    required: boolean;
  }): Promise<void> {
    await db.approval_rule_approvers.add({
      rule_id: data.rule_id,
      user_id: data.user_id,
      order_index: data.order_index,
      required: data.required
    } as any);
  },

  async findById(id: number): Promise<ApprovalRuleWithApprovers | null> {
    const rule = await db.approval_rules.get(id);
    if (!rule) return null;

    const approvers = await db.approval_rule_approvers.where('rule_id').equals(id).toArray();
    approvers.sort((a, b) => a.order_index - b.order_index);

    const approversWithNames = await Promise.all(approvers.map(async (a) => {
      const user = await db.users.get(a.user_id);
      return { ...a, approver_name: user?.name || 'Unknown' };
    }));

    return {
      ...rule,
      approvers: approversWithNames
    };
  },

  async findByUser(user_id: number): Promise<ApprovalRuleWithApprovers | null> {
    const rules = await db.approval_rules.where('user_id').equals(user_id).toArray();
    if (rules.length === 0) return null;
    rules.sort((a, b) => (b.id || 0) - (a.id || 0)); // DESC
    const rule = rules[0];

    return this.findById(rule.id!);
  },

  async findByCompany(company_id: number): Promise<(ApprovalRule & { user_name: string })[]> {
    const rules = await db.approval_rules.where('company_id').equals(company_id).toArray();
    rules.sort((a, b) => (b.id || 0) - (a.id || 0));

    return await Promise.all(rules.map(async (r) => {
      const user = await db.users.get(r.user_id);
      return { ...r, user_name: user?.name || 'Unknown' };
    }));
  },

  async deleteApprovers(rule_id: number): Promise<void> {
    const approvers = await db.approval_rule_approvers.where('rule_id').equals(rule_id).toArray();
    await Promise.all(approvers.map(a => db.approval_rule_approvers.delete(a.id!)));
  },

  async update(id: number, data: {
    user_id: number;
    description: string;
    manager_id: number;
    manager_is_approver: boolean;
    specific_approver_id?: number | null;
    sequential: boolean;
    min_approval_percentage: number;
  }): Promise<void> {
    await db.approval_rules.update(id, data);
  },

  async delete(id: number): Promise<void> {
    await db.approval_rules.delete(id);
    await this.deleteApprovers(id);
  },
};

export const ApprovalRequestRepo = {
  async create(data: {
    expense_id: number;
    approver_id: number;
    rule_id: number;
    order_index: number;
  }): Promise<number> {
    return await db.approval_requests.add({
      expense_id: data.expense_id,
      approver_id: data.approver_id,
      rule_id: data.rule_id,
      order_index: data.order_index,
      status: 'pending',
      created_at: new Date().toISOString()
    } as any);
  },

  async findPendingByApprover(approver_id: number): Promise<ApprovalRequestWithDetails[]> {
    const requests = await db.approval_requests.where('approver_id').equals(approver_id).toArray();
    const pending = requests.filter(r => r.status === 'pending');
    pending.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

    return await Promise.all(pending.map(async (ar) => {
      const approver = await db.users.get(ar.approver_id);
      const expense = await db.expenses.get(ar.expense_id);
      const employee = expense?.employee_id ? await db.users.get(expense.employee_id) : null;
      const category = expense ? CATEGORIES.find(c => c.id === expense.category_id) : null;
      const company = expense?.company_id ? await db.companies.get(expense.company_id) : null;

      return {
        ...ar,
        approver_name: approver?.name || 'Unknown',
        expense_description: expense?.description || '',
        expense_amount: expense?.amount || 0,
        expense_currency: expense?.currency || '',
        employee_name: employee?.name || 'Unknown',
        category_name: category?.name || 'Misc',
        company_base_currency: company?.base_currency || 'USD'
      };
    }));
  },

  async findByExpense(expense_id: number): Promise<(ApprovalRequest & { approver_name: string })[]> {
    const requests = await db.approval_requests.where('expense_id').equals(expense_id).toArray();
    requests.sort((a, b) => a.order_index - b.order_index);

    return await Promise.all(requests.map(async (ar) => {
      const approver = await db.users.get(ar.approver_id);
      return { ...ar, approver_name: approver?.name || 'Unknown' };
    }));
  },

  async updateStatus(id: number, status: ApprovalRequestStatus): Promise<void> {
    await db.approval_requests.update(id, { status, acted_at: new Date().toISOString() });
  },

  async decide(id: number, status: ApprovalRequestStatus, comment: string): Promise<void> {
    const req = await db.approval_requests.get(id);
    if (req && req.status === 'pending') {
      await db.approval_requests.update(id, {
        status,
        acted_at: new Date().toISOString(),
        decision_comment: comment.trim()
      });
    }
  },
};
