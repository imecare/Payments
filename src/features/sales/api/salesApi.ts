/**
 * Sales feature – API layer
 * Endpoints: /payment/PaySales  |  /payment/PayPublicSales
 */
import apiClient from '@/shared/api/apiClient';
import type { Sale, CreateSaleDTO } from '@/shared/types';

export type { Sale, CreateSaleDTO };

export const salesApi = {
  /** All sales (admin) */
  getAll: async (): Promise<Sale[]> => {
    const { data } = await apiClient.get<Sale[]>('/payment/PaySales/history');
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

  create: async (sale: CreateSaleDTO): Promise<Sale> => {
    const { data } = await apiClient.post<Sale>('/payment/PaySales', sale);
    return data;
  },

  update: async (id: number, sale: Partial<Sale>): Promise<Sale> => {
    const { data } = await apiClient.put<Sale>(`/payment/PaySales/${id}`, { ...sale, id });
    return data;
  },

  /** Mark seller commission as paid */
  markCommissionPaid: async (id: number): Promise<Sale> => {
    const { data } = await apiClient.patch<Sale>(
      `/payment/PaySales/${id}/commission-paid`
    );
    return data;
  },
};
