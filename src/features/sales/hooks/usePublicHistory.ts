import { useMutation } from '@tanstack/react-query';
import {
  publicHistoryApi,
  type PublicHistoryLookupRequest,
  type PublicHistoryResponse,
} from '../api/publicHistoryApi';

export function usePublicHistoryLookup() {
  return useMutation<PublicHistoryResponse, unknown, PublicHistoryLookupRequest>({
    mutationFn: publicHistoryApi.lookup,
  });
}
