import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync('reimbursement.db');

  // Enable WAL mode and foreign keys
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  // ── Companies ──────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      base_currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Users ──────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','employee')),
      manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Categories ─────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📦'
    );
  `);

  // ── Expenses ───────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL DEFAULT '',
      expense_date TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      paid_by TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'USD',
      amount REAL NOT NULL DEFAULT 0,
      remarks TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','waiting_approval','approved','rejected')),
      receipt_uri TEXT,
      ocr_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Approval Rules ─────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS approval_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL DEFAULT '',
      manager_id INTEGER NOT NULL REFERENCES users(id),
      manager_is_approver INTEGER NOT NULL DEFAULT 0,
      specific_approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      condition_mode TEXT NOT NULL DEFAULT 'hybrid' CHECK(condition_mode IN ('percentage','specific_approver','hybrid')),
      sequential INTEGER NOT NULL DEFAULT 1,
      min_approval_percentage REAL NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const approvalRuleColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(approval_rules);`);
  const hasSpecificApprover = approvalRuleColumns.some(c => c.name === 'specific_approver_id');
  if (!hasSpecificApprover) {
    await db.execAsync(`ALTER TABLE approval_rules ADD COLUMN specific_approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);
  }
  const hasConditionMode = approvalRuleColumns.some(c => c.name === 'condition_mode');
  if (!hasConditionMode) {
    await db.execAsync(`ALTER TABLE approval_rules ADD COLUMN condition_mode TEXT NOT NULL DEFAULT 'hybrid';`);
  }

  // ── Approval Rule Approvers ────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS approval_rule_approvers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      required INTEGER NOT NULL DEFAULT 0
    );
  `);

  // ── Approval Requests ──────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule_id INTEGER NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','skipped')),
      acted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const approvalRequestColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(approval_requests);`);
  const hasDecisionComment = approvalRequestColumns.some(c => c.name === 'decision_comment');
      if (!hasDecisionComment) {
    await db.execAsync(`ALTER TABLE approval_requests ADD COLUMN decision_comment TEXT NOT NULL DEFAULT '';`);
  }

  // ── Approval Events (Explainable Approval Graph) ───────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS approval_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      rule_id INTEGER NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      snapshot_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Exchange Rates Cache ───────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exchange_rate_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_currency TEXT NOT NULL,
      rates_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Seed categories if empty ───────────────────────────────────────────────
  const catCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM categories`
  );
  if ((catCount?.count ?? 0) === 0) {
    await db.execAsync(`
      INSERT INTO categories (name, icon) VALUES
        ('Food & Dining', '🍽️'),
        ('Transport', '🚗'),
        ('Accommodation', '🏨'),
        ('Office Supplies', '📎'),
        ('Entertainment', '🎭'),
        ('Healthcare', '🏥'),
        ('Training & Education', '📚'),
        ('Miscellaneous', '📦');
    `);
  }

  console.log('[DB] Database initialized successfully');
};

export default { initDatabase, getDb };
