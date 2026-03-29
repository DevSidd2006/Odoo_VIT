# USP Roadmap (Web)

This roadmap converts the USP into implementation milestones.

## USP Target

Build the most explainable reimbursement approval engine for complex policy logic.

## Milestone 1 - Explainable Decisions (Started)

- [x] Add decision explanation model in `web/src/types/index.ts`
- [x] Add explanation computation in `web/src/services/ApprovalService.ts`
- [x] Show live explanation cards in manager approval UI (`web/src/screens/manager/ManagerDashboard.tsx`)
- [ ] Persist explanation events into an audit/event store (timeline)

## Milestone 2 - Policy Simulator 2.0

- [ ] Include condition mode simulation (`percentage` / `specific` / `hybrid`)
- [ ] Scenario matrix (best case / worst case / edge cases)
- [ ] Before/after comparison when editing existing policies

## Milestone 3 - Trust Layer

- [ ] Full audit trail UI for each expense
- [ ] Explicit FX source + timestamp in approval cards
- [ ] Security hardening for credentials and password resets

## Milestone 4 - Admin Intelligence

- [ ] "All Expenses" control room with filters and overrides
- [ ] Rule impact analysis by team/user/category
- [ ] Policy conflict and deadlock detection warnings
