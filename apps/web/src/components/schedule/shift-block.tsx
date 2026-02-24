'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, CalendarOff } from 'lucide-react';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';

interface ShiftConflict {
  type: 'OVERLAP' | 'AVAILABILITY' | 'HOURS_CAP';
  message: string;
  shiftId: string;
  employeeId: string;
  conflictingShiftId?: string;
}

interface ShiftBlockProps {
  shift: {
    id: string;
    startTime: string;
    endTime: string;
    role: { name: string; color: string; shortCode: string };
    location?: { name: string } | null;
    notes?: string | null;
  };
  conflicts?: ShiftConflict[];
  hasConflict?: boolean;
  onClick?: () => void;
}

function ConflictIcon({ type }: { type: string }) {
  switch (type) {
    case 'OVERLAP':
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    case 'HOURS_CAP':
      return <Clock className="h-3 w-3 text-orange-500" />;
    case 'AVAILABILITY':
      return <CalendarOff className="h-3 w-3 text-red-400" />;
    default:
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
  }
}

export function ShiftBlock({ shift, conflicts, hasConflict, onClick }: ShiftBlockProps) {
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  const timeStr = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const hasConflicts = (conflicts && conflicts.length > 0) || hasConflict;

  const block = (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full rounded-md px-2 py-1 text-left text-xs border transition-colors hover:opacity-80',
        'cursor-pointer',
      )}
      style={{
        backgroundColor: `${shift.role.color}20`,
        borderColor: shift.role.color,
        borderLeftWidth: '3px',
      }}
    >
      <div className="font-medium truncate" style={{ color: shift.role.color }}>
        {shift.role.shortCode}
      </div>
      <div className="text-muted-foreground truncate">{timeStr}</div>
      {shift.location && (
        <div className="text-muted-foreground truncate text-[10px]">{shift.location.name}</div>
      )}
      {hasConflicts && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5">
          {conflicts && conflicts.length > 0 ? (
            conflicts.map((c, i) => (
              <ConflictIcon key={`${c.type}-${i}`} type={c.type} />
            ))
          ) : (
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
          )}
        </div>
      )}
    </button>
  );

  // Wrap in tooltip if there are conflicts with messages
  if (conflicts && conflicts.length > 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {block}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px]">
            <div className="space-y-1">
              {conflicts.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <ConflictIcon type={c.type} />
                  <span className="text-xs">{c.message}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return block;
}
