'use client';

import { useState } from 'react';
import {
  useMyLeaveRequests,
  useCreateLeaveRequest,
  useCancelLeaveRequest,
  useLeaveBalance,
  LeaveRequest,
  LeaveReason,
} from '@/hooks/use-leave-requests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarOff,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  TreePalm,
  Thermometer,
} from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<LeaveReason, string> = {
  SICK: 'Sick',
  PERSONAL: 'Personal',
  VACATION: 'Vacation',
  OTHER: 'Other',
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: 'Pending', icon: Clock, variant: 'secondary' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, variant: 'default' },
  REJECTED: { label: 'Rejected', icon: XCircle, variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', icon: Ban, variant: 'outline' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

// ─── AC1 (9.4): Balance Display ─────────────────────────────────────────────

function BalanceCard() {
  const { data: balance, isLoading } = useLeaveBalance();

  if (isLoading || !balance) return null;

  const annualPct = balance.annual.total > 0
    ? Math.min(100, (balance.annual.used / balance.annual.total) * 100)
    : 0;
  const sickPct = balance.sick.total > 0
    ? Math.min(100, (balance.sick.used / balance.sick.total) * 100)
    : 0;

  const annualExceeded = balance.annual.used >= balance.annual.total;
  const sickExceeded = balance.sick.used >= balance.sick.total;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TreePalm className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Annual Leave</span>
          </div>
          <p className="text-2xl font-bold">
            {balance.annual.used}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}of {balance.annual.total} days used
            </span>
          </p>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${annualExceeded ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${annualPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {Math.max(0, balance.annual.total - balance.annual.used)} days remaining
            {annualExceeded && (
              <span className="text-red-600 font-medium"> (exceeded)</span>
            )}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Sick Leave</span>
          </div>
          <p className="text-2xl font-bold">
            {balance.sick.used}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}of {balance.sick.total} days used
            </span>
          </p>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${sickExceeded ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${sickPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {Math.max(0, balance.sick.total - balance.sick.used)} days remaining
            {sickExceeded && (
              <span className="text-red-600 font-medium"> (exceeded)</span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Request Form ───────────────────────────────────────────────────────────

function RequestForm({ onSuccess }: { onSuccess: () => void }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState<LeaveReason | ''>('');
  const [notes, setNotes] = useState('');
  const createRequest = useCreateLeaveRequest();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!date) {
      toast({ title: 'Date required', description: 'Please select a date.', variant: 'destructive' });
      return;
    }
    if (!reason) {
      toast({ title: 'Reason required', description: 'Please select a reason.', variant: 'destructive' });
      return;
    }

    try {
      const result = await createRequest.mutateAsync({
        date,
        reason,
        notes: notes.trim() || undefined,
      });

      const formattedDate = formatDate(date);
      toast({
        title: 'Day off requested',
        description: `Day off requested for ${formattedDate}`,
      });

      // AC5 (9.1): Warn about shift conflict
      if (result.hasShiftConflict) {
        toast({
          title: 'Shift conflict noted',
          description: `You have a scheduled shift on ${formattedDate}. Your manager will see this when reviewing.`,
          variant: 'destructive',
        });
      }

      // AC5 (9.4): Warn about exceeding balance
      if (result.exceedsBalance) {
        toast({
          title: 'Balance exceeded',
          description: 'This request exceeds your leave allowance. It will still be submitted for review.',
          variant: 'destructive',
        });
      }

      setDate('');
      setReason('');
      setNotes('');
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Request failed';
      toast({
        title: 'Error',
        description: typeof msg === 'string' ? msg : 'Request failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Request Day Off
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-sm">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as LeaveReason)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SICK">Sick</SelectItem>
                <SelectItem value="PERSONAL">Personal</SelectItem>
                <SelectItem value="VACATION">Vacation</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={createRequest.isPending || !date || !reason}
            className="gap-2"
          >
            {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Request Card ───────────────────────────────────────────────────────────

function RequestCard({
  request,
  showCancel,
}: {
  request: LeaveRequest;
  showCancel: boolean;
}) {
  const cancelRequest = useCancelLeaveRequest();
  const { toast } = useToast();

  const statusConfig = STATUS_CONFIG[request.status];
  const StatusIcon = statusConfig?.icon || Clock;

  const handleCancel = async () => {
    try {
      await cancelRequest.mutateAsync(request.id);
      toast({ title: 'Request cancelled', description: 'Your day off request has been cancelled.' });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Cancel failed';
      toast({
        title: 'Error',
        description: typeof msg === 'string' ? msg : 'Cancel failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className={`mt-0.5 rounded-full p-1.5 ${
        request.status === 'APPROVED' ? 'bg-green-100' :
        request.status === 'REJECTED' ? 'bg-red-100' :
        request.status === 'CANCELLED' ? 'bg-gray-100' :
        'bg-amber-100'
      }`}>
        <StatusIcon className={`h-3.5 w-3.5 ${
          request.status === 'APPROVED' ? 'text-green-600' :
          request.status === 'REJECTED' ? 'text-red-600' :
          request.status === 'CANCELLED' ? 'text-gray-500' :
          'text-amber-600'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{formatDate(request.date)}</span>
          <Badge variant={statusConfig?.variant || 'outline'} className="text-xs gap-1">
            <StatusIcon className="h-2.5 w-2.5" />
            {statusConfig?.label || request.status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {REASON_LABELS[request.reason] || request.reason}
          </Badge>
          {request.hasShiftConflict && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              Shift conflict
            </Badge>
          )}
        </div>
        {request.notes && (
          <p className="text-xs text-muted-foreground mt-1">{request.notes}</p>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          Submitted {formatRelative(request.createdAt)}
          {request.reviewedBy && request.reviewedAt && (
            <span>
              {' '}&middot; {request.status === 'APPROVED' ? 'Approved' : 'Reviewed'} by{' '}
              {request.reviewedBy.firstName} {request.reviewedBy.lastName}
            </span>
          )}
        </div>
        {request.rejectionReason && (
          <div className="text-xs text-red-700 mt-1 bg-red-50 rounded px-2 py-1">
            Reason: {request.rejectionReason}
          </div>
        )}
      </div>
      {showCancel && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive gap-1"
          onClick={handleCancel}
          disabled={cancelRequest.isPending}
        >
          <X className="h-3.5 w-3.5" />
          {cancelRequest.isPending ? 'Cancelling...' : 'Cancel'}
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DayOffPage() {
  const { data, isLoading } = useMyLeaveRequests();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Day Off</h1>
          <p className="text-muted-foreground">
            Request time off and view your leave history
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Request Day Off
          </Button>
        )}
      </div>

      {/* AC1 (9.4): Leave balance display */}
      <BalanceCard />

      {/* Request form */}
      {showForm && (
        <RequestForm onSuccess={() => setShowForm(false)} />
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">Loading requests...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pending section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Pending ({data?.pending.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.pending.length ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CalendarOff className="h-6 w-6 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No pending requests.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.pending.map((request) => (
                    <RequestCard key={request.id} request={request} showCancel />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarOff className="h-4 w-4" />
                Past ({data?.past.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.past.length ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CalendarOff className="h-6 w-6 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No past requests.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.past.map((request) => (
                    <RequestCard key={request.id} request={request} showCancel={false} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
