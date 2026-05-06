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
  statusId: number; // 1 = Active, 0 = Inactive
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
export type PaymentMethod = "Cash" | "Card" | "Transfer";

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
  customerName?: string;
  sellerId: number | null;
  sellerName?: string;
  totalAmount: number;
  costPrice: number;
  productDescription?: string;
  commissionAmount: number;
  isCommissionPaid: boolean;
  isPaid: boolean;
  date: string;
  commissionPaidAt?: string | null;
  customer?: Customer;
  seller?: Seller;
  payments?: Payment[];
  /** @deprecated use payments */
  payment?: Payment[];
  /** Server-computed: sum of abonos (paymentTypeId=2) */
  paidAmount?: number;
  /** Server-computed: Max(0, totalAmount - paidAmount) */
  remainingBalance?: number;
  /** Server-computed: Min(100, paidAmount / totalAmount * 100) */
  paymentProgress?: number;
}

export interface CreateSaleDTO {
  customerId: number;
  sellerId?: number;
  totalAmount: number;
  costPrice: number;
  productDescription: string;
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
  /** Server-computed: sum of (totalAmount - costPrice) for paid sales */
  totalProfit?: number;
}

export interface CommissionistStats {
  totalCustomers: number;
  totalSales: number;
  paidSales: number;
  pendingCommissionsAmount: number;
  paidCommissionsAmount: number;
  pendingCommissionsCount: number;
  paidCommissionsCount: number;
}
