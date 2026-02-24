'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useDepartments } from '@/hooks/use-departments';
import { useTeamAttendance, AttendanceEntry } from '@/hooks/use-team-attendance';
import { useCreateManualClockEvent } from '@/hooks/use-clock-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  LogOut,
  Timer,
  Users,
  RefreshCw,
  Phone,
  MessageSquare,
  ClipboardPlus,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';

type StatusFilter = 'ALL' | 'ON_TIME' | 'LATE' | 'MISSING' | 'CLOCKED_OUT' | 'NOT_STARTED';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  ON_TIME: { label: 'On Time', color: 'text-green-600', icon: CheckCircle2, badgeVariant: 'default' },
  LATE: { label: 'Late', color: 'text-amber-600', icon: Clock, badgeVariant: 'secondary' },
  MISSING: { label: 'Missing', color: 'text-red-600', icon: AlertTriangle, badgeVariant: 'destructive' },
  CLOCKED_OUT: { label: 'Clocked Out', color: 'text-gray-500', icon: LogOut, badgeVariant: 'outline' },
  NOT_STARTED: { label: 'Not Started', color: 'text-blue-500', icon: Timer, badgeVariant: 'outline' },
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge variant={config.badgeVariant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ─── AC5: Manual Clock-In Form (inline in SituationCard) ─────────────────────

function ManualClockInForm({ entry, onSuccess, onCancel }: {
  entry: AttendanceEntry;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [time, setTime] = useState(defaultTime);
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const createManual = useCreateManualClockEvent();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a reason for the manual clock-in.', variant: 'destructive' });
      return;
    }

    const today = new Date();
    const [h, m] = time.split(':').map(Number);
    today.setHours(h, m, 0, 0);

    try {
      await createManual.mutateAsync({
        employeeId: entry.employee.id,
        shiftId: entry.shiftId,
        type: 'CLOCK_IN',
        timestamp: today.toISOString(),
        reason: reason.trim(),
      });
      toast({ title: 'Manual clock-in logged', description: `Clock-in recorded for ${entry.employee.firstName}.` });
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to log clock-in';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Failed to log clock-in', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Log Manual Clock-In</div>
      <div className="grid gap-2 grid-cols-2">
        <div>
          <Label className="text-xs">Time</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Reason</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Forgot to clock in"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={createManual.isPending}>
          {createManual.isPending ? 'Logging...' : 'Log Clock-In'}
        </Button>
      </div>
    </div>
  );
}

// ─── Story 7.4: SituationCard (UX8) — inline drill-down ─────────────────────

function SituationCard({ entry, onRefresh }: { entry: AttendanceEntry; onRefresh: () => void }) {
  const [showManualForm, setShowManualForm] = useState(false);
  const router = useRouter();

  const shiftStart = new Date(entry.shiftStart);
  const shiftEnd = new Date(entry.shiftEnd);
  const now = new Date();

  // Compute lateness or shift progress
  const lateMinutes = entry.clockIn
    ? Math.max(0, Math.round((new Date(entry.clockIn.timestamp).getTime() - shiftStart.getTime()) / 60000))
    : 0;

  const missingMinutes = entry.status === 'MISSING'
    ? Math.round((now.getTime() - shiftStart.getTime()) / 60000)
    : 0;

  // AC4: Shift progress for on-time employees
  const shiftDuration = (shiftEnd.getTime() - shiftStart.getTime()) / 60000;
  const elapsed = Math.max(0, Math.min(shiftDuration, (now.getTime() - shiftStart.getTime()) / 60000));
  const progressPct = shiftDuration > 0 ? Math.round((elapsed / shiftDuration) * 100) : 0;

  const hasPhone = !!entry.employee.phone;

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-4 space-y-3" role="region" aria-label={`Details for ${entry.employee.firstName} ${entry.employee.lastName}`}>
      {/* Employee info header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {entry.employee.firstName[0]}{entry.employee.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{entry.employee.firstName} {entry.employee.lastName}</div>
          <div className="text-xs text-muted-foreground">{entry.employee.email}</div>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {/* Shift details */}
      <div className="grid gap-2 grid-cols-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatTime(entry.shiftStart)} - {formatTime(entry.shiftEnd)}</span>
        </div>
        {entry.role && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span style={entry.role.color ? { color: entry.role.color } : undefined}>{entry.role.name}</span>
          </div>
        )}
        {entry.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{entry.location.name}</span>
          </div>
        )}
        {entry.employee.department && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{entry.employee.department.name}</span>
          </div>
        )}
      </div>

      {/* Status-specific detail */}
      {entry.status === 'LATE' && entry.clockIn && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-sm">
          <span className="text-amber-700">
            Clocked in at {formatTime(entry.clockIn.timestamp)} — {formatDuration(lateMinutes)} late
          </span>
        </div>
      )}

      {entry.status === 'MISSING' && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm">
          <span className="text-red-700">
            No clock-in recorded. Shift started {formatDuration(missingMinutes)} ago.
          </span>
        </div>
      )}

      {entry.status === 'ON_TIME' && entry.clockIn && (
        <div className="space-y-1.5">
          <div className="text-sm text-muted-foreground">
            Clocked in at {formatTime(entry.clockIn.timestamp)}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{progressPct}%</span>
          </div>
        </div>
      )}

      {entry.status === 'CLOCKED_OUT' && entry.clockIn && entry.clockOut && (
        <div className="text-sm text-muted-foreground">
          In: {formatTime(entry.clockIn.timestamp)}
          {entry.clockIn.method === 'MANUAL' && ' (manual)'}
          {' '} | Out: {formatTime(entry.clockOut.timestamp)}
          {entry.clockOut.method === 'AUTO' && ' (auto)'}
          {entry.clockOut.method === 'MANUAL' && ' (manual)'}
        </div>
      )}

      {/* AC2/AC3: Action buttons */}
      <div className="flex items-center gap-2 pt-1 border-t">
        {/* Call */}
        {hasPhone ? (
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <a href={`tel:${entry.employee.phone}`}>
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => router.push(`/employees/${entry.employee.id}`)}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="text-xs">Add phone</span>
          </Button>
        )}

        {/* Text */}
        {hasPhone ? (
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <a href={`sms:${entry.employee.phone}`}>
              <MessageSquare className="h-3.5 w-3.5" />
              Text
            </a>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled>
            <MessageSquare className="h-3.5 w-3.5" />
            Text
          </Button>
        )}

        {/* AC5: Log Manual Clock-In (only for MISSING status) */}
        {entry.status === 'MISSING' && !showManualForm && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowManualForm(true)}
          >
            <ClipboardPlus className="h-3.5 w-3.5" />
            Log Clock-In
          </Button>
        )}

        {/* View profile */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 ml-auto"
          onClick={() => router.push(`/employees/${entry.employee.id}`)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Profile
        </Button>
      </div>

      {/* AC5: Manual clock-in form */}
      {showManualForm && (
        <ManualClockInForm
          entry={entry}
          onSuccess={() => {
            setShowManualForm(false);
            onRefresh();
          }}
          onCancel={() => setShowManualForm(false)}
        />
      )}
    </div>
  );
}

// ─── EmployeeRow with expand/collapse ────────────────────────────────────────

function EmployeeRow({ entry, isExpanded, onToggle, onRefresh }: {
  entry: AttendanceEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const initials = `${entry.employee.firstName[0]}${entry.employee.lastName[0]}`.toUpperCase();

  return (
    <div>
      <div
        onClick={onToggle}
        role="button"
        aria-expanded={isExpanded}
        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
      >
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {entry.employee.firstName} {entry.employee.lastName}
            </span>
            {entry.isAdHoc && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Ad Hoc
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {entry.role && (
              <span
                className="inline-flex items-center gap-1"
                style={entry.role.color ? { color: entry.role.color } : undefined}
              >
                {entry.role.name}
              </span>
            )}
            <span>{formatTime(entry.shiftStart)} - {formatTime(entry.shiftEnd)}</span>
            {entry.location && <span>@ {entry.location.name}</span>}
          </div>
          {entry.clockIn && (
            <div className="text-xs text-muted-foreground mt-0.5">
              In: {formatTime(entry.clockIn.timestamp)}
              {entry.clockIn.method === 'MANUAL' && ' (manual)'}
              {entry.clockOut && (
                <>
                  {' '}| Out: {formatTime(entry.clockOut.timestamp)}
                  {entry.clockOut.method === 'AUTO' && ' (auto)'}
                  {entry.clockOut.method === 'MANUAL' && ' (manual)'}
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={entry.status} />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {isExpanded && <SituationCard entry={entry} onRefresh={onRefresh} />}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function AllClearHero({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-green-100 p-4 mb-3">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-xl font-semibold text-green-700">
        All {count} Here
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        Everyone scheduled for today has clocked in on time.
      </p>
    </div>
  );
}

function renderEntries(
  entries: AttendanceEntry[],
  expandedId: string | null,
  onToggle: (id: string) => void,
  onRefresh: () => void,
) {
  return entries.map((entry) => (
    <EmployeeRow
      key={entry.shiftId}
      entry={entry}
      isExpanded={expandedId === entry.shiftId}
      onToggle={() => onToggle(entry.shiftId)}
      onRefresh={onRefresh}
    />
  ));
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { employee } = useAuth();
  const isAdmin = employee?.systemRole === 'SUPER_ADMIN' || employee?.systemRole === 'ADMIN';

  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: departments } = useDepartments();
  const { data, dataUpdatedAt, isRefetching, refetch } = useTeamAttendance(departmentId);

  const { toast } = useToast();

  // NFR35: Last-updated timestamp
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    : null;

  // NFR36: Stale data detection (>60s)
  const isStale = dataUpdatedAt ? (Date.now() - dataUpdatedAt > 60000) : false;

  const handleToggle = useCallback((shiftId: string) => {
    setExpandedId((prev) => prev === shiftId ? null : shiftId);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Filter entries by status
  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    if (statusFilter === 'ALL') return data.entries;
    return data.entries.filter((e) => e.status === statusFilter);
  }, [data?.entries, statusFilter]);

  // Group by status for column display
  const grouped = useMemo(() => {
    if (!data?.entries) return { onTime: [], late: [], missing: [], clockedOut: [], notStarted: [] };
    return {
      onTime: data.entries.filter((e) => e.status === 'ON_TIME'),
      late: data.entries.filter((e) => e.status === 'LATE'),
      missing: data.entries.filter((e) => e.status === 'MISSING'),
      clockedOut: data.entries.filter((e) => e.status === 'CLOCKED_OUT'),
      notStarted: data.entries.filter((e) => e.status === 'NOT_STARTED'),
    };
  }, [data?.entries]);

  // Adaptive layout threshold
  const activeCount = (data?.summary?.onTime || 0) + (data?.summary?.late || 0) + (data?.summary?.missing || 0);
  const useColumns = activeCount >= 8;

  const allClear = data && data.summary.late === 0 && data.summary.missing === 0 && data.summary.onTime > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Attendance</h1>
          <p className="text-muted-foreground">
            Real-time attendance status for today&apos;s shifts
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isStale && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Data may be outdated
            </Badge>
          )}
          {lastUpdated && (
            <span>Updated {lastUpdated}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {isAdmin && departments && departments.length > 0 && (
          <Select
            value={departmentId || 'all'}
            onValueChange={(v) => setDepartmentId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ON_TIME">On Time</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
            <SelectItem value="MISSING">Missing</SelectItem>
            <SelectItem value="CLOCKED_OUT">Clocked Out</SelectItem>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('ON_TIME')}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">On Time</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{data.summary.onTime}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('LATE')}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Late</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{data.summary.late}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('MISSING')}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Missing</span>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">{data.summary.missing}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('CLOCKED_OUT')}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Clocked Out</span>
                <LogOut className="h-4 w-4 text-gray-500" />
              </div>
              <div className="text-2xl font-bold text-gray-500">{data.summary.clockedOut}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('NOT_STARTED')}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Not Started</span>
                <Timer className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-500">{data.summary.notStarted}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Clear hero state */}
      {allClear && statusFilter === 'ALL' && (
        <Card>
          <CardContent className="p-0">
            <AllClearHero count={data!.summary.onTime + data!.summary.clockedOut} />
          </CardContent>
        </Card>
      )}

      {/* Main content: adaptive layout */}
      {data && !allClear && statusFilter === 'ALL' && useColumns ? (
        /* Three-column layout for 8+ active employees */
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Missing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.missing.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">None</p>
              ) : renderEntries(grouped.missing, expandedId, handleToggle, handleRefresh)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Late
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.late.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">None</p>
              ) : renderEntries(grouped.late, expandedId, handleToggle, handleRefresh)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> On Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.onTime.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">None</p>
              ) : renderEntries(grouped.onTime, expandedId, handleToggle, handleRefresh)}
            </CardContent>
          </Card>
        </div>
      ) : data && statusFilter !== 'ALL' ? (
        /* Filtered single list */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              {STATUS_CONFIG[statusFilter]?.label || 'Filtered'} ({filteredEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No employees with this status.
              </p>
            ) : renderEntries(filteredEntries, expandedId, handleToggle, handleRefresh)}
          </CardContent>
        </Card>
      ) : data && !allClear ? (
        /* Single list for <8 active employees */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Today&apos;s Shifts ({data.summary.total})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No shifts scheduled for today.
                </p>
              </div>
            ) : (
              renderEntries(
                [...data.entries].sort((a, b) => {
                  const order: Record<string, number> = { MISSING: 0, LATE: 1, ON_TIME: 2, NOT_STARTED: 3, CLOCKED_OUT: 4 };
                  return (order[a.status] ?? 5) - (order[b.status] ?? 5);
                }),
                expandedId,
                handleToggle,
                handleRefresh,
              )
            )}
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <RefreshCw className="h-6 w-6 text-muted-foreground/50 animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading attendance data...</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
