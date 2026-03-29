# 💸 Reimbursement App

A full-featured **expense reimbursement management** mobile app built with **React Native (Expo)**. Supports multi-role workflows (Admin, Manager, Employee), configurable approval chains, receipt OCR via Tesseract, and multi-currency conversion — all stored **locally on-device** with SQLite.

---

## ✨ Features

### 🔐 Authentication
- Admin company signup with country selection (auto-sets base currency)
- Login with role-based navigation routing
- Forgot password — generates a secure random password

### 👤 Admin
- **User Management** — create users, assign roles (Manager / Employee), set managers
- **Approval Rules** — configure per-employee approval chains:
  - Sequential or parallel approver routing
  - "Manager first" toggle
  - Required approver flags (rejection auto-rejects expense)
  - Minimum approval percentage threshold

### 🧾 Employee
- Create expense reports with: description, date, category, paid-by, currency, amount, remarks
- **Receipt attachment** — take a photo or pick from gallery
- **Tesseract OCR** — auto-extract amount, date, and description from receipts
- Status workflow: `Draft → Submitted → Waiting Approval → Approved / Rejected`
- Dashboard summary: To-Submit total · Waiting total · Approved total

### ✅ Manager
- Approval dashboard with all pending expense requests
- Amounts shown in original currency **and** converted to company base currency (real-time)
- Approve / Reject — record becomes read-only after action

### 💱 Currency
- Multi-currency expense entry
- Real-time exchange rates via [open.er-api.com](https://open.er-api.com) (free, no API key)
- 24-hour local SQLite cache with offline fallback to stale rates

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (SDK 54) |
| Language | TypeScript |
| Database | expo-sqlite (local SQLite) |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| OCR | react-native-tesseract-ocr (on-device) |
| Images | expo-image-picker |
| Storage | @react-native-async-storage/async-storage |
| Styling | Custom design system (dark theme) |

---

## 📁 Project Structure

```
reimbursement-app/
├── src/
│   ├── context/          # React contexts (Auth)
│   ├── db/               # SQLite database init & schema
│   ├── navigation/       # Stack & tab navigators
│   ├── repositories/     # Data access layer (CRUD)
│   ├── screens/
│   │   ├── auth/         # Login, Signup, ForgotPassword
│   │   ├── admin/        # UserManagement, ApprovalRules
│   │   ├── employee/     # ExpenseList, ExpenseForm, ReceiptUpload
│   │   └── manager/      # ApprovalsDashboard
│   ├── services/         # ApprovalService, CurrencyService
│   ├── theme/            # Colors, typography, spacing tokens
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Constants (countries, currencies, categories)
├── .planning/            # GSD project planning docs
├── app.json
├── App.tsx
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For OCR features: EAS Build or `expo prebuild` (bare workflow)

### Install

```bash
git clone https://github.com/DevSidd2006/Odoo_VIT.git
cd Odoo_VIT
npm install
```

### Run (Expo Go — no OCR)

```bash
npx expo start
```

### Run with OCR (bare workflow)

```bash
npx expo prebuild
npx expo run:android   # or run:ios
```

---

## 📸 Screens

| Auth | Employee | Manager | Admin |
|------|----------|---------|-------|
| Signup / Login | Expense List | Approvals Dashboard | User Management |
| Country picker | Receipt + OCR | Currency conversion | Approval Rules |
| Forgot Password | Submit flow | Approve / Reject | Role assignment |

---

## 🗺️ Roadmap

- [x] Phase 1 — Foundation, Design System & Navigation
- [x] Phase 2 — Database Schema & Data Layer  
- [ ] Phase 3 — Authentication Flow
- [ ] Phase 4 — Admin User Management
- [ ] Phase 5 — Admin Approval Rules
- [ ] Phase 6 — Employee Expense Management
- [ ] Phase 7 — Receipt Attachment & Tesseract OCR
- [ ] Phase 8 — Manager Approval Dashboard
- [ ] Phase 9 — Currency Conversion & Polish

---

## 📄 License

MIT © [DevSidd2006](https://github.com/DevSidd2006)
