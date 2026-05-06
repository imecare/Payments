/**
 * Sales feature – API layer
 * Endpoints: /payment/PaySales  |  /payment/PayPublicSales
 */
import apiClient from '@/shared/api/apiClient';
import type { Sale, CreateSaleDTO } from '@/shared/types';

export type { Sale, CreateSaleDTO };

export const salesApi = {
  /** All sales (admin) — GET /payment/PaySales returns all tenant sales */
  getAll: async (): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>('/payment/PaySales');
    return data;
  },

  /** Customer history search by phone/rfc (at least one required) */
  getHistory: async (params: { phone?: string; rfc?: string }): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>('/payment/PaySales/history', { params });
    return data;
  },

  /** Sales scoped to the logged-in commissionist */
  getMine: async (): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>('/payment/PaySales/mine');
    return data;
  },

  getById: async (id: number): Promise<Sale> => {
    const { data } = await apiClient.get<Sale>(`/payment/PaySales/${id}`);
    return data;
  },

  /** Sales pending payment for a customer */
  getPendingByCustomer: async (customerId: number): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>(
      `/payment/PaySales/customer/${customerId}/pending`
    );
    return data;
  },

  /** Public endpoint – sales history by customer phone */
  getByCustomerPhone: async (phone: string): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>(
      `/payment/PayPublicSales/history/${phone}`
    );
    return data;
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
};
