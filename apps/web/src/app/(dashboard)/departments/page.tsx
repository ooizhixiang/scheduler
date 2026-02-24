'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/use-departments';
import { useEmployees } from '@/hooks/use-employees';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Users, Building2 } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

export default function DepartmentsPage() {
  useAuth();
  const { toast } = useToast();
  const { data: departments, isLoading } = useDepartments();
  const { data: employeesData } = useEmployees({ pageSize: 200, status: 'ACTIVE' });
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', managerId: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', managerId: '' });
    setDialogOpen(true);
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    setForm({ name: dept.name, managerId: dept.managerId || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateDept.mutateAsync({
          id: editing.id,
          name: form.name,
          managerId: form.managerId || null,
        });
        toast({ title: 'Department updated' });
      } else {
        await createDept.mutateAsync({
          name: form.name,
          managerId: form.managerId || undefined,
        });
        toast({ title: 'Department created' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDept.mutateAsync(deleteConfirm.id);
      toast({ title: 'Department deleted' });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const employees = employeesData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">Manage organizational departments</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Department</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !departments?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No departments created yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Departments help organize your team and scope manager access to their team&apos;s data.
            </p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Department</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Name</th>
                <th className="p-3 text-left text-sm font-medium hidden sm:table-cell">Manager</th>
                <th className="p-3 text-left text-sm font-medium">Employees</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept: any) => (
                <tr key={dept.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dept.name}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {dept.manager ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{dept.manager.firstName} {dept.manager.lastName}</span>
                        <Badge variant="outline" className="text-xs">Manager</Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No manager</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3" />
                      {dept._count?.employees || 0}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(dept)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>{editing ? 'Update department details.' : 'Add a new department to your organization.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={form.managerId || '_none'} onValueChange={(v) => setForm({ ...form, managerId: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No manager</SelectItem>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.systemRole.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Employees with the Employee role will be auto-promoted to Manager when assigned.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createDept.isPending || updateDept.isPending}>
              {(createDept.isPending || updateDept.isPending) ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;?
              {(deleteConfirm?._count?.employees || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  {deleteConfirm._count.employees} employee(s) in this department will be set to unassigned.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDept.isPending}>
              {deleteDept.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
