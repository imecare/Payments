/**
 * Expenses feature – React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, type CreateExpenseDTO } from '../api/expensesApi';

// ============================================
// QUERY KEYS
// ============================================
export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
};

// ============================================
// QUERIES
// ============================================
export function useExpenses() {
  return useQuery({
    queryKey: expenseKeys.lists(),
    queryFn: expensesApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// MUTATIONS
// ============================================
export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseDTO) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateExpenseDTO }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMarkExpenseReceived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, received }: { id: number; received: boolean }) =>
      expensesApi.markReceived(id, received),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}
