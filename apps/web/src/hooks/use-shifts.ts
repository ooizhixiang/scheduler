'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, ...shift }: Record<string, unknown> & { scheduleId: string }) => {
      const { data } = await apiClient.post(`/schedules/${scheduleId}/shifts`, shift);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useCreateBulkShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, shifts }: { scheduleId: string; shifts: any[] }) => {
      const { data } = await apiClient.post(`/schedules/${scheduleId}/shifts/bulk`, { shifts });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, id, ...shift }: Record<string, unknown> & { scheduleId: string; id: string }) => {
      const { data } = await apiClient.patch(`/schedules/${scheduleId}/shifts/${id}`, shift);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, id }: { scheduleId: string; id: string }) => {
      const { data } = await apiClient.delete(`/schedules/${scheduleId}/shifts/${id}`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
