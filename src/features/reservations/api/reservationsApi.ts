/**
 * Reservations feature - API layer
 * Endpoints: /payment/PayReservations  (Apartados)
 */
import apiClient from '@/shared/api/apiClient';
import type { Reservation, CreateReservationDTO } from '@/shared/types';

export type { Reservation, CreateReservationDTO };

export const reservationsApi = {
  getAll: async (): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>('/payment/PayReservations');
    return data;
  },

  getMine: async (): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>('/payment/PayReservations/mine');
    return data;
  },

  create: async (reservation: CreateReservationDTO): Promise<number> => {
    const { data } = await apiClient.post<number>('/payment/PayReservations', reservation);
    return data;
  },

  update: async (id: number, reservation: CreateReservationDTO): Promise<void> => {
    await apiClient.put(`/payment/PayReservations/${id}`, { ...reservation, id });
  },

  /** Concreta el apartado -> lo convierte en venta. Devuelve el saleId. */
  concretize: async (id: number): Promise<number> => {
    const { data } = await apiClient.post<{ saleId: number }>(
      `/payment/PayReservations/${id}/concretize`
    );
    return data.saleId;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/payment/PayReservations/${id}`);
  },
};
