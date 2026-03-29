# REQUIREMENTS.md — Reimbursement App

## Milestone 1 — Full MVP

### Must-Have (P0)

#### Authentication & Company Setup
- REQ-001: Admin signup form: Name, Email, Password, Confirm Password, Country (dropdown of all countries, sets base currency)
- REQ-002: Login form: Email + Password
- REQ-003: Forgot Password: generates random password, stores in DB, shows it (simulated email)
- REQ-004: Role-based navigation routing after login (Admin → Admin screens, Manager → Manager screens, Employee → Employee screens)

#### User Management (Admin)
- REQ-005: User list table with columns: User, Role, Manager, Email, Actions
- REQ-006: Create new user inline with dropdown name search (create on-the-fly if not found), role dropdown (Manager/Employee), manager dropdown, email field
- REQ-007: "Send Password" button generates a random password and saves to user record

#### Approval Rules (Admin)
- REQ-008: Approval rule form: User (dropdown), Description, Manager (dynamic dropdown, pre-filled from user record)
- REQ-009: Approvers list: add/remove approvers with Required checkbox per approver
- REQ-010: "Is Manager an Approver?" checkbox — if checked, request goes to manager first before other approvers
- REQ-011: "Approvers Sequence" toggle — if checked, approvals go sequentially (John → Mitchell → Andreas); if unchecked, all approvers notified simultaneously
- REQ-012: Minimum Approval Percentage field — minimum % of approvers required for auto-approval
- REQ-013: If required approver rejects → expense auto-rejected; if sequence unchecked → send to all simultaneously
- REQ-037: Specific approver rule — if selected specific approver approves, expense auto-approves
- REQ-038: Hybrid rule support — percentage rule OR specific approver rule can finalize approval
- REQ-039: Rule validation must ensure specific approver belongs to active approval path

#### Employee — Expense Flow
- REQ-014: Expense list with summary row: "X rs To submit", "Y rs Waiting approval", "Z rs Approved"
- REQ-015: Expense table: Employee, Description, Date, Category, Paid By, Remarks, Amount, Status (color-coded badges)
- REQ-016: Expense row tap opens detail view (read-only if Submitted/Approved/Rejected; editable if Draft)
- REQ-017: "New" button opens blank expense form
- REQ-018: "Upload" button opens camera/gallery picker
- REQ-019: After photo taken/selected, Tesseract OCR extracts text and auto-fills: amount, description, date (best-effort)
- REQ-020: Expense form fields: Description, Expense Date, Category (dropdown), Paid By (dropdown), Total Amount, Currency (dropdown, defaults to company base currency), Remarks
- REQ-021: Expense status flow: Draft → Submitted → Waiting Approval → Approved/Rejected
- REQ-022: "Submit" button sends expense through approval routing based on matching approval rule
- REQ-023: Audit trail below form: Approver, Status, Time columns

#### Manager — Approval Dashboard
- REQ-024: "Approvals to Review" table: Approval Subject, Request Owner, Category, Request Status, Total Amount (in company currency), Approve button, Reject button
- REQ-025: Total amount shown in both original currency and converted to company base currency (e.g., "567 $ (in ZAR) = 49896")
- REQ-026: After approve/reject action, record becomes read-only, action buttons disappear, status updates
- REQ-040: Manager decision must show explainable reason text (why approved/rejected/pending)

#### Currency
- REQ-027: At expense creation, employee selects currency and enters amount
- REQ-028: In manager view, amount is converted to company base currency using current exchange rate
- REQ-029: Exchange rates fetched from open.er-api.com (free, no key) with 24h local cache

### Should-Have (P1)
- REQ-030: Edit expense (while in Draft state)
- REQ-031: Delete expense (while in Draft state)
- REQ-032: Filter expense list by status
- REQ-033: Category management (predefined: Food, Transport, Accommodation, Office Supplies, Miscellaneous)
- REQ-041: Policy health indicator (Green/Amber/Red) before saving approval rule
- REQ-042: Admin override must auto-close pending approval requests and record override reason

### Nice-to-Have (P2)
- REQ-034: Search expenses by description
- REQ-035: Date range filter
- REQ-036: Export expense list (basic CSV)
