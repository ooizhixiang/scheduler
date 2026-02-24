'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const { data } = await apiClient.get('/schedules');
      return data.data || data;
    },
  });
}

export function useSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/schedules/${id}`);
      return data.data || data;
    },
    enabled: !!id,
  });
}

export function useMySchedule() {
  return useQuery({
    queryKey: ['my-schedule'],
    queryFn: async () => {
      const { data } = await apiClient.get('/schedules/my-schedule');
      return data.data || data;
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Record<string, unknown>) => {
      const { data } = await apiClient.post('/schedules', schedule);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...schedule }: Record<string, unknown> & { id: string }) => {
      const { data } = await apiClient.patch(`/schedules/${id}`, schedule);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/schedules/${id}`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function usePublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/schedules/${id}/publish`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUnpublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/schedules/${id}/unpublish`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useCopySchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: Record<string, unknown> & { id: string }) => {
      const { data } = await apiClient.post(`/schedules/${id}/copy`, dto);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useScheduleConflicts(id: string | undefined) {
  return useQuery({
    queryKey: ['schedules', id, 'conflicts'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/schedules/${id}/conflicts`);
      return data.data || data;
    },
    enabled: !!id,
  });
}

export function useScheduleViews(id: string | undefined) {
  return useQuery({
    queryKey: ['schedules', id, 'views'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/schedules/${id}/views`);
      return data.data || data;
    },
    enabled: !!id,
  });
}

export function useRecordScheduleView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data } = await apiClient.post(`/schedules/${scheduleId}/views`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
    },
  });
}

export function useScheduleAmendments(id: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ['schedules', id, 'amendments'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/schedules/${id}/amendments`);
      return data.data || data;
    },
    enabled: !!id && enabled,
  });
}

export function usePublishAmendments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/schedules/${id}/publish-amendments`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useSendReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, employeeId }: { scheduleId: string; employeeId: string }) => {
      const { data } = await apiClient.post(`/schedules/${scheduleId}/remind/${employeeId}`);
      return data.data || data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.scheduleId, 'views'] });
    },
  });
}
