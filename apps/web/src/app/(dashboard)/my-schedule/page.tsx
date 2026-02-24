'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMySchedule, useRecordScheduleView } from '@/hooks/use-schedules';
import { useSettings } from '@/hooks/use-settings';
import { useClockIn, useClockOut, useAdHocClockIn, requestGpsPosition, GpsError, getGpsGuidance, useEventQueue, useRetryQueueEvent } from '@/hooks/use-clock-events';
import { useApprovedLeaves, LeaveReason } from '@/hooks/use-leave-requests';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useLocations } from '@/hooks/use-locations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, CalendarOff, Plus, Loader2, MapPin, Clock } from 'lucide-react';
import { PrimaryShiftCard, deriveShiftState, type ShiftState } from '@/components/schedule/primary-shift-card';
import { useToast } from '@/components/ui/toaster';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PUBLISH_DAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

export default function MySchedulePage() {
  const { employee } = useAuth();
  const { data: schedules, isLoading } = useMySchedule();
  const { data: settings } = useSettings();
  const { data: locations } = useLocations();
  const recordView = useRecordScheduleView();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const adHocClockIn = useAdHocClockIn();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const eventQueue = useEventQueue();
  const retryEvent = useRetryQueueEvent();

  const [weekOffset, setWeekOffset] = useState(0);

  // Reason labels for leave display
  const REASON_LABELS: Record<LeaveReason, string> = {
    SICK: 'Sick Leave', PERSONAL: 'Personal Leave', VACATION: 'Vacation', OTHER: 'Day Off',
  };
  const [clockingShiftId, setClockingShiftId] = useState<string | null>(null);
  const [clockError, setClockError] = useState<Record<string, string>>({});
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [gpsGuidance, setGpsGuidance] = useState<Record<string, string[]>>({});

  // Ad-hoc state
  const [showAdHocPanel, setShowAdHocPanel] = useState(false);
  const [adHocLocationId, setAdHocLocationId] = useState('');
  const [adHocLoading, setAdHocLoading] = useState(false);
  const [adHocError, setAdHocError] = useState('');

  // Record views for all returned schedules
  useEffect(() => {
    if (schedules?.length) {
      for (const schedule of schedules) {
        recordView.mutate(schedule.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules]);

  // Build current week date range (Monday-based)
  const weekDates = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  // AC2 (9.5): Fetch approved leaves for the current week
  const weekStartStr = weekDates[0]?.toISOString().split('T')[0];
  const weekEndStr = weekDates[6]?.toISOString().split('T')[0];
  const { data: approvedLeaves } = useApprovedLeaves(weekStartStr, weekEndStr, employee?.id);

  // Index approved leaves by dateKey
  const leavesByDay = useMemo(() => {
    const map = new Map<string, { reason: LeaveReason }>();
    for (const leave of (approvedLeaves || [])) {
      const dateKey = new Date(leave.date).toISOString().split('T')[0];
      map.set(dateKey, { reason: leave.reason });
    }
    return map;
  }, [approvedLeaves]);

  // Collect all shifts from all schedules, filter to current week
  const weekShifts = useMemo(() => {
    if (!schedules?.length) return [];

    const allShifts: any[] = [];
    for (const schedule of schedules) {
      for (const shift of schedule.shifts || []) {
        allShifts.push({ ...shift, scheduleName: schedule.name });
      }
    }

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];

    return allShifts.filter((shift) => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });
  }, [schedules, weekDates]);

  // Group shifts by day
  const shiftsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const shift of weekShifts) {
      const dateKey = new Date(shift.date).toISOString().split('T')[0];
      const existing = map.get(dateKey) || [];
      existing.push(shift);
      map.set(dateKey, existing);
    }
    return map;
  }, [weekShifts]);

  // AC1 (Story 6.4): Build queue status lookup per shift
  const queueByShift = useMemo(() => {
    const map = new Map<string, { status: string; eventId: string; error?: string }>();
    for (const entry of eventQueue) {
      if (entry.status === 'DONE') continue;
      map.set(entry.shiftId, {
        status: entry.status,
        eventId: entry.id,
        error: entry.error,
      });
    }
    return map;
  }, [eventQueue]);

  const today = new Date().toISOString().split('T')[0];
  const hasAnyShifts = schedules?.some((s: any) => s.shifts?.length > 0);
  const publishDayName = settings?.publishDay != null
    ? PUBLISH_DAY_NAMES[settings.publishDay]
    : null;

  // AC1 (Story 6.5): Show ad-hoc button when no shift scheduled now
  const hasActiveShiftNow = useMemo(() => {
    const now = Date.now();
    return weekShifts.some((shift) => {
      const start = new Date(shift.startTime).getTime();
      const end = new Date(shift.endTime).getTime();
      const windowStart = start - 15 * 60 * 1000;
      return now >= windowStart && now <= end;
    });
  }, [weekShifts]);

  // Clock-in handler
  const handleClockIn = useCallback(async (shiftId: string) => {
    setClockingShiftId(shiftId);
    setClockError((prev) => ({ ...prev, [shiftId]: '' }));
    setGpsGuidance((prev) => ({ ...prev, [shiftId]: [] }));

    try {
      let coords: { latitude: number; longitude: number } | undefined;
      try {
        coords = await requestGpsPosition();
      } catch (gpsErr) {
        if (!navigator.onLine) {
          coords = undefined;
        } else {
          throw gpsErr;
        }
      }

      await clockIn.mutateAsync({
        shiftId,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      setFailedAttempts((prev) => ({ ...prev, [shiftId]: 0 }));

      if (!navigator.onLine) {
        toast({ title: 'Clock-in saved offline', description: 'Will sync when connection returns' });
      } else {
        toast({ title: 'Clocked in successfully' });
      }
    } catch (err: any) {
      const attempts = (failedAttempts[shiftId] || 0) + 1;
      setFailedAttempts((prev) => ({ ...prev, [shiftId]: attempts }));

      let msg: string;
      let guidance: string[] = [];

      if (err instanceof GpsError) {
        msg = err.message;
        guidance = getGpsGuidance(err.code);
      } else if (err.response?.data?.message) {
        const data = err.response.data;
        msg = typeof data.message === 'string' ? data.message : data.message?.message || 'Clock-in failed';
      } else {
        msg = err.message || 'Clock-in failed';
      }

      if (attempts >= 3) {
        guidance = [
          ...guidance,
          'Still having trouble? Contact your manager to log a manual clock-in.',
        ];
      }

      setClockError((prev) => ({ ...prev, [shiftId]: msg }));
      setGpsGuidance((prev) => ({ ...prev, [shiftId]: guidance }));
      toast({ title: 'Clock-in failed', description: msg, variant: 'destructive' });
    } finally {
      setClockingShiftId(null);
    }
  }, [clockIn, toast, failedAttempts]);

  // Clock-out handler
  const handleClockOut = useCallback(async (shiftId: string) => {
    setClockingShiftId(shiftId);
    setClockError((prev) => ({ ...prev, [shiftId]: '' }));

    try {
      let coords: { latitude: number; longitude: number } | undefined;
      try {
        coords = await requestGpsPosition();
      } catch {
        // GPS not required for clock-out
      }
      await clockOut.mutateAsync({
        shiftId,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });

      if (!navigator.onLine) {
        toast({ title: 'Clock-out saved offline', description: 'Will sync when connection returns' });
      } else {
        toast({ title: 'Clocked out successfully' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Clock-out failed';
      setClockError((prev) => ({ ...prev, [shiftId]: msg }));
      toast({ title: 'Clock-out failed', description: msg, variant: 'destructive' });
    } finally {
      setClockingShiftId(null);
    }
  }, [clockOut, toast]);

  // Retry handler for sync-failed events
  const handleRetry = useCallback(async (shiftId: string) => {
    const queueEntry = queueByShift.get(shiftId);
    if (!queueEntry) return;
    setClockError((prev) => ({ ...prev, [shiftId]: '' }));
    await retryEvent(queueEntry.eventId);
  }, [queueByShift, retryEvent]);

  // AC2 (Story 6.5): Ad-hoc clock-in handler
  const handleAdHocClockIn = useCallback(async () => {
    setAdHocLoading(true);
    setAdHocError('');

    try {
      let coords: { latitude: number; longitude: number } | undefined;
      try {
        coords = await requestGpsPosition();
      } catch (gpsErr) {
        if (gpsErr instanceof GpsError) {
          setAdHocError(gpsErr.message);
          setAdHocLoading(false);
          return;
        }
      }

      await adHocClockIn.mutateAsync({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        locationId: adHocLocationId || undefined,
      });

      toast({ title: 'Ad-hoc clock-in successful', description: 'Unscheduled shift started. Your manager will be notified.' });
      setShowAdHocPanel(false);
      setAdHocLocationId('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Ad-hoc clock-in failed';
      const errorMsg = typeof msg === 'string' ? msg : msg?.message || 'Ad-hoc clock-in failed';
      setAdHocError(errorMsg);
      toast({ title: 'Ad-hoc clock-in failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setAdHocLoading(false);
    }
  }, [adHocClockIn, adHocLocationId, toast]);

  // Helper: extract clock state from shift's clock events
  function getClockState(shift: any) {
    const events = shift.clockEvents || [];
    const clockInEvent = events.find((e: any) => e.type === 'CLOCK_IN');
    const clockOutEvent = events.find((e: any) => e.type === 'CLOCK_OUT');
    return {
      clockedIn: !!clockInEvent,
      clockedOut: !!clockOutEvent,
      clockInTime: clockInEvent?.timestamp,
      clockOutTime: clockOutEvent?.timestamp,
    };
  }

  // Derive shift state with queue overlay
  function getEffectiveState(shift: any, baseState: ShiftState): ShiftState {
    const queueEntry = queueByShift.get(shift.id);
    if (!queueEntry) return baseState;

    if (queueEntry.status === 'PENDING' || queueEntry.status === 'FLUSHING') {
      return 'PENDING_SYNC';
    }
    if (queueEntry.status === 'FAILED') {
      return 'SYNC_FAILED';
    }
    return baseState;
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">Your upcoming shifts</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {weekDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {weekDates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* AC1 (Story 6.5): Ad-hoc clock-in button when no shift scheduled now */}
      {!isLoading && weekOffset === 0 && !hasActiveShiftNow && (
        <Card className="border-dashed">
          <CardContent className="py-3 px-4">
            {!showAdHocPanel ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAdHocPanel(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ad Hoc Clock-In
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  <span>Clock in for unscheduled shift</span>
                </div>

                {/* Optional location picker */}
                {locations && locations.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Location (optional)
                    </label>
                    <select
                      value={adHocLocationId}
                      onChange={(e) => setAdHocLocationId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">No specific location</option>
                      {locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {adHocError && (
                  <p className="text-xs text-red-600">{adHocError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowAdHocPanel(false); setAdHocError(''); }}
                    disabled={adHocLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
                    onClick={handleAdHocClockIn}
                    disabled={adHocLoading}
                  >
                    {adHocLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Clock In Now'
                    )}
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                  Your manager will be notified of this unscheduled clock-in
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !hasAnyShifts ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium">No schedule published yet</p>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {publishDayName
                ? `Your manager usually publishes on ${publishDayName}.`
                : 'Check back later for your upcoming shifts.'}
            </p>
          </CardContent>
        </Card>
      ) : weekShifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shifts scheduled this week</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the arrows to check other weeks
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {weekDates.map((date, i) => {
            const dateKey = date.toISOString().split('T')[0];
            const shifts = shiftsByDay.get(dateKey) || [];
            const isToday = dateKey === today;
            const leaveEntry = leavesByDay.get(dateKey);

            return (
              <div key={dateKey}>
                <div className={`flex items-center gap-2 mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  <span className="text-sm font-medium">{DAY_NAMES[i]}</span>
                  <span className="text-xs">
                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  {isToday && <Badge variant="default" className="text-[10px] px-1.5 py-0">Today</Badge>}
                </div>

                {/* AC2 (9.5): Day Off — Approved card */}
                {leaveEntry && (
                  <Card className="border-amber-200 bg-amber-50 mb-2">
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <div className="rounded-full bg-amber-100 p-2">
                        <CalendarOff className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          {REASON_LABELS[leaveEntry.reason] || 'Day Off'} — Approved
                        </p>
                        <p className="text-xs text-amber-700">You have an approved day off</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {shifts.length === 0 && !leaveEntry ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground border-l-2 border-dashed border-muted ml-1">
                    No shifts
                  </div>
                ) : shifts.length === 0 ? null : (
                  <div className="space-y-2">
                    {shifts.map((shift: any) => {
                      const { clockedIn, clockedOut, clockInTime, clockOutTime } = getClockState(shift);
                      const baseState = deriveShiftState(shift.startTime, shift.endTime, clockedIn, clockedOut);
                      const state = getEffectiveState(shift, baseState);
                      const queueEntry = queueByShift.get(shift.id);

                      return (
                        <PrimaryShiftCard
                          key={shift.id}
                          shiftId={shift.id}
                          roleName={shift.role?.name || 'Unknown'}
                          roleShortCode={shift.role?.shortCode || '??'}
                          roleColor={shift.role?.color || '#6366f1'}
                          startTime={shift.startTime}
                          endTime={shift.endTime}
                          locationName={shift.location?.name}
                          notes={shift.notes}
                          coworkers={shift.coworkers || []}
                          state={state}
                          clockedIn={clockedIn}
                          clockedOut={clockedOut}
                          clockInTime={clockInTime}
                          clockOutTime={clockOutTime}
                          isAdHoc={shift.isAdHoc}
                          onClockIn={handleClockIn}
                          onClockOut={handleClockOut}
                          onRetry={handleRetry}
                          isClockingIn={clockingShiftId === shift.id && clockIn.isPending}
                          isClockingOut={clockingShiftId === shift.id && clockOut.isPending}
                          clockError={clockError[shift.id] || queueEntry?.error}
                          gpsGuidance={gpsGuidance[shift.id]}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
