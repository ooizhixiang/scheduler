'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';

interface ShiftFieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface ShiftChange {
  type: 'ADDED' | 'MODIFIED' | 'REMOVED';
  shiftId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  roleName?: string;
  locationName?: string;
  fieldChanges?: ShiftFieldChange[];
}

interface EmployeeDiff {
  employeeId: string;
  employeeName: string;
  changes: ShiftChange[];
}

interface AmendmentPreview {
  scheduleId: string;
  scheduleName: string;
  hasChanges: boolean;
  affectedEmployeeCount: number;
  totalChanges: number;
  employeeDiffs: EmployeeDiff[];
}

interface DiffPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: AmendmentPreview | null | undefined;
  isLoading: boolean;
  isPublishing: boolean;
  onConfirm: () => void;
}

const CHANGE_ICONS = {
  ADDED: Plus,
  MODIFIED: Pencil,
  REMOVED: Trash2,
} as const;

const CHANGE_COLORS = {
  ADDED: 'text-green-600',
  MODIFIED: 'text-blue-600',
  REMOVED: 'text-red-500',
} as const;

const CHANGE_BG = {
  ADDED: 'bg-green-50 border-green-200',
  MODIFIED: 'bg-blue-50 border-blue-200',
  REMOVED: 'bg-red-50 border-red-200',
} as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function DiffPreview({
  open, onOpenChange, preview, isLoading, isPublishing, onConfirm,
}: DiffPreviewProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Review Changes</SheetTitle>
          <SheetDescription>
            {isLoading
              ? 'Computing changes...'
              : preview?.hasChanges
                ? `${preview.totalChanges} change${preview.totalChanges > 1 ? 's' : ''} affecting ${preview.affectedEmployeeCount} employee${preview.affectedEmployeeCount > 1 ? 's' : ''}`
                : 'No changes to publish.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">Analyzing changes...</p>
          )}

          {!isLoading && preview && !preview.hasChanges && (
            <p className="text-sm text-muted-foreground text-center py-8">
              The schedule matches the published version. No amendments to publish.
            </p>
          )}

          {!isLoading && preview?.employeeDiffs?.map((empDiff) => (
            <div key={empDiff.employeeId}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                  {empDiff.employeeName.split(' ').map((w) => w[0]).join('')}
                </div>
                <span className="text-sm font-medium">{empDiff.employeeName}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {empDiff.changes.length} change{empDiff.changes.length > 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="space-y-2 pl-9">
                {empDiff.changes.map((change, i) => {
                  const Icon = CHANGE_ICONS[change.type];
                  const color = CHANGE_COLORS[change.type];
                  const bg = CHANGE_BG[change.type];

                  return (
                    <Card key={i} className={`border ${bg}`}>
                      <CardContent className="py-2 px-3">
                        <div className="flex items-start gap-2">
                          <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {change.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(change.date)}
                              </span>
                            </div>

                            {(change.type === 'ADDED' || change.type === 'REMOVED') && (
                              <p className="text-xs mt-1">
                                {change.startTime}–{change.endTime}
                                {change.roleName && <span className="text-muted-foreground"> ({change.roleName})</span>}
                                {change.locationName && <span className="text-muted-foreground"> @ {change.locationName}</span>}
                              </p>
                            )}

                            {change.type === 'MODIFIED' && change.fieldChanges && (
                              <div className="mt-1 space-y-0.5">
                                {change.fieldChanges.map((fc, j) => (
                                  <p key={j} className="text-xs flex items-center gap-1">
                                    <span className="font-medium">{fc.field}:</span>
                                    <span className="text-red-500 line-through">{fc.oldValue}</span>
                                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                    <span className="text-green-600">{fc.newValue}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6">
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!preview?.hasChanges || isPublishing}
              className="flex-1"
            >
              {isPublishing ? 'Publishing...' : 'Confirm & Publish Changes'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
