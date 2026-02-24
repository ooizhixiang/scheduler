'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export type LeaveReason = 'SICK' | 'PERSONAL' | 'VACATION' | 'OTHER';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  reason: LeaveReason;
  notes: string | null;
  status: LeaveRequestStatus;
  hasShiftConflict: boolean;
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId?: string | null;
    department?: { id: string; name: string } | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MyLeaveRequests {
  pending: LeaveRequest[];
  past: LeaveRequest[];
}

// ─── Employee hooks ──────────────────────────────────────────────────────────

export function useMyLeaveRequests() {
  return useQuery<MyLeaveRequests>({
    queryKey: ['leave-requests', 'my'],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave-requests/my');
      return data.data || data;
    },
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { date: string; reason: LeaveReason; notes?: string }) => {
      const { data } = await apiClient.post('/leave-requests', params);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await apiClient.post(`/leave-requests/${requestId}/cancel`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}

export interface LeaveBalance {
  annual: { used: number; total: number };
  sick: { used: number; total: number };
  pending: number;
  year: number;
}

export interface CoverageImpact {
  date: string;
  totalScheduled: number;
  coverageAfterApproval: number;
  requestEmployeeShifts: { id: string; startTime: string; endTime: string; role: string }[];
  scheduledEmployees: { id: string; firstName: string; lastName: string; roles: string[] }[];
  availableEmployees: { id: string; firstName: string; lastName: string }[];
  warning?: string;
}

export interface ApprovedLeave {
  id: string;
  employeeId: string;
  date: string;
  reason: LeaveReason;
}

export function useApprovedLeaves(startDate?: string, endDate?: string, employeeId?: string) {
  return useQuery<ApprovedLeave[]>({
    queryKey: ['leave-requests', 'approved-leaves', startDate, endDate, employeeId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (employeeId) params.employeeId = employeeId;
      const { data } = await apiClient.get('/leave-requests/approved-leaves', { params });
      return data.data || data;
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useLeaveBalance(employeeId?: string | null) {
  return useQuery<LeaveBalance>({
    queryKey: ['leave-requests', 'balance', employeeId || 'my'],
    queryFn: async () => {
      const url = employeeId
        ? `/leave-requests/balance/${employeeId}`
        : '/leave-requests/balance';
      const { data } = await apiClient.get(url);
      return data.data || data;
    },
  });
}

// ─── Manager hooks (Story 9.2) ──────────────────────────────────────────────

export function usePendingLeaveRequests(departmentId?: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', 'pending', departmentId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (departmentId) params.departmentId = departmentId;
      const { data } = await apiClient.get('/leave-requests/pending', { params });
      return data.data || data;
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await apiClient.post(`/leave-requests/${requestId}/approve`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { requestId: string; reason: string }) => {
      const { data } = await apiClient.post(`/leave-requests/${params.requestId}/reject`, {
        reason: params.reason,
      });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}

export function useCoverageImpact(requestId: string | null) {
  return useQuery<CoverageImpact>({
    queryKey: ['leave-requests', 'coverage-impact', requestId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/leave-requests/${requestId}/coverage-impact`);
      return data.data || data;
    },
    enabled: !!requestId,
  });
}

export function useUndoLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await apiClient.post(`/leave-requests/${requestId}/undo`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}
