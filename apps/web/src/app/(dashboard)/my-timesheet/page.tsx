'use client';

import { useState, useMemo } from 'react';
import { useMyTimesheet, TimesheetEntry, TimesheetFlag } from '@/hooks/use-timesheets';
import { useMyClockHistory } from '@/hooks/use-clock-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  ArrowDownUp,
} from 'lucide-react';

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

function FlagBadge({ flag }: { flag: TimesheetFlag }) {
  return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <AlertTriangle className="h-3 w-3" />
      {flag.message}
    </Badge>
  );
}

// ─── AC1: Timesheet Table ────────────────────────────────────────────────────

function TimesheetTable({ entries }: { entries: TimesheetEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No timesheet entries for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Shift</th>
            <th className="py-2 pr-4 font-medium">Clock In</th>
            <th className="py-2 pr-4 font-medium">Clock Out</th>
            <th className="py-2 pr-4 font-medium text-right">Gross</th>
            <th className="py-2 pr-4 font-medium text-right">Break</th>
            <th className="py-2 font-medium text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.shiftId} className="border-b last:border-0">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <span>{formatDate(entry.date)}</span>
                  {entry.isAdHoc && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      Ad Hoc
                    </Badge>
                  )}
                </div>
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {formatTime(entry.scheduledStart)} - {formatTime(entry.scheduledEnd)}
                {entry.role && (
                  <span className="ml-1" style={entry.role.color ? { color: entry.role.color } : undefined}>
                    ({entry.role.name})
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-4">
                {entry.clockIn ? (
                  <span>
                    {formatTime(entry.clockIn.timestamp)}
                    {entry.clockIn.method !== 'GPS' && (
                      <Badge variant={methodBadgeVariant(entry.clockIn.method)} className="ml-1 text-xs">
                        {methodLabel(entry.clockIn.method)}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-2.5 pr-4">
                {entry.clockOut ? (
                  <span>
                    {formatTime(entry.clockOut.timestamp)}
                    {entry.clockOut.method !== 'GPS' && (
                      <Badge variant={methodBadgeVariant(entry.clockOut.method)} className="ml-1 text-xs">
                        {methodLabel(entry.clockOut.method)}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono">{formatHours(entry.grossHours)}</td>
              <td className="py-2.5 pr-4 text-right font-mono text-muted-foreground">
                {entry.breakDeduction > 0 ? `-${entry.breakDeduction.toFixed(2)}h` : '—'}
              </td>
              <td className="py-2.5 text-right font-mono font-medium">{formatHours(entry.netHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Show flags below the table */}
      {entries.some((e) => e.flags.length > 0) && (
        <div className="mt-3 space-y-1">
          {entries.filter((e) => e.flags.length > 0).map((entry) => (
            <div key={entry.shiftId} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{formatDate(entry.date)}:</span>
              {entry.flags.map((flag, i) => (
                <FlagBadge key={i} flag={flag} />
              ))}
              {entry.adjustedBy && (
                <Badge variant="secondary" className="text-xs">
                  Adjusted by {entry.adjustedBy}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AC3/AC4: Clock History List ─────────────────────────────────────────────

function ClockHistoryList({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No clock events for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event: any) => {
        const isAdjustment = !!event.originalEvent;
        return (
          <div key={event.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className={`mt-0.5 rounded-full p-1.5 ${event.type === 'CLOCK_IN' ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Clock className={`h-3.5 w-3.5 ${event.type === 'CLOCK_IN' ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  Clock {event.type === 'CLOCK_IN' ? 'In' : 'Out'}
                </span>
                <Badge variant={methodBadgeVariant(event.method)} className="text-xs">
                  {methodLabel(event.method)}
                </Badge>
                {event.shift?.isAdHoc && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                    Unscheduled shift
                  </Badge>
                )}
                {isAdjustment && (
                  <Badge variant="secondary" className="text-xs">
                    Adjustment
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {formatDate(event.timestamp)} at {formatTime(event.timestamp)}
              </div>
              {event.shift && (
                <div className="text-xs text-muted-foreground">
                  Shift: {formatTime(event.shift.startTime)} - {formatTime(event.shift.endTime)}
                  {event.shift.role && (
                    <span style={event.shift.role.color ? { color: event.shift.role.color } : undefined}>
                      {' '}({event.shift.role.name})
                    </span>
                  )}
                  {event.shift.location && ` @ ${event.shift.location.name}`}
                </div>
              )}
              {/* AC4: Manager attribution */}
              {event.adjustedBy && (
                <div className="text-xs text-amber-700 mt-1">
                  Adjusted by {event.adjustedBy.firstName} {event.adjustedBy.lastName}
                  {event.reason && ` — "${event.reason}"`}
                </div>
              )}
              {event.notes && !event.adjustedBy && (
                <div className="text-xs text-muted-foreground mt-0.5">{event.notes}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MyTimesheetPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { from, to, label } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const { data: timesheet, isLoading: tsLoading } = useMyTimesheet(from, to);
  const { data: clockHistory, isLoading: chLoading } = useMyClockHistory(from, to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Timesheet</h1>
        <p className="text-muted-foreground">
          View your computed hours and clock event history
        </p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* AC2: Period summary */}
      {timesheet && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Scheduled</div>
              <div className="text-2xl font-bold">{timesheet.totalScheduledHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Gross Hours</div>
              <div className="text-2xl font-bold">{timesheet.totalGrossHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Breaks</div>
              <div className="text-2xl font-bold text-muted-foreground">
                {timesheet.totalBreakDeduction > 0 ? `-${timesheet.totalBreakDeduction.toFixed(1)}h` : '0h'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-sm text-muted-foreground">Net Hours</div>
              <div className="text-2xl font-bold text-primary">{timesheet.totalNetHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Flag alerts */}
      {timesheet && timesheet.flagCount > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">
            {timesheet.flagCount} timesheet {timesheet.flagCount === 1 ? 'entry' : 'entries'} flagged for review.
            Contact your manager if you believe there&apos;s an error.
          </span>
        </div>
      )}

      {/* Tabs: Timesheet / Clock History */}
      <Tabs defaultValue="timesheet">
        <TabsList>
          <TabsTrigger value="timesheet" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Timesheet
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <ArrowDownUp className="h-3.5 w-3.5" />
            Clock History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timesheet">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Hours Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tsLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading timesheet...</p>
              ) : timesheet ? (
                <TimesheetTable entries={timesheet.entries} />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No timesheet data for this period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Clock Event History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading history...</p>
              ) : clockHistory && clockHistory.length > 0 ? (
                <ClockHistoryList events={clockHistory} />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No clock events for this period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
