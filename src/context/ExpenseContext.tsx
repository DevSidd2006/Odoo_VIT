import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, ExpenseStatus } from '../types';
import { useAuth } from './AuthContext';

interface ExpenseContextType {
  expenses: Expense[];
  submitExpense: (expense: Omit<Expense, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  approveExpense: (id: string, approverName: string) => Promise<void>;
  rejectExpense: (id: string, reason: string) => Promise<void>;
  getMyExpenses: () => Expense[];
  getPendingForApproval: () => Expense[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const STORAGE_KEY = 'expenses';

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setExpenses(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveExpenses = async (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newExpenses));
  };

  const submitExpense = async (expense: Omit<Expense, 'id' | 'status' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await saveExpenses([newExpense, ...expenses]);
  };

  const approveExpense = async (id: string, approverName: string) => {
    const updated = expenses.map(e =>
      e.id === id
        ? { ...e, status: 'approved' as ExpenseStatus, approvedBy: approverName, approvedAt: new Date().toISOString() }
        : e
    );
    await saveExpenses(updated);
  };

  const rejectExpense = async (id: string, reason: string) => {
    const updated = expenses.map(e =>
      e.id === id
        ? { ...e, status: 'rejected' as ExpenseStatus, rejectionReason: reason }
        : e
    );
    await saveExpenses(updated);
  };

  const getMyExpenses = () => {
    if (!user) return [];
    return expenses.filter(e => e.employeeId === user.id);
  };

  const getPendingForApproval = () => {
    if (!user) return [];
    // For demo: manager sees all pending expenses
    if (user.role === 'manager' || user.role === 'admin') {
      return expenses.filter(e => e.status === 'pending' && e.employeeId !== user.id);
    }
    return [];
  };

  return (
    <ExpenseContext.Provider value={{
      expenses,
      submitExpense,
      approveExpense,
      rejectExpense,
      getMyExpenses,
      getPendingForApproval,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpenses must be in ExpenseProvider');
  return context;
}
