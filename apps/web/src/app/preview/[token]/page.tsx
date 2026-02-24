'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface PreviewShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  roleName?: string;
  roleColor?: string;
  roleShortCode?: string;
  locationName?: string;
}

interface PreviewSchedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  shifts: PreviewShift[];
}

interface PreviewData {
  employeeName: string;
  schedules: PreviewSchedule[];
}

type PageState = 'loading' | 'ok' | 'expired' | 'invalid';

export default function PreviewPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [data, setData] = useState<PreviewData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_URL}/schedules/preview/${token}`)
      .then((res) => {
        const result = res.data?.data || res.data;
        setData(result);
        setState('ok');
      })
      .catch((err) => {
        const msg = err.response?.data?.message || '';
        if (msg === 'EXPIRED_TOKEN' || err.response?.status === 400) {
          setState('expired');
        } else {
          setState('invalid');
        }
      });
  }, [token]);

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

  // Collect all shifts, filter to week
  const weekShifts = useMemo(() => {
    if (!data?.schedules?.length) return [];

    const allShifts: PreviewShift[] = [];
    for (const schedule of data.schedules) {
      for (const shift of schedule.shifts) {
        allShifts.push(shift);
      }
    }

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];

    return allShifts.filter((shift) => {
      const d = new Date(shift.date);
      return d >= weekStart && d <= weekEnd;
    });
  }, [data, weekDates]);

  // Group shifts by day
  const shiftsByDay = useMemo(() => {
    const map = new Map<string, PreviewShift[]>();
    for (const shift of weekShifts) {
      const dateKey = new Date(shift.date).toISOString().split('T')[0];
      const existing = map.get(dateKey) || [];
      existing.push(shift);
      map.set(dateKey, existing);
    }
    return map;
  }, [weekShifts]);

  const today = new Date().toISOString().split('T')[0];

  // Loading
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <p className="text-muted-foreground">Loading your schedule...</p>
      </div>
    );
  }

  // AC5: Expired or invalid token
  if (state === 'expired' || state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h1 className="text-xl font-semibold mb-2">
              {state === 'expired' ? 'Preview Link Expired' : 'Invalid Link'}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {state === 'expired'
                ? 'This preview link has expired. Contact your manager or create your account to view your schedule.'
                : 'This preview link is not valid. It may have been revoked or the URL is incorrect.'}
            </p>
            <a
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Your Account
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // AC2, AC3: Read-only schedule view
  return (
    <div className="min-h-screen bg-muted/50 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-4">
          <h1 className="text-2xl font-bold tracking-tight">Schedule Preview</h1>
          <p className="text-muted-foreground text-sm">
            {data?.employeeName ? `Shifts for ${data.employeeName}` : 'Your upcoming shifts'}
          </p>
          <Badge variant="outline" className="mt-2 text-xs">Read-only preview</Badge>
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

        {weekShifts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No shifts scheduled this week</p>
              <p className="text-xs text-muted-foreground mt-1">Use the arrows to check other weeks</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {weekDates.map((date, i) => {
              const dateKey = date.toISOString().split('T')[0];
              const shifts = shiftsByDay.get(dateKey) || [];
              const isToday = dateKey === today;

              return (
                <div key={dateKey}>
                  <div className={`flex items-center gap-2 mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="text-sm font-medium">{DAY_NAMES[i]}</span>
                    <span className="text-xs">
                      {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {isToday && <Badge variant="default" className="text-[10px] px-1.5 py-0">Today</Badge>}
                  </div>

                  {shifts.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground border-l-2 border-dashed border-muted ml-1">
                      No shifts
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shifts.map((shift) => (
                        <Card key={shift.id} className="overflow-hidden">
                          <div className="h-1.5 w-full" style={{ backgroundColor: shift.roleColor || '#6366f1' }} />
                          <CardContent className="py-3 px-4 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{shift.roleName || 'Shift'}</span>
                              {shift.roleShortCode && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {shift.roleShortCode}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                                {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {shift.locationName && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span>{shift.locationName}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer: prompt to register */}
        <div className="text-center pb-6">
          <p className="text-xs text-muted-foreground mb-2">
            Create your account to access all features
          </p>
          <a
            href="/set-password"
            className="text-xs text-primary hover:underline"
          >
            Set up your account
          </a>
        </div>
      </div>
    </div>
  );
}
