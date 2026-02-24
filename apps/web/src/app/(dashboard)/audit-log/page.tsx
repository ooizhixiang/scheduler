'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { useEmployees } from '@/hooks/use-employees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'ARCHIVE', label: 'Archive' },
  { value: 'REACTIVATE', label: 'Reactivate' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
  { value: 'INVITE_SENT', label: 'Invite Sent' },
  { value: 'PUBLISH', label: 'Publish' },
  { value: 'UNPUBLISH', label: 'Unpublish' },
  { value: 'COPY', label: 'Copy' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'Employee', label: 'Employee' },
  { value: 'Role', label: 'Role' },
  { value: 'Department', label: 'Department' },
  { value: 'Group', label: 'Group' },
  { value: 'Location', label: 'Location' },
  { value: 'CompanySettings', label: 'Settings' },
  { value: 'Schedule', label: 'Schedule' },
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  ARCHIVE: 'bg-orange-100 text-orange-700',
  REACTIVATE: 'bg-teal-100 text-teal-700',
  LOGIN: 'bg-gray-100 text-gray-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  PASSWORD_RESET: 'bg-yellow-100 text-yellow-700',
  INVITE_SENT: 'bg-purple-100 text-purple-700',
  PUBLISH: 'bg-indigo-100 text-indigo-700',
  UNPUBLISH: 'bg-pink-100 text-pink-700',
  COPY: 'bg-cyan-100 text-cyan-700',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function DiffView({ oldValues, newValues }: { oldValues?: any; newValues?: any }) {
  if (!oldValues && !newValues) return null;

  const oldKeys = Object.keys(oldValues || {});
  const newKeys = Object.keys(newValues || {});
  const allKeysArr = Array.from(new Set(oldKeys.concat(newKeys)));

  // Filter out internal fields
  const ignoreKeys = ['id', 'tenantId', 'createdAt', 'updatedAt', 'passwordHash', 'inviteToken', 'inviteExpiresAt', 'resetToken', 'resetExpiresAt', 'refreshTokenHash'];
  const keys = allKeysArr.filter((k) => !ignoreKeys.includes(k));

  if (keys.length === 0) return null;

  return (
    <div className="mt-2 rounded border bg-muted/30 p-3 text-xs space-y-1">
      {keys.map((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const changed = oldVal !== undefined && newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal);
        const added = oldVal === undefined && newVal !== undefined;
        const removed = oldVal !== undefined && newVal === undefined;

        return (
          <div key={key} className="flex gap-2">
            <span className="font-mono text-muted-foreground w-32 shrink-0">{key}:</span>
            {changed && (
              <>
                <span className="line-through text-red-500">{JSON.stringify(oldVal)}</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="text-green-600">{JSON.stringify(newVal)}</span>
              </>
            )}
            {added && <span className="text-green-600">+ {JSON.stringify(newVal)}</span>}
            {removed && <span className="text-red-500 line-through">{JSON.stringify(oldVal)}</span>}
            {!changed && !added && !removed && (
              <span className="text-muted-foreground">{JSON.stringify(newVal ?? oldVal)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogPage() {
  useAuth();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useAuditLogs({
    page,
    pageSize,
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const hasFilters = action || entityType || startDate || endDate;

  const clearFilters = () => {
    setAction('');
    setEntityType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Immutable record of all system changes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select value={action || '_all'} onValueChange={(v) => { setAction(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Actions" /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entity Type</Label>
              <Select value={entityType || '_all'} onValueChange={(v) => { setEntityType(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Entities" /></SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{total} entries</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No audit log entries found</p>
          ) : (
            <div className="space-y-2">
              {items.map((entry: any) => {
                const isExpanded = expandedId === entry.id;
                const hasDetails = entry.oldValues || entry.newValues;
                return (
                  <div
                    key={entry.id}
                    className={`rounded-md border p-3 transition-colors ${hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => hasDetails && setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={`shrink-0 text-xs ${ACTION_COLORS[entry.action] || ''}`}>
                          {entry.action}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {entry.actor
                            ? `${entry.actor.firstName} ${entry.actor.lastName}`
                            : 'System'}
                        </span>
                        <span className="text-sm text-muted-foreground truncate">
                          {entry.entityType}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                    {isExpanded && hasDetails && (
                      <DiffView oldValues={entry.oldValues} newValues={entry.newValues} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
