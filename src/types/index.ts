// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'employee';

export type ExpenseStatus = 'draft' | 'submitted' | 'waiting_approval' | 'approved' | 'rejected';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

// ─── Core Domain ──────────────────────────────────────────────────────────────

export interface Company {
  id: number;
  name: string;
  country: string;
  base_currency: string;
  created_at: string;
}

export interface User {
  id: number;
  company_id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  manager_id: number | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Expense {
  id: number;
  company_id: number;
  employee_id: number;
  description: string;
  expense_date: string;
  category_id: number;
  paid_by: string;
  currency: string;
  amount: number;
  remarks: string;
  status: ExpenseStatus;
  receipt_uri: string | null;
  ocr_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRule {
  id: number;
  company_id: number;
  user_id: number;
  description: string;
  manager_id: number;
  manager_is_approver: boolean;
  sequential: boolean;
  min_approval_percentage: number;
  created_at: string;
}

export interface ApprovalRuleApprover {
  id: number;
  rule_id: number;
  user_id: number;
  order_index: number;
  required: boolean;
}

export interface ApprovalRequest {
  id: number;
  expense_id: number;
  approver_id: number;
  rule_id: number;
  order_index: number;
  status: ApprovalRequestStatus;
  acted_at: string | null;
  created_at: string;
}

// ─── Joined/View Types ────────────────────────────────────────────────────────

export interface ExpenseWithDetails extends Expense {
  employee_name: string;
  category_name: string;
  category_icon: string;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  approver_name: string;
  expense_description: string;
  expense_amount: number;
  expense_currency: string;
  employee_name: string;
  category_name: string;
  company_base_currency: string;
}

export interface UserWithManager extends User {
  manager_name: string | null;
}

export interface ApprovalRuleWithApprovers extends ApprovalRule {
  approvers: (ApprovalRuleApprover & { approver_name: string })[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  user_id: number;
  company_id: number;
  role: UserRole;
  name: string;
  email: string;
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fetched_at: string;
}

// ─── Country ─────────────────────────────────────────────────────────────────

export interface Country {
  name: string;
  code: string;
  currency: string;
  currency_name: string;
  flag: string;
}
