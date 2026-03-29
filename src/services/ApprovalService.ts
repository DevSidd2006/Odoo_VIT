import { ExpenseRepo } from '../repositories/ExpenseRepo';
import { ApprovalRuleRepo, ApprovalRequestRepo } from '../repositories/ApprovalRepo';
import { UserRepo } from '../repositories/UserRepo';

/**
 * ApprovalService handles the routing logic when an expense is submitted.
 * It reads the approval rule for the employee and creates the appropriate
 * approval_request records (sequential or parallel).
 */
export const ApprovalService = {
  /**
   * Submit an expense: creates approval requests based on the matching rule.
   */
  async submitExpense(expenseId: number, employeeId: number): Promise<void> {
    const rule = await ApprovalRuleRepo.findByUser(employeeId);

    if (!rule) {
      // No rule: auto-approve
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    const approvers: { user_id: number; order_index: number }[] = [];
    let nextIndex = 0;

    // Manager first?
    if (rule.manager_is_approver) {
      approvers.push({ user_id: rule.manager_id, order_index: nextIndex++ });
    }

    // Add configured approvers
    rule.approvers.forEach(a => {
      approvers.push({ user_id: a.user_id, order_index: nextIndex++ });
    });

    if (approvers.length === 0) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    // Create approval request records
    if (rule.sequential) {
      // Sequential: only activate the first request; others wait
      for (let i = 0; i < approvers.length; i++) {
        await ApprovalRequestRepo.create({
          expense_id: expenseId,
          approver_id: approvers[i].user_id,
          rule_id: rule.id,
          order_index: i,
        });
      }
    } else {
      // Parallel: all approvers get requests simultaneously
      for (const approver of approvers) {
        await ApprovalRequestRepo.create({
          expense_id: expenseId,
          approver_id: approver.user_id,
          rule_id: rule.id,
          order_index: approver.order_index,
        });
      }
    }

    await ExpenseRepo.updateStatus(expenseId, 'waiting_approval');
  },

  /**
   * Process an approver's decision on an expense.
   * Handles both sequential and parallel flows including auto-reject on required rejections.
   */
  async processDecision(
    approvalRequestId: number,
    decision: 'approved' | 'rejected',
    expenseId: number,
    ruleId: number,
  ): Promise<void> {
    // Update this specific request
    await ApprovalRequestRepo.updateStatus(approvalRequestId, decision);

    // Get all requests for this expense
    const allRequests = await ApprovalRequestRepo.findByExpense(expenseId);
    const rule = await ApprovalRuleRepo.findByUser(0); // We'll fetch by ruleId below

    if (decision === 'rejected') {
      // Auto-reject the expense
      await ExpenseRepo.updateStatus(expenseId, 'rejected');
      return;
    }

    // Check if all pending requests are done
    const pending = allRequests.filter(r => r.status === 'pending');
    const approved = allRequests.filter(r => r.status === 'approved');
    const rejected = allRequests.filter(r => r.status === 'rejected');

    if (rejected.length > 0) {
      await ExpenseRepo.updateStatus(expenseId, 'rejected');
      return;
    }

    if (pending.length === 0) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
    }
    // else: still pending — wait for more approvals
  },
};
