import Dexie, { Table } from 'dexie';
import type {
  Company, User, Category, Expense,
  ApprovalRule, ApprovalRuleApprover, ApprovalRequest
} from '../types';

export class ReimburseAppDB extends Dexie {
  companies!: Table<Company, number>;
  users!: Table<User, number>;
  categories!: Table<Category, number>;
  expenses!: Table<Expense, number>;
  approval_rules!: Table<ApprovalRule, number>;
  approval_rule_approvers!: Table<ApprovalRuleApprover, number>;
  approval_requests!: Table<ApprovalRequest, number>;
  exchange_rate_cache!: Table<{ id?: number; base_currency: string; rates_json: string; fetched_at: string }, number>;

  constructor() {
    super('ReimburseAppDB');

    this.version(1).stores({
      companies: '++id, base_currency',
      users: '++id, email, company_id, role',
      categories: '++id, company_id',
      expenses: '++id, employee_id, company_id, status',
      approval_rules: '++id, user_id, company_id',
      approval_rule_approvers: '++id, rule_id, user_id, order_index',
      approval_requests: '++id, expense_id, approver_id, status',
      exchange_rate_cache: '++id, base_currency, fetched_at'
    });
  }
}

export const db = new ReimburseAppDB();

// We can seed initial data like Categories if the tables are empty
db.on('populate', async () => {
  // Pre-populate some standard things if needed, but doing it in the app init is safer
});
