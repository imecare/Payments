/**
 * Payments feature – React Query hooks
 * Manages all "abonos" state: queries, mutations, and cache invalidation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, type CreatePaymentDTO } from '../api/paymentsApi';

// ============================================
// QUERY KEYS
// ============================================
export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  bySale: (saleId: number) => [...paymentKeys.all, 'sale', saleId] as const,
};

// ============================================
// QUERIES
// ============================================

/** Fetch all payments (admin view) */
export function useAllPayments() {
  return useQuery({
    queryKey: paymentKeys.lists(),
    queryFn: paymentsApi.getAll,
    staleTime: 2 * 60 * 1000,
  });
}

/** Fetch the abonos registered for a specific sale */
export function usePaymentsBySale(saleId: number) {
  return useQuery({
    queryKey: paymentKeys.bySale(saleId),
    queryFn: () => paymentsApi.getBySaleId(saleId),
    enabled: saleId > 0,
  });
}

// ============================================
// MUTATIONS
// ============================================

/** Register a new abono and refresh relevant caches */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePaymentDTO) => paymentsApi.create(dto),
    onSuccess: (_data, variables) => {
      // Refresh payments list for this sale
      queryClient.invalidateQueries({ queryKey: paymentKeys.bySale(variables.saleId) });
      // The sale's isPaid status may have changed – refresh all sales caches
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

/** Delete a payment and refresh caches */
export function useDeletePayment(saleId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: number) => paymentsApi.delete(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.bySale(saleId) });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
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

/** Calculate balance from a sale's total and its payments */
export function calculateSaleBalance(totalAmount: number, payments: { amount: number }[]): SaleBalance {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const progress = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;

  return {
    totalPaid,
    remainingBalance,
    progress,
    isPaid: remainingBalance <= 0,
  };
}
