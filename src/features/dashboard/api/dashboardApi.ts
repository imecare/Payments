/**
 * Dashboard feature – API layer
 * Primary endpoint: /payment/PayDashboard/stats
 * Fallback: calculates stats client-side from Sales / Customers / Sellers endpoints.
 */
import apiClient from '@/shared/api/apiClient';
import type { DashboardStats, Sale, Customer, Seller } from '@/shared/types';

export type { DashboardStats };

export const dashboardApi = {
  /** Dedicated stats endpoint (preferred) */
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>('/payment/PayDashboard/stats');
    return data;
  },

  /**
   * Fallback: derive stats from raw entity data when the dedicated endpoint
   * is unavailable (e.g. during local dev without the full backend).
   */
  calculateStats: async (): Promise<DashboardStats> => {
    const [sales, customers, sellers] = await Promise.all([
      apiClient.get<Sale[]>('/payment/PaySales/history').then((r) => r.data),
      apiClient.get<Customer[]>('/payment/PayCustomers').then((r) => r.data),
      apiClient.get<Seller[]>('/payment/PaySellers').then((r) => r.data),
    ]);

    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);

    const totalCollected = sales
      .flatMap((s) => s.payment ?? [])
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingCollection = sales
      .filter((s) => !s.isPaid)
      .reduce((acc, s) => {
        const paid = (s.payment ?? []).reduce((sum, p) => sum + p.amount, 0);
        return acc + Math.max(0, s.totalAmount - paid);
      }, 0);

    const pendingCommissions = sales
      .filter((s) => s.isPaid && !s.isCommissionPaid)
      .reduce((acc, s) => acc + s.commissionAmount, 0);

    const paidCommissions = sales
      .filter((s) => s.isCommissionPaid)
      .reduce((acc, s) => acc + s.commissionAmount, 0);

    return {
      totalSales,
      totalCollected,
      pendingCollection,
      pendingCommissions,
      paidCommissions,
      activeCustomers: customers.length,
      activeSellers: sellers.length,
    };
  },
};
