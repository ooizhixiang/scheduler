'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { GridCell } from './grid-cell';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface PaintedCell {
  employeeId: string;
  date: string;
}

interface ApprovedLeaveEntry {
  id: string;
  employeeId: string;
  date: string;
  reason: string;
}

interface ScheduleGridProps {
  schedule: any;
  allEmployees: Employee[];
  conflicts: any[];
  approvedLeaves?: ApprovedLeaveEntry[];
  paintRole?: { id: string; name: string; color: string; shortCode: string } | null;
  onClickEmpty: (employeeId: string, date: string) => void;
  onClickShift: (shift: any) => void;
  onPaintComplete?: (cells: PaintedCell[]) => void;
}

export function ScheduleGrid({
  schedule, allEmployees, conflicts, approvedLeaves,
  paintRole, onClickEmpty, onClickShift, onPaintComplete,
}: ScheduleGridProps) {
  const isDraft = schedule.status === 'DRAFT';
  const isPaintMode = isDraft && !!paintRole;

  // Paint state
  const [paintedCells, setPaintedCells] = useState<Set<string>>(new Set());
  const [isPainting, setIsPainting] = useState(false);
  const paintedCellsRef = useRef<Set<string>>(new Set());

  // Build date range
  const dates = useMemo(() => {
    const result: Date[] = [];
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const current = new Date(start);
    while (current <= end) {
      result.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [schedule.startDate, schedule.endDate]);

  // Use ALL employees, sorted by last name then first name
  const employees = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of allEmployees) {
      map.set(emp.id, emp);
    }
    for (const shift of schedule.shifts || []) {
      if (!map.has(shift.employee.id)) {
        map.set(shift.employee.id, shift.employee);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`),
    );
  }, [allEmployees, schedule.shifts]);

  // Index shifts by employee+date
  const shiftIndex = useMemo(() => {
    const index = new Map<string, any[]>();
    for (const shift of schedule.shifts || []) {
      const dateKey = new Date(shift.date).toISOString().split('T')[0];
      const key = `${shift.employee.id}-${dateKey}`;
      const existing = index.get(key) || [];
      existing.push(shift);
      index.set(key, existing);
    }
    return index;
  }, [schedule.shifts]);

  // Set of occupied cell keys for paint mode skip
  const occupiedCells = useMemo(() => {
    const set = new Set<string>();
    shiftIndex.forEach((shifts, key) => {
      if (shifts.length > 0) {
        set.add(key);
      }
    });
    return set;
  }, [shiftIndex]);

  // Conflict map: shiftId → conflict objects
  const conflictMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const c of (conflicts || [])) {
      const existing = map.get(c.shiftId) || [];
      existing.push(c);
      map.set(c.shiftId, existing);
    }
    return map;
  }, [conflicts]);

  // Index approved leaves by employee+date
  const leaveIndex = useMemo(() => {
    const set = new Set<string>();
    for (const leave of (approvedLeaves || [])) {
      const dateKey = new Date(leave.date).toISOString().split('T')[0];
      set.add(`${leave.employeeId}-${dateKey}`);
    }
    return set;
  }, [approvedLeaves]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- Paint mode pointer handlers ---

  const tryAddCell = useCallback((cellKey: string) => {
    // Skip occupied cells
    if (occupiedCells.has(cellKey)) return;
    if (paintedCellsRef.current.has(cellKey)) return;
    const next = new Set(paintedCellsRef.current);
    next.add(cellKey);
    paintedCellsRef.current = next;
    setPaintedCells(next);
  }, [occupiedCells]);

  const handleCellPointerDown = useCallback((employeeId: string, dateKey: string, e: React.PointerEvent) => {
    if (!isPaintMode) return;
    e.preventDefault();
    // Capture pointer for smooth drag across cells
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsPainting(true);
    const cellKey = `${employeeId}-${dateKey}`;
    const next = new Set<string>();
    if (!occupiedCells.has(cellKey)) {
      next.add(cellKey);
    }
    paintedCellsRef.current = next;
    setPaintedCells(next);
  }, [isPaintMode, occupiedCells]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPainting || !isPaintMode) return;
    // Find the cell element under the pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const cell = (el as HTMLElement).closest('[data-cell-key]') as HTMLElement | null;
    if (!cell) return;
    const cellKey = cell.dataset.cellKey;
    if (cellKey) {
      tryAddCell(cellKey);
    }
  }, [isPainting, isPaintMode, tryAddCell]);

  const handlePointerUp = useCallback(() => {
    if (!isPainting) return;
    setIsPainting(false);
    const cells = Array.from(paintedCellsRef.current);
    setPaintedCells(new Set());
    paintedCellsRef.current = new Set();

    if (cells.length > 0 && onPaintComplete) {
      const parsed = cells.map((key) => {
        const [employeeId, date] = [key.substring(0, 36), key.substring(37)];
        return { employeeId, date };
      });
      onPaintComplete(parsed);
    }
  }, [isPainting, onPaintComplete]);

  // Tap-to-add for tablet: single click in paint mode creates one shift
  const handleCellTapPaint = useCallback((employeeId: string, dateKey: string) => {
    if (!isPaintMode) return;
    const cellKey = `${employeeId}-${dateKey}`;
    if (occupiedCells.has(cellKey)) return;
    onPaintComplete?.([{ employeeId, date: dateKey }]);
  }, [isPaintMode, occupiedCells, onPaintComplete]);

  return (
    <div
      className="overflow-auto relative"
      style={isPaintMode ? { cursor: 'crosshair' } : undefined}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="grid gap-px bg-border select-none"
        style={{
          gridTemplateColumns: `180px repeat(${dates.length}, minmax(120px, 1fr))`,
        }}
      >
        {/* Header row — sticky top */}
        <div className="bg-card sticky left-0 top-0 z-30 p-2 font-medium text-sm border-b">
          Employees
        </div>
        {dates.map((date) => (
          <div
            key={date.toISOString()}
            className="bg-card sticky top-0 z-20 p-2 text-center text-sm font-medium border-b"
          >
            <div>{dayNames[date.getDay()]}</div>
            <div className="text-xs text-muted-foreground">
              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}

        {/* Employee rows */}
        {employees.map((employee) => (
          <div key={employee.id} className="display-contents contents">
            <div className="bg-card sticky left-0 z-10 p-2 flex items-center gap-2 border-b">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
              <div className="text-sm truncate">
                {employee.firstName} {employee.lastName}
              </div>
            </div>
            {dates.map((date) => {
              const dateKey = date.toISOString().split('T')[0];
              const cellKey = `${employee.id}-${dateKey}`;
              const shifts = shiftIndex.get(cellKey) || [];
              const isPaintTarget = paintedCells.has(cellKey);
              const isOccupiedSkip = isPaintMode && isPainting && occupiedCells.has(cellKey);

              return (
                <div
                  key={`cell-${cellKey}`}
                  className="bg-card p-1 border-b relative"
                  data-cell-key={cellKey}
                  onPointerDown={(e) => handleCellPointerDown(employee.id, dateKey, e)}
                  onClick={() => {
                    if (isPaintMode && !isPainting) {
                      handleCellTapPaint(employee.id, dateKey);
                    }
                  }}
                >
                  <GridCell
                    shifts={shifts}
                    conflictMap={conflictMap}
                    isDraft={isDraft}
                    isPaintMode={isPaintMode}
                    hasApprovedLeave={leaveIndex.has(cellKey)}
                    onClickEmpty={() => !isPaintMode && onClickEmpty(employee.id, dateKey)}
                    onClickShift={(shift) => !isPaintMode && onClickShift(shift)}
                  />
                  {/* Ghost block overlay during paint */}
                  {isPaintTarget && paintRole && (
                    <div
                      className="absolute inset-1 rounded-md border-2 border-dashed flex items-center justify-center text-xs font-medium pointer-events-none animate-in fade-in-0 duration-150"
                      style={{
                        backgroundColor: `${paintRole.color}15`,
                        borderColor: paintRole.color,
                        color: paintRole.color,
                      }}
                    >
                      {paintRole.shortCode}
                    </div>
                  )}
                  {/* Skip indicator for occupied cells during drag */}
                  {isOccupiedSkip && (
                    <div className="absolute inset-1 rounded-md bg-muted/40 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-muted-foreground">Occupied</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty state */}
        {employees.length === 0 && (
          <div className="bg-card p-4 col-span-full text-center text-muted-foreground">
            No employees found. Add employees to start scheduling.
          </div>
        )}
      </div>
    </div>
  );
}
