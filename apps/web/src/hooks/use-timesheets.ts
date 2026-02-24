'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';

export interface TimesheetFlag {
  type: 'HOURS_EXCEED_SHIFT' | 'NEGATIVE_HOURS' | 'MISSING_CLOCK_IN' | 'MISSING_CLOCK_OUT' | 'AUTO_CLOCK_OUT';
  message: string;
}

export interface TimesheetEntry {
  shiftId: string;
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string; email: string };
  role: { id: string; name: string; color: string | null; shortCode: string | null } | null;
  location: { id: string; name: string } | null;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledHours: number;
  clockIn: { timestamp: string; method: string } | null;
  clockOut: { timestamp: string; method: string } | null;
  grossHours: number | null;
  breakDeduction: number;
  netHours: number | null;
  isAdHoc: boolean;
  adjustedBy: string | null;
  flags: TimesheetFlag[];
  reviewedAt: string | null;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  reviewNote: string | null;
}

export interface TimesheetSummary {
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string; email: string };
  totalScheduledHours: number;
  totalGrossHours: number;
  totalBreakDeduction: number;
  totalNetHours: number;
  entries: TimesheetEntry[];
  flagCount: number;
  hasUnreviewedFlags: boolean;
}

export interface TimesheetResult {
  periodStart: string;
  periodEnd: string;
  departmentId: string | null;
  summaries: TimesheetSummary[];
  totals: {
    scheduledHours: number;
    grossHours: number;
    breakDeduction: number;
    netHours: number;
    shiftCount: number;
    flagCount: number;
  };
}

export function useTimesheets(from?: string, to?: string, options?: { employeeId?: string; departmentId?: string }) {
  return useQuery<TimesheetResult>({
    queryKey: ['timesheets', from, to, options?.employeeId, options?.departmentId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (options?.employeeId) params.employeeId = options.employeeId;
      if (options?.departmentId) params.departmentId = options.departmentId;
      const { data } = await apiClient.get('/timesheets', { params });
      return data.data || data;
    },
    enabled: !!from && !!to,
  });
}

export function useTeamTimesheets(from?: string, to?: string, departmentId?: string) {
  return useQuery<TimesheetResult>({
    queryKey: ['timesheets', 'team', from, to, departmentId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (departmentId) params.departmentId = departmentId;
      const { data } = await apiClient.get('/timesheets/team', { params });
      return data.data || data;
    },
    enabled: !!from && !!to,
  });
}

export function useMyTimesheet(from?: string, to?: string) {
  return useQuery<TimesheetSummary | null>({
    queryKey: ['timesheets', 'my', from, to],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await apiClient.get('/timesheets/my', { params });
      return data.data || data;
    },
    enabled: !!from && !!to,
  });
}

export function useReviewShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { shiftId: string; note?: string }) => {
      const { data } = await apiClient.post(`/timesheets/${params.shiftId}/review`, {
        note: params.note,
      });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

export function useReviewEmployeeShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { employeeId: string; from: string; to: string; note?: string }) => {
      const { data } = await apiClient.post('/timesheets/review-employee', params);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

// ─── Story 8.4: CSV Payroll Export ───────────────────────────────────────────

export interface CsvExportResult {
  filename: string;
  contentType: string;
  content: string;
}

export interface CsvExportError {
  error: 'UNREVIEWED_FLAGS';
  message: string;
  flagCount: number;
}

export function useExportCsv() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<CsvExportError | null>(null);

  const exportCsv = useCallback(async (params: { from: string; to: string; departmentId?: string }) => {
    setIsExporting(true);
    setExportError(null);

    try {
      const queryParams: Record<string, string> = {
        from: params.from,
        to: params.to,
      };
      if (params.departmentId) queryParams.departmentId = params.departmentId;

      const { data } = await apiClient.get('/timesheets/csv', { params: queryParams });
      const result = data.data || data;

      // AC2: Check for unreviewed flags blocking export
      if (result.error === 'UNREVIEWED_FLAGS') {
        setExportError(result as CsvExportError);
        return null;
      }

      // AC3: Trigger browser download with proper filename
      const csvResult = result as CsvExportResult;
      const blob = new Blob([csvResult.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = csvResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return csvResult;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Export failed';
      setExportError({
        error: 'UNREVIEWED_FLAGS',
        message: typeof msg === 'string' ? msg : 'Export failed',
        flagCount: 0,
      });
      return null;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const clearError = useCallback(() => setExportError(null), []);

  return { exportCsv, isExporting, exportError, clearError };
}
