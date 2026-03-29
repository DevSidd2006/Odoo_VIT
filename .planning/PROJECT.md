# PROJECT.md — Reimbursement App

## What This Is

A multi-role expense reimbursement mobile app built in React Native (Expo). Companies register, set up approval rules, then employees submit expenses (with receipt photos + OCR), and managers approve/reject them. All data is stored locally on device using SQLite. Currency conversion is applied when displaying amounts in the manager view.

## Core Value

Zero-friction expense reporting with structured approval workflows — no cloud dependency, works fully offline.

USP focus for this milestone:

- Explainable approval decisions (not just status labels)
- Policy simulation before publish
- Safe admin override with audit proof trail

## Context

- **Platform:** React Native (Expo managed → bare workflow for Tesseract OCR)
- **Database:** expo-sqlite (local SQLite)
- **OCR:** react-native-tesseract-ocr (Tesseract, on-device)
- **Navigation:** React Navigation v6 (Stack + Bottom Tabs)
- **Currency:** Free exchange rate API (open.er-api.com, free tier) with local cache fallback
- **Auth:** Local auth via SQLite + AsyncStorage (no cloud auth)
- **UI:** Custom design system with dark theme, premium aesthetics

## Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Company signup, user management, approval rule configuration |
| **Manager** | Review and approve/reject expense requests |
| **Employee** | Submit expenses, attach receipts, track status |

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Admin can sign up creating a company with base currency (via country selection)
- [ ] Admin can create users and assign them Manager or Employee roles
- [ ] Admin can set a manager for each user
- [ ] Admin can send a random generated password to a user via "Send Password" action
- [ ] Admin can configure approval rules per user (approvers list, sequential/parallel, minimum approval %, manager-first toggle)
- [ ] Employees can create expense reports with: description, category, expense date, paid by, currency, amount, remarks
- [ ] Employees can attach a receipt photo (camera or gallery) with Tesseract OCR auto-filling fields
- [ ] Expenses follow Draft → Submitted → Approved/Rejected workflow
- [ ] When employee submits, approval routing happens based on configured approval rules
- [ ] Managers see a dashboard of pending expenses to approve/reject
- [ ] Manager view shows amount converted to company base currency using real-time exchange rates
- [ ] Once approved/rejected by manager, record becomes read-only and action buttons disappear
- [ ] Expense list shows summary cards (to-submit total, pending total, approved total)
- [ ] Full audit trail (who approved/rejected, at what time)

### Out of Scope

- Cloud sync / backend server — local SQLite only
- Email sending (simulate "send password" with local storage)
- Push notifications
- Multi-company per device

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local SQLite only | User explicitly selected this — no server needed | — Pending |
| Tesseract OCR | User explicitly selected this — free, on-device | — Pending |
| Expo bare workflow | react-native-tesseract-ocr requires native modules | — Pending |
| Free exchange rate API | No API key required for open.er-api.com | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-29 after initialization*
