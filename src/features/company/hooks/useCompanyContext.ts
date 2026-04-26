import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companyApi, type CompanyContextResponse } from '../api/companyApi';

export const companyKeys = {
  all: ['company'] as const,
  context: () => [...companyKeys.all, 'context'] as const,
};

function readJwtClaims(): Partial<CompanyContextResponse> {
  const token = localStorage.getItem('authToken');
  if (!token) return {};

  try {
    const payload = token.split('.')[1];
    if (!payload) return {};

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    const claims = JSON.parse(decoded) as Record<string, string>;

    return {
      companyCode:
        claims.companyCode ||
        claims.company_code ||
        claims.tenantCode ||
        claims.tenant_code ||
        claims['http://schemas.businesscloud/companyCode'] ||
        '',
      companyName:
        claims.companyName ||
        claims.company_name ||
        claims['http://schemas.businesscloud/companyName'] ||
        '',
      tenantId:
        claims.tenantId || claims.tenant_id || claims['http://schemas.businesscloud/tenantId'] || '',
    };
  } catch {
    return {};
  }
}

export function useCompanyContext() {
  const claimsFallback = useMemo(() => readJwtClaims(), []);

  return useQuery<CompanyContextResponse>({
    queryKey: companyKeys.context(),
    queryFn: companyApi.getContext,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    // If backend endpoint is not ready yet, use JWT claims as fallback.
    placeholderData: {
      companyName: claimsFallback.companyName || 'Empresa',
      companyCode: claimsFallback.companyCode || '',
      tenantId: claimsFallback.tenantId,
    },
  });
}
