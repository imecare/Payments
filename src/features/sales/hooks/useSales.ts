/**
 * Sales feature – React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, type CreateSaleDTO } from '../api/salesApi';
import type { Payment } from '@/shared/types';

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
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(saleId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ============================================
// COMPUTED HELPERS
// ============================================
export interface SaleBalance {
  totalPaid: number;
  remainingBalance: number;
  /** 0–100 */
  progress: number;
  isPaid: boolean;
}

/** paymentTypeId === 1 → cargo inicial (face value of sale), paymentTypeId === 2 → abono real */
export const PAYMENT_TYPE_ABONO = 2;

export function calculateSaleBalance(
  totalAmount: number,
  payments: Pick<Payment, 'amount' | 'paymentTypeId'>[]
): SaleBalance {
  const abonos = payments.filter((p) => p.paymentTypeId === PAYMENT_TYPE_ABONO);
  const totalPaid = abonos.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const progress = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;
  return { totalPaid, remainingBalance, progress, isPaid: remainingBalance <= 0 };
}
