'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAvailability, useSetAvailability } from '@/hooks/use-availability';
import { useEmployees } from '@/hooks/use-employees';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { Clock, Info } from 'lucide-react';

const DAYS = [
  { key: 'SUNDAY', label: 'Sunday' },
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
];

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

interface DayEntry {
  dayOfWeek: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

const DEFAULT_ENTRIES: DayEntry[] = DAYS.map((d) => ({
  dayOfWeek: d.key,
  isAvailable: true,
  startTime: '09:00',
  endTime: '17:00',
}));

export default function AvailabilityPage() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const isManager = employee?.systemRole && MANAGER_ROLES.includes(employee.systemRole);

  // Manager can select another employee to edit
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const targetEmployeeId = selectedEmployeeId || employee?.id;

  const { data: employeesData } = useEmployees({ pageSize: 100 });
  const employees = (employeesData?.items || employeesData || []).filter((e: any) => e.status === 'ACTIVE' || !e.status);

  const { data: availability, isLoading } = useAvailability(targetEmployeeId);
  const setAvailability = useSetAvailability();

  const [entries, setEntries] = useState<DayEntry[]>(DEFAULT_ENTRIES);
  const [hasExisting, setHasExisting] = useState(false);

  // Set default to own employee ID when loaded
  useEffect(() => {
    if (employee?.id && !selectedEmployeeId) {
      setSelectedEmployeeId(employee.id);
    }
  }, [employee?.id, selectedEmployeeId]);

  useEffect(() => {
    if (availability?.length) {
      setHasExisting(true);
      setEntries(
        DAYS.map((d) => {
          const existing = availability.find((a: any) => a.dayOfWeek === d.key);
          return existing
            ? {
                dayOfWeek: d.key,
                isAvailable: existing.isAvailable,
                startTime: existing.startTime || '09:00',
                endTime: existing.endTime || '17:00',
              }
            : { dayOfWeek: d.key, isAvailable: true, startTime: '09:00', endTime: '17:00' };
        }),
      );
    } else {
      setHasExisting(false);
      setEntries(DEFAULT_ENTRIES);
    }
  }, [availability]);

  const toggleDay = (index: number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, isAvailable: !e.isAvailable } : e)),
    );
  };

  const updateTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  };

  const handleSave = async () => {
    if (!targetEmployeeId) return;
    try {
      await setAvailability.mutateAsync({
        employeeId: targetEmployeeId,
        entries: entries.map((e) => ({
          dayOfWeek: e.dayOfWeek,
          isAvailable: e.isAvailable,
          startTime: e.isAvailable ? e.startTime : undefined,
          endTime: e.isAvailable ? e.endTime : undefined,
        })),
      });
      toast({ title: 'Availability saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const selectedEmployee = employees.find((e: any) => e.id === targetEmployeeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Availability</h1>
          <p className="text-muted-foreground">
            {isManager && selectedEmployeeId !== employee?.id
              ? `Editing availability for ${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`
              : 'Set your weekly availability preferences'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={setAvailability.isPending}>
          {setAvailability.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Manager: employee selector */}
      {isManager && employees.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Employee:</span>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                  {emp.id === employee?.id ? ' (You)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty state guidance (AC5) */}
      {!isLoading && !hasExisting && (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">No availability set yet</p>
              <p className="text-sm text-muted-foreground">
                Set your availability to let your manager know which days work best for you.
                Toggle days off and adjust your preferred hours, then click Save Changes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-3">
          {DAYS.map((day, index) => {
            const entry = entries[index];
            return (
              <Card key={day.key} className={!entry.isAvailable ? 'opacity-60' : ''}>
                <CardContent className="flex items-center gap-4 py-4">
                  <button
                    onClick={() => toggleDay(index)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      entry.isAvailable
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {day.label.slice(0, 2)}
                  </button>
                  <div className="flex-1">
                    <p className="font-medium">{day.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.isAvailable ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                  {entry.isAvailable && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => updateTime(index, 'startTime', e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => updateTime(index, 'endTime', e.target.value)}
                        className="w-28"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
