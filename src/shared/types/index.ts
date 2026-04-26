/**
 * Shared domain types
 * All features import their entity types from here to avoid duplication.
 */

// ============================================
// SELLERS
// ============================================
export interface Seller {
  id: number;
  name: string;
  lastName: string;
  phone: string;
  date: string;
  customers?: Customer[];
}

export interface CreateSellerDTO {
  name: string;
  lastName: string;
  phone: string;
}

// ============================================
// CUSTOMERS
// ============================================
export interface Customer {
  id: number;
  name: string;
  lastName: string;
  rfc: string;
  phone: string;
  sellerId: number;
  seller?: Seller;
}

export interface CreateCustomerDTO {
  name: string;
  lastName: string;
  rfc: string;
  phone: string;
  sellerId: number;
}

// ============================================
// PAYMENTS  (mirror of features/payments/api/paymentsApi.ts)
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
  reference?: string;
}

// ============================================
// SALES
// ============================================
export interface Sale {
  id: number;
  customerId: number;
  sellerId: number | null;
  totalAmount: number;
  costPrice: number;
  commissionAmount: number;
  isCommissionPaid: boolean;
  isPaid: boolean;
  date: string;
  customer?: Customer;
  payment?: Payment[];
}

export interface CreateSaleDTO {
  customerId: number;
  sellerId?: number;
  totalAmount: number;
  costPrice: number;
  commissionAmount: number;
}

// ============================================
// DASHBOARD
// ============================================
export interface DashboardStats {
  totalSales: number;
  totalCollected: number;
  pendingCollection: number;
  pendingCommissions: number;
  paidCommissions: number;
  activeCustomers: number;
  activeSellers: number;
}
