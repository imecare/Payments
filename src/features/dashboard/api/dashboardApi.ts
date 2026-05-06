/**
 * Dashboard feature – API layer
 * Primary endpoint: /payment/PayDashboard/stats
 * Fallback: calculates stats client-side from Sales / Customers / Sellers endpoints.
 */
import apiClient from '@/shared/api/apiClient';
import type { DashboardStats, CommissionistStats, Sale, Customer, Seller } from '@/shared/types';

export type { DashboardStats };

export const dashboardApi = {
  /** Dedicated stats endpoint (preferred) */
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>('/payment/PayDashboard/stats');
    return data;
  },

  /** Commissionist-only stats endpoint */
  getCommissionistStats: async (): Promise<CommissionistStats> => {
    const { data } = await apiClient.get<CommissionistStats>(
      '/payment/PayDashboard/commissionist-stats'
    );
    return data;
  },

  /**
   * Fallback: derive stats from raw entity data when the dedicated endpoint
   * is unavailable (e.g. during local dev without the full backend).
   */
  calculateStats: async (): Promise<DashboardStats> => {
    const [sales, customers, sellers] = await Promise.all([
      apiClient.get<Sale[]>('/payment/PaySales').then((r) => r.data),
      apiClient.get<Customer[]>('/payment/PayCustomers').then((r) => r.data),
      apiClient.get<Seller[]>('/payment/PaySellers').then((r) => r.data),
    ]);

    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);

    const totalCollected = sales
      .flatMap((s) => s.payments ?? s.payment ?? [])
      .filter((p) => p.paymentTypeId === 2)
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingCollection = sales
      .filter((s) => !s.isPaid)
      .reduce((acc, s) => {
        const paid = (s.payments ?? s.payment ?? [])
          .filter((p) => p.paymentTypeId === 2)
          .reduce((sum, p) => sum + p.amount, 0);
        return acc + Math.max(0, s.totalAmount - paid);
      }, 0);

    const pendingCommissions = sales
      .filter((s) => s.isPaid && !s.isCommissionPaid)
      .reduce((acc, s) => acc + s.commissionAmount, 0);

    const paidCommissions = sales
      .filter((s) => s.isCommissionPaid)
      .reduce((acc, s) => acc + s.commissionAmount, 0);

    const totalProfit = sales
      .filter((s) => s.isPaid)
      .reduce((acc, s) => acc + (s.totalAmount - (s.costPrice ?? 0)), 0);

    return {
      totalSales,
      totalCollected,
      pendingCollection,
      pendingCommissions,
      paidCommissions,
      activeCustomers: customers.length,
      activeSellers: sellers.length,
      totalProfit,
    };
  },
};
