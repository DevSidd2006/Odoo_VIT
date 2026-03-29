# Reimbursement Management (Web App)

This repository contains a **web-based reimbursement management app** built with React + Vite (inside `web/`).

It supports role-based workflows:

- Admin: user management + approval policy setup
- Manager: pending approvals with comments and currency-aware review
- Employee: draft expenses, submit for approval, track status

## App location

- Main web app: `web/`
- There is also a React Native codebase in root `src/`, but this README is for the web app workflow.

## Implemented features (web)

- Authentication + persisted session (`localStorage`)
- Company signup with country selection and base currency assignment
- Admin dashboard:
  - Create/manage employees and managers
  - Set manager relationships
  - Configure approval rules (manager approver, additional approvers, threshold, specific approver)
  - Policy simulator entry point
- Employee dashboard:
  - Create expense drafts
  - Submit draft to approval flow
  - View own expense status/history
- Manager dashboard:
  - View pending approvals
  - Approve/reject with comment
  - See converted amount in company base currency
- Local data persistence via Dexie/IndexedDB repositories

## Tech stack

- React 19
- TypeScript
- Vite
- React Router
- Dexie (IndexedDB)
- Zustand
- Tesseract.js (available dependency for OCR-related extensions)

## Quick start

```bash
cd web
npm install
npm run dev
```

App runs on the local Vite dev server (default `http://localhost:5173`).

## Build

```bash
cd web
npm run build
npm run preview
```

## Scripts (web)

- `npm run dev` - start dev server
- `npm run build` - type-check + production build
- `npm run preview` - preview production build
- `npm run lint` - lint project

## APIs used by services

- Countries/currencies: `https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag`
- Exchange rates: `https://api.exchangerate-api.com/v4/latest/{BASE}`

## Notes

- Current auth/password flow is demo-oriented (not production hardened).
- Data is local (browser IndexedDB); no backend server required for demo.
