import apiClient from '../../../shared/api/axiosClient';

export interface CompanyContextResponse {
  companyName: string;
  companyCode: string;
  tenantId?: string;
}

export const companyApi = {
  /**
   * Protected endpoint for admin users.
   * Backend should return the code the customer must use in /consulta.
   */
  getContext: async (): Promise<CompanyContextResponse> => {
    const { data } = await apiClient.get<CompanyContextResponse>('/payment/PayCompany/context');
    return data;
  },
};
