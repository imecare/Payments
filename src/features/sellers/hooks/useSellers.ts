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
  active: () => [...sellerKeys.all, 'active'] as const,
  details: () => [...sellerKeys.all, 'detail'] as const,
  detail: (id: number) => [...sellerKeys.details(), id] as const,
};

// ============================================
// QUERIES
// ============================================

export function useSellers(enabled = true) {
  return useQuery({
    queryKey: sellerKeys.lists(),
    queryFn: sellersApi.getAll,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useActiveSellers(enabled = true) {
  return useQuery({
    queryKey: sellerKeys.active(),
    queryFn: sellersApi.getActive,
    staleTime: 5 * 60 * 1000,
    enabled,
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
      queryClient.invalidateQueries({ queryKey: sellerKeys.active() });
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
      queryClient.invalidateQueries({ queryKey: sellerKeys.active() });
      queryClient.invalidateQueries({ queryKey: sellerKeys.detail(id) });
    },
  });
}

export function useToggleSellerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: number; statusId: number }) =>
      sellersApi.toggleStatus(id, statusId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sellerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sellerKeys.active() });
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
      queryClient.invalidateQueries({ queryKey: sellerKeys.active() });
    },
  });
}
