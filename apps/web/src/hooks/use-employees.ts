'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

interface EmployeeListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  status?: string;
}

export function useEmployees(params: EmployeeListParams = {}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/employees', { params });
      return data.data || data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/employees/${id}`);
      return data.data || data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: Record<string, unknown>) => {
      const { data } = await apiClient.post('/employees', employee);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...employee }: Record<string, unknown> & { id: string }) => {
      const { data } = await apiClient.patch(`/employees/${id}`, employee);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useArchiveEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/employees/${id}/archive`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/employees/${id}/reactivate`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useAssignRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, roleIds }: { employeeId: string; roleIds: string[] }) => {
      const { data } = await apiClient.post(`/employees/${employeeId}/roles`, { roleIds });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data } = await apiClient.post(`/employees/${employeeId}/resend-invite`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useEmployeeSessions(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'sessions'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/employees/${employeeId}/sessions`);
      return data.data || data;
    },
    enabled: !!employeeId,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, sessionId }: { employeeId: string; sessionId: string }) => {
      const { data } = await apiClient.delete(`/employees/${employeeId}/sessions/${sessionId}`);
      return data.data || data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', variables.employeeId, 'sessions'] });
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data } = await apiClient.delete(`/employees/${employeeId}/sessions`);
      return data.data || data;
    },
    onSuccess: (_data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'sessions'] });
    },
  });
}
