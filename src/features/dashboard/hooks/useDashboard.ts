/**
 * Dashboard feature – React Query hooks
 */
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type DashboardStats } from '../api/dashboardApi';

// ============================================
// QUERY KEYS
// ============================================
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

// ============================================
// HOOKS
// ============================================

/**
 * Fetches dashboard statistics.
 * Tries the dedicated endpoint first; falls back to client-side calculation
 * if the endpoint is not yet available.
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      try {
        return await dashboardApi.getStats();
      } catch {
        return await dashboardApi.calculateStats();
      }
    },
    staleTime: 60 * 1000,          // 1 minute
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
  });
}
