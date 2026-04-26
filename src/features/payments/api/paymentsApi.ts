/**
 * Payments feature – API layer
 * All backend calls related to "abonos" (payments/installments) and Stripe.
 * Endpoints target the .NET backend at /payment/PayPayments
 */
import apiClient from '@/shared/api/apiClient';

// ============================================
// TYPES
// ============================================
export type PaymentMethod = 'Cash' | 'Card' | 'Transfer';

export interface Payment {
  id: number;
  saleId: number;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference: string;
  paymentTypeId: number;
}

export interface CreatePaymentDTO {
  saleId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  /** Optional bank/Stripe reference */
  reference?: string;
}

// ============================================
// STRIPE TYPES  (extend when integrating)
// ============================================
export interface StripeSessionDTO {
  saleId: number;
  amount: number;
  currency?: string;  // default: 'mxn'
  successUrl: string;
  cancelUrl: string;
}

export interface StripeSession {
  sessionId: string;
  url: string;
}

// ============================================
// API
// ============================================
export const paymentsApi = {
  /** Retrieve all payments */
  getAll: async (): Promise<Payment[]> => {
    const { data } = await apiClient.get<Payment[]>('/payment/PayPayments');
    return data;
  },

  /** Retrieve payments for a specific sale */
  getBySaleId: async (saleId: number): Promise<Payment[]> => {
    const { data } = await apiClient.get<Payment[]>(`/payment/PayPayments/sale/${saleId}`);
    return data;
  },

  /** Register a new abono (cash / card / transfer) */
  create: async (payment: CreatePaymentDTO): Promise<Payment> => {
    const { data } = await apiClient.post<Payment>('/payment/PayPayments', payment);
    return data;
  },

  /** Delete a payment record */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/payment/PayPayments/${id}`);
  },

  // ------------------------------------------
  // Stripe integration (uncomment when ready)
  // ------------------------------------------
  // createStripeSession: async (dto: StripeSessionDTO): Promise<StripeSession> => {
  //   const { data } = await apiClient.post<StripeSession>('/payment/stripe/create-session', dto);
  //   return data;
  // },
};
