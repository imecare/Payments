/**
 * Sales feature – API layer
 * Endpoints: /payment/PaySales  |  /payment/PayPublicSales
 */
import apiClient from '@/shared/api/apiClient';
import type { Sale, CreateSaleDTO } from '@/shared/types';

export type { Sale, CreateSaleDTO };

/** Normalize legacy `payment` field → `payments` to eliminate deprecated field downstream */
function normalizeSale(s: Sale): Sale {
  return {
    ...s,
    payments: s.payments ?? s.payment ?? [],
    payment: undefined,
  };
}

export const salesApi = {
  /** All sales (admin) — GET /payment/PaySales returns all tenant sales */
  getAll: async (): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>('/payment/PaySales');
    return data.map(normalizeSale);
  },

  /** Customer history search by phone/rfc (at least one required) */
  getHistory: async (params: { phone?: string; rfc?: string }): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>('/payment/PaySales/history', { params });
    return data.map(normalizeSale);
  },

  /** Sales scoped to the logged-in commissionist */
  getMine: async (): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>('/payment/PaySales/mine');
    return data.map(normalizeSale);
  },

  getById: async (id: number): Promise<Sale> => {
    const { data } = await apiClient.get<Sale>(`/payment/PaySales/${id}`);
    return normalizeSale(data);
  },

  /** Sales pending payment for a customer */
  getPendingByCustomer: async (customerId: number): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>(
      `/payment/PaySales/customer/${customerId}/pending`
    );
    return data.map(normalizeSale);
  },

  /** Public endpoint – sales history by customer phone */
  getByCustomerPhone: async (phone: string): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>(
      `/payment/PayPublicSales/history/${phone}`
    );
    return data.map(normalizeSale);
  },

  /** Returns the new sale's id */
  create: async (sale: CreateSaleDTO): Promise<number> => {
    const { data } = await apiClient.post<number>('/payment/PaySales', sale);
    return data;
  },

  update: async (id: number, sale: CreateSaleDTO): Promise<void> => {
    await apiClient.put(`/payment/PaySales/${id}`, { ...sale, id });
  },

  /** Mark commission as paid/unpaid — paid defaults to true */
  markCommissionPaid: async (id: number, paid = true, note?: string): Promise<void> => {
    await apiClient.patch(`/payment/PaySales/${id}/commission-paid`, { paid, note });
  },

  /** Delete a sale (SuperAdmin only) */
  delete: async (id: number, reason?: string): Promise<void> => {
    const params = reason ? { reason } : undefined;
    await apiClient.delete(`/payment/PaySales/${id}`, { params });
  },
};
