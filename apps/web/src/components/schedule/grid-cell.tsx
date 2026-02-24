'use client';

import { cn } from '@/lib/utils';
import { ShiftBlock } from './shift-block';
import { Plus, CalendarOff } from 'lucide-react';

interface GridCellProps {
  shifts: any[];
  conflictMap: Map<string, any[]>;
  isDraft: boolean;
  isPaintMode?: boolean;
  hasApprovedLeave?: boolean;
  onClickEmpty: () => void;
  onClickShift: (shift: any) => void;
}

export function GridCell({ shifts, conflictMap, isDraft, isPaintMode, hasApprovedLeave, onClickEmpty, onClickShift }: GridCellProps) {
  return (
    <div
      className={cn(
        'min-h-[80px] border rounded-md p-1 space-y-1 transition-colors',
        isDraft && !isPaintMode && 'hover:bg-accent/50 cursor-pointer',
        isPaintMode && 'cursor-crosshair',
        hasApprovedLeave && 'bg-amber-50/50',
      )}
      onClick={(e) => {
        if (isPaintMode) return;
        if (isDraft && shifts.length === 0 && e.target === e.currentTarget) {
          onClickEmpty();
        }
      }}
    >
      {/* AC1 (9.5): Day Off badge for approved leave — shift NOT removed (FR29) */}
      {hasApprovedLeave && (
        <div className="flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-2 py-1 text-xs font-medium text-amber-800">
          <CalendarOff className="h-3 w-3" />
          Day Off
        </div>
      )}
      {shifts.map((shift) => (
        <ShiftBlock
          key={shift.id}
          shift={shift}
          conflicts={conflictMap.get(shift.id)}
          onClick={() => {
            if (!isPaintMode) onClickShift(shift);
          }}
        />
      ))}
      {isDraft && !isPaintMode && shifts.length === 0 && !hasApprovedLeave && (
        <button
          onClick={onClickEmpty}
          className="w-full h-full min-h-[60px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      {isDraft && !isPaintMode && (shifts.length > 0 || hasApprovedLeave) && (
        <button
          onClick={(e) => { e.stopPropagation(); onClickEmpty(); }}
          className="w-full flex items-center justify-center py-0.5 text-muted-foreground/50 hover:text-foreground transition-colors rounded"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
