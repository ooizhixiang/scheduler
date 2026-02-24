'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

interface AuditLogParams {
  page?: number;
  pageSize?: number;
  entityType?: string;
  actorId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLogs(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/audit-logs', { params });
      return data.data || data;
    },
  });
}
