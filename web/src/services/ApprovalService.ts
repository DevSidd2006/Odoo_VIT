import { ExpenseRepo } from '../repositories/ExpenseRepo';
import { ApprovalRuleRepo, ApprovalRequestRepo } from '../repositories/ApprovalRepo';

type ApprovalPlanStep = {
  approver_id: number;
  order_index: number;
  required: boolean;
};

const sortByOrder = <T extends { order_index: number }>(rows: T[]): T[] => {
  return [...rows].sort((a, b) => a.order_index - b.order_index);
};

const dedupePlan = (steps: ApprovalPlanStep[]): ApprovalPlanStep[] => {
  const map = new Map<number, ApprovalPlanStep>();
  for (const step of steps) {
    const existing = map.get(step.approver_id);
    if (!existing) {
      map.set(step.approver_id, step);
      continue;
    }

    map.set(step.approver_id, {
      ...existing,
      required: existing.required || step.required,
      order_index: Math.min(existing.order_index, step.order_index),
    });
  }

  return Array.from(map.values())
    .sort((a, b) => a.order_index - b.order_index)
    .map((step, index) => ({ ...step, order_index: index }));
};

const buildApprovalPlan = (rule: any): ApprovalPlanStep[] => {
  const raw: ApprovalPlanStep[] = [];

  if (rule.manager_is_approver && rule.manager_id) {
    raw.push({ approver_id: rule.manager_id, order_index: 0, required: true });
  }

  const orderedApprovers = sortByOrder(rule.approvers || []);
  for (const approver of orderedApprovers) {
    raw.push({
      approver_id: approver.user_id,
      order_index: raw.length,
      required: Boolean(approver.required),
    });
  }

  return dedupePlan(raw);
};

const finalizeExpense = async (expenseId: number, status: 'approved' | 'rejected'): Promise<void> => {
  await ExpenseRepo.updateStatus(expenseId, status);
  const requests = await ApprovalRequestRepo.findByExpense(expenseId);
  for (const request of requests.filter(r => r.status === 'pending')) {
    await ApprovalRequestRepo.updateStatus(request.id!, 'skipped');
  }
};

export const ApprovalService = {
  async submitExpense(expenseId: number, employeeId: number): Promise<void> {
    const rule = await ApprovalRuleRepo.findByUser(employeeId);

    if (!rule) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    const approvers = buildApprovalPlan(rule);

    if (approvers.length === 0) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    if (rule.sequential) {
      const first = approvers[0];
      await ApprovalRequestRepo.create({
        expense_id: expenseId,
        approver_id: first.approver_id,
        rule_id: rule.id!,
        order_index: first.order_index,
      });
      await ExpenseRepo.updateStatus(expenseId, 'waiting_approval');
      return;
    }

    for (const approver of approvers) {
      await ApprovalRequestRepo.create({
        expense_id: expenseId,
        approver_id: approver.approver_id,
        rule_id: rule.id!,
        order_index: approver.order_index,
      });
    }

    await ExpenseRepo.updateStatus(expenseId, 'waiting_approval');
  },

  async processDecision(
    approvalRequestId: number,
    decision: 'approved' | 'rejected',
    expenseId: number,
    ruleId: number,
    comment: string = ''
  ): Promise<void> {
    const rule = await ApprovalRuleRepo.findById(ruleId);
    if (!rule) return;

    await ApprovalRequestRepo.decide(approvalRequestId, decision, comment);

    const allRequests = sortByOrder(await ApprovalRequestRepo.findByExpense(expenseId));
    const plan = buildApprovalPlan(rule);
    if (plan.length === 0) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    const statusByApprover = new Map<number, string>();
    for (const request of allRequests) {
      statusByApprover.set(request.approver_id, request.status);
    }

    const approvedCount = plan.filter(step => statusByApprover.get(step.approver_id) === 'approved').length;
    const rejectedCount = plan.filter(step => statusByApprover.get(step.approver_id) === 'rejected').length;
    const unresolvedCount = plan.length - approvedCount - rejectedCount;

    const requiredRejected = plan
      .filter(step => step.required)
      .some(step => statusByApprover.get(step.approver_id) === 'rejected');
    if (requiredRejected) {
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    const specificApproverId = rule.specific_approver_id ?? null;
    const specificApproverMet =
      specificApproverId !== null && statusByApprover.get(specificApproverId) === 'approved';

    const percentageMet = (approvedCount / plan.length) * 100 >= rule.min_approval_percentage;
    if (specificApproverMet || percentageMet) {
      await finalizeExpense(expenseId, 'approved');
      return;
    }

    const maxPossibleApprovals = approvedCount + unresolvedCount;
    const maxPossiblePercent = (maxPossibleApprovals / plan.length) * 100;
    const specificStillPossible =
      specificApproverId === null || statusByApprover.get(specificApproverId) !== 'rejected';

    if (maxPossiblePercent < rule.min_approval_percentage && !specificStillPossible) {
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    if (!rule.sequential) {
      return;
    }

    if (decision !== 'approved') {
      return;
    }

    const createdIndexes = new Set(allRequests.map(request => request.order_index));
    const nextStep = plan.find(step => !createdIndexes.has(step.order_index));
    if (!nextStep) {
      return;
    }

    await ApprovalRequestRepo.create({
      expense_id: expenseId,
      approver_id: nextStep.approver_id,
      rule_id: ruleId,
      order_index: nextStep.order_index,
    });
  },

  async getApprovalProgress(expenseId: number) {
    const requests = await ApprovalRequestRepo.findByExpense(expenseId);
    const total = requests.length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const percentage = total > 0 ? (approved / total) * 100 : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      percentage,
      isComplete: pending === 0,
      requests
    };
  },
};
