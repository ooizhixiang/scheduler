'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  useEmployee, useArchiveEmployee, useReactivateEmployee, useUpdateEmployee,
  useResendInvite, useAssignRoles, useEmployeeSessions, useRevokeSession, useRevokeAllSessions,
} from '@/hooks/use-employees';
import { useDepartments } from '@/hooks/use-departments';
import { useRoles } from '@/hooks/use-roles';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Archive, Monitor, Smartphone, Trash2, RefreshCw, Pencil, RotateCcw, Check, Settings2, Clock, Plus, AlertCircle } from 'lucide-react';
import { getInitials, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toaster';
import { useEmployeeClockHistory, useCreateManualClockEvent, useAdjustClockEvent } from '@/hooks/use-clock-events';

function parseUserAgent(ua?: string): { device: string; browser: string } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown' };
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const device = isMobile ? 'Mobile' : 'Desktop';
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  return { device, browser };
}

function SessionsTab({ employeeId }: { employeeId: string }) {
  const { toast } = useToast();
  const { data: sessions, isLoading } = useEmployeeSessions(employeeId);
  const revokeSession = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSession.mutateAsync({ employeeId, sessionId });
      toast({ title: 'Session revoked' });
    } catch {
      toast({ title: 'Failed to revoke session', variant: 'destructive' });
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAll.mutateAsync(employeeId);
      toast({ title: 'All sessions revoked' });
    } catch {
      toast({ title: 'Failed to revoke sessions', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Loading sessions...</p>;
  }

  const sessionList = sessions as any[] || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Active Sessions</CardTitle>
        {sessionList.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleRevokeAll} disabled={revokeAll.isPending}>
            Revoke All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sessionList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions</p>
        ) : (
          <div className="space-y-3">
            {sessionList.map((session: any) => {
              const { device, browser } = parseUserAgent(session.userAgent);
              const DeviceIcon = device === 'Mobile' ? Smartphone : Monitor;
              return (
                <div key={session.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{browser} on {device}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.ipAddress || 'Unknown IP'} &middot; Started {formatDate(session.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokeSession.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const updateEmployee = useUpdateEmployee();
  const { data: departments } = useDepartments();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    systemRole: 'EMPLOYEE',
    employmentType: 'FULL_TIME',
    departmentId: '',
    weeklyHoursCap: '' as string | number,
    hireDate: '',
  });

  useEffect(() => {
    if (employee && open) {
      setForm({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        phone: employee.phone || '',
        systemRole: employee.systemRole || 'EMPLOYEE',
        employmentType: employee.employmentType || 'FULL_TIME',
        departmentId: employee.department?.id || '',
        weeklyHoursCap: employee.weeklyHoursCap ?? '',
        hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
      });
    }
  }, [employee, open]);

  const handleSave = async () => {
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        systemRole: form.systemRole,
        employmentType: form.employmentType,
        departmentId: form.departmentId || null,
        weeklyHoursCap: form.weeklyHoursCap !== '' ? Number(form.weeklyHoursCap) : null,
        hireDate: form.hireDate || undefined,
      });
      onOpenChange(false);
      toast({ title: 'Employee updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to update', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update employee profile information.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>System Role</Label>
              <Select value={form.systemRole} onValueChange={(v) => setForm({ ...form, systemRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.departmentId || '_none'} onValueChange={(v) => setForm({ ...form, departmentId: v === '_none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {Array.isArray(departments) && departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weekly Hours Cap</Label>
              <Input
                type="number"
                min={0}
                max={168}
                value={form.weeklyHoursCap}
                onChange={(e) => setForm({ ...form, weeklyHoursCap: e.target.value })}
                placeholder="No limit"
              />
            </div>
            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignRolesDialog({
  employeeId,
  currentRoleIds,
  open,
  onOpenChange,
}: {
  employeeId: string;
  currentRoleIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: allRoles } = useRoles();
  const assignRoles = useAssignRoles();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelected(currentRoleIds);
    }
  }, [open, currentRoleIds]);

  const toggleRole = (roleId: string) => {
    setSelected((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    try {
      await assignRoles.mutateAsync({ employeeId, roleIds: selected });
      onOpenChange(false);
      toast({ title: 'Roles updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to assign roles', variant: 'destructive' });
    }
  };

  const rolesList = Array.isArray(allRoles) ? allRoles : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
          <DialogDescription>Select the roles for this employee. Click a role to toggle it.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {rolesList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles available. Create roles first.</p>
          ) : (
            <div className="space-y-2">
              {rolesList.map((role: any) => {
                const isSelected = selected.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`w-full flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" style={{ borderColor: role.color, color: role.color }}>
                      {role.shortCode}
                    </Badge>
                    {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={assignRoles.isPending}>
            {assignRoles.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClockHistoryTab({ employeeId }: { employeeId: string }) {
  const { toast } = useToast();
  const { data: events, isLoading } = useEmployeeClockHistory(employeeId);
  const createManual = useCreateManualClockEvent();
  const adjustEvent = useAdjustClockEvent();

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ shiftId: '', type: 'CLOCK_IN' as 'CLOCK_IN' | 'CLOCK_OUT', timestamp: '', reason: '', notes: '' });
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ timestamp: '', reason: '', notes: '' });

  const handleCreateManual = async () => {
    if (!manualForm.shiftId || !manualForm.timestamp || !manualForm.reason) {
      toast({ title: 'Fill in all required fields', variant: 'destructive' });
      return;
    }
    try {
      await createManual.mutateAsync({ ...manualForm, employeeId });
      toast({ title: 'Manual clock event created' });
      setShowManualForm(false);
      setManualForm({ shiftId: '', type: 'CLOCK_IN', timestamp: '', reason: '', notes: '' });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : msg?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleAdjust = async () => {
    if (!adjustingId || !adjustForm.timestamp || !adjustForm.reason) {
      toast({ title: 'Fill in all required fields', variant: 'destructive' });
      return;
    }
    try {
      await adjustEvent.mutateAsync({ eventId: adjustingId, ...adjustForm });
      toast({ title: 'Clock event adjusted' });
      setAdjustingId(null);
      setAdjustForm({ timestamp: '', reason: '', notes: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed', variant: 'destructive' });
    }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading clock history...</p>;

  const eventList = (events as any[]) || [];
  // Filter to only show "effective" events (latest adjustment or original if no adjustments)
  const effectiveEvents = eventList.filter((e: any) => !e.originalEventId || e.adjustments?.length === 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Clock Event History</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowManualForm(!showManualForm)}>
          <Plus className="mr-2 h-4 w-4" />Log Clock Event
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AC1: Manual clock event form */}
        {showManualForm && (
          <div className="border rounded-md p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Log Manual Clock Event</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Shift ID</Label>
                <Input
                  value={manualForm.shiftId}
                  onChange={(e) => setManualForm({ ...manualForm, shiftId: e.target.value })}
                  placeholder="Shift ID"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={manualForm.type} onValueChange={(v: any) => setManualForm({ ...manualForm, type: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLOCK_IN">Clock In</SelectItem>
                    <SelectItem value="CLOCK_OUT">Clock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Timestamp</Label>
              <Input
                type="datetime-local"
                value={manualForm.timestamp}
                onChange={(e) => setManualForm({ ...manualForm, timestamp: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <Input
                value={manualForm.reason}
                onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
                placeholder="e.g., GPS failure, forgot to clock in"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowManualForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateManual} disabled={createManual.isPending}>
                {createManual.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* AC3: Adjust form */}
        {adjustingId && (
          <div className="border rounded-md p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Adjust Clock Event</p>
            <div className="space-y-1">
              <Label className="text-xs">New Timestamp</Label>
              <Input
                type="datetime-local"
                value={adjustForm.timestamp}
                onChange={(e) => setAdjustForm({ ...adjustForm, timestamp: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <Input
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="Reason for adjustment"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdjustingId(null)}>Cancel</Button>
              <Button size="sm" onClick={handleAdjust} disabled={adjustEvent.isPending}>
                {adjustEvent.isPending ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </div>
        )}

        {/* AC4: Event list with attribution */}
        {effectiveEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clock events recorded</p>
        ) : (
          <div className="space-y-2">
            {effectiveEvents.map((event: any) => (
              <div key={event.id} className="flex items-start justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={event.type === 'CLOCK_IN' ? 'default' : 'secondary'} className="text-[10px]">
                      {event.type === 'CLOCK_IN' ? 'Clock In' : 'Clock Out'}
                    </Badge>
                    {event.method === 'MANUAL' && (
                      <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200">
                        Manual
                      </Badge>
                    )}
                    {event.isAdHoc && (
                      <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200">
                        Ad Hoc
                      </Badge>
                    )}
                    {event.shift?.role && (
                      <span className="text-[10px] text-muted-foreground">{event.shift.role.name}</span>
                    )}
                  </div>
                  <p className="text-sm">{formatTime(event.timestamp)}</p>
                  {event.shift?.location && (
                    <p className="text-xs text-muted-foreground">{event.shift.location.name}</p>
                  )}
                  {/* AC4: Attribution for manager adjustments */}
                  {event.adjustedBy && (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {event.originalEventId ? 'Adjusted' : 'Logged'} by {event.adjustedBy.firstName} {event.adjustedBy.lastName}
                    </p>
                  )}
                  {event.reason && (
                    <p className="text-xs text-muted-foreground italic">Reason: {event.reason}</p>
                  )}
                  {/* Show if this event has been superseded by an adjustment */}
                  {event.adjustments?.length > 0 && (
                    <p className="text-xs text-muted-foreground">Has {event.adjustments.length} adjustment(s)</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAdjustingId(event.id);
                    setAdjustForm({ timestamp: '', reason: '', notes: '' });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmployeeDetailPage() {
  useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const { data: employee, isLoading } = useEmployee(id);
  const archiveEmployee = useArchiveEmployee();
  const reactivateEmployee = useReactivateEmployee();
  const resendInvite = useResendInvite();
  const currentEmployee = useAuthStore((s) => s.employee);
  const isSuperAdmin = currentEmployee?.systemRole === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || currentEmployee?.systemRole === 'ADMIN';
  const [editOpen, setEditOpen] = useState(false);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground">Loading...</div>;
  }

  if (!employee) {
    return <div className="text-center py-10 text-muted-foreground">Employee not found</div>;
  }

  const handleArchive = async () => {
    try {
      await archiveEmployee.mutateAsync(id);
      toast({ title: 'Employee archived' });
      router.push('/employees');
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateEmployee.mutateAsync(id);
      toast({ title: 'Employee reactivated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />Back
      </Button>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h1>
            <p className="text-muted-foreground">{employee.email}</p>
            <div className="flex gap-2 mt-1">
              <Badge>{employee.status}</Badge>
              <Badge variant="outline">{employee.systemRole.replace('_', ' ')}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && employee.status !== 'ARCHIVED' && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </Button>
          )}
          {employee.status === 'INVITED' && isAdmin && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await resendInvite.mutateAsync(id);
                  toast({ title: 'Invitation resent' });
                } catch (err: any) {
                  toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
                }
              }}
              disabled={resendInvite.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />Resend Invite
            </Button>
          )}
          {employee.status === 'ARCHIVED' && isAdmin && (
            <Button variant="outline" onClick={handleReactivate} disabled={reactivateEmployee.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />Reactivate
            </Button>
          )}
          {employee.status !== 'ARCHIVED' && isAdmin && (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />Archive
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          {(isAdmin || currentEmployee?.systemRole === 'MANAGER') && (
            <TabsTrigger value="clock-history">Clock History</TabsTrigger>
          )}
          {isSuperAdmin && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employment Type</p>
                  <p className="font-medium">{employee.employmentType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{employee.department?.name || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{employee.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hire Date</p>
                  <p className="font-medium">{employee.hireDate ? formatDate(employee.hireDate) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Hours Cap</p>
                  <p className="font-medium">{employee.weeklyHoursCap ?? 'No limit'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">{employee.lastLoginAt ? formatDate(employee.lastLoginAt) : 'Never'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Assigned Roles</CardTitle>
              {isAdmin && employee.status !== 'ARCHIVED' && (
                <Button variant="outline" size="sm" onClick={() => setRolesDialogOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />Manage Roles
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {employee.employeeRoles?.length ? (
                <div className="flex flex-wrap gap-2">
                  {employee.employeeRoles.map((er: any) => (
                    <Badge
                      key={er.role.id}
                      variant="outline"
                      className="px-3 py-1"
                      style={{ borderColor: er.role.color, color: er.role.color }}
                    >
                      {er.role.icon && <span className="mr-1">{er.role.icon}</span>}
                      {er.role.name} ({er.role.shortCode})
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader><CardTitle className="text-lg">Groups</CardTitle></CardHeader>
            <CardContent>
              {employee.groupMembers?.length ? (
                <div className="flex flex-wrap gap-2">
                  {employee.groupMembers.map((gm: any) => (
                    <Badge key={gm.group.id} variant="secondary">{gm.group.name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not a member of any groups</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(isAdmin || currentEmployee?.systemRole === 'MANAGER') && (
          <TabsContent value="clock-history">
            <ClockHistoryTab employeeId={id} />
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="sessions">
            <SessionsTab employeeId={id} />
          </TabsContent>
        )}
      </Tabs>

      {isAdmin && <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} />}
      {isAdmin && (
        <AssignRolesDialog
          employeeId={id}
          currentRoleIds={employee.employeeRoles?.map((er: any) => er.role.id) || []}
          open={rolesDialogOpen}
          onOpenChange={setRolesDialogOpen}
        />
      )}
    </div>
  );
}
