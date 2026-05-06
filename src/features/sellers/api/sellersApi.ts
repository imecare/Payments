/**
 * Sellers feature – API layer
 * Endpoints: /payment/PaySellers
 */
import apiClient from '@/shared/api/apiClient';
import type { Seller, CreateSellerDTO } from '@/shared/types';

export type { Seller, CreateSellerDTO };

export const sellersApi = {
  getAll: async (): Promise<Seller[]> => {
    const { data } = await apiClient.get<Seller[]>('/payment/PaySellers');
    return data;
  },

  getActive: async (): Promise<Seller[]> => {
    const { data } = await apiClient.get<Seller[]>('/payment/PaySellers/active');
    return data;
  },

  getById: async (id: number): Promise<Seller> => {
    const { data } = await apiClient.get<Seller>(`/payment/PaySellers/${id}`);
    return data;
  },

  create: async (seller: CreateSellerDTO): Promise<Seller> => {
    const { data } = await apiClient.post<Seller>('/payment/PaySellers', seller);
    return data;
  },

  update: async (id: number, seller: CreateSellerDTO): Promise<Seller> => {
    const { data } = await apiClient.put<Seller>(`/payment/PaySellers/${id}`, { ...seller, id });
    return data;
  },

  toggleStatus: async (id: number, statusId: number): Promise<Seller> => {
    const { data } = await apiClient.patch<Seller>(`/payment/PaySellers/${id}/status`, { statusId });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/payment/PaySellers/${id}`);
  },
};
