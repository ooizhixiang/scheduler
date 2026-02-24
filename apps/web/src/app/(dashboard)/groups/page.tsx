'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useSetGroupMembers } from '@/hooks/use-groups';
import { useEmployees } from '@/hooks/use-employees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, UserPlus, Search, FolderOpen } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function GroupsPage() {
  useAuth();
  const { toast } = useToast();
  const { data: groups, isLoading } = useGroups();
  const { data: employeesData } = useEmployees({ pageSize: 200, status: 'ACTIVE' });
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const setMembers = useSetGroupMembers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [managingGroup, setManagingGroup] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const employees = employeesData?.items || [];

  const filteredEmployees = memberSearch
    ? employees.filter((emp: any) =>
        `${emp.firstName} ${emp.lastName} ${emp.email}`
          .toLowerCase()
          .includes(memberSearch.toLowerCase()),
      )
    : employees;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (group: any) => {
    setEditing(group);
    setForm({ name: group.name, description: group.description || '' });
    setDialogOpen(true);
  };

  const openMembers = (group: any) => {
    setManagingGroup(group);
    setSelectedMembers(group.members?.map((m: any) => m.employee.id) || []);
    setMemberSearch('');
    setMembersDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateGroup.mutateAsync({ id: editing.id, ...form });
        toast({ title: 'Group updated' });
        setDialogOpen(false);
      } else {
        const newGroup = await createGroup.mutateAsync(form);
        toast({ title: 'Group created', description: 'Now assign members to this group.' });
        setDialogOpen(false);
        // AC2: auto-open members dialog after creating
        setManagingGroup(newGroup);
        setSelectedMembers([]);
        setMemberSearch('');
        setMembersDialogOpen(true);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleSaveMembers = async () => {
    try {
      await setMembers.mutateAsync({ groupId: managingGroup.id, employeeIds: selectedMembers });
      toast({ title: 'Members updated' });
      setMembersDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteGroup.mutateAsync(deleteConfirm.id);
      toast({ title: 'Group deleted' });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const toggleMember = (empId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">Organize employees into groups for scheduling convenience</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Group</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !groups?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No groups created yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Groups let you organize employees beyond department structure for flexible scheduling.
            </p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Group</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group: any) => (
            <Card key={group.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{group.name}</CardTitle>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {group._count?.members || 0}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{group.description || 'No description'}</p>
                {group.members?.length > 0 && (
                  <div className="flex -space-x-2 mb-3">
                    {group.members.slice(0, 5).map((m: any) => (
                      <Avatar key={m.employee.id} className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className="text-[10px]">{getInitials(m.employee.firstName, m.employee.lastName)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {(group._count?.members || 0) > 5 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                        +{group._count.members - 5}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openMembers(group)}>
                    <UserPlus className="h-4 w-4 mr-1" />Members
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(group)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(group)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
            <DialogTitle>{editing ? 'Edit Group' : 'Create Group'}</DialogTitle>
            <DialogDescription>{editing ? 'Update group details.' : 'Create a new employee group.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Shift Team" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createGroup.isPending || updateGroup.isPending}>
              {(createGroup.isPending || updateGroup.isPending) ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Members — {managingGroup?.name}</DialogTitle>
            <DialogDescription>Select employees to include in this group.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              className="pl-9"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1 overflow-y-auto flex-1 min-h-0 py-2">
            {filteredEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>
            ) : (
              filteredEmployees.map((emp: any) => {
                const isSelected = selectedMembers.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleMember(emp.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded"
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getInitials(emp.firstName, emp.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                    </div>
                    {emp.department?.name && (
                      <Badge variant="outline" className="text-xs">{emp.department.name}</Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMembers} disabled={setMembers.isPending}>
              {setMembers.isPending ? 'Saving...' : `Save (${selectedMembers.length} selected)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;?
              Employees in this group will not be affected — groups are organizational labels only.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteGroup.isPending}>
              {deleteGroup.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
