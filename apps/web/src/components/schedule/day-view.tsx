'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, CalendarOff } from 'lucide-react';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';

interface DayViewProps {
  schedule: any;
  conflicts: any[];
  selectedDate: string; // YYYY-MM-DD
}

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Assign lanes to overlapping shifts (greedy interval graph coloring)
function assignLanes(shifts: any[]): { shift: any; lane: number; totalLanes: number }[] {
  if (shifts.length === 0) return [];

  const sorted = [...shifts].sort((a, b) => {
    const aStart = new Date(a.startTime).getTime();
    const bStart = new Date(b.startTime).getTime();
    return aStart - bStart;
  });

  const lanes: number[][] = []; // lanes[i] = array of shift end times in lane i
  const assignments: { shift: any; lane: number }[] = [];

  for (const shift of sorted) {
    const start = new Date(shift.startTime).getTime();
    let assigned = false;
    for (let i = 0; i < lanes.length; i++) {
      const lastEnd = lanes[i][lanes[i].length - 1];
      if (start >= lastEnd) {
        lanes[i].push(new Date(shift.endTime).getTime());
        assignments.push({ shift, lane: i });
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      lanes.push([new Date(shift.endTime).getTime()]);
      assignments.push({ shift, lane: lanes.length - 1 });
    }
  }

  const totalLanes = lanes.length;
  return assignments.map((a) => ({ ...a, totalLanes }));
}

function getTimePosition(time: Date): number {
  const hours = time.getHours() + time.getMinutes() / 60;
  return (hours - START_HOUR) * HOUR_HEIGHT;
}

function getTimeHeight(start: Date, end: Date): number {
  const startH = start.getHours() + start.getMinutes() / 60;
  const endH = end.getHours() + end.getMinutes() / 60;
  return Math.max((endH - startH) * HOUR_HEIGHT, HOUR_HEIGHT / 4);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DayView({ schedule, conflicts, selectedDate }: DayViewProps) {
  // Filter shifts for selected date
  const dayShifts = useMemo(() => {
    return (schedule.shifts || []).filter((shift: any) => {
      const shiftDate = new Date(shift.date).toISOString().split('T')[0];
      return shiftDate === selectedDate;
    });
  }, [schedule.shifts, selectedDate]);

  // Group shifts by employee
  const employeeGroups = useMemo(() => {
    const map = new Map<string, { employee: any; shifts: any[] }>();
    for (const shift of dayShifts) {
      const emp = shift.employee;
      const existing = map.get(emp.id);
      if (existing) {
        existing.shifts.push(shift);
      } else {
        map.set(emp.id, { employee: emp, shifts: [shift] });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.employee.lastName}${a.employee.firstName}`.localeCompare(
        `${b.employee.lastName}${b.employee.firstName}`,
      ),
    );
  }, [dayShifts]);

  // Build conflict map
  const conflictMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const c of (conflicts || [])) {
      const existing = map.get(c.shiftId) || [];
      existing.push(c);
      map.set(c.shiftId, existing);
    }
    return map;
  }, [conflicts]);

  // Find the visible hour range from shifts (with padding)
  const visibleRange = useMemo(() => {
    if (dayShifts.length === 0) return { startHour: 7, endHour: 19 };
    let min = 24, max = 0;
    for (const shift of dayShifts) {
      const s = new Date(shift.startTime);
      const e = new Date(shift.endTime);
      min = Math.min(min, s.getHours());
      max = Math.max(max, e.getHours() + (e.getMinutes() > 0 ? 1 : 0));
    }
    return { startHour: Math.max(0, min - 1), endHour: Math.min(24, max + 1) };
  }, [dayShifts]);

  const hours = Array.from(
    { length: visibleRange.endHour - visibleRange.startHour },
    (_, i) => visibleRange.startHour + i,
  );

  const dayLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (dayShifts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-1">No shifts on {dayLabel}</p>
        <p className="text-sm">Switch to &ldquo;By Person&rdquo; view to add shifts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{dayLabel}</h3>

      <div className="overflow-auto border rounded-lg">
        <div className="relative" style={{ minHeight: hours.length * HOUR_HEIGHT + 20 }}>
          {/* Hour grid lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border/50"
              style={{ top: (hour - visibleRange.startHour) * HOUR_HEIGHT }}
            >
              <span className="absolute -top-2.5 left-2 text-[10px] text-muted-foreground bg-background px-1">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Employee columns */}
          <div
            className="relative ml-14"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${employeeGroups.length}, minmax(140px, 1fr))`,
              gap: '4px',
              minHeight: hours.length * HOUR_HEIGHT,
            }}
          >
            {employeeGroups.map(({ employee, shifts }) => {
              const laneAssignments = assignLanes(shifts);

              return (
                <div key={employee.id} className="relative">
                  {/* Employee header */}
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b pb-1 mb-1 px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium shrink-0">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </div>
                      <span className="text-xs font-medium truncate">
                        {employee.firstName} {employee.lastName}
                      </span>
                    </div>
                  </div>

                  {/* Shift blocks */}
                  {laneAssignments.map(({ shift, lane, totalLanes }) => {
                    const start = new Date(shift.startTime);
                    const end = new Date(shift.endTime);
                    const top = (start.getHours() + start.getMinutes() / 60 - visibleRange.startHour) * HOUR_HEIGHT;
                    const height = getTimeHeight(start, end);
                    const shiftConflicts = conflictMap.get(shift.id);
                    const widthPct = 100 / totalLanes;
                    const leftPct = lane * widthPct;

                    const block = (
                      <div
                        key={shift.id}
                        className="absolute rounded-md px-1.5 py-1 text-[10px] border overflow-hidden"
                        style={{
                          top: top + 24, // offset for employee header
                          height: Math.max(height, 28),
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: `${shift.role.color}20`,
                          borderColor: shift.role.color,
                          borderLeftWidth: '3px',
                        }}
                      >
                        <div className="font-semibold truncate" style={{ color: shift.role.color }}>
                          {shift.role.shortCode}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {formatTime(start)} – {formatTime(end)}
                        </div>
                        {shift.location && (
                          <div className="text-muted-foreground truncate text-[9px]">{shift.location.name}</div>
                        )}
                        {shiftConflicts && shiftConflicts.length > 0 && (
                          <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                            {shiftConflicts.map((c: any, i: number) => (
                              <span key={i}>
                                {c.type === 'OVERLAP' && <AlertTriangle className="h-2.5 w-2.5 text-yellow-500" />}
                                {c.type === 'HOURS_CAP' && <Clock className="h-2.5 w-2.5 text-orange-500" />}
                                {c.type === 'AVAILABILITY' && <CalendarOff className="h-2.5 w-2.5 text-red-400" />}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );

                    if (shiftConflicts && shiftConflicts.length > 0) {
                      return (
                        <TooltipProvider key={shift.id} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>{block}</TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[250px]">
                              <div className="space-y-1">
                                {shiftConflicts.map((c: any, i: number) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    {c.type === 'OVERLAP' && <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />}
                                    {c.type === 'HOURS_CAP' && <Clock className="h-3 w-3 text-orange-500 shrink-0" />}
                                    {c.type === 'AVAILABILITY' && <CalendarOff className="h-3 w-3 text-red-400 shrink-0" />}
                                    <span className="text-xs">{c.message}</span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return block;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
