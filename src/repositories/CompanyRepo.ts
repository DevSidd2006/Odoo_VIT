import { getDb } from '../db/database';
import { Company } from '../types';

export const CompanyRepo = {
  async create(data: { name: string; country: string; base_currency: string }): Promise<number> {
    const db = getDb();
    const result = await db.runAsync(
      `INSERT INTO companies (name, country, base_currency) VALUES (?, ?, ?)`,
      [data.name, data.country, data.base_currency]
    );
    return result.lastInsertRowId;
  },

  async findById(id: number): Promise<Company | null> {
    const db = getDb();
    return db.getFirstAsync<Company>(`SELECT * FROM companies WHERE id = ?`, [id]);
  },

  async getAll(): Promise<Company[]> {
    const db = getDb();
    return db.getAllAsync<Company>(`SELECT * FROM companies ORDER BY name`);
  },
};
