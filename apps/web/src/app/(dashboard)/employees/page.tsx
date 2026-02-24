'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEmployees, useCreateEmployee, useResendInvite } from '@/hooks/use-employees';
import { useDepartments } from '@/hooks/use-departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';
import { getInitials, formatDate } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function EmployeesPage() {
  useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useEmployees({ page, search, departmentId: deptFilter || undefined });
  const { data: departments } = useDepartments();
  const createEmployee = useCreateEmployee();
  const resendInvite = useResendInvite();

  const handleResendInvite = async (employeeId: string) => {
    try {
      await resendInvite.mutateAsync(employeeId);
      toast({ title: 'Invitation resent', description: 'A new invite email has been sent.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to resend invite', variant: 'destructive' });
    }
  };

  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', phone: '',
    systemRole: 'EMPLOYEE', employmentType: 'FULL_TIME', departmentId: '',
  });

  const handleCreate = async () => {
    try {
      await createEmployee.mutateAsync({
        ...form,
        departmentId: form.departmentId || undefined,
      });
      setDialogOpen(false);
      setForm({ email: '', firstName: '', lastName: '', phone: '', systemRole: 'EMPLOYEE', employmentType: 'FULL_TIME', departmentId: '' });
      toast({ title: 'Employee created', description: 'An invite email has been sent.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed to create employee', variant: 'destructive' });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'INVITED': return 'secondary';
      case 'ARCHIVED': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>An invite email will be sent to the new employee.</DialogDescription>
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
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
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
                  <Label>Type</Label>
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
                <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {Array.isArray(departments) && departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createEmployee.isPending}>
                {createEmployee.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {Array.isArray(departments) && departments.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !data?.items?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground">No employees found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">Employee</th>
                  <th className="p-3 text-left text-sm font-medium hidden md:table-cell">Department</th>
                  <th className="p-3 text-left text-sm font-medium hidden sm:table-cell">Type</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium hidden lg:table-cell">Roles</th>
                  <th className="p-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((emp: any) => (
                  <tr key={emp.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3">
                      <Link href={`/employees/${emp.id}`} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(emp.firstName, emp.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="p-3 hidden md:table-cell text-sm">{emp.department?.name || '-'}</td>
                    <td className="p-3 hidden sm:table-cell text-sm">{emp.employmentType.replace('_', ' ')}</td>
                    <td className="p-3">
                      <Badge variant={statusColor(emp.status) as any}>{emp.status}</Badge>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {emp.employeeRoles?.map((er: any) => (
                          <Badge
                            key={er.role.id}
                            variant="outline"
                            style={{ borderColor: er.role.color, color: er.role.color }}
                          >
                            {er.role.shortCode}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {emp.status === 'INVITED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.preventDefault(); handleResendInvite(emp.id); }}
                          disabled={resendInvite.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Resend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * (data.pageSize || 20) + 1} to {Math.min(page * (data.pageSize || 20), data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
