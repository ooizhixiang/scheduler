'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSettings, useUpdateSettings, useNotificationPrefs, useUpdateNotificationPrefs } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { Check, Plus, Trash2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface BreakRule {
  minShiftHours: number;
  breakDurationMinutes: number;
  isPaid: boolean;
}

const NOTIFICATION_TYPES: { key: string; label: string; description: string; mandatory?: boolean }[] = [
  { key: 'SCHEDULE_PUBLISHED', label: 'Schedule Published', description: 'When a new schedule is published for your team', mandatory: true },
  { key: 'SCHEDULE_UNPUBLISHED', label: 'Schedule Unpublished', description: 'When a published schedule is retracted' },
  { key: 'SCHEDULE_AMENDED', label: 'Schedule Amended', description: 'When a published schedule is updated with changes' },
  { key: 'SCHEDULE_VIEW_REMINDER', label: 'Schedule View Reminder', description: 'Reminder to view a published schedule' },
  { key: 'ROLE_ASSIGNED', label: 'Role Assigned', description: 'When you are assigned a new role' },
  { key: 'ROLE_REMOVED', label: 'Role Removed', description: 'When a role is removed from you' },
  { key: 'DEPARTMENT_CHANGED', label: 'Department Changed', description: 'When your department assignment changes' },
  { key: 'GROUP_ADDED', label: 'Added to Group', description: 'When you are added to a group' },
  { key: 'GROUP_REMOVED', label: 'Removed from Group', description: 'When you are removed from a group' },
  { key: 'EMPLOYEE_ARCHIVED', label: 'Account Archived', description: 'When your account is archived' },
  { key: 'EMPLOYEE_REACTIVATED', label: 'Account Reactivated', description: 'When your account is reactivated' },
];

function NotificationsTab() {
  const { toast } = useToast();
  const { data: prefsData, isLoading } = useNotificationPrefs();
  const updatePrefs = useUpdateNotificationPrefs();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (prefsData?.preferences) {
      setPrefs(prefsData.preferences);
    }
  }, [prefsData]);

  const handleToggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await updatePrefs.mutateAsync(prefs);
      toast({ title: 'Notification preferences saved' });
    } catch {
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose which notifications you want to receive. Schedule published notifications are mandatory.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map((nt) => {
            const enabled = nt.mandatory ? true : (prefs[nt.key] !== false);
            return (
              <div key={nt.key} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{nt.label}</p>
                  <p className="text-xs text-muted-foreground">{nt.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={nt.mandatory}
                  onClick={() => !nt.mandatory && handleToggle(nt.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    enabled ? 'bg-primary' : 'bg-muted'
                  } ${nt.mandatory ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
        <Button onClick={handleSave} disabled={updatePrefs.isPending}>
          {updatePrefs.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const isSuperAdmin = employee?.systemRole === 'SUPER_ADMIN';

  const [form, setForm] = useState<Record<string, any>>({});
  const [breakRules, setBreakRules] = useState<BreakRule[]>([]);

  useEffect(() => {
    if (settings) {
      setForm(settings);
      setBreakRules(Array.isArray(settings.breakRules) ? settings.breakRules : []);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        companyName: form.companyName,
        timezone: form.timezone,
        workWeekStartDay: form.workWeekStartDay,
        defaultShiftDuration: form.defaultShiftDuration,
        maxOvertimeHoursPerWeek: form.maxOvertimeHoursPerWeek,
        scheduleVisibility: form.scheduleVisibility,
        schedulingCadence: form.schedulingCadence,
        customPeriodDays: form.schedulingCadence === 'CUSTOM' ? form.customPeriodDays : null,
        breakRules,
        publishDay: form.publishDay,
        midYearJoinPolicy: form.midYearJoinPolicy,
        annualLeaveDefaultDays: form.annualLeaveDefaultDays,
        sickLeaveDefaultDays: form.sickLeaveDefaultDays,
        leaveEscalationHours: form.leaveEscalationHours,
      });
      toast({ title: 'Settings saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const addBreakRule = () => {
    setBreakRules([...breakRules, { minShiftHours: 6, breakDurationMinutes: 30, isPaid: false }]);
  };

  const removeBreakRule = (index: number) => {
    setBreakRules(breakRules.filter((_, i) => i !== index));
  };

  const updateBreakRule = (index: number, field: keyof BreakRule, value: any) => {
    setBreakRules(breakRules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)));
  };

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin ? 'Configure company-wide settings and personal preferences' : 'View company settings and manage your preferences'}
        </p>
      </div>

      <Tabs defaultValue={isSuperAdmin ? 'schedule' : 'notifications'}>
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          {/* General schedule settings */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Core company and scheduling defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={form.companyName || ''}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={form.timezone || ''}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Week Start Day</Label>
                  <Select
                    value={String(form.workWeekStartDay ?? 1)}
                    onValueChange={(v) => setForm({ ...form, workWeekStartDay: parseInt(v) })}
                    disabled={!isSuperAdmin}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Shift Duration (hours)</Label>
                  <Input
                    type="number"
                    value={form.defaultShiftDuration || ''}
                    onChange={(e) => setForm({ ...form, defaultShiftDuration: parseFloat(e.target.value) })}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Overtime Hours/Week</Label>
                  <Input
                    type="number"
                    value={form.maxOvertimeHoursPerWeek || ''}
                    onChange={(e) => setForm({ ...form, maxOvertimeHoursPerWeek: parseFloat(e.target.value) })}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schedule Visibility</Label>
                  <Select
                    value={form.scheduleVisibility || 'SAME_DEPARTMENT'}
                    onValueChange={(v) => setForm({ ...form, scheduleVisibility: v })}
                    disabled={!isSuperAdmin}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWN_ONLY">Own Only</SelectItem>
                      <SelectItem value="SAME_DEPARTMENT">Same Department</SelectItem>
                      <SelectItem value="ALL">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling Cadence (FR67) */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Cadence</CardTitle>
              <CardDescription>How often you create schedules for your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {[
                  { value: 'WEEKLY', label: 'Weekly', desc: 'Create a new schedule every week' },
                  { value: 'BI_WEEKLY', label: 'Bi-weekly', desc: 'Create a new schedule every two weeks' },
                  { value: 'CUSTOM', label: 'Custom', desc: 'Set a custom period length' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => isSuperAdmin && setForm({ ...form, schedulingCadence: option.value })}
                    disabled={!isSuperAdmin}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      form.schedulingCadence === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    } ${!isSuperAdmin ? 'cursor-default' : ''}`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        form.schedulingCadence === option.value
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {form.schedulingCadence === option.value && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {form.schedulingCadence === 'CUSTOM' && (
                <div className="space-y-2 ml-7">
                  <Label>Period length (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={form.customPeriodDays || ''}
                    onChange={(e) => setForm({ ...form, customPeriodDays: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g. 10"
                    className="max-w-[200px]"
                    disabled={!isSuperAdmin}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Break Rules (FR68) */}
          <Card>
            <CardHeader>
              <CardTitle>Break Deduction Rules</CardTitle>
              <CardDescription>Automatic break deductions based on shift length, applied to future timesheets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {breakRules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No break rules configured.</p>
                  {isSuperAdmin && (
                    <Button variant="outline" size="sm" onClick={addBreakRule}>
                      <Plus className="h-4 w-4 mr-1" /> Add break rule
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {breakRules.map((rule, i) => (
                    <div key={i} className="flex items-end gap-3 rounded-lg border p-4">
                      <div className="space-y-2 flex-1">
                        <Label>For shifts over (hours)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          step={0.5}
                          value={rule.minShiftHours}
                          onChange={(e) => updateBreakRule(i, 'minShiftHours', parseFloat(e.target.value) || 0)}
                          disabled={!isSuperAdmin}
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label>Break duration (minutes)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={120}
                          step={5}
                          value={rule.breakDurationMinutes}
                          onChange={(e) => updateBreakRule(i, 'breakDurationMinutes', parseInt(e.target.value) || 0)}
                          disabled={!isSuperAdmin}
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label>Paid?</Label>
                        <Select
                          value={rule.isPaid ? 'paid' : 'unpaid'}
                          onValueChange={(v) => updateBreakRule(i, 'isPaid', v === 'paid')}
                          disabled={!isSuperAdmin}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => removeBreakRule(i)} className="shrink-0">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {isSuperAdmin && (
                    <Button variant="outline" size="sm" onClick={addBreakRule}>
                      <Plus className="h-4 w-4 mr-1" /> Add another rule
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Publish Day (FR69) */}
          <Card>
            <CardHeader>
              <CardTitle>Publish Day</CardTitle>
              <CardDescription>The day you usually publish schedules. Employees see this so they know when to expect their schedule.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => isSuperAdmin && setForm({ ...form, publishDay: i })}
                    disabled={!isSuperAdmin}
                    className={`rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                      form.publishDay === i
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    } ${!isSuperAdmin ? 'cursor-default' : ''}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save All Changes'}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Settings</CardTitle>
              <CardDescription>Configure employee defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mid-Year Join Policy</Label>
                  <Select
                    value={form.midYearJoinPolicy || 'PRORATED'}
                    onValueChange={(v) => setForm({ ...form, midYearJoinPolicy: v })}
                    disabled={!isSuperAdmin}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_ALLOCATION">Full Allocation</SelectItem>
                      <SelectItem value="PRORATED">Prorated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Annual Leave Default Days</Label>
                  <Input
                    type="number"
                    value={form.annualLeaveDefaultDays || ''}
                    onChange={(e) => setForm({ ...form, annualLeaveDefaultDays: parseInt(e.target.value) })}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sick Leave Default Days</Label>
                  <Input
                    type="number"
                    value={form.sickLeaveDefaultDays || ''}
                    onChange={(e) => setForm({ ...form, sickLeaveDefaultDays: parseInt(e.target.value) })}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leave Escalation Hours</Label>
                  <Input
                    type="number"
                    value={form.leaveEscalationHours || ''}
                    onChange={(e) => setForm({ ...form, leaveEscalationHours: parseInt(e.target.value) })}
                    placeholder="48"
                    disabled={!isSuperAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hours before pending leave requests escalate to Super Admin (default: 48)
                  </p>
                </div>
              </div>
              {isSuperAdmin && (
                <Button onClick={handleSave} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
