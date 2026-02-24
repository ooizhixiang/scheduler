'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useAvailability(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['availability', employeeId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/availability/${employeeId}`);
      return data.data || data;
    },
    enabled: !!employeeId,
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, entries }: { employeeId: string; entries: any[] }) => {
      const { data } = await apiClient.put(`/availability/${employeeId}`, { entries });
      return data.data || data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability', variables.employeeId] });
    },
  });
}
