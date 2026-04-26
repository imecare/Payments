/**
 * Sellers feature – React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellersApi, type CreateSellerDTO } from '../api/sellersApi';

// ============================================
// QUERY KEYS
// ============================================
export const sellerKeys = {
  all: ['sellers'] as const,
  lists: () => [...sellerKeys.all, 'list'] as const,
  details: () => [...sellerKeys.all, 'detail'] as const,
  detail: (id: number) => [...sellerKeys.details(), id] as const,
};

// ============================================
// QUERIES
// ============================================

export function useSellers() {
  return useQuery({
    queryKey: sellerKeys.lists(),
    queryFn: sellersApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSeller(id: number) {
  return useQuery({
    queryKey: sellerKeys.detail(id),
    queryFn: () => sellersApi.getById(id),
    enabled: id > 0,
  });
}

// ============================================
// MUTATIONS
// ============================================

export function useCreateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSellerDTO) => sellersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellerKeys.lists() });
    },
  });
}

export function useUpdateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateSellerDTO }) =>
      sellersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sellerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sellerKeys.detail(id) });
    },
  });
}

export function useDeleteSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sellersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellerKeys.lists() });
    },
  });
}
