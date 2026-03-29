import { db } from '../db/database';
import type { Company } from '../types';

export const CompanyRepo = {
  async create(data: { name: string; country: string; base_currency: string }): Promise<number> {
    return await db.companies.add({
      name: data.name,
      country: data.country,
      base_currency: data.base_currency,
      created_at: new Date().toISOString()
    } as any);
  },

  async findById(id: number): Promise<Company | undefined> {
    return await db.companies.get(id);
  }
};
