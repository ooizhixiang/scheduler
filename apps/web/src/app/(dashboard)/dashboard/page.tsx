'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Calendar, Clock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEmployees } from '@/hooks/use-employees';
import { useSchedules } from '@/hooks/use-schedules';
import { useSettings } from '@/hooks/use-settings';
import { useTeamAttendance } from '@/hooks/use-team-attendance';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import Link from 'next/link';

function useRecentActivity() {
  return useQuery({
    queryKey: ['audit-logs', { pageSize: 5 }],
    queryFn: async () => {
      const { data } = await apiClient.get('/audit-logs', {
        params: { pageSize: 5 },
      });
      return data.data || data;
    },
  });
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'created',
    UPDATE: 'updated',
    DELETE: 'deleted',
    ARCHIVE: 'archived',
    REACTIVATE: 'reactivated',
    LOGIN: 'logged in',
    LOGOUT: 'logged out',
    PASSWORD_RESET: 'reset password',
    INVITE_SENT: 'sent invite',
    PUBLISH: 'published',
    UNPUBLISH: 'unpublished',
    COPY: 'copied',
  };
  return map[action] || action.toLowerCase();
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AttendanceMiniBoard() {
  const { data } = useTeamAttendance();
  const summary = data?.summary;

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50 animate-pulse mb-2" />
            <p className="text-sm text-muted-foreground">Loading attendance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allClear = summary && summary.late === 0 && summary.missing === 0 && summary.onTime > 0;

  return (
    <Link href="/attendance">
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Attendance Board</CardTitle>
          <Badge variant="outline" className="text-xs">
            {summary?.total || 0} shifts today
          </Badge>
        </CardHeader>
        <CardContent>
          {allClear ? (
            <div className="flex flex-col items-center py-3 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 mb-1" />
              <span className="text-sm font-medium text-green-700">
                All {(summary?.onTime || 0) + (summary?.clockedOut || 0)} Here
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{summary?.onTime || 0}</div>
                <div className="text-xs text-muted-foreground">On Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{summary?.late || 0}</div>
                <div className="text-xs text-muted-foreground">Late</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{summary?.missing || 0}</div>
                <div className="text-xs text-muted-foreground">Missing</div>
              </div>
            </div>
          )}
          {(summary?.missing || 0) > 0 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {summary!.missing} employee{summary!.missing > 1 ? 's' : ''} missing clock-in
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const isManager = employee?.systemRole === 'SUPER_ADMIN' || employee?.systemRole === 'ADMIN' || employee?.systemRole === 'MANAGER';

  const { data: settings } = useSettings();
  const { data: employeesData } = useEmployees({ pageSize: 1 });
  const { data: invitedData } = useEmployees({ pageSize: 1, status: 'INVITED' });
  const { data: schedules } = useSchedules();
  const { data: activityData } = useRecentActivity();

  // Redirect to setup wizard if not completed
  useEffect(() => {
    if (settings && !settings.setupComplete && employee?.systemRole === 'SUPER_ADMIN') {
      router.replace('/setup');
    }
  }, [settings, employee, router]);

  const activeSchedules = Array.isArray(schedules)
    ? schedules.filter((s: any) => s.status === 'PUBLISHED').length
    : 0;

  const stats = [
    {
      label: 'Team Size',
      value: employeesData?.total || 0,
      icon: Users,
      href: '/employees',
    },
    {
      label: 'Pending Invites',
      value: invitedData?.total || 0,
      icon: UserPlus,
      href: '/employees',
    },
    {
      label: 'Active Schedules',
      value: activeSchedules,
      icon: Calendar,
      href: '/schedules',
    },
  ];

  const activityItems = activityData?.items || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {employee?.firstName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityItems.length > 0 ? (
                <div className="space-y-3">
                  {activityItems.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 rounded-full bg-muted p-1.5">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">
                          {item.actor
                            ? `${item.actor.firstName} ${item.actor.lastName}`
                            : 'System'}{' '}
                          {formatAction(item.action)} {item.entityType.toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity yet. Actions like creating employees, publishing schedules,
                  and other changes will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isManager ? <AttendanceMiniBoard /> : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance Board</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Attendance tracking is available for managers.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Timesheet reports and payroll exports will be available here once
                attendance tracking is set up.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
