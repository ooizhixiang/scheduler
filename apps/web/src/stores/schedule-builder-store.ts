'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShiftData {
  id: string;
  employeeId: string;
  roleId: string;
  locationId?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  employee: { id: string; firstName: string; lastName: string; email?: string };
  role: { id: string; name: string; color: string; shortCode: string };
  location?: { id: string; name: string } | null;
}

interface HistoryEntry {
  shifts: ShiftData[];
}

interface ScheduleBuilderState {
  scheduleId: string | null;
  shifts: ShiftData[];
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Initialization
  initSchedule: (scheduleId: string, shifts: ShiftData[]) => void;

  // Shift mutations (push to undo stack)
  addShift: (shift: ShiftData) => void;
  updateShift: (shiftId: string, shift: ShiftData) => void;
  removeShift: (shiftId: string) => void;
  setShifts: (shifts: ShiftData[]) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Clear
  clearHistory: () => void;
  reset: () => void;
}

const MAX_HISTORY = 50;

export const useScheduleBuilderStore = create<ScheduleBuilderState>()(
  persist(
    (set, get) => ({
      scheduleId: null,
      shifts: [],
      undoStack: [],
      redoStack: [],

      initSchedule: (scheduleId, shifts) => {
        const current = get();
        // Only reinitialize if schedule changed
        if (current.scheduleId === scheduleId) {
          // Sync from server — update shifts but keep history
          set({ shifts });
          return;
        }
        set({
          scheduleId,
          shifts,
          undoStack: [],
          redoStack: [],
        });
      },

      addShift: (shift) => {
        const { shifts, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-MAX_HISTORY + 1), { shifts }],
          redoStack: [],
          shifts: [...shifts, shift],
        });
      },

      updateShift: (shiftId, shift) => {
        const { shifts, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-MAX_HISTORY + 1), { shifts }],
          redoStack: [],
          shifts: shifts.map((s) => (s.id === shiftId ? shift : s)),
        });
      },

      removeShift: (shiftId) => {
        const { shifts, undoStack } = get();
        set({
          undoStack: [...undoStack.slice(-MAX_HISTORY + 1), { shifts }],
          redoStack: [],
          shifts: shifts.filter((s) => s.id !== shiftId),
        });
      },

      setShifts: (shifts) => {
        const current = get();
        set({
          undoStack: [...current.undoStack.slice(-MAX_HISTORY + 1), { shifts: current.shifts }],
          redoStack: [],
          shifts,
        });
      },

      undo: () => {
        const { shifts, undoStack, redoStack } = get();
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        set({
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, { shifts }],
          shifts: prev.shifts,
        });
      },

      redo: () => {
        const { shifts, undoStack, redoStack } = get();
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        set({
          redoStack: redoStack.slice(0, -1),
          undoStack: [...undoStack, { shifts }],
          shifts: next.shifts,
        });
      },

      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,

      clearHistory: () => set({ undoStack: [], redoStack: [] }),

      reset: () => set({
        scheduleId: null,
        shifts: [],
        undoStack: [],
        redoStack: [],
      }),
    }),
    {
      name: 'scheduler-builder-draft',
      partialize: (state) => ({
        scheduleId: state.scheduleId,
        shifts: state.shifts,
        // Don't persist undo/redo stacks to keep localStorage small
      }),
    },
  ),
);
