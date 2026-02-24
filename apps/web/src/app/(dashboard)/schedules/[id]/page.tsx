'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import {
  useSchedule, usePublishSchedule, useUnpublishSchedule, useCopySchedule,
  useScheduleConflicts, useScheduleViews, useSendReminder,
  useScheduleAmendments, usePublishAmendments,
} from '@/hooks/use-schedules';
import { useRoles } from '@/hooks/use-roles';
import { useLocations } from '@/hooks/use-locations';
import { useEmployees } from '@/hooks/use-employees';
import { useCreateBulkShifts, useDeleteShift } from '@/hooks/use-shifts';
import { useSettings } from '@/hooks/use-settings';
import { useApprovedLeaves } from '@/hooks/use-leave-requests';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ScheduleGrid, PaintedCell } from '@/components/schedule/schedule-grid';
import { ScheduleToolbar, ViewMode } from '@/components/schedule/schedule-toolbar';
import { DayView } from '@/components/schedule/day-view';
import { QuickScheduleEdit } from '@/components/schedule/quick-schedule-edit';
import { ShiftPanel } from '@/components/schedule/shift-panel';
import { DiffPreview } from '@/components/schedule/diff-preview';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toaster';
import { useScheduleBuilderStore } from '@/stores/schedule-builder-store';
import { ArrowLeft, AlertTriangle, Eye, Check, Clock, Send } from 'lucide-react';

const MOBILE_BREAKPOINT = 768;
const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function subscribeToResize(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}
function getIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
}
function getServerSnapshot() {
  return false; // SSR: assume desktop
}

export default function ScheduleBuilderPage() {
  const { employee } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const isMobile = useSyncExternalStore(subscribeToResize, getIsMobile, getServerSnapshot);

  // Mobile redirect: employees go to /my-schedule, managers get QuickScheduleEdit
  useEffect(() => {
    if (isMobile && employee?.systemRole && !MANAGER_ROLES.includes(employee.systemRole)) {
      router.replace('/my-schedule');
    }
  }, [isMobile, employee?.systemRole, router]);

  const { data: schedule, isLoading } = useSchedule(id);
  const { data: conflicts } = useScheduleConflicts(id);
  const { data: viewStatus } = useScheduleViews(id);
  const { data: roles } = useRoles();
  const { data: locations } = useLocations();
  const { data: employeesData } = useEmployees({ pageSize: 100 });
  const { data: settings } = useSettings();

  // AC1 (9.5): Fetch approved leaves for the schedule date range
  const scheduleStartDate = schedule?.startDate ? new Date(schedule.startDate).toISOString().split('T')[0] : undefined;
  const scheduleEndDate = schedule?.endDate ? new Date(schedule.endDate).toISOString().split('T')[0] : undefined;
  const { data: approvedLeaves } = useApprovedLeaves(scheduleStartDate, scheduleEndDate);

  const queryClient = useQueryClient();
  const publishSchedule = usePublishSchedule();
  const unpublishSchedule = useUnpublishSchedule();
  const copySchedule = useCopySchedule();
  const createBulkShifts = useCreateBulkShifts();
  const deleteShift = useDeleteShift();
  const sendReminder = useSendReminder();
  const publishAmendments = usePublishAmendments();

  const [shiftPanelOpen, setShiftPanelOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyForm, setCopyForm] = useState({ name: '', startDate: '', endDate: '' });
  const [diffPreviewOpen, setDiffPreviewOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [prefillEmployeeId, setPrefillEmployeeId] = useState('');
  const [prefillDate, setPrefillDate] = useState('');
  const [conflictPanelOpen, setConflictPanelOpen] = useState(false);
  const [viewPanelOpen, setViewPanelOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [lastClickedShift, setLastClickedShift] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('BY_PERSON');
  const [selectedDate, setSelectedDate] = useState('');

  const allEmployeesList = employeesData?.items || employeesData || [];
  const employees = allEmployeesList.filter((e: any) => e.status === 'ACTIVE' || !e.status);

  // Initialize selectedDate to schedule start date
  useEffect(() => {
    if (schedule?.startDate && !selectedDate) {
      setSelectedDate(new Date(schedule.startDate).toISOString().split('T')[0]);
    }
  }, [schedule?.startDate, selectedDate]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (mode === 'BY_DAY' && selectedRole) {
      setSelectedRole(null); // Exit paint mode when switching to By Day
    }
    setViewMode(mode);
  }, [selectedRole]);

  // Zustand store for undo/redo + localStorage persistence
  const initSchedule = useScheduleBuilderStore((s) => s.initSchedule);
  const storeUndo = useScheduleBuilderStore((s) => s.undo);
  const storeRedo = useScheduleBuilderStore((s) => s.redo);
  const canUndo = useScheduleBuilderStore((s) => s.canUndo);
  const canRedo = useScheduleBuilderStore((s) => s.canRedo);

  useEffect(() => {
    if (schedule?.id && schedule.shifts) {
      initSchedule(schedule.id, schedule.shifts);
    }
  }, [schedule?.id, schedule?.shifts, initSchedule]);

  // Undo handler — reverts local store state and refreshes from server
  const handleUndo = useCallback(() => {
    if (!canUndo()) return;
    storeUndo();
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    toast({ title: 'Undone' });
  }, [canUndo, storeUndo, queryClient, toast]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (!canRedo()) return;
    storeRedo();
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    toast({ title: 'Redone' });
  }, [canRedo, storeRedo, queryClient, toast]);

  // Delete last-clicked shift via keyboard
  const handleDeleteKey = useCallback(async () => {
    if (!lastClickedShift || schedule?.status !== 'DRAFT') return;
    try {
      await deleteShift.mutateAsync({ scheduleId: id, id: lastClickedShift.id });
      toast({ title: 'Shift deleted' });
      setLastClickedShift(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  }, [lastClickedShift, schedule?.status, id, deleteShift, toast]);

  // Ctrl+S — changes are auto-saved via mutations, just confirm
  const handleSave = useCallback(() => {
    toast({ title: 'All changes saved', description: 'Shifts are automatically saved to the server.' });
  }, [toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Escape — close panels, exit paint mode
      if (e.key === 'Escape') {
        if (shiftPanelOpen) return; // ShiftPanel handles its own Escape
        if (conflictPanelOpen) { setConflictPanelOpen(false); return; }
        if (viewPanelOpen) { setViewPanelOpen(false); return; }
        if (selectedRole) { setSelectedRole(null); return; }
      }

      // Ctrl+Z — Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z — Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+S — Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Delete / Backspace — delete last-clicked shift
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (lastClickedShift && !shiftPanelOpen) {
          e.preventDefault();
          handleDeleteKey();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRole, shiftPanelOpen, conflictPanelOpen, viewPanelOpen, lastClickedShift, handleUndo, handleRedo, handleSave, handleDeleteKey]);

  const handleClickEmpty = (employeeId: string, date: string) => {
    setEditingShift(null);
    setPrefillEmployeeId(employeeId);
    setPrefillDate(date);
    setShiftPanelOpen(true);
  };

  const handleClickShift = (shift: any) => {
    setLastClickedShift(shift);
    setEditingShift(shift);
    setShiftPanelOpen(true);
  };

  // Paint mode: bulk create shifts
  const handlePaintComplete = useCallback(async (cells: PaintedCell[]) => {
    if (!selectedRole || cells.length === 0) return;

    // Default shift times: use settings duration (default 8h) starting at 09:00
    const duration = settings?.defaultShiftDuration || 8;
    const defaultStart = '09:00';
    const startHour = 9;
    const endHour = startHour + duration;
    const endMinutes = endHour >= 24 ? 0 : 0;
    const endHourClamped = endHour >= 24 ? 23 : endHour;
    const defaultEnd = `${String(endHourClamped).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    const shifts = cells.map((cell) => {
      const startTimeISO = new Date(`${cell.date}T${defaultStart}:00`).toISOString();
      const endTimeISO = new Date(`${cell.date}T${defaultEnd}:00`).toISOString();
      return {
        employeeId: cell.employeeId,
        roleId: selectedRole.id,
        date: cell.date,
        startTime: startTimeISO,
        endTime: endTimeISO,
      };
    });

    try {
      await createBulkShifts.mutateAsync({ scheduleId: id, shifts });
      toast({
        title: `${shifts.length} shift${shifts.length > 1 ? 's' : ''} created`,
        description: `Role: ${selectedRole.name} (${defaultStart}–${defaultEnd})`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error?.message || 'Failed to create shifts',
        variant: 'destructive',
      });
    }
  }, [selectedRole, settings?.defaultShiftDuration, id, createBulkShifts, toast]);

  const handlePublish = async () => {
    try {
      await publishSchedule.mutateAsync(id);
      toast({ title: 'Schedule published' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishSchedule.mutateAsync(id);
      toast({ title: 'Schedule unpublished' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleOpenCopyDialog = () => {
    if (!schedule) return;
    // Calculate next period: shift by the schedule's duration
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const durationMs = end.getTime() - start.getTime();
    const newStart = new Date(end.getTime() + 24 * 60 * 60 * 1000); // day after end
    const newEnd = new Date(newStart.getTime() + durationMs);

    setCopyForm({
      name: `${schedule.name} — Copy`,
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0],
    });
    setCopyDialogOpen(true);
  };

  const handleCopy = async () => {
    if (!copyForm.name || !copyForm.startDate || !copyForm.endDate) return;
    try {
      const newSchedule = await copySchedule.mutateAsync({
        id,
        name: copyForm.name,
        startDate: copyForm.startDate,
        endDate: copyForm.endDate,
      });
      setCopyDialogOpen(false);
      toast({ title: 'Schedule copied', description: `"${copyForm.name}" created with shifted shifts.` });
      router.push(`/schedules/${newSchedule.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to copy schedule', variant: 'destructive' });
    }
  };

  // Fetch amendments diff only when preview panel is open
  const { data: amendmentPreview, isLoading: isLoadingAmendments } = useScheduleAmendments(
    id,
    diffPreviewOpen && schedule?.status === 'PUBLISHED',
  );

  const handleOpenDiffPreview = () => {
    setDiffPreviewOpen(true);
  };

  const handleConfirmAmendments = async () => {
    try {
      await publishAmendments.mutateAsync(id);
      setDiffPreviewOpen(false);
      toast({ title: 'Amendments published', description: 'All affected employees have been notified.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to publish amendments', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground">Loading schedule...</div>;
  }

  if (!schedule) {
    return <div className="text-center py-10 text-muted-foreground">Schedule not found</div>;
  }

  // Mobile manager view — QuickScheduleEdit
  if (isMobile && employee?.systemRole && MANAGER_ROLES.includes(employee.systemRole)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/schedules">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{schedule.name}</h1>
            <Badge variant={schedule.status === 'DRAFT' ? 'outline' : 'default'} className="text-[10px]">
              {schedule.status}
            </Badge>
          </div>
          {schedule.status === 'DRAFT' && (
            <Button size="sm" onClick={handlePublish}>Publish</Button>
          )}
        </div>
        <QuickScheduleEdit
          schedule={schedule}
          conflicts={conflicts || []}
          employees={employees}
          roles={roles || []}
          locations={locations || []}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/schedules">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{schedule.name}</h1>
      </div>

      <ScheduleToolbar
        schedule={schedule}
        conflictCount={conflicts?.length || 0}
        viewStatus={viewStatus}
        onPublish={schedule.status === 'DRAFT' ? handlePublish : undefined}
        onUnpublish={schedule.status === 'PUBLISHED' ? handleUnpublish : undefined}
        onPublishAmendments={schedule.status === 'PUBLISHED' ? handleOpenDiffPreview : undefined}
        onCopy={handleOpenCopyDialog}
        onShowConflicts={() => setConflictPanelOpen(true)}
        onShowViews={() => setViewPanelOpen(true)}
        selectedRole={selectedRole}
        roles={roles}
        onRoleSelect={setSelectedRole}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
      />

      {viewMode === 'BY_PERSON' ? (
        <ScheduleGrid
          schedule={schedule}
          allEmployees={employees}
          conflicts={conflicts || []}
          approvedLeaves={approvedLeaves}
          paintRole={selectedRole}
          onClickEmpty={handleClickEmpty}
          onClickShift={handleClickShift}
          onPaintComplete={handlePaintComplete}
        />
      ) : (
        <DayView
          schedule={schedule}
          conflicts={conflicts || []}
          selectedDate={selectedDate}
        />
      )}

      {/* Shift Create/Edit Panel */}
      <ShiftPanel
        open={shiftPanelOpen}
        onOpenChange={setShiftPanelOpen}
        scheduleId={id}
        employees={employees}
        roles={roles || []}
        locations={locations || []}
        editingShift={editingShift}
        prefillEmployeeId={prefillEmployeeId}
        prefillDate={prefillDate}
      />

      {/* Conflicts Panel — grouped by employee */}
      <Sheet open={conflictPanelOpen} onOpenChange={setConflictPanelOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Conflicts ({conflicts?.length || 0})</SheetTitle>
            <SheetDescription>These are soft warnings and do not block publishing or saving.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {(() => {
              if (!conflicts || conflicts.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">No conflicts found</p>;
              }
              // Group by employee
              const grouped = new Map<string, { employee: string; items: any[] }>();
              for (const c of conflicts) {
                const existing = grouped.get(c.employeeId);
                if (existing) {
                  existing.items.push(c);
                } else {
                  // Extract employee name from message (format: "FirstName LastName has/is/exceeds...")
                  const name = c.message.split(/\s(?:has|is|exceeds)/)[0] || 'Unknown';
                  grouped.set(c.employeeId, { employee: name, items: [c] });
                }
              }
              return Array.from(grouped.values()).map((group) => (
                <div key={group.employee}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium shrink-0">
                      {group.employee.split(' ').map((w: string) => w[0]).join('')}
                    </div>
                    <span className="text-sm font-medium">{group.employee}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{group.items.length}</Badge>
                  </div>
                  <div className="space-y-2 pl-8">
                    {group.items.map((conflict: any, i: number) => (
                      <Card key={i}>
                        <CardContent className="flex items-start gap-2 py-2 px-3">
                          {conflict.type === 'OVERLAP' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />}
                          {conflict.type === 'HOURS_CAP' && <Clock className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />}
                          {conflict.type === 'AVAILABILITY' && <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />}
                          <div>
                            <Badge variant="outline" className="mb-0.5 text-[10px] px-1.5 py-0">{conflict.type}</Badge>
                            <p className="text-xs text-muted-foreground">{conflict.message}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* View Tracking Panel */}
      <Sheet open={viewPanelOpen} onOpenChange={setViewPanelOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>View Tracking</SheetTitle>
            <SheetDescription>
              {viewStatus?.viewed || 0} of {viewStatus?.total || 0} employees have viewed this schedule.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> Viewed ({viewStatus?.viewedEmployees?.length || 0})
            </h3>
            {viewStatus?.viewedEmployees?.map((emp: any) => (
              <div key={emp.id} className="flex items-center justify-between pl-5 py-1">
                <span className="text-sm">{emp.firstName} {emp.lastName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(emp.viewedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            <h3 className="text-sm font-medium text-orange-500 flex items-center gap-1 mt-3">
              <Clock className="h-4 w-4" /> Pending ({viewStatus?.pendingEmployees?.length || 0})
            </h3>
            {viewStatus?.pendingEmployees?.map((emp: any) => {
              const recentlySent = emp.reminderSentAt && (Date.now() - new Date(emp.reminderSentAt).getTime()) < 15 * 60 * 1000;
              return (
                <div key={emp.id} className="flex items-center justify-between pl-5 py-1">
                  <span className="text-sm">{emp.firstName} {emp.lastName}</span>
                  {recentlySent ? (
                    <span className="text-xs text-muted-foreground">Reminder sent recently</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        sendReminder.mutate(
                          { scheduleId: id, employeeId: emp.id },
                          {
                            onSuccess: () => toast({ title: 'Reminder sent', description: `Reminder sent to ${emp.firstName} ${emp.lastName}` }),
                            onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.error?.message || err.response?.data?.message || 'Failed to send reminder', variant: 'destructive' }),
                          },
                        );
                      }}
                      disabled={sendReminder.isPending}
                    >
                      <Send className="mr-1 h-3 w-3" />
                      Send Reminder
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Copy Schedule Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Schedule</DialogTitle>
            <DialogDescription>
              Create a new schedule by copying all shifts from &quot;{schedule.name}&quot; to a new date range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={copyForm.name}
                onChange={(e) => setCopyForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="New schedule name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={copyForm.startDate}
                  onChange={(e) => setCopyForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={copyForm.endDate}
                  onChange={(e) => setCopyForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCopy}
              disabled={!copyForm.name || !copyForm.startDate || !copyForm.endDate || copySchedule.isPending}
            >
              {copySchedule.isPending ? 'Copying...' : 'Copy Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amendment Diff Preview */}
      <DiffPreview
        open={diffPreviewOpen}
        onOpenChange={setDiffPreviewOpen}
        preview={amendmentPreview}
        isLoading={isLoadingAmendments}
        isPublishing={publishAmendments.isPending}
        onConfirm={handleConfirmAmendments}
      />
    </div>
  );
}
