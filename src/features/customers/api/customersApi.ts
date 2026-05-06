/**
 * Customers feature – API layer
 * Endpoints: /payment/PayCustomers
 */
import apiClient from '@/shared/api/apiClient';
import type { Customer, CreateCustomerDTO } from '@/shared/types';

export type { Customer, CreateCustomerDTO };

export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get<Customer[]>('/payment/PayCustomers');
    return data;
  },

  getMine: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get<Customer[]>('/payment/PayCustomers/mine');
    return data;
  },

  getById: async (id: number): Promise<Customer> => {
    const { data } = await apiClient.get<Customer>(`/payment/PayCustomers/${id}`);
    return data;
  },

  create: async (customer: CreateCustomerDTO): Promise<Customer> => {
    const { data } = await apiClient.post<Customer>('/payment/PayCustomers', customer);
    return data;
  },

  update: async (id: number, customer: CreateCustomerDTO): Promise<Customer> => {
    const { data } = await apiClient.put<Customer>(`/payment/PayCustomers/${id}`, { ...customer, id });
    return data;
  },
};
