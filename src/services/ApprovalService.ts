import { ApprovalEventRepo, ApprovalRuleRepo, ApprovalRequestRepo } from '../repositories/ApprovalRepo';
import { ExpenseRepo } from '../repositories/ExpenseRepo';
import { UserRepo } from '../repositories/UserRepo';
import {
  ApprovalConditionMode,
  ApprovalEvent,
  ApprovalExplanation,
  ApprovalRuleWithApprovers,
  ApprovalRequestStatus,
} from '../types';

type ApprovalPlanStep = {
  approver_id: number;
  order_index: number;
  required: boolean;
};

const sortByOrder = <T extends { order_index: number }>(rows: T[]): T[] => {
  return [...rows].sort((a, b) => a.order_index - b.order_index);
};

const getConditionMode = (rule: ApprovalRuleWithApprovers): ApprovalConditionMode => {
  return rule.condition_mode ?? 'hybrid';
};

const describeCondition = (
  mode: ApprovalConditionMode,
  threshold: number,
  specificApproverName?: string,
): string => {
  if (mode === 'percentage') {
    return `Approval condition: ${threshold}% approvals`;
  }
  if (mode === 'specific_approver') {
    return `Approval condition: ${specificApproverName ?? 'specific approver'} approves`;
  }
  return `Approval condition: ${threshold}% approvals OR ${specificApproverName ?? 'specific approver'} approves`;
};

const buildApprovalPlan = async (
  rule: ApprovalRuleWithApprovers,
  employeeId: number,
): Promise<ApprovalPlanStep[]> => {
  const employee = await UserRepo.findById(employeeId);
  const steps: ApprovalPlanStep[] = [];

  if (rule.manager_is_approver && employee?.manager_id) {
    steps.push({ approver_id: employee.manager_id, order_index: 0, required: true });
  }

  const orderedRuleApprovers = sortByOrder(rule.approvers);
  for (const approver of orderedRuleApprovers) {
    steps.push({
      approver_id: approver.user_id,
      order_index: steps.length,
      required: Boolean(approver.required),
    });
  }

  const deduped = new Map<number, ApprovalPlanStep>();
  for (const step of steps) {
    const existing = deduped.get(step.approver_id);
    if (!existing) {
      deduped.set(step.approver_id, step);
      continue;
    }

    deduped.set(step.approver_id, {
      ...existing,
      required: existing.required || step.required,
    });
  }

  return Array.from(deduped.values()).map((step, idx) => ({ ...step, order_index: idx }));
};

const finalizeExpense = async (expenseId: number, status: 'approved' | 'rejected'): Promise<void> => {
  await ExpenseRepo.updateStatus(expenseId, status);
  const requests = await ApprovalRequestRepo.findByExpense(expenseId);
  const pending = requests.filter(r => r.status === 'pending');
  for (const request of pending) {
    await ApprovalRequestRepo.updateStatus(request.id, 'skipped');
  }
};

const buildExplanation = async (
  rule: ApprovalRuleWithApprovers,
  plan: ApprovalPlanStep[],
  requestByApprover: Map<number, { status: ApprovalRequestStatus }>,
): Promise<ApprovalExplanation> => {
  const totalApprovers = plan.length;
  const approvedCount = plan.filter(step => requestByApprover.get(step.approver_id)?.status === 'approved').length;
  const rejectedCount = plan.filter(step => requestByApprover.get(step.approver_id)?.status === 'rejected').length;
  const pendingCount = totalApprovers - approvedCount - rejectedCount;
  const approvalPercent = totalApprovers === 0 ? 0 : (approvedCount / totalApprovers) * 100;
  const thresholdPercent = Number(rule.min_approval_percentage ?? 100);
  const percentageMet = approvalPercent >= thresholdPercent;

  const requiredSteps = plan.filter(step => step.required);
  const requiredRejected = requiredSteps.some(step => requestByApprover.get(step.approver_id)?.status === 'rejected');

  const specificApproverId = rule.specific_approver_id ?? null;
  const specificApproverApproved = specificApproverId
    ? requestByApprover.get(specificApproverId)?.status === 'approved'
    : false;
  const specificApproverName = specificApproverId
    ? (await UserRepo.findById(specificApproverId))?.name
    : undefined;

  const conditionMode = getConditionMode(rule);
  const conditionMet = conditionMode === 'percentage'
    ? percentageMet
    : conditionMode === 'specific_approver'
      ? specificApproverApproved
      : (percentageMet || specificApproverApproved);

  const allResolved = pendingCount === 0;
  const decision: 'pending' | 'approved' | 'rejected' = requiredRejected
    ? 'rejected'
    : conditionMet
      ? 'approved'
      : allResolved
        ? 'rejected'
        : 'pending';

  const reason = requiredRejected
    ? 'A required approver rejected the request.'
    : conditionMet
      ? describeCondition(conditionMode, thresholdPercent, specificApproverName)
      : allResolved
        ? 'All approvers responded, but approval condition was not met.'
        : 'Waiting for more approver decisions.';

  return {
    ruleDescription: rule.description,
    conditionMode,
    totalApprovers,
    approvedCount,
    rejectedCount,
    pendingCount,
    approvalPercent,
    thresholdPercent,
    percentageMet,
    specificApproverName,
    specificApproverApproved,
    requiredRejected,
    decision,
    reason,
  };
};

const logApprovalEvent = async (
  expenseId: number,
  ruleId: number,
  eventType: string,
  message: string,
  explanation?: ApprovalExplanation,
): Promise<void> => {
  await ApprovalEventRepo.create({
    expense_id: expenseId,
    rule_id: ruleId,
    event_type: eventType,
    message,
    snapshot_json: explanation ? JSON.stringify(explanation) : undefined,
  });
};

export const ApprovalService = {
  async submitExpense(expenseId: number, employeeId: number): Promise<void> {
    const rule = await ApprovalRuleRepo.findByUser(employeeId);
    if (!rule) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    const plan = await buildApprovalPlan(rule, employeeId);
    if (plan.length === 0) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    const specificApproverName = rule.specific_approver_id
      ? (await UserRepo.findById(rule.specific_approver_id))?.name
      : undefined;

    await ExpenseRepo.updateStatus(expenseId, 'waiting_approval');
    await logApprovalEvent(
      expenseId,
      rule.id,
      'rule_matched',
      `${rule.description || 'Approval rule'} matched. ${describeCondition(getConditionMode(rule), Number(rule.min_approval_percentage ?? 100), specificApproverName)}`,
    );

    if (rule.sequential) {
      const first = plan[0];
      await ApprovalRequestRepo.create({
        expense_id: expenseId,
        approver_id: first.approver_id,
        rule_id: rule.id,
        order_index: first.order_index,
      });
      const firstApprover = await UserRepo.findById(first.approver_id);
      await logApprovalEvent(
        expenseId,
        rule.id,
        'step_opened',
        `Step 1 opened for ${firstApprover?.name ?? `Approver #${first.approver_id}`}.`,
      );
      return;
    }

    for (const step of plan) {
      await ApprovalRequestRepo.create({
        expense_id: expenseId,
        approver_id: step.approver_id,
        rule_id: rule.id,
        order_index: step.order_index,
      });
    }

    await logApprovalEvent(
      expenseId,
      rule.id,
      'parallel_opened',
      `${plan.length} approvers notified in parallel.`,
    );
  },

  async processDecision(
    approvalRequestId: number,
    decision: 'approved' | 'rejected',
    expenseId: number,
    ruleId: number,
    comment = '',
  ): Promise<void> {
    const rule = await ApprovalRuleRepo.findById(ruleId);
    const expense = await ExpenseRepo.findById(expenseId);
    if (!rule || !expense?.employee_id) {
      return;
    }

    await ApprovalRequestRepo.decide(approvalRequestId, decision, comment);

    const allRequests = sortByOrder(await ApprovalRequestRepo.findByExpense(expenseId));
    const actedRequest = allRequests.find(r => r.id === approvalRequestId);
    if (!actedRequest) {
      return;
    }

    const plan = await buildApprovalPlan(rule, expense.employee_id);
    if (plan.length === 0) {
      await ExpenseRepo.updateStatus(expenseId, 'approved');
      return;
    }

    const requestByApprover = new Map<number, { status: ApprovalRequestStatus }>();
    for (const request of allRequests) {
      requestByApprover.set(request.approver_id, { status: request.status });
    }

    const actor = await UserRepo.findById(actedRequest.approver_id);
    await logApprovalEvent(
      expenseId,
      rule.id,
      'decision_recorded',
      `${actor?.name ?? `Approver #${actedRequest.approver_id}`} ${decision}.`,
    );

    const explanation = await buildExplanation(rule, plan, requestByApprover);

    if (explanation.requiredRejected) {
      await logApprovalEvent(expenseId, rule.id, 'finalized', 'Expense rejected. A required approver rejected.', explanation);
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    if (explanation.decision === 'approved') {
      await logApprovalEvent(expenseId, rule.id, 'finalized', `Expense approved. ${explanation.reason}`, explanation);
      await finalizeExpense(expenseId, 'approved');
      return;
    }

    const maxPossibleApprovals = explanation.approvedCount + explanation.pendingCount;
    const maxPossiblePercent = explanation.totalApprovers === 0
      ? 0
      : (maxPossibleApprovals / explanation.totalApprovers) * 100;
    const percentageImpossible = maxPossiblePercent < explanation.thresholdPercent;
    const specificStillPossible = Boolean(rule.specific_approver_id)
      && requestByApprover.get(rule.specific_approver_id!)?.status !== 'rejected';

    if (explanation.conditionMode === 'percentage' && percentageImpossible) {
      await logApprovalEvent(expenseId, rule.id, 'finalized', 'Expense rejected. Threshold is no longer reachable.', explanation);
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    if (explanation.conditionMode === 'specific_approver' && !specificStillPossible && !explanation.specificApproverApproved) {
      await logApprovalEvent(expenseId, rule.id, 'finalized', 'Expense rejected. Specific approver condition cannot be met.', explanation);
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    if (explanation.conditionMode === 'hybrid' && percentageImpossible && !specificStillPossible && !explanation.specificApproverApproved) {
      await logApprovalEvent(expenseId, rule.id, 'finalized', 'Expense rejected. Hybrid condition cannot be met.', explanation);
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    const allResolved = explanation.pendingCount === 0;
    if (allResolved) {
      await logApprovalEvent(expenseId, rule.id, 'finalized', `Expense rejected. ${explanation.reason}`, explanation);
      await finalizeExpense(expenseId, 'rejected');
      return;
    }

    if (!rule.sequential || actedRequest.status !== 'approved') {
      return;
    }

    const createdOrderIndexes = new Set(allRequests.map(r => r.order_index));
    const nextStep = plan.find(step => !createdOrderIndexes.has(step.order_index));
    if (!nextStep) {
      return;
    }

    await ApprovalRequestRepo.create({
      expense_id: expenseId,
      approver_id: nextStep.approver_id,
      rule_id: ruleId,
      order_index: nextStep.order_index,
    });

    const nextApprover = await UserRepo.findById(nextStep.approver_id);
    await logApprovalEvent(
      expenseId,
      rule.id,
      'step_opened',
      `Step ${nextStep.order_index + 1} opened for ${nextApprover?.name ?? `Approver #${nextStep.approver_id}`}.`,
      explanation,
    );
  },

  async getExpenseDecisionTrail(expenseId: number): Promise<{ explanation: ApprovalExplanation | null; events: ApprovalEvent[] }> {
    const expense = await ExpenseRepo.findById(expenseId);
    if (!expense?.employee_id) {
      return { explanation: null, events: [] };
    }

    const requests = sortByOrder(await ApprovalRequestRepo.findByExpense(expenseId));
    const events = await ApprovalEventRepo.findByExpense(expenseId);

    if (requests.length === 0) {
      return { explanation: null, events };
    }

    const rule = await ApprovalRuleRepo.findById(requests[0].rule_id);
    if (!rule) {
      return { explanation: null, events };
    }

    const plan = await buildApprovalPlan(rule, expense.employee_id);
    const requestByApprover = new Map<number, { status: ApprovalRequestStatus }>();
    for (const request of requests) {
      requestByApprover.set(request.approver_id, { status: request.status });
    }

    const explanation = await buildExplanation(rule, plan, requestByApprover);
    return { explanation, events };
  },
};
