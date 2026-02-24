'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateShift, useUpdateShift, useDeleteShift } from '@/hooks/use-shifts';
import { useToast } from '@/components/ui/toaster';
import { Trash2 } from 'lucide-react';

interface ShiftPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  employees: any[];
  roles: any[];
  locations: any[];
  editingShift?: any;
  prefillEmployeeId?: string;
  prefillDate?: string;
  side?: 'right' | 'bottom';
  readOnly?: boolean;
}

interface ShiftForm {
  employeeId: string;
  roleId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

const EMPTY_FORM: ShiftForm = {
  employeeId: '',
  roleId: '',
  locationId: '',
  date: '',
  startTime: '09:00',
  endTime: '17:00',
  notes: '',
};

export function ShiftPanel({
  open, onOpenChange, scheduleId, employees, roles, locations,
  editingShift, prefillEmployeeId, prefillDate, side = 'right', readOnly = false,
}: ShiftPanelProps) {
  const { toast } = useToast();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const [form, setForm] = useState<ShiftForm>(EMPTY_FORM);
  const [timeError, setTimeError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  // Track the "clean" form state to detect unsaved changes
  const cleanFormRef = useRef<ShiftForm>(EMPTY_FORM);

  // Initialize form when panel opens or shift changes
  useEffect(() => {
    if (!open) return;

    let initial: ShiftForm;
    if (editingShift) {
      const startDate = new Date(editingShift.startTime);
      const endDate = new Date(editingShift.endTime);
      initial = {
        employeeId: editingShift.employeeId || editingShift.employee?.id || '',
        roleId: editingShift.roleId || editingShift.role?.id || '',
        locationId: editingShift.locationId || editingShift.location?.id || '',
        date: new Date(editingShift.date).toISOString().split('T')[0],
        startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
        notes: editingShift.notes || '',
      };
    } else {
      initial = {
        employeeId: prefillEmployeeId || '',
        roleId: roles[0]?.id || '',
        locationId: '',
        date: prefillDate || '',
        startTime: '09:00',
        endTime: '17:00',
        notes: '',
      };
    }
    setForm(initial);
    cleanFormRef.current = initial;
    setTimeError('');
  }, [open, editingShift, prefillEmployeeId, prefillDate, roles]);

  // Check if form has unsaved changes
  const isDirty = useCallback(() => {
    const clean = cleanFormRef.current;
    return (
      form.employeeId !== clean.employeeId ||
      form.roleId !== clean.roleId ||
      form.locationId !== clean.locationId ||
      form.date !== clean.date ||
      form.startTime !== clean.startTime ||
      form.endTime !== clean.endTime ||
      form.notes !== clean.notes
    );
  }, [form]);

  // Validate time: end must be after start
  const validateTime = useCallback((startTime: string, endTime: string) => {
    if (startTime && endTime && startTime >= endTime) {
      return 'End time must be after start time';
    }
    return '';
  }, []);

  // Handle time changes with validation
  const updateFormField = useCallback((field: keyof ShiftForm, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'startTime' || field === 'endTime') {
        setTimeError(validateTime(updated.startTime, updated.endTime));
      }
      return updated;
    });
  }, [validateTime]);

  // Intercept close attempts — check for unsaved changes
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && isDirty()) {
      setDiscardConfirmOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  }, [isDirty, onOpenChange]);

  const handleDiscard = useCallback(() => {
    setDiscardConfirmOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const canSave =
    form.employeeId &&
    form.roleId &&
    form.date &&
    form.startTime &&
    form.endTime &&
    !timeError;

  const handleSave = async () => {
    // Final time validation
    const err = validateTime(form.startTime, form.endTime);
    if (err) {
      setTimeError(err);
      return;
    }

    try {
      const dateStr = form.date;
      const startTimeISO = new Date(`${dateStr}T${form.startTime}:00`).toISOString();
      const endTimeISO = new Date(`${dateStr}T${form.endTime}:00`).toISOString();

      const payload = {
        employeeId: form.employeeId,
        roleId: form.roleId,
        locationId: form.locationId || undefined,
        date: dateStr,
        startTime: startTimeISO,
        endTime: endTimeISO,
        notes: form.notes || undefined,
      };

      if (editingShift) {
        await updateShift.mutateAsync({ scheduleId, id: editingShift.id, ...payload });
        toast({ title: 'Shift updated' });
      } else {
        await createShift.mutateAsync({ scheduleId, ...payload });
        toast({ title: 'Shift created' });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to save shift', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!editingShift) return;
    try {
      await deleteShift.mutateAsync({ scheduleId, id: editingShift.id });
      toast({ title: 'Shift deleted' });
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to delete shift', variant: 'destructive' });
      setDeleteConfirmOpen(false);
    }
  };

  const isSaving = createShift.isPending || updateShift.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side={side} className={`overflow-y-auto ${side === 'bottom' ? 'max-h-[85vh] rounded-t-xl' : ''}`}>
          <SheetHeader>
            <SheetTitle>
              {readOnly ? 'Shift Details' : (editingShift ? 'Edit Shift' : 'Create Shift')}
            </SheetTitle>
            <SheetDescription>
              {readOnly
                ? 'This schedule is published. Shifts are read-only.'
                : (editingShift ? 'Modify shift details.' : 'Add a new shift to the schedule.')}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => updateFormField('employeeId', v)} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.roleId} onValueChange={(v) => updateFormField('roleId', v)} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} />
                        {role.name}
                        {role.shortCode && (
                          <span className="text-xs text-muted-foreground">({role.shortCode})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select
                value={form.locationId || '__none__'}
                onValueChange={(v) => updateFormField('locationId', v === '__none__' ? '' : v)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No location</SelectItem>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => updateFormField('date', e.target.value)} disabled={readOnly} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => updateFormField('startTime', e.target.value)} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => updateFormField('endTime', e.target.value)}
                  className={timeError ? 'border-destructive' : ''}
                  disabled={readOnly}
                />
              </div>
            </div>
            {timeError && (
              <p className="text-sm text-destructive -mt-2">{timeError}</p>
            )}

            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={form.notes}
                onChange={(e) => updateFormField('notes', e.target.value)}
                placeholder="Optional notes"
                maxLength={500}
                disabled={readOnly}
              />
            </div>
          </div>

          {readOnly ? (
            <SheetFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
            </SheetFooter>
          ) : (
            <SheetFooter>
              <div className="flex w-full justify-between">
                {editingShift && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={deleteShift.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!canSave || isSaving}>
                    {isSaving
                      ? (editingShift ? 'Updating...' : 'Creating...')
                      : (editingShift ? 'Update' : 'Create')}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteShift.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Unsaved Changes Confirmation */}
      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
