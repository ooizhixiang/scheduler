'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface AttendanceEntry {
  shiftId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    departmentId: string | null;
    department: { id: string; name: string } | null;
  };
  role: { id: string; name: string; color: string | null; shortCode: string | null } | null;
  location: { id: string; name: string } | null;
  shiftStart: string;
  shiftEnd: string;
  isAdHoc: boolean;
  clockIn: { id: string; timestamp: string; method: string } | null;
  clockOut: { id: string; timestamp: string; method: string } | null;
  status: 'ON_TIME' | 'LATE' | 'MISSING' | 'CLOCKED_OUT' | 'NOT_STARTED';
}

export interface TeamAttendanceData {
  date: string;
  departmentId: string | null;
  summary: {
    onTime: number;
    late: number;
    missing: number;
    clockedOut: number;
    notStarted: number;
    total: number;
  };
  entries: AttendanceEntry[];
  timestamp: string;
}

/** FR56/FR58: Team attendance with 30-second auto-refresh polling */
export function useTeamAttendance(departmentId?: string) {
  return useQuery<TeamAttendanceData>({
    queryKey: ['team-attendance', departmentId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (departmentId) params.departmentId = departmentId;
      const { data } = await apiClient.get('/clock-events/team/attendance', { params });
      return data.data || data;
    },
    refetchInterval: 30000, // AC5: 30-second polling
    refetchIntervalInBackground: false,
    staleTime: 15000,
  });
}
