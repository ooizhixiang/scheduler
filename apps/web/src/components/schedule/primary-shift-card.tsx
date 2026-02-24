'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, Radio, WifiOff, AlertCircle, Ban, Loader2, RefreshCw } from 'lucide-react';

// 8 visual shift states (UX3, War Room Rec #4)
export type ShiftState =
  | 'UPCOMING'
  | 'CLOCK_IN_AVAILABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'LATE'
  | 'MISSED'
  | 'PENDING_SYNC'
  | 'SYNC_FAILED'
  | 'CANCELLED';

interface Coworker {
  id: string;
  firstName: string;
  lastName: string;
}

interface PrimaryShiftCardProps {
  shiftId: string;
  roleName: string;
  roleShortCode: string;
  roleColor: string;
  startTime: string;
  endTime: string;
  locationName?: string;
  notes?: string;
  coworkers: Coworker[];
  state: ShiftState;
  clockedIn?: boolean;
  clockedOut?: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  onClockIn?: (shiftId: string) => void;
  onClockOut?: (shiftId: string) => void;
  onRetry?: (shiftId: string) => void;
  isClockingIn?: boolean;
  isClockingOut?: boolean;
  isAdHoc?: boolean;
  clockError?: string;
  gpsGuidance?: string[];
}

const STATE_CONFIG: Record<ShiftState, { label: string; color: string; bgClass: string; icon?: React.ElementType }> = {
  UPCOMING:           { label: 'Upcoming',       color: 'text-blue-600',    bgClass: 'bg-blue-50' },
  CLOCK_IN_AVAILABLE: { label: 'Clock In Now',   color: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  IN_PROGRESS:        { label: 'In Progress',    color: 'text-green-600',   bgClass: 'bg-green-50',  icon: Radio },
  COMPLETED:          { label: 'Completed',      color: 'text-gray-500',    bgClass: 'bg-gray-50' },
  LATE:               { label: 'Late',           color: 'text-orange-600',  bgClass: 'bg-orange-50', icon: AlertCircle },
  MISSED:             { label: 'Missed',         color: 'text-red-600',     bgClass: 'bg-red-50',    icon: AlertCircle },
  PENDING_SYNC:       { label: 'Pending Sync',   color: 'text-yellow-600',  bgClass: 'bg-yellow-50', icon: WifiOff },
  SYNC_FAILED:        { label: 'Sync Failed',    color: 'text-red-600',     bgClass: 'bg-red-50',    icon: WifiOff },
  CANCELLED:          { label: 'Cancelled',      color: 'text-gray-400',    bgClass: 'bg-gray-50',   icon: Ban },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function computeHours(startTime: string, endTime: string): string {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  return (ms / (1000 * 60 * 60)).toFixed(1);
}

function formatElapsed(clockInTime: string): string {
  const elapsed = Date.now() - new Date(clockInTime).getTime();
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function PrimaryShiftCard({
  shiftId,
  roleName,
  roleShortCode,
  roleColor,
  startTime,
  endTime,
  locationName,
  notes,
  coworkers,
  state,
  clockedIn,
  clockedOut,
  clockInTime,
  clockOutTime,
  onClockIn,
  onClockOut,
  isAdHoc,
  onRetry,
  isClockingIn,
  isClockingOut,
  clockError,
  gpsGuidance,
}: PrimaryShiftCardProps) {
  const cfg = STATE_CONFIG[state];
  const StateIcon = cfg.icon;
  const isInactive = state === 'COMPLETED' || state === 'CANCELLED' || state === 'MISSED';

  // AC4: Live elapsed time counter when clocked in
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!clockInTime || clockedOut) return;
    setElapsed(formatElapsed(clockInTime));
    const interval = setInterval(() => setElapsed(formatElapsed(clockInTime)), 30000);
    return () => clearInterval(interval);
  }, [clockInTime, clockedOut]);

  const showClockInButton = state === 'CLOCK_IN_AVAILABLE' && !clockedIn;
  const showClockOutButton = clockedIn && !clockedOut && (state === 'IN_PROGRESS' || state === 'CLOCK_IN_AVAILABLE');
  const showUpcomingStub = state === 'UPCOMING' && !clockedIn;

  return (
    <Card className={`overflow-hidden ${isInactive ? 'opacity-60' : ''}`}>
      {/* Role color bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: roleColor }} />

      <CardContent className="py-3 px-4 space-y-2">
        {/* AC2 (Story 6.5): Ad-hoc label */}
        {isAdHoc && (
          <div className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 rounded px-2 py-0.5 font-medium">
            <AlertCircle className="h-2.5 w-2.5" />
            Unscheduled shift
          </div>
        )}

        {/* Header: role + state badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{roleName}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {roleShortCode}
            </Badge>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color} ${cfg.bgClass} border-transparent`}>
            {StateIcon && <StateIcon className="h-2.5 w-2.5 mr-0.5" />}
            {cfg.label}
          </Badge>
        </div>

        {/* Time + duration */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {formatTime(startTime)} – {formatTime(endTime)}
          </span>
          <span className="text-xs">({computeHours(startTime, endTime)}h)</span>
        </div>

        {/* AC4: Elapsed time when clocked in */}
        {clockedIn && !clockedOut && elapsed && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            <span>Clocked in {elapsed} ago</span>
          </div>
        )}

        {/* Location */}
        {locationName && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{locationName}</span>
          </div>
        )}

        {/* Co-workers (FR12) */}
        {coworkers.length > 0 && (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Working with:{' '}
              {coworkers.map((c) => c.firstName).join(', ')}
            </span>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <p className="text-xs text-muted-foreground italic">{notes}</p>
        )}

        {/* Error display with GPS guidance (Story 6.3) */}
        {clockError && (
          <div className="text-xs bg-red-50 rounded px-3 py-2 space-y-1.5">
            <p className="text-red-600 font-medium">{clockError}</p>
            {gpsGuidance && gpsGuidance.length > 0 && (
              <ol className="text-red-500 list-decimal list-inside space-y-0.5">
                {gpsGuidance.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Clock-in/out CTA area (AC1, AC3, AC4) */}
        <div className="pt-2 border-t mt-2">
          {/* AC1 (Story 6.4): Pending sync indicator */}
          {state === 'PENDING_SYNC' && (
            <div className="flex items-center justify-center py-2 rounded-md bg-yellow-50 text-yellow-700 gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-medium">Saved offline — will sync when connected</span>
            </div>
          )}

          {/* AC5 (Story 6.4): Sync failed with retry */}
          {state === 'SYNC_FAILED' && (
            <div className="space-y-2">
              <div className="flex items-center justify-center py-2 rounded-md bg-red-50 text-red-600">
                <span className="text-xs font-medium">Sync failed — tap to retry</span>
              </div>
              <Button
                onClick={() => onRetry?.(shiftId)}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Sync
              </Button>
            </div>
          )}

          {showUpcomingStub && (
            <div className="flex items-center justify-center py-2 rounded-md bg-muted/50 text-muted-foreground">
              <span className="text-xs">Clock-in available when your shift starts</span>
            </div>
          )}

          {showClockInButton && (
            <Button
              onClick={() => onClockIn?.(shiftId)}
              disabled={isClockingIn}
              className="w-full h-14 text-base font-semibold bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
            >
              {isClockingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying Location...
                </>
              ) : (
                'Clock In'
              )}
            </Button>
          )}

          {showClockOutButton && (
            <Button
              onClick={() => onClockOut?.(shiftId)}
              disabled={isClockingOut}
              variant="outline"
              className="w-full h-14 text-base font-semibold"
            >
              {isClockingOut ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Clocking Out...
                </>
              ) : (
                'Clock Out'
              )}
            </Button>
          )}

          {clockedOut && (
            <div className="flex items-center justify-center py-2 rounded-md bg-green-50 text-green-600">
              <span className="text-xs font-medium">
                Shift complete
                {clockInTime && clockOutTime && (() => {
                  const ms = new Date(clockOutTime).getTime() - new Date(clockInTime).getTime();
                  const h = Math.floor(ms / 3600000);
                  const m = Math.floor((ms % 3600000) / 60000);
                  return ` — ${h}h ${m}m worked`;
                })()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const CLOCK_IN_WINDOW_MINUTES = 15;

/** Derive shift state from current time and clock events */
export function deriveShiftState(
  startTime: string,
  endTime: string,
  clockedIn?: boolean,
  clockedOut?: boolean,
): ShiftState {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const windowStart = start - CLOCK_IN_WINDOW_MINUTES * 60 * 1000;

  // Already clocked out → completed
  if (clockedOut) return 'COMPLETED';

  // Clocked in → in progress
  if (clockedIn) return 'IN_PROGRESS';

  // Before window → upcoming
  if (now < windowStart) return 'UPCOMING';

  // Within window or after start but before end → clock in available
  if (now >= windowStart && now < end) return 'CLOCK_IN_AVAILABLE';

  // Past end without clock in → completed
  return 'COMPLETED';
}
