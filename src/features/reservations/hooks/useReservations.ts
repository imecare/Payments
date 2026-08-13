/**
 * Reservations feature - React Query hooks (Apartados)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi, type CreateReservationDTO } from '../api/reservationsApi';

// ============================================
// QUERY KEYS
// ============================================
export const reservationKeys = {
  all: ['reservations'] as const,
  lists: (scope: 'all' | 'mine' = 'all') => [...reservationKeys.all, 'list', scope] as const,
};

// ============================================
// QUERIES
// ============================================
export function useReservations(scope: 'all' | 'mine' = 'all') {
  return useQuery({
    queryKey: reservationKeys.lists(scope),
    queryFn: scope === 'mine' ? reservationsApi.getMine : reservationsApi.getAll,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// MUTATIONS
// ============================================
export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReservationDTO) => reservationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateReservationDTO }) =>
      reservationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}

export function useConcretizeReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reservationsApi.concretize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reservationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}
