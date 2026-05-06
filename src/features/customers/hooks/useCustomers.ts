/**
 * Customers feature – React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type CreateCustomerDTO } from '../api/customersApi';

// ============================================
// QUERY KEYS
// ============================================
export const customerKeys = {
  all: ['customers'] as const,
  lists: (scope: 'all' | 'mine' = 'all') => [...customerKeys.all, 'list', scope] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
};

// ============================================
// QUERIES
// ============================================

export function useCustomers(scope: 'all' | 'mine' = 'all') {
  return useQuery({
    queryKey: customerKeys.lists(scope),
    queryFn: scope === 'mine' ? customersApi.getMine : customersApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersApi.getById(id),
    enabled: id > 0,
  });
}

// ============================================
// MUTATIONS
// ============================================

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerDTO) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateCustomerDTO }) =>
      customersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}
