import { ExpenseRepo } from '../repositories/ExpenseRepo';
import { ApprovalRuleRepo, ApprovalRequestRepo } from '../repositories/ApprovalRepo';
import { UserRepo } from '../repositories/UserRepo';
import type { ApprovalExplanation } from '../types';

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

  const orderedApprovers = sortByOrder((rule.approvers || []) as any[]);
  for (const approver of orderedApprovers) {
    raw.push({
      approver_id: approver.user_id,
      order_index: raw.length,
      required: Boolean(approver.required),
    });
  }

  return dedupePlan(raw);
};

const getMode = (rule: any): 'percentage' | 'specific' | 'hybrid' => {
  const hasSpecificApprover = Boolean(rule.specific_approver_id);
  if (hasSpecificApprover && rule.min_approval_percentage < 100) return 'hybrid';
  if (hasSpecificApprover && rule.min_approval_percentage >= 100) return 'specific';
  return 'percentage';
};

const isEligibleApproverRole = (role: string | undefined): boolean => {
  return role === 'admin' || role === 'manager';
};

const resolveEligibleApprovers = async (rule: any, employeeId: number): Promise<ApprovalPlanStep[]> => {
  const rawPlan = buildApprovalPlan(rule);
  const eligible: ApprovalPlanStep[] = [];

  for (const step of rawPlan) {
    const approver = await UserRepo.findById(step.approver_id);
    if (!approver) continue;
    if (approver.id === employeeId) continue;
    if (!isEligibleApproverRole(approver.role)) continue;
    eligible.push(step);
  }

  return dedupePlan(eligible);
};

const buildExplanation = async (expenseId: number, ruleId: number): Promise<ApprovalExplanation | null> => {
  const rule = await ApprovalRuleRepo.findById(ruleId);
  if (!rule) return null;

  const plan = buildApprovalPlan(rule);
  if (plan.length === 0) {
    return {
      mode: 'percentage',
      approvedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      totalApprovers: 0,
      approvalPercent: 0,
      thresholdPercent: 0,
      specificApproverApproved: false,
      requiredRejected: false,
      decision: 'approved',
      reason: 'No approvers are configured, so the expense is auto-approved.',
    };
  }

  const allRequests = sortByOrder(await ApprovalRequestRepo.findByExpense(expenseId));
  const statusByApprover = new Map<number, string>();
  for (const request of allRequests) {
    statusByApprover.set(request.approver_id, request.status);
  }

  const approvedCount = plan.filter(step => statusByApprover.get(step.approver_id) === 'approved').length;
  const rejectedCount = plan.filter(step => statusByApprover.get(step.approver_id) === 'rejected').length;
  const pendingCount = plan.length - approvedCount - rejectedCount;

  const requiredRejected = plan
    .filter(step => step.required)
    .some(step => statusByApprover.get(step.approver_id) === 'rejected');

  const specificApproverId = rule.specific_approver_id ?? null;
  const specificInPlan = specificApproverId !== null && plan.some(step => step.approver_id === specificApproverId);
  const specificApproverApproved =
    specificInPlan && statusByApprover.get(specificApproverId!) === 'approved';
  const specificApproverName =
    specificApproverId === null
      ? undefined
      : (specificApproverId === rule.manager_id
          ? (rule.manager_is_approver ? 'Direct Manager' : undefined)
          : rule.approvers.find(a => a.user_id === specificApproverId)?.approver_name);

  const approvalPercent = (approvedCount / plan.length) * 100;
  const thresholdPercent = rule.min_approval_percentage;
  const percentageMet = approvalPercent >= thresholdPercent;
  const mode = getMode(rule);

  if (requiredRejected) {
    return {
      mode,
      approvedCount,
      rejectedCount,
      pendingCount,
      totalApprovers: plan.length,
      approvalPercent,
      thresholdPercent,
      specificApproverName,
      specificApproverApproved,
      requiredRejected: true,
      decision: 'rejected',
      reason: 'A required approver rejected this expense, so the workflow ends in rejection.',
    };
  }

  const conditionMet = mode === 'percentage'
    ? percentageMet
    : mode === 'specific'
      ? specificApproverApproved
      : (percentageMet || specificApproverApproved);

  if (conditionMet) {
    const reason = mode === 'percentage'
      ? `Approval threshold reached (${approvalPercent.toFixed(1)}% >= ${thresholdPercent}%).`
      : mode === 'specific'
        ? 'The specific approver has approved this expense.'
        : (specificApproverApproved
            ? 'Hybrid rule passed because the specific approver approved.'
            : `Hybrid rule passed because approval threshold reached (${approvalPercent.toFixed(1)}% >= ${thresholdPercent}%).`);

    return {
      mode,
      approvedCount,
      rejectedCount,
      pendingCount,
      totalApprovers: plan.length,
      approvalPercent,
      thresholdPercent,
      specificApproverName,
      specificApproverApproved,
      requiredRejected: false,
      decision: 'approved',
      reason,
    };
  }

  const maxPossibleApprovals = approvedCount + pendingCount;
  const maxPossiblePercent = (maxPossibleApprovals / plan.length) * 100;
  const specificStillPossible =
    specificApproverId === null
      ? true
      : (specificInPlan && statusByApprover.get(specificApproverId) !== 'rejected');
  const canStillPass = mode === 'percentage'
    ? maxPossiblePercent >= thresholdPercent
    : mode === 'specific'
      ? specificStillPossible
      : (maxPossiblePercent >= thresholdPercent || specificStillPossible);

  if (!canStillPass) {
    return {
      mode,
      approvedCount,
      rejectedCount,
      pendingCount,
      totalApprovers: plan.length,
      approvalPercent,
      thresholdPercent,
      specificApproverName,
      specificApproverApproved,
      requiredRejected: false,
      decision: 'rejected',
      reason: 'Remaining pending approvers cannot satisfy the active approval condition anymore.',
    };
  }

  return {
    mode,
    approvedCount,
    rejectedCount,
    pendingCount,
    totalApprovers: plan.length,
    approvalPercent,
    thresholdPercent,
    specificApproverName,
    specificApproverApproved,
    requiredRejected: false,
    decision: 'pending',
    reason: 'Waiting for more approver decisions to satisfy rule conditions.',
  };
};

const finalizeExpense = async (expenseId: number, status: 'approved' | 'rejected'): Promise<void> => {
  await ExpenseRepo.updateStatus(expenseId, status);
  await ApprovalRequestRepo.skipPendingByExpense(expenseId);
};

export const ApprovalService = {
  async submitExpense(expenseId: number, employeeId: number): Promise<void> {
    const expense = await ExpenseRepo.findById(expenseId);
    if (!expense || expense.employee_id !== employeeId) {
      throw new Error(`[Security] Unauthorized: Employee ${employeeId} does not own expense ${expenseId}`);
    }

    if (expense.status !== 'draft') {
      throw new Error('Only draft expenses can be submitted.');
    }

    const rule = await ApprovalRuleRepo.findByUser(employeeId);

    if (!rule) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    const approvers = await resolveEligibleApprovers(rule, employeeId);

    if (rule.specific_approver_id) {
      const specificInPlan = approvers.some(step => step.approver_id === rule.specific_approver_id);
      if (!specificInPlan) {
        throw new Error('Rule misconfiguration: specific approver is not part of the approval path.');
      }
    }

    if (approvers.length === 0) {
      throw new Error('Rule misconfiguration: no valid approvers assigned. Please assign a manager/admin approver.');
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
    actorId: number,
    comment: string = ''
  ): Promise<void> {
    const expense = await ExpenseRepo.findById(expenseId);
    if (!expense || (expense.status !== 'waiting_approval' && expense.status !== 'submitted')) {
      throw new Error('Expense is already finalized or not ready for approval.');
    }

    const request = await ApprovalRequestRepo.findByExpense(expenseId);
    const targetRequest = request.find(r => r.id === approvalRequestId);
    
    if (!targetRequest || targetRequest.approver_id !== actorId) {
      throw new Error(`[Security] Unauthorized: Actor ${actorId} is not assigned to this request.`);
    }

    const actor = await UserRepo.findById(actorId);
    if (!actor || !isEligibleApproverRole(actor.role)) {
      throw new Error('[Security] Unauthorized: only manager/admin approvers can make approval decisions.');
    }

    if (expense.employee_id === actorId) {
      throw new Error('[Security] Unauthorized: requester cannot approve their own expense.');
    }

    if (targetRequest.status !== 'pending') {
      throw new Error('This approval request is no longer pending.');
    }

    const rule = await ApprovalRuleRepo.findById(ruleId);
    if (!rule) return;

    await ApprovalRequestRepo.decide(approvalRequestId, decision, comment);

    const explanation = await buildExplanation(expenseId, ruleId);
    if (!explanation) return;

    if (explanation.decision === 'approved') {
      await finalizeExpense(expenseId, 'approved');
      return;
    }

    if (explanation.decision === 'rejected') {
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    if (!rule.sequential) {
      return;
    }

    const allRequests = sortByOrder(await ApprovalRequestRepo.findByExpense(expenseId));

    const createdIndexes = new Set(allRequests.map(request => request.order_index));
    const plan = buildApprovalPlan(rule);
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

  async getDecisionExplanation(expenseId: number, ruleId: number) {
    return buildExplanation(expenseId, ruleId);
  },

  async adminOverrideExpense(expenseId: number, status: 'approved' | 'rejected', comment = '') {
    const expense = await ExpenseRepo.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found.');
    }

    if (expense.status === 'approved' || expense.status === 'rejected') {
      return;
    }

    await finalizeExpense(expenseId, status);
    if (comment.trim()) {
      // Keep latest override note in expense remarks for audit readability.
      await ExpenseRepo.update(expenseId, {
        remarks: `${expense.remarks ?? ''}\n[Admin Override] ${comment.trim()}`.trim(),
      });
    }
  },
};
