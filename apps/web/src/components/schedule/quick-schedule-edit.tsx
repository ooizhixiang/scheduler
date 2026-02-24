'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShiftPanel } from './shift-panel';
import { Plus, Clock, MapPin, AlertTriangle } from 'lucide-react';

interface QuickScheduleEditProps {
  schedule: any;
  conflicts: any[];
  employees: any[];
  roles: any[];
  locations: any[];
}

export function QuickScheduleEdit({
  schedule, conflicts, employees, roles, locations,
}: QuickScheduleEditProps) {
  const isDraft = schedule.status === 'DRAFT';

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date(schedule.startDate).toISOString().split('T')[0];
  });

  const [shiftPanelOpen, setShiftPanelOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);

  // Build date range for horizontal selector
  const dates = useMemo(() => {
    const result: { date: Date; key: string }[] = [];
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const current = new Date(start);
    while (current <= end) {
      result.push({
        date: new Date(current),
        key: current.toISOString().split('T')[0],
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [schedule.startDate, schedule.endDate]);

  // Filter shifts for selected date
  const dayShifts = useMemo(() => {
    return (schedule.shifts || [])
      .filter((shift: any) => {
        const shiftDate = new Date(shift.date).toISOString().split('T')[0];
        return shiftDate === selectedDate;
      })
      .sort((a: any, b: any) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
  }, [schedule.shifts, selectedDate]);

  // Build conflict map for indicators
  const conflictMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const c of conflicts || []) {
      const existing = map.get(c.shiftId) || [];
      existing.push(c);
      map.set(c.shiftId, existing);
    }
    return map;
  }, [conflicts]);

  const today = new Date().toISOString().split('T')[0];

  const handleTapShift = (shift: any) => {
    if (!isDraft) return;
    setEditingShift(shift);
    setShiftPanelOpen(true);
  };

  const handleAddShift = () => {
    setEditingShift(null);
    setShiftPanelOpen(true);
  };

  const dayLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Horizontal date selector */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 pb-2">
          {dates.map(({ date, key }) => {
            const isSelected = key === selectedDate;
            const isToday = key === today;
            const dayShiftCount = (schedule.shifts || []).filter(
              (s: any) => new Date(s.date).toISOString().split('T')[0] === key,
            ).length;

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={`flex flex-col items-center min-w-[56px] px-2 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <span className="text-[10px] uppercase">
                  {date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {date.getDate()}
                </span>
                {dayShiftCount > 0 && (
                  <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {dayShiftCount} shift{dayShiftCount !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day label + add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{dayLabel}</h3>
        {isDraft && (
          <Button size="sm" variant="outline" onClick={handleAddShift}>
            <Plus className="h-4 w-4 mr-1" />
            Add Shift
          </Button>
        )}
      </div>

      {/* Shift list */}
      {dayShifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-sm">No shifts on this day</p>
            {isDraft && (
              <Button variant="link" size="sm" onClick={handleAddShift} className="mt-1">
                Add a shift
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {dayShifts.map((shift: any) => {
            const startTime = new Date(shift.startTime);
            const endTime = new Date(shift.endTime);
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            const shiftConflicts = conflictMap.get(shift.id);

            return (
              <Card
                key={shift.id}
                className={isDraft ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
                onClick={() => handleTapShift(shift)}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: shift.role?.color || '#6366f1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {shift.employee?.firstName} {shift.employee?.lastName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{ borderColor: shift.role?.color, color: shift.role?.color }}
                        >
                          {shift.role?.shortCode}
                        </Badge>
                        {shiftConflicts && shiftConflicts.length > 0 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="text-xs">({hours.toFixed(1)}h)</span>
                        </span>
                        {shift.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {shift.location.name}
                          </span>
                        )}
                      </div>
                      {shift.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Shift panel — bottom sheet on mobile */}
      <ShiftPanel
        open={shiftPanelOpen}
        onOpenChange={setShiftPanelOpen}
        scheduleId={schedule.id}
        employees={employees}
        roles={roles}
        locations={locations}
        editingShift={editingShift}
        prefillDate={selectedDate}
        side="bottom"
      />
    </div>
  );
}
