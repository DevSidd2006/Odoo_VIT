import { db } from '../db/database';
import type { User, UserRole } from '../types';

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
    return await db.users.add({
      company_id: data.company_id,
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      manager_id: data.manager_id ?? null,
      created_at: new Date().toISOString()
    } as any);
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return await db.users.where('email').equals(email).first();
  },

  async findById(id: number): Promise<User | undefined> {
    return await db.users.get(id);
  },

  async findByCompany(company_id: number): Promise<User[]> {
    const users = await db.users.where('company_id').equals(company_id).toArray();
    return users.sort((a, b) => a.name.localeCompare(b.name));
  },

  async findManagersByCompany(company_id: number): Promise<User[]> {
    const users = await db.users.where('company_id').equals(company_id).toArray();
    return users.filter(u => u.role === 'admin' || u.role === 'manager').sort((a, b) => a.name.localeCompare(b.name));
  },

  async updatePassword(id: number, password: string): Promise<void> {
    await db.users.update(id, { password });
  },

  async update(id: number, data: Partial<Pick<User, 'name' | 'email' | 'role' | 'manager_id'>>): Promise<void> {
    await db.users.update(id, data);
  },

  async delete(id: number): Promise<void> {
    await db.users.delete(id);
  },
};
