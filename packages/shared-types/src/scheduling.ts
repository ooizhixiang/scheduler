export type ConflictType = 'OVERLAP' | 'AVAILABILITY' | 'HOURS_CAP';

export interface ShiftConflict {
  type: ConflictType;
  shiftId: string;
  employeeId: string;
  message: string;
  conflictingShiftId?: string;
}

export interface ScheduleViewStatus {
  total: number;
  viewed: number;
  pending: number;
  viewedEmployees: { id: string; firstName: string; lastName: string; viewedAt: string }[];
  pendingEmployees: { id: string; firstName: string; lastName: string; reminderSentAt?: string | null }[];
}

export interface AmendmentDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export type ShiftChangeType = 'ADDED' | 'MODIFIED' | 'REMOVED';

export interface ShiftFieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ShiftChange {
  type: ShiftChangeType;
  shiftId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  roleName?: string;
  locationName?: string;
  fieldChanges?: ShiftFieldChange[];
}

export interface EmployeeAmendmentDiff {
  employeeId: string;
  employeeName: string;
  changes: ShiftChange[];
}

export interface AmendmentPreview {
  scheduleId: string;
  scheduleName: string;
  hasChanges: boolean;
  affectedEmployeeCount: number;
  totalChanges: number;
  employeeDiffs: EmployeeAmendmentDiff[];
}
