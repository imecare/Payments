/**
 * Sales feature – React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, type CreateSaleDTO } from '../api/salesApi';
import type { Sale } from '../../../shared/types';

// ============================================
// QUERY KEYS
// ============================================
export const saleKeys = {
  all: ['sales'] as const,
  lists: (scope: 'all' | 'mine' = 'all') => [...saleKeys.all, 'list', scope] as const,
  pending: () => [...saleKeys.all, 'pending'] as const,
  pendingByCustomer: (customerId: number) => [...saleKeys.pending(), customerId] as const,
  details: () => [...saleKeys.all, 'detail'] as const,
  detail: (id: number) => [...saleKeys.details(), id] as const,
  byCustomerPhone: (phone: string) => [...saleKeys.all, 'phone', phone] as const,
};

// ============================================
// QUERIES
// ============================================

export function useSales(scope: 'all' | 'mine' = 'all') {
  return useQuery({
    queryKey: saleKeys.lists(scope),
    queryFn: scope === 'mine' ? salesApi.getMine : salesApi.getAll,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSale(id: number) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: () => salesApi.getById(id),
    enabled: id > 0,
  });
}

export function usePendingSalesByCustomer(customerId: number) {
  return useQuery({
    queryKey: saleKeys.pendingByCustomer(customerId),
    queryFn: () => salesApi.getPendingByCustomer(customerId),
    enabled: customerId > 0,
  });
}

/** Public portal: look up sale history by customer phone number */
export function useSalesByCustomerPhone(phone: string) {
  return useQuery({
    queryKey: saleKeys.byCustomerPhone(phone),
    queryFn: () => salesApi.getByCustomerPhone(phone),
    enabled: phone.length >= 10,
  });
}

// ============================================
// MUTATIONS
// ============================================

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSaleDTO) => salesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateSaleDTO }) =>
      salesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
    },
  });
}

export function useMarkCommissionPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, paid = true, note }: { saleId: number; paid?: boolean; note?: string }) =>
      salesApi.markCommissionPaid(saleId, paid, note),
    onMutate: async ({ saleId, paid }) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: saleKeys.all });
      
      // Snapshot del estado anterior
      const previousSales = queryClient.getQueryData(saleKeys.lists());
      const previousMineSales = queryClient.getQueryData(saleKeys.lists('mine'));
      
      // Actualización optimista - actualizar todas las listas de ventas
      const updateSalesCache = (oldSales: Sale[] | undefined) => {
        if (!oldSales) return oldSales;
        return oldSales.map((sale) =>
          sale.id === saleId
            ? { ...sale, isCommissionPaid: paid, commissionPaidAt: paid ? new Date().toISOString() : null }
            : sale
        );
      };
      
      queryClient.setQueryData(saleKeys.lists(), updateSalesCache);
      queryClient.setQueryData(saleKeys.lists('mine'), updateSalesCache);
      
      return { previousSales, previousMineSales };
    },
    onError: (_err, _variables, context) => {
      // Revertir en caso de error
      if (context?.previousSales) {
        queryClient.setQueryData(saleKeys.lists(), context.previousSales);
      }
      if (context?.previousMineSales) {
        queryClient.setQueryData(saleKeys.lists('mine'), context.previousMineSales);
      }
    },
    onSettled: (_, __, { saleId }) => {
      // Refrescar datos del servidor
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(saleId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      salesApi.delete(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ============================================
// COMPUTED HELPERS — re-exported from usePayments for backward compat
// ============================================
export type { SaleBalance } from '../../../features/payments/hooks/usePayments';
export { calculateSaleBalance, PAYMENT_TYPE_ABONO } from '../../../features/payments/hooks/usePayments';
