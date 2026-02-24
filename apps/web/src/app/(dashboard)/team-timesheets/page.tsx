'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDepartments } from '@/hooks/use-departments';
import {
  useTeamTimesheets,
  useReviewShift,
  useReviewEmployeeShifts,
  useExportCsv,
  TimesheetSummary,
  TimesheetEntry,
  TimesheetFlag,
} from '@/hooks/use-timesheets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Users,
  Clock,
  Shield,
  Download,
} from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekRange(offset: number): { from: string; to: string; label: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const from = monday.toISOString().split('T')[0];
  const to = sunday.toISOString().split('T')[0];

  const monthFmt = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const label = `${monthFmt(monday)} - ${monthFmt(sunday)}`;

  return { from, to, label };
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatHours(h: number | null): string {
  if (h === null) return '—';
  return `${h.toFixed(2)}h`;
}

function methodLabel(method: string): string {
  switch (method) {
    case 'GPS': return 'Self';
    case 'MANUAL': return 'Manager';
    case 'AUTO': return 'Auto';
    default: return method;
  }
}

function methodBadgeVariant(method: string): 'default' | 'secondary' | 'outline' {
  switch (method) {
    case 'GPS': return 'default';
    case 'MANUAL': return 'secondary';
    case 'AUTO': return 'outline';
    default: return 'outline';
  }
}

// ─── Flag Review Form ────────────────────────────────────────────────────────

function ReviewForm({ shiftId, onDone }: { shiftId: string; onDone: () => void }) {
  const [note, setNote] = useState('');
  const reviewMutation = useReviewShift();
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      await reviewMutation.mutateAsync({ shiftId, note: note.trim() || undefined });
      toast({ title: 'Flags reviewed', description: 'Entry marked as reviewed.' });
      onDone();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Review failed';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Review failed', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional review note..."
        className="h-7 text-xs flex-1"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={handleSubmit}
        disabled={reviewMutation.isPending}
      >
        <Shield className="h-3 w-3" />
        {reviewMutation.isPending ? 'Reviewing...' : 'Mark Reviewed'}
      </Button>
    </div>
  );
}

// ─── Flag Badge ──────────────────────────────────────────────────────────────

function FlagBadge({ flag }: { flag: TimesheetFlag }) {
  return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <AlertTriangle className="h-3 w-3" />
      {flag.message}
    </Badge>
  );
}

// ─── AC2: Employee Detail View (day-by-day breakdown with flag review) ──────

function EmployeeDetail({
  summary,
  from,
  to,
}: {
  summary: TimesheetSummary;
  from: string;
  to: string;
}) {
  const [reviewingShiftId, setReviewingShiftId] = useState<string | null>(null);
  const reviewAll = useReviewEmployeeShifts();
  const { toast } = useToast();

  const unreviewedFlaggedEntries = summary.entries.filter(
    (e) => e.flags.length > 0 && !e.reviewedAt,
  );

  const handleReviewAll = async () => {
    try {
      const result = await reviewAll.mutateAsync({
        employeeId: summary.employeeId,
        from,
        to,
      });
      toast({
        title: 'All flags reviewed',
        description: `${result.reviewed || 0} entries marked as reviewed.`,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Review failed';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Review failed', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      {/* Summary row */}
      <div className="grid gap-3 grid-cols-4 text-center">
        <div>
          <div className="text-xs text-muted-foreground">Scheduled</div>
          <div className="text-sm font-bold">{summary.totalScheduledHours.toFixed(1)}h</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Gross</div>
          <div className="text-sm font-bold">{summary.totalGrossHours.toFixed(1)}h</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Breaks</div>
          <div className="text-sm font-bold text-muted-foreground">
            {summary.totalBreakDeduction > 0 ? `-${summary.totalBreakDeduction.toFixed(1)}h` : '0h'}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Net</div>
          <div className="text-sm font-bold text-primary">{summary.totalNetHours.toFixed(1)}h</div>
        </div>
      </div>

      {/* Batch review button */}
      {unreviewedFlaggedEntries.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={handleReviewAll}
          disabled={reviewAll.isPending}
        >
          <Shield className="h-3.5 w-3.5" />
          {reviewAll.isPending
            ? 'Reviewing...'
            : `Review All ${unreviewedFlaggedEntries.length} Flagged Entries`}
        </Button>
      )}

      {/* Day-by-day table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Date</th>
              <th className="py-1.5 pr-3 font-medium">Shift</th>
              <th className="py-1.5 pr-3 font-medium">Clock In</th>
              <th className="py-1.5 pr-3 font-medium">Clock Out</th>
              <th className="py-1.5 pr-3 font-medium text-right">Gross</th>
              <th className="py-1.5 pr-3 font-medium text-right">Break</th>
              <th className="py-1.5 pr-3 font-medium text-right">Net</th>
              <th className="py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.entries.map((entry) => {
              const hasFlagsUnreviewed = entry.flags.length > 0 && !entry.reviewedAt;
              return (
                <tr
                  key={entry.shiftId}
                  className={`border-b last:border-0 ${hasFlagsUnreviewed ? 'bg-amber-50/50' : ''}`}
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <span>{formatDate(entry.date)}</span>
                      {entry.isAdHoc && (
                        <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300 px-1">
                          Ad Hoc
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {formatTime(entry.scheduledStart)} - {formatTime(entry.scheduledEnd)}
                    {entry.role && (
                      <span className="ml-1" style={entry.role.color ? { color: entry.role.color } : undefined}>
                        ({entry.role.name})
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {entry.clockIn ? (
                      <span>
                        {formatTime(entry.clockIn.timestamp)}
                        {entry.clockIn.method !== 'GPS' && (
                          <Badge variant={methodBadgeVariant(entry.clockIn.method)} className="ml-1 text-[10px] px-1">
                            {methodLabel(entry.clockIn.method)}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {entry.clockOut ? (
                      <span>
                        {formatTime(entry.clockOut.timestamp)}
                        {entry.clockOut.method !== 'GPS' && (
                          <Badge variant={methodBadgeVariant(entry.clockOut.method)} className="ml-1 text-[10px] px-1">
                            {methodLabel(entry.clockOut.method)}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{formatHours(entry.grossHours)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">
                    {entry.breakDeduction > 0 ? `-${entry.breakDeduction.toFixed(2)}h` : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono font-medium">{formatHours(entry.netHours)}</td>
                  <td className="py-2">
                    {entry.flags.length === 0 ? (
                      <Badge variant="outline" className="gap-1 text-[10px] text-green-600 border-green-300">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Clean
                      </Badge>
                    ) : entry.reviewedAt ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Shield className="h-2.5 w-2.5" />
                        Reviewed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Flagged
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Flags detail section with review */}
      {summary.entries.some((e) => e.flags.length > 0) && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flags</div>
          {summary.entries
            .filter((e) => e.flags.length > 0)
            .map((entry) => (
              <div key={entry.shiftId} className="rounded-md border p-2 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDate(entry.date)}:
                  </span>
                  {entry.flags.map((flag, i) => (
                    <FlagBadge key={i} flag={flag} />
                  ))}
                  {entry.adjustedBy && (
                    <Badge variant="secondary" className="text-xs">
                      Adjusted by {entry.adjustedBy}
                    </Badge>
                  )}
                  {entry.reviewedAt && entry.reviewedBy && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 gap-1">
                      <Shield className="h-2.5 w-2.5" />
                      Reviewed by {entry.reviewedBy.firstName} {entry.reviewedBy.lastName}
                      {entry.reviewNote && ` — "${entry.reviewNote}"`}
                    </Badge>
                  )}
                </div>
                {/* AC3: Inline review form for unreviewed flags */}
                {!entry.reviewedAt && (
                  reviewingShiftId === entry.shiftId ? (
                    <ReviewForm
                      shiftId={entry.shiftId}
                      onDone={() => setReviewingShiftId(null)}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => setReviewingShiftId(entry.shiftId)}
                    >
                      <Shield className="h-3 w-3" />
                      Review
                    </Button>
                  )
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── AC1: Employee Summary Row with expand/collapse ──────────────────────────

function EmployeeSummaryRow({
  summary,
  isExpanded,
  onToggle,
  from,
  to,
}: {
  summary: TimesheetSummary;
  isExpanded: boolean;
  onToggle: () => void;
  from: string;
  to: string;
}) {
  const status = summary.hasUnreviewedFlags ? 'Needs Review' : 'Clean';
  const initials = `${summary.employee.firstName[0]}${summary.employee.lastName[0]}`.toUpperCase();

  return (
    <div className="border-b last:border-0">
      <div
        onClick={onToggle}
        role="button"
        aria-expanded={isExpanded}
        className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-medium">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">
            {summary.employee.firstName} {summary.employee.lastName}
          </span>
        </div>
        <div className="text-sm font-mono text-right w-16">
          {summary.totalNetHours.toFixed(1)}h
        </div>
        <div className="w-20 text-center">
          {summary.flagCount > 0 ? (
            <Badge
              variant={summary.hasUnreviewedFlags ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {summary.flagCount} flag{summary.flagCount !== 1 ? 's' : ''}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="w-28 text-right">
          {status === 'Clean' ? (
            <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-300">
              <CheckCircle2 className="h-3 w-3" />
              Clean
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Needs Review
            </Badge>
          )}
        </div>
        <div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4">
          <EmployeeDetail summary={summary} from={from} to={to} />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TeamTimesheetsPage() {
  const { employee } = useAuth();
  const isAdmin = employee?.systemRole === 'SUPER_ADMIN' || employee?.systemRole === 'ADMIN';

  const [weekOffset, setWeekOffset] = useState(0);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLEAN' | 'NEEDS_REVIEW'>('ALL');

  const { from, to, label } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const { data: departments } = useDepartments();
  const { data: timesheets, isLoading } = useTeamTimesheets(from, to, departmentId);
  const { exportCsv, isExporting, exportError, clearError } = useExportCsv();
  const { toast } = useToast();

  const handleExport = async () => {
    clearError();
    const result = await exportCsv({ from, to, departmentId });
    if (result) {
      toast({ title: 'CSV exported', description: `Downloaded ${result.filename}` });
    }
  };

  const filteredSummaries = useMemo(() => {
    if (!timesheets?.summaries) return [];
    if (statusFilter === 'ALL') return timesheets.summaries;
    if (statusFilter === 'NEEDS_REVIEW') return timesheets.summaries.filter((s) => s.hasUnreviewedFlags);
    return timesheets.summaries.filter((s) => !s.hasUnreviewedFlags);
  }, [timesheets?.summaries, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Timesheets</h1>
          <p className="text-muted-foreground">
            Review employee hours and resolve flagged entries
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || !timesheets}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* AC5: Week navigation + AC4: Department filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm min-w-[180px] text-center">{label}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={weekOffset >= 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
            This Week
          </Button>
        )}

        <div className="flex-1" />

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
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Employees</SelectItem>
            <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
            <SelectItem value="CLEAN">Clean</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Period totals */}
      {timesheets && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Employees</div>
              <div className="text-2xl font-bold">{timesheets.summaries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Total Shifts</div>
              <div className="text-2xl font-bold">{timesheets.totals.shiftCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Total Net Hours</div>
              <div className="text-2xl font-bold text-primary">
                {timesheets.totals.netHours.toFixed(1)}h
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Flagged</div>
              <div className={`text-2xl font-bold ${timesheets.totals.flagCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {timesheets.totals.flagCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-2xl font-bold">
                {timesheets.summaries.some((s) => s.hasUnreviewedFlags) ? (
                  <span className="text-amber-600">Review</span>
                ) : (
                  <span className="text-green-600">Clear</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Flag alert banner */}
      {timesheets && timesheets.totals.flagCount > 0 && timesheets.summaries.some((s) => s.hasUnreviewedFlags) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">
            {timesheets.summaries.filter((s) => s.hasUnreviewedFlags).length} employee{' '}
            {timesheets.summaries.filter((s) => s.hasUnreviewedFlags).length === 1 ? 'timesheet has' : 'timesheets have'}{' '}
            flagged entries requiring review before payroll export.
          </span>
        </div>
      )}

      {/* AC2: Export blocked by unreviewed flags */}
      {exportError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span className="text-sm text-red-800 flex-1">{exportError.message}</span>
          <Button variant="ghost" size="sm" onClick={clearError} className="text-red-600 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Employee list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees ({filteredSummaries.length})
            </CardTitle>
            {/* Column headers */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="w-16 text-right">Hours</span>
              <span className="w-20 text-center">Flags</span>
              <span className="w-28 text-right">Status</span>
              <span className="w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading timesheets...</p>
          ) : filteredSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {timesheets?.summaries.length === 0
                  ? 'No timesheet data for this period.'
                  : 'No employees match the current filter.'}
              </p>
            </div>
          ) : (
            filteredSummaries.map((summary) => (
              <EmployeeSummaryRow
                key={summary.employeeId}
                summary={summary}
                isExpanded={expandedId === summary.employeeId}
                onToggle={() =>
                  setExpandedId((prev) =>
                    prev === summary.employeeId ? null : summary.employeeId,
                  )
                }
                from={from}
                to={to}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
