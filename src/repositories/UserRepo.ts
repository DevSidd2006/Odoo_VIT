import { getDb } from '../db/database';
import { User, UserRole } from '../types';

export const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
};

export const UserRepo = {
  async create(data: {
    company_id: number;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    manager_id?: number | null;
  }): Promise<number> {
    const db = getDb();
    const result = await db.runAsync(
      `INSERT INTO users (company_id, name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.company_id, data.name, data.email, data.password, data.role, data.manager_id ?? null]
    );
    return result.lastInsertRowId;
  },

  async findByEmail(email: string): Promise<User | null> {
    const db = getDb();
    return db.getFirstAsync<User>(`SELECT * FROM users WHERE email = ?`, [email]);
  },

  async findById(id: number): Promise<User | null> {
    const db = getDb();
    return db.getFirstAsync<User>(`SELECT * FROM users WHERE id = ?`, [id]);
  },

  async findByCompany(company_id: number): Promise<User[]> {
    const db = getDb();
    return db.getAllAsync<User>(`SELECT * FROM users WHERE company_id = ? ORDER BY name`, [company_id]);
  },

  async findManagersByCompany(company_id: number): Promise<User[]> {
    const db = getDb();
    return db.getAllAsync<User>(
      `SELECT * FROM users WHERE company_id = ? AND role IN ('admin','manager') ORDER BY name`,
      [company_id]
    );
  },

  async updatePassword(id: number, password: string): Promise<void> {
    const db = getDb();
    await db.runAsync(`UPDATE users SET password = ? WHERE id = ?`, [password, id]);
  },

  async update(id: number, data: Partial<Pick<User, 'name' | 'email' | 'role' | 'manager_id'>>): Promise<void> {
    const db = getDb();
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return;

    const fields = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value ?? null);
    await db.runAsync(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id] as any);
  },

  async delete(id: number): Promise<void> {
    const db = getDb();
    await db.runAsync(`DELETE FROM users WHERE id = ?`, [id]);
  },
};
