# ReimburseFlow (Web System)

A complete role-based reimbursement system with explainable approvals.

## What this system does

- Employees create expense drafts and submit them.
- Managers review pending requests and approve or reject with comments.
- Admins manage users, configure approval rules, and apply emergency overrides.
- Approval outcomes are explainable (mode, approval count, percentage, and reason).

## Core workflow

1. Admin signs up a company (country sets base currency).
2. Admin creates team members (manager and employee) and approval rules.
3. Employee submits an expense.
4. Manager receives pending request and decides.
5. System finalizes status based on rule logic (or admin override).

## Approval model (high level)

- Supports manager-first, sequential/parallel approvers, required approvers, and minimum approval percentage.
- Supports specific approver rules.
- Hybrid mode combines absolute checks (required/specific) with percentage threshold.

## Tech stack

- React + TypeScript + Vite
- React Router
- Dexie (IndexedDB local persistence)
- Tesseract.js (receipt OCR in employee flow)

## External APIs

- Countries and currencies: https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag
- Exchange rates: https://api.exchangerate-api.com/v4/latest/{BASE}

Resilience behavior:

- Country API failure falls back to static country constants.
- Exchange API failure falls back to cached IndexedDB rates when available.

## Project structure

- `web/`: primary web app (use this for running/testing)
- `src/` at repository root: separate React Native codebase

## Run locally

```bash
cd web
npm install
npm run dev
```

If default port is busy, Vite automatically picks the next free port.

## Quick test checklist

1. Sign up as admin.
2. Create one manager and one employee in Team Members.
3. Create an approval rule for the employee.
4. Log in as employee and submit an expense.
5. Log in as manager and approve/reject from Pending Approvals.
6. Verify final status in admin Global Expenses.

## Deployment notes

- The current implementation runs as a self-contained web system using browser-local data storage.
- External country and exchange services are integrated with fallback behavior for reliability.
- The architecture is modular and can be connected to a backend API layer when required.
