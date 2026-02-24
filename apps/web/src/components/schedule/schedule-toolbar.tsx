'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateNavigation } from './date-navigation';
import {
  Send, Copy, AlertTriangle, Paintbrush, X, Undo2, Redo2,
  Users, CalendarDays, ChevronLeft, ChevronRight, FilePen,
} from 'lucide-react';

export type ViewMode = 'BY_PERSON' | 'BY_DAY';

interface ViewStatusData {
  viewed: number;
  total: number;
  pending: number;
  viewedEmployees?: { id: string; firstName: string; lastName: string; viewedAt: string }[];
  pendingEmployees?: { id: string; firstName: string; lastName: string }[];
}

interface ScheduleToolbarProps {
  schedule: {
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  conflictCount: number;
  viewStatus?: ViewStatusData;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onPublishAmendments?: () => void;
  onCopy?: () => void;
  onShowConflicts?: () => void;
  onShowViews?: () => void;
  selectedRole?: any;
  roles?: any[];
  onRoleSelect?: (role: any) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
}

export function ScheduleToolbar({
  schedule, conflictCount, viewStatus,
  onPublish, onUnpublish, onPublishAmendments, onCopy, onShowConflicts, onShowViews,
  selectedRole, roles, onRoleSelect,
  canUndo, canRedo, onUndo, onRedo,
  viewMode = 'BY_PERSON', onViewModeChange,
  selectedDate, onSelectedDateChange,
}: ScheduleToolbarProps) {
  const isDraft = schedule.status === 'DRAFT';
  const isByDay = viewMode === 'BY_DAY';

  const handleRoleClick = (role: any) => {
    if (selectedRole?.id === role.id) {
      onRoleSelect?.(null);
    } else {
      onRoleSelect?.(role);
    }
  };

  // Day navigation for By Day view
  const navigateDay = (direction: -1 | 1) => {
    if (!selectedDate || !onSelectedDateChange) return;
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    const newDate = d.toISOString().split('T')[0];
    // Clamp to schedule range
    const start = schedule.startDate.split('T')[0];
    const end = schedule.endDate.split('T')[0];
    if (newDate >= start && newDate <= end) {
      onSelectedDateChange(newDate);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 pb-4 border-b">
      <div className="flex items-center gap-2 mr-auto">
        <h2 className="text-lg font-semibold">{schedule.name}</h2>
        <Badge variant={isDraft ? 'outline' : 'default'}>
          {schedule.status}
        </Badge>
      </div>

      {/* View mode toggle */}
      {onViewModeChange && (
        <div className="flex items-center gap-0.5 border rounded-md p-1">
          <button
            onClick={() => onViewModeChange('BY_PERSON')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              !isByDay ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
            title="By Person — grid view"
          >
            <Users className="h-3 w-3" />
            By Person
          </button>
          <button
            onClick={() => onViewModeChange('BY_DAY')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              isByDay ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
            title="By Day — timetable view (read-only)"
          >
            <CalendarDays className="h-3 w-3" />
            By Day
          </button>
        </div>
      )}

      {/* Date range or Day selector */}
      {isByDay && selectedDate ? (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <DateNavigation
          startDate={new Date(schedule.startDate)}
          endDate={new Date(schedule.endDate)}
        />
      )}

      {/* Undo/Redo buttons — in By Person view */}
      {!isByDay && (
        <div className="flex items-center gap-0.5 border rounded-md p-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Role paint selector — in By Person view */}
      {!isByDay && roles && roles.length > 0 && (
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Paintbrush className="h-3.5 w-3.5 text-muted-foreground mx-1" />
          {roles.map((role: any) => (
            <button
              key={role.id}
              onClick={() => handleRoleClick(role)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedRole?.id === role.id
                  ? 'text-white ring-2 ring-offset-1 ring-current'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
              style={selectedRole?.id === role.id ? { backgroundColor: role.color } : {}}
              title={`${role.name} — click to ${selectedRole?.id === role.id ? 'exit' : 'enter'} paint mode`}
            >
              {role.shortCode}
            </button>
          ))}
          {selectedRole && (
            <button
              onClick={() => onRoleSelect?.(null)}
              className="ml-1 p-1 rounded text-muted-foreground hover:bg-accent transition-colors"
              title="Exit paint mode (Esc)"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Paint mode indicator */}
      {selectedRole && !isByDay && (
        <Badge variant="outline" className="text-xs border-dashed" style={{ borderColor: selectedRole.color, color: selectedRole.color }}>
          Paint: {selectedRole.shortCode}
        </Badge>
      )}

      {conflictCount > 0 && (
        <Button variant="outline" size="sm" onClick={onShowConflicts}>
          <AlertTriangle className="mr-1 h-4 w-4 text-yellow-500" />
          {conflictCount}
        </Button>
      )}

      {viewStatus && schedule.status === 'PUBLISHED' && (
        <button
          onClick={onShowViews}
          className="flex items-center gap-2 border rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
          title={`${viewStatus.viewed} of ${viewStatus.total} employees have viewed`}
        >
          {/* Avatar stack */}
          <div className="flex items-center -space-x-1.5">
            {(viewStatus.viewedEmployees || []).slice(0, 3).map((emp) => (
              <div
                key={emp.id}
                className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium ring-2 ring-background"
                title={`${emp.firstName} ${emp.lastName}`}
              >
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
            ))}
            {(viewStatus.pending > 0) && (
              <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-medium ring-2 ring-background">
                +{viewStatus.pending}
              </div>
            )}
          </div>
          <span className={`text-xs font-medium ${viewStatus.viewed === viewStatus.total ? 'text-green-600' : 'text-muted-foreground'}`}>
            {viewStatus.viewed}/{viewStatus.total} viewed
          </span>
        </button>
      )}

      {isDraft && onPublish && (
        <Button size="sm" onClick={onPublish}>
          <Send className="mr-1 h-4 w-4" />Publish
        </Button>
      )}

      {!isDraft && onPublishAmendments && (
        <Button size="sm" variant="default" onClick={onPublishAmendments}>
          <FilePen className="mr-1 h-4 w-4" />Publish Changes
        </Button>
      )}

      {!isDraft && onUnpublish && (
        <Button variant="outline" size="sm" onClick={onUnpublish}>
          Unpublish
        </Button>
      )}

      {onCopy && (
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="mr-1 h-4 w-4" />Copy
        </Button>
      )}
    </div>
  );
}
