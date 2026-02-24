'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule, usePublishSchedule,
} from '@/hooks/use-schedules';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Calendar, Trash2, Send, ExternalLink, Pencil, User } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';
import { formatDate } from '@/lib/utils';

function getDefaultDates(cadence?: string, customDays?: number) {
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));

  let daysSpan = 6; // default weekly (Mon-Sun)
  if (cadence === 'BIWEEKLY') daysSpan = 13;
  else if (cadence === 'CUSTOM' && customDays) daysSpan = customDays - 1;

  const endDate = new Date(nextMonday);
  endDate.setDate(nextMonday.getDate() + daysSpan);

  return {
    startDate: nextMonday.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

function getDefaultName(startDate: string) {
  const d = new Date(startDate);
  return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function SchedulesPage() {
  useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { data: schedules, isLoading } = useSchedules();
  const { data: settings } = useSettings();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const publishSchedule = usePublishSchedule();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });

  const openCreate = () => {
    const defaults = getDefaultDates(
      settings?.schedulingCadence,
      settings?.customPeriodDays,
    );
    setForm({
      name: getDefaultName(defaults.startDate),
      startDate: defaults.startDate,
      endDate: defaults.endDate,
    });
    setCreateDialogOpen(true);
  };

  const openEdit = (schedule: any) => {
    setEditDialog(schedule);
    setForm({
      name: schedule.name,
      startDate: schedule.startDate?.split('T')[0] || '',
      endDate: schedule.endDate?.split('T')[0] || '',
    });
  };

  const handleCreate = async () => {
    try {
      const newSchedule = await createSchedule.mutateAsync(form);
      toast({ title: 'Schedule created' });
      setCreateDialogOpen(false);
      // AC2: redirect to builder
      router.push(`/schedules/${newSchedule.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editDialog) return;
    try {
      await updateSchedule.mutateAsync({ id: editDialog.id, ...form });
      toast({ title: 'Schedule updated' });
      setEditDialog(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSchedule.mutateAsync(deleteConfirm.id);
      toast({ title: 'Schedule deleted' });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishSchedule.mutateAsync(id);
      toast({ title: 'Schedule published', description: 'Employees have been notified.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <p className="text-muted-foreground">Create and manage work schedules</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Schedule</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !schedules?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No schedules yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first schedule to start assigning shifts to your team.
            </p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Schedule</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule: any) => (
            <Card key={schedule.id} className="group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base truncate">{schedule.name}</CardTitle>
                <Badge variant={schedule.status === 'DRAFT' ? 'outline' : 'default'}>
                  {schedule.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-1">
                  {formatDateRange(schedule.startDate, schedule.endDate)}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>{schedule._count?.shifts || 0} shifts</span>
                  {schedule.createdBy && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {schedule.createdBy.firstName} {schedule.createdBy.lastName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/schedules/${schedule.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-1 h-3 w-3" />Open
                    </Button>
                  </Link>
                  {schedule.status === 'DRAFT' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePublish(schedule.id)}
                        disabled={publishSchedule.isPending}
                      >
                        <Send className="mr-1 h-3 w-3" />Publish
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(schedule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setDeleteConfirm(schedule)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
            <DialogDescription>
              Set up a new schedule period. Date range defaults to your configured scheduling cadence.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Week of Jan 6" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setForm({
                      ...form,
                      startDate: newStart,
                      name: getDefaultName(newStart),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || !form.startDate || !form.endDate || createSchedule.isPending}>
              {createSchedule.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (DRAFT only) */}
      <Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) setEditDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Update the schedule name or date range.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!form.name || updateSchedule.isPending}>
              {updateSchedule.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;?
              {(deleteConfirm?._count?.shifts || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  This schedule contains {deleteConfirm._count.shifts} shift(s) that will be permanently removed.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSchedule.isPending}>
              {deleteSchedule.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
