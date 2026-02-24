'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDepartments } from '@/hooks/use-departments';
import {
  usePendingLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useUndoLeaveRequest,
  useCoverageImpact,
  useLeaveBalance,
  LeaveRequest,
  LeaveReason,
  CoverageImpact,
} from '@/hooks/use-leave-requests';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  AlertTriangle,
  Undo2,
  Building2,
  Eye,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<LeaveReason, string> = {
  SICK: 'Sick',
  PERSONAL: 'Personal',
  VACATION: 'Vacation',
  OTHER: 'Other',
};

const REASON_COLORS: Record<LeaveReason, string> = {
  SICK: 'text-red-600 bg-red-50 border-red-200',
  PERSONAL: 'text-blue-600 bg-blue-50 border-blue-200',
  VACATION: 'text-green-600 bg-green-50 border-green-200',
  OTHER: 'text-gray-600 bg-gray-50 border-gray-200',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function daysPending(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86400000));
}

function daysPendingLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// ─── AC4 (9.4): Balance Badge ───────────────────────────────────────────────

function BalanceBadge({ employeeId, reason }: { employeeId: string; reason: LeaveReason }) {
  const { data: balance } = useLeaveBalance(employeeId);
  if (!balance) return null;

  const isSick = reason === 'SICK';
  const bucket = isSick ? balance.sick : balance.annual;
  const remaining = Math.max(0, bucket.total - bucket.used);
  const exceeded = bucket.used >= bucket.total;

  return (
    <Badge
      variant="outline"
      className={`text-xs ${exceeded ? 'border-red-200 text-red-700 bg-red-50' : 'border-muted'}`}
    >
      {isSick ? 'Sick' : 'Annual'}: {remaining}/{bucket.total} left
    </Badge>
  );
}

// ─── Rejection Form ─────────────────────────────────────────────────────────

function RejectForm({
  requestId,
  onDone,
  onCancel,
}: {
  requestId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const rejectMutation = useRejectLeaveRequest();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'A reason is required to reject a request.', variant: 'destructive' });
      return;
    }

    try {
      await rejectMutation.mutateAsync({ requestId, reason: reason.trim() });
      onDone();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Rejection failed';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Rejection failed', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <Label className="text-xs">Reason for rejection (required)</Label>
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Insufficient coverage on that day"
        className="h-8 text-sm"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleSubmit}
          disabled={rejectMutation.isPending || !reason.trim()}
        >
          {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}

// ─── Undo Toast Hook ────────────────────────────────────────────────────────

function useUndoToast() {
  const undoMutation = useUndoLeaveRequest();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showUndoToast = useCallback(
    (requestId: string, action: 'approved' | 'rejected', employeeName: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      toast({
        title: `Request ${action}`,
        description: `${employeeName}'s day off has been ${action}.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            className="gap-1 shrink-0"
            onClick={async () => {
              try {
                await undoMutation.mutateAsync(requestId);
                toast({
                  title: 'Undone',
                  description: `Decision reversed — request returned to pending.`,
                });
              } catch {
                toast({
                  title: 'Undo failed',
                  description: 'Could not undo the decision.',
                  variant: 'destructive',
                });
              }
            }}
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
        ),
        duration: 5000,
      });
    },
    [toast, undoMutation],
  );

  return { showUndoToast };
}

// ─── AC1-3: Coverage Impact Panel ───────────────────────────────────────────

function CoverageImpactPanel({
  requestId,
  employeeName,
  onApprove,
  onReject,
  approvePending,
}: {
  requestId: string;
  employeeName: string;
  onApprove: () => void;
  onReject: () => void;
  approvePending: boolean;
}) {
  const { data: impact, isLoading } = useCoverageImpact(requestId);

  if (isLoading) {
    return (
      <div className="mt-3 border-t pt-3 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading coverage data...
      </div>
    );
  }

  if (!impact) return null;

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      {/* AC2: Coverage warning */}
      {impact.warning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{impact.warning}</p>
        </div>
      )}

      {/* Coverage ratio */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Users className="h-3 w-3" />
            Current Coverage
          </div>
          <p className="text-lg font-semibold">
            {impact.totalScheduled}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              scheduled
            </span>
          </p>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Users className="h-3 w-3" />
            After Approval
          </div>
          <p className={`text-lg font-semibold ${impact.warning ? 'text-amber-600' : ''}`}>
            {impact.coverageAfterApproval}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              remaining
            </span>
          </p>
        </div>
      </div>

      {/* Employee's shifts on that day */}
      {impact.requestEmployeeShifts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {employeeName}&apos;s shifts on this day
          </p>
          <div className="flex flex-wrap gap-1.5">
            {impact.requestEmployeeShifts.map((s) => (
              <Badge key={s.id} variant="outline" className="text-xs">
                {s.role}: {formatTime(s.startTime)} – {formatTime(s.endTime)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* AC1: Scheduled employees */}
      {impact.scheduledEmployees.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Scheduled that day ({impact.scheduledEmployees.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {impact.scheduledEmployees.map((e) => (
              <Badge key={e.id} variant="secondary" className="text-xs gap-1">
                {e.firstName} {e.lastName}
                <span className="text-muted-foreground">
                  ({e.roles.join(', ')})
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* AC3: Available employees who could cover */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
          <UserCheck className="h-3 w-3" />
          Available to cover ({impact.availableEmployees.length})
        </p>
        {impact.availableEmployees.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {impact.availableEmployees.map((e) => (
              <Badge key={e.id} variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                {e.firstName} {e.lastName}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No additional employees available on this day
          </p>
        )}
      </div>

      {/* AC4: Approve/Reject from the panel */}
      <div className="flex gap-2 justify-end pt-1 border-t">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onReject}
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onApprove}
          disabled={approvePending}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {approvePending ? 'Approving...' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}

// ─── Request Card ───────────────────────────────────────────────────────────

function RequestCard({ request }: { request: LeaveRequest }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const approveMutation = useApproveLeaveRequest();
  const { toast } = useToast();
  const { showUndoToast } = useUndoToast();

  const initials = request.employee
    ? `${request.employee.firstName[0]}${request.employee.lastName[0]}`.toUpperCase()
    : '??';

  const employeeName = request.employee
    ? `${request.employee.firstName} ${request.employee.lastName}`
    : 'Unknown';

  const days = daysPending(request.createdAt);
  const reasonColor = REASON_COLORS[request.reason] || REASON_COLORS.OTHER;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(request.id);
      showUndoToast(request.id, 'approved', employeeName);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Approval failed';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Approval failed', variant: 'destructive' });
    }
  };

  const handleRejectDone = () => {
    setShowRejectForm(false);
    setShowImpact(false);
    showUndoToast(request.id, 'rejected', employeeName);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{employeeName}</span>
              {request.employee?.department && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Building2 className="h-2.5 w-2.5" />
                  {request.employee.department.name}
                </Badge>
              )}
              {request.employeeId && (
                <BalanceBadge employeeId={request.employeeId} reason={request.reason} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formatDate(request.date)}</span>
              </span>
              <Badge variant="outline" className={`text-xs border ${reasonColor}`}>
                {REASON_LABELS[request.reason]}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {daysPendingLabel(days)} pending
              </span>
            </div>
            {request.notes && (
              <p className="text-xs text-muted-foreground mt-1.5">{request.notes}</p>
            )}
            {request.hasShiftConflict && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Has a scheduled shift on this day
              </div>
            )}
          </div>
          {/* Action buttons */}
          {!showRejectForm && !showImpact && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowImpact(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                View Impact
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          )}
          {/* Collapse button when panel is open */}
          {showImpact && !showRejectForm && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => setShowImpact(false)}
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Hide
            </Button>
          )}
        </div>

        {/* Coverage Impact Panel (Story 9.3) */}
        {showImpact && !showRejectForm && (
          <CoverageImpactPanel
            requestId={request.id}
            employeeName={employeeName}
            onApprove={handleApprove}
            onReject={() => {
              setShowImpact(false);
              setShowRejectForm(true);
            }}
            approvePending={approveMutation.isPending}
          />
        )}

        {/* Inline rejection form */}
        {showRejectForm && (
          <RejectForm
            requestId={request.id}
            onDone={handleRejectDone}
            onCancel={() => setShowRejectForm(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { employee } = useAuth();
  const isAdmin = employee?.systemRole === 'SUPER_ADMIN' || employee?.systemRole === 'ADMIN';

  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const { data: departments } = useDepartments();
  const { data: requests, isLoading } = usePendingLeaveRequests(departmentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">
          Review and act on pending day-off requests
        </p>
      </div>

      {/* Department filter */}
      <div className="flex items-center gap-3">
        {isAdmin && departments && departments.length > 0 && (
          <Select
            value={departmentId || 'all'}
            onValueChange={(v) => setDepartmentId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {requests && (
          <span className="text-sm text-muted-foreground">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Request feed */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">Loading requests...</p>
          </CardContent>
        </Card>
      ) : !requests?.length ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-green-100 p-4 mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700">All Clear</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No pending day-off requests to review.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
