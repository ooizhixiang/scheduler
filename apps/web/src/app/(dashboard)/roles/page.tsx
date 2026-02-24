'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '@/hooks/use-roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, AlertTriangle, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

/**
 * Check WCAG AA contrast ratio between a hex color and white background.
 * Returns true if contrast ratio >= 4.5:1 (AA for normal text).
 */
function getContrastRatio(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Contrast against white (luminance = 1)
  return (1 + 0.05) / (luminance + 0.05);
}

function isWcagAACompliant(hex: string): boolean {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return true;
  return getContrastRatio(hex) >= 3;
}

export default function RolesPage() {
  useAuth();
  const { toast } = useToast();
  const { data: roles, isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [form, setForm] = useState({ name: '', shortCode: '', description: '', color: '#6366f1', icon: '' });

  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', shortCode: '', description: '', color: '#6366f1', icon: '' });
    setDialogOpen(true);
  };

  const openEdit = (role: any) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      shortCode: role.shortCode || '',
      description: role.description || '',
      color: role.color,
      icon: role.icon || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        color: form.color,
        icon: form.icon || undefined,
      };
      if (form.shortCode) {
        payload.shortCode = form.shortCode.toUpperCase();
      }

      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, ...payload });
        toast({ title: 'Role updated' });
      } else {
        await createRole.mutateAsync(payload);
        toast({ title: 'Role created' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRole.mutateAsync(deleteConfirm.id);
      toast({ title: 'Role deleted' });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const contrastOk = isWcagAACompliant(form.color);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">Manage job roles for scheduling</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Role</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !roles?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No roles created yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Roles help color-code shifts and identify job functions.
            </p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Role</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role: any) => (
            <Card key={role.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: role.color }}
                  >
                    {role.icon ? role.icon.slice(0, 1).toUpperCase() : ''}
                  </div>
                  <CardTitle className="text-base">{role.name}</CardTitle>
                </div>
                <Badge variant="outline" style={{ borderColor: role.color, color: role.color }}>
                  {role.shortCode}
                </Badge>
              </CardHeader>
              <CardContent>
                {role.icon && (
                  <p className="text-xs text-muted-foreground mb-1">Icon: {role.icon}</p>
                )}
                <p className="text-sm text-muted-foreground mb-3">{role.description || 'No description'}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {role._count?.employeeRoles || 0} employees
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(role)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update the role details.' : 'Add a new job role for scheduling.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Barista" />
              </div>
              <div className="space-y-2">
                <Label>Short Code</Label>
                <Input
                  value={form.shortCode}
                  onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase().slice(0, 4) })}
                  placeholder="e.g. BA"
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground">1-4 chars, auto-generated if blank</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
                {!contrastOk && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Low contrast on white — may be hard to read
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input value={form.icon} placeholder="e.g. coffee" onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
            </div>
            {form.name && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: form.color }}
                  >
                    {form.icon ? form.icon.slice(0, 1).toUpperCase() : ''}
                  </div>
                  <span className="font-medium">{form.name}</span>
                  <Badge variant="outline" style={{ borderColor: form.color, color: form.color }}>
                    {form.shortCode || form.name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 4) || '??'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createRole.isPending || updateRole.isPending}>
              {(createRole.isPending || updateRole.isPending) ? 'Saving...' : editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &ldquo;{deleteConfirm?.name}&rdquo;?
              {(deleteConfirm?._count?.employeeRoles || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  This role is assigned to {deleteConfirm._count.employeeRoles} employee(s). Their role assignment will be removed.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRole.isPending}>
              {deleteRole.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
