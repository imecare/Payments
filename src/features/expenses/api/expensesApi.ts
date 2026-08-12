/**
 * Expenses feature – API layer
 * Endpoints: /payment/PayExpenses  (Compras / Gastos)
 */
import apiClient from '@/shared/api/apiClient';
import type { Expense, CreateExpenseDTO } from '@/shared/types';

export type { Expense, CreateExpenseDTO };

export const expensesApi = {
  getAll: async (): Promise<Expense[]> => {
    const { data } = await apiClient.get<Expense[]>('/payment/PayExpenses');
    return data;
  },

  create: async (expense: CreateExpenseDTO): Promise<number> => {
    const { data } = await apiClient.post<number>('/payment/PayExpenses', expense);
    return data;
  },

  update: async (id: number, expense: CreateExpenseDTO): Promise<void> => {
    await apiClient.put(`/payment/PayExpenses/${id}`, { ...expense, id });
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/payment/PayExpenses/${id}`);
  },
};
