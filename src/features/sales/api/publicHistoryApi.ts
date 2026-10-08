import publicApiClient from '../../../shared/api/publicApiClient';
import type { Sale } from '../../../shared/types';
import axios from 'axios';

export interface PublicHistoryLookupRequest {
  phone: string;
  rfc: string;
  companyCode: string;
}

export interface PublicHistoryResponse {
  statusCode?: string;
  message?: string;
  customerName?: string;
  companyName?: string;
  hasMovements?: boolean;
  totalActivePurchases: number;
  totalPaidOnActivePurchases: number;
  sales: Sale[];
}

interface PublicHistoryEnvelope {
  statusCode?: string;
  message?: string;
  data?: {
    customerName?: string;
    companyName?: string;
    hasMovements?: boolean;
    totalActivePurchases?: number;
    totalPaidOnActivePurchases?: number;
    sales?: Sale[];
  };
  customerName?: string;
  companyName?: string;
  hasMovements?: boolean;
  totalActivePurchases?: number;
  totalPaidOnActivePurchases?: number;
  sales?: Sale[];
}

export interface PublicHistoryApiError {
  status?: number;
  statusCode?: string;
  message: string;
}

function normalizeResponse(payload: PublicHistoryEnvelope): PublicHistoryResponse {
  const data = payload.data;

  return {
    statusCode: payload.statusCode,
    message: payload.message,
    customerName: data?.customerName ?? payload.customerName,
    companyName: data?.companyName ?? payload.companyName,
    hasMovements: data?.hasMovements ?? payload.hasMovements,
    totalActivePurchases: data?.totalActivePurchases ?? payload.totalActivePurchases ?? 0,
    totalPaidOnActivePurchases:
      data?.totalPaidOnActivePurchases ?? payload.totalPaidOnActivePurchases ?? 0,
    sales: data?.sales ?? payload.sales ?? [],
  };
}

export function parsePublicHistoryError(error: unknown): PublicHistoryApiError {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as {
      statusCode?: string;
      message?: string;
      title?: string;
    } | undefined;

    return {
      status: error.response?.status,
      statusCode: responseData?.statusCode,
      message:
        responseData?.message ||
        responseData?.title ||
        error.message ||
        'No fue posible consultar tu historial.',
    };
  }

  return {
    message: 'No fue posible consultar tu historial.',
  };
}

/**
 * Planned endpoint for anonymous history lookup.
 * Backend should validate that phone + rfc + companyCode belong to the same customer.
 */
export const publicHistoryApi = {
  lookup: async (payload: PublicHistoryLookupRequest): Promise<PublicHistoryResponse> => {
    const { data } = await publicApiClient.post<PublicHistoryEnvelope>(
      '/payment/PayPublicSales/history/query',
      payload
    );

    return normalizeResponse(data);
  },
};
