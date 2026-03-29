# ROADMAP.md — Reimbursement App

## Milestone 1 — Full MVP

### Phase 1 — Foundation, Design System & Navigation
**Goal:** Install all dependencies, set up navigation skeleton (Auth/Admin/Employee/Manager stacks), and establish the full design system (colors, typography, spacing, shared components).

**Plans:**
1. Install all dependencies (expo-sqlite, react-navigation, expo-image-picker, react-native-tesseract-ocr, AsyncStorage, etc.)
2. Build design system (theme.ts — colors, fonts, spacing) and core UI primitives (Button, Input, Badge, Card, Header)
3. Set up navigation structure (AuthStack, AdminStack, EmployeeStack, ManagerStack) with role-based routing

**UAT:**
- [ ] App launches without errors
- [ ] Navigation stubs render for all 3 roles
- [ ] Design system tokens applied consistently

---

### Phase 2 — Database Schema & Data Layer
**Goal:** Define the full SQLite schema, seed initial data, and build the repository layer (typed CRUD functions) for all entities.

**Plans:**
1. Design and create SQLite tables: companies, users, roles, expenses, categories, approval_rules, approvers, approval_requests
2. Build database initialization (migrations) and seeder for dev/demo data
3. Build repository layer: CompanyRepo, UserRepo, ExpenseRepo, ApprovalRuleRepo, ApprovalRequestRepo

**UAT:**
- [ ] DB initializes cleanly on fresh install
- [ ] All repos tested with basic CRUD operations
- [ ] Foreign key constraints enforced

---

### Phase 3 — Authentication Flow
**Goal:** Full auth system — admin company signup with country/currency, login, forgot password, and role-based routing after login.

**Plans:**
1. Signup screen: Name, Email, Password, Confirm Password, Country dropdown (all countries + auto-set base currency)
2. Login screen: Email/Password with credential validation against SQLite
3. Forgot Password: generates random 8-char password, updates user record, displays it (simulated email)
4. Auth context + AsyncStorage session persistence + role-based navigation routing

**UAT:**
- [ ] Admin can sign up and is routed to Admin home
- [ ] Existing user can log in and is routed by role
- [ ] Forgot password produces a new password and displays it
- [ ] Session persists across app restarts

---

### Phase 4 — Admin User Management
**Goal:** Admin can manage all users — create, assign roles and managers, send passwords.

**Plans:**
1. User list screen with table (User, Role, Manager, Email, Actions)
2. Inline user creation: name search/create, role dropdown, manager dropdown, email field
3. "Send Password" flow: generates random password, saves to user record, shows confirmation

**UAT:**
- [ ] Admin sees all users in a table
- [ ] Admin can create a new user with role and manager assigned
- [ ] "Send Password" generates and stores a new password

---

### Phase 5 — Admin Approval Rules
**Goal:** Admin configures approval rules per user — approvers, sequencing, required flags, minimum approval percentage.

**Plans:**
1. Approval rule list and form: User selector, Description, Manager dropdown (pre-filled from user)
2. Approvers sub-list: add/remove approvers with Required checkbox, "Is Manager an Approver?" checkbox
3. Sequence toggle (sequential vs parallel) and Minimum Approval Percentage field with explanations

**UAT:**
- [ ] Admin can create an approval rule with multiple approvers
- [ ] Sequential and parallel modes can be toggled
- [ ] Minimum approval percentage is saved and readable
- [ ] Manager-first checkbox correctly set

---

### Phase 6 — Employee Expense Management
**Goal:** Employees can create, edit, and submit expenses with full form, multi-currency input, and status tracking.

**Plans:**
1. Expense list screen: summary header (To Submit / Waiting Approval / Approved totals), expense table with status badges
2. Expense detail/create form: all fields (description, date, category, paid by, currency, amount, remarks)
3. Submit flow: validate fields → create approval_request records based on matching approval rule → update status to "Submitted"

**UAT:**
- [ ] Employee sees their expenses in a list with summary totals
- [ ] Employee can create a new Draft expense
- [ ] Submitting routes through correct approval rule
- [ ] Status changes to "Waiting Approval" after submit

---

### Phase 7 — Receipt Attachment & Tesseract OCR
**Goal:** Employees can take a photo or pick from gallery; Tesseract OCR extracts text and auto-fills expense fields.

**Plans:**
1. Integrate expo-image-picker (camera + gallery) and attach image URI to expense record
2. Integrate react-native-tesseract-ocr: process image, extract raw text
3. Parse OCR output to detect amount, date, and description; auto-fill into expense form with user confirmation

**UAT:**
- [ ] User can pick image from gallery or take photo
- [ ] OCR runs and returns text from a receipt image
- [ ] Amount and date fields are pre-filled (or at least attempted) from OCR output
- [ ] User can manually override auto-filled values

---

### Phase 8 — Manager Approval Dashboard
**Goal:** Managers see all pending expenses routed to them, with amounts converted to company currency, and can approve/reject.

**Plans:**
1. Approvals dashboard: table with all pending approval_requests assigned to this manager
2. Approve/Reject actions: update approval_request + trigger approval rule logic (sequential next step, or final decision)
3. Currency conversion display: show original amount and converted amount side-by-side

**UAT:**
- [ ] Manager sees all pending approvals for their queue
- [ ] Approve/Reject updates status correctly
- [ ] Sequential rule routes to next approver after approval
- [ ] Once finalized, record becomes read-only and buttons disappear

---

### Phase 9 — Currency Conversion & Polish
**Goal:** Integrate exchange rate fetching, apply real-time conversion in manager view, and polish the full UX.

**Plans:**
1. Exchange rate service: fetch from open.er-api.com, cache in SQLite for 24h, fallback to last known rates
2. Apply conversion in manager dashboard, expense detail view
3. UX polish: loading states, error toasts, empty states, keyboard handling, scroll behavior

**UAT:**
- [ ] Exchange rates are fetched and cached
- [ ] Manager sees converted amounts correctly
- [ ] 24h cache prevents repeat API calls
- [ ] App handles offline gracefully (uses cached rates)

---

## Backlog

- REQ-034: Search expenses by description
- REQ-035: Date range filter
- REQ-036: Export expense list (CSV)
