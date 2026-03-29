export type UserRole = 'admin' | 'manager' | 'employee';

export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'pending';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface Company {
  id: number;
  name: string;
  country: string;
  base_currency: string;
  currency?: string;
  created_at?: string;
}

export interface User {
  id: number;
  company_id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  manager_id?: number | null;
  managerId?: number | null;
  companyId?: number;
  created_at?: string;
}

export interface UserWithManager extends User {
  manager_name?: string | null;
}

export interface Expense {
  id: number | string;
  company_id?: number;
  employee_id?: number;
  employeeId?: number | string;
  employeeName?: string;
  employee_name?: string;
  description: string;
  expense_date?: string;
  date?: string;
  category_id?: number;
  category?: string;
  paid_by?: string;
  currency: string;
  amount: number;
  remarks?: string;
  status: ExpenseStatus;
  receipt_uri?: string;
  receiptUri?: string;
  ocr_text?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface ExpenseWithDetails extends Expense {
  employee_name?: string;
  category_name?: string;
  category_icon?: string;
}

export interface ApprovalRule {
  id: number;
  company_id: number;
  user_id: number;
  description: string;
  manager_id: number;
  manager_is_approver: number | boolean;
  sequential: number | boolean;
  min_approval_percentage: number;
  created_at?: string;
}

export interface ApprovalRuleApprover {
  id: number;
  rule_id: number;
  user_id: number;
  order_index: number;
  required: number | boolean;
}

export interface ApprovalRuleWithApprovers extends ApprovalRule {
  approvers: (ApprovalRuleApprover & { approver_name?: string })[];
}

export interface ApprovalRequest {
  id: number;
  expense_id: number;
  approver_id: number;
  rule_id: number;
  order_index: number;
  status: ApprovalRequestStatus;
  acted_at?: string | null;
  created_at?: string;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  approver_name?: string;
  expense_description?: string;
  expense_amount?: number;
  expense_currency?: string;
  employee_name?: string;
  category_name?: string;
  company_base_currency?: string;
}

export interface AuthSession {
  user_id: number;
  company_id: number;
  role: UserRole;
  name: string;
  email: string;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fetched_at: string;
}

export interface Country {
  name: string;
  code: string;
  currency: string;
  currency_name: string;
  flag: string;
}
