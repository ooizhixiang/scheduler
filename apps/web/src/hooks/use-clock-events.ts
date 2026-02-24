'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import apiClient from '@/lib/api-client';

// ─── Event Queue Pattern (AC7 / Story 6.4) ─────────────────────────────────
// All clock events flow through a local queue → flush to server.
// Online mode: flush immediately. Offline mode: defer flush until connectivity returns.

export interface QueuedEvent {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  shiftId: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  status: 'PENDING' | 'FLUSHING' | 'DONE' | 'FAILED';
  error?: string;
  retryCount?: number;
}

const QUEUE_KEY = 'scheduler_clock_event_queue';
const MAX_RETRIES = 5;

// ─── Queue Storage (AC2: localStorage write verification) ────────────────────

function getQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save queue with AC2 write verification */
function saveQueue(queue: QueuedEvent[]): boolean {
  try {
    const json = JSON.stringify(queue);
    localStorage.setItem(QUEUE_KEY, json);
    // Verify write succeeded
    const readBack = localStorage.getItem(QUEUE_KEY);
    return readBack === json;
  } catch {
    return false;
  }
}

function addToQueue(event: Omit<QueuedEvent, 'id' | 'status' | 'retryCount'>): QueuedEvent | null {
  const entry: QueuedEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'PENDING',
    retryCount: 0,
  };
  const queue = getQueue();
  queue.push(entry);
  const ok = saveQueue(queue);
  if (!ok) return null; // AC2: write verification failed
  notifyQueueListeners();
  return entry;
}

function updateQueueEntry(id: string, updates: Partial<QueuedEvent>) {
  const queue = getQueue();
  const entry = queue.find((e) => e.id === id);
  if (entry) {
    Object.assign(entry, updates);
    saveQueue(queue);
    notifyQueueListeners();
  }
}

function removeFromQueue(id: string) {
  const queue = getQueue().filter((e) => e.id !== id);
  saveQueue(queue);
  notifyQueueListeners();
}

// ─── Queue Subscription (for reactive UI updates) ────────────────────────────

let queueListeners: (() => void)[] = [];
let queueSnapshot = getQueue();

function notifyQueueListeners() {
  queueSnapshot = getQueue();
  for (const listener of queueListeners) listener();
}

function subscribeToQueue(listener: () => void) {
  queueListeners.push(listener);
  return () => {
    queueListeners = queueListeners.filter((l) => l !== listener);
  };
}

function getQueueSnapshot() {
  return queueSnapshot;
}

/** Hook to reactively read the event queue */
export function useEventQueue() {
  return useSyncExternalStore(subscribeToQueue, getQueueSnapshot, () => []);
}

// ─── GPS Helper ──────────────────────────────────────────────────────────────

export type GpsErrorCode = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

export class GpsError extends Error {
  code: GpsErrorCode;
  constructor(code: GpsErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function requestGpsPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GpsError('UNSUPPORTED', 'Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case 1:
            reject(new GpsError(
              'PERMISSION_DENIED',
              'Location access is required for clock-in. Enable location services in your browser settings.',
            ));
            break;
          case 2:
            reject(new GpsError(
              'POSITION_UNAVAILABLE',
              'Unable to determine your location. Ensure GPS is enabled and you\'re not in airplane mode. Try again in a moment.',
            ));
            break;
          case 3:
            reject(new GpsError(
              'TIMEOUT',
              'Unable to determine your location. Ensure GPS is enabled and you\'re not in airplane mode. Try again in a moment.',
            ));
            break;
          default:
            reject(new GpsError('POSITION_UNAVAILABLE', err.message || 'GPS error'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

/** User-friendly GPS error guidance per error type */
export function getGpsGuidance(code: GpsErrorCode): string[] {
  switch (code) {
    case 'PERMISSION_DENIED':
      return [
        'Open your browser settings',
        'Find "Site Settings" or "Permissions"',
        'Allow location access for this site',
        'Tap "Clock In" again',
      ];
    case 'TIMEOUT':
    case 'POSITION_UNAVAILABLE':
      return [
        'Check that GPS/Location is enabled on your device',
        'Make sure you\'re not in airplane mode',
        'Move to an area with better reception',
        'Try again in a moment',
      ];
    case 'UNSUPPORTED':
      return [
        'Your browser doesn\'t support location services',
        'Try using Chrome or Safari on your phone',
      ];
    default:
      return ['Try again in a moment'];
  }
}

// ─── Queue Flush (AC3: connectivity recovery & event replay) ─────────────────

let flushing = false;

async function flushQueue(queryClient?: any): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  flushing = true;
  try {
    const queue = getQueue();
    const pending = queue.filter((e) => e.status === 'PENDING' || e.status === 'FAILED');

    // Replay events in chronological order
    const sorted = pending.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    for (const entry of sorted) {
      if ((entry.retryCount || 0) >= MAX_RETRIES) continue;

      updateQueueEntry(entry.id, { status: 'FLUSHING' });

      try {
        const endpoint = entry.type === 'CLOCK_IN'
          ? '/clock-events/clock-in'
          : '/clock-events/clock-out';

        await apiClient.post(endpoint, {
          shiftId: entry.shiftId,
          latitude: entry.latitude,
          longitude: entry.longitude,
          timestamp: entry.timestamp, // AC4: send client timestamp for offline replay
        });

        removeFromQueue(entry.id);
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Sync failed';
        const errorMsg = typeof msg === 'string' ? msg : msg?.message || 'Sync failed';
        updateQueueEntry(entry.id, {
          status: 'FAILED',
          error: errorMsg,
          retryCount: (entry.retryCount || 0) + 1,
        });
      }
    }

    // Invalidate queries after flush so UI refreshes
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['clock-events'] });
    }
  } finally {
    flushing = false;
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { shiftId: string; latitude?: number; longitude?: number }) => {
      const entry = addToQueue({
        type: 'CLOCK_IN',
        shiftId: params.shiftId,
        latitude: params.latitude,
        longitude: params.longitude,
        timestamp: new Date().toISOString(),
      });

      // AC2: localStorage write verification
      if (!entry) {
        throw new Error('Unable to save clock-in event. Storage may be full or unavailable.');
      }

      // If offline, resolve successfully — event is queued
      if (!navigator.onLine) {
        return { queued: true, id: entry.id };
      }

      try {
        updateQueueEntry(entry.id, { status: 'FLUSHING' });
        const { data } = await apiClient.post('/clock-events/clock-in', {
          shiftId: params.shiftId,
          latitude: params.latitude,
          longitude: params.longitude,
        });
        removeFromQueue(entry.id);
        return data.data || data;
      } catch (err) {
        updateQueueEntry(entry.id, { status: 'FAILED', error: (err as any).message });
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['clock-events'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { shiftId: string; latitude?: number; longitude?: number }) => {
      const entry = addToQueue({
        type: 'CLOCK_OUT',
        shiftId: params.shiftId,
        latitude: params.latitude,
        longitude: params.longitude,
        timestamp: new Date().toISOString(),
      });

      // AC2: localStorage write verification
      if (!entry) {
        throw new Error('Unable to save clock-out event. Storage may be full or unavailable.');
      }

      // If offline, resolve successfully — event is queued
      if (!navigator.onLine) {
        return { queued: true, id: entry.id };
      }

      try {
        updateQueueEntry(entry.id, { status: 'FLUSHING' });
        const { data } = await apiClient.post('/clock-events/clock-out', {
          shiftId: params.shiftId,
          latitude: params.latitude,
          longitude: params.longitude,
        });
        removeFromQueue(entry.id);
        return data.data || data;
      } catch (err) {
        updateQueueEntry(entry.id, { status: 'FAILED', error: (err as any).message });
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['clock-events'] });
    },
  });
}

/** Hook to automatically flush the queue when coming back online (AC3) */
export function useQueueFlush() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      flushQueue(queryClient);
    };

    window.addEventListener('online', handleOnline);

    // Also flush on mount if online and there are pending events
    if (navigator.onLine) {
      const queue = getQueue();
      if (queue.some((e) => e.status === 'PENDING' || e.status === 'FAILED')) {
        flushQueue(queryClient);
      }
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);
}

/** Retry a specific failed event (AC5) */
export function useRetryQueueEvent() {
  const queryClient = useQueryClient();

  return useCallback(
    async (eventId: string) => {
      const queue = getQueue();
      const entry = queue.find((e) => e.id === eventId);
      if (!entry) return;

      updateQueueEntry(eventId, { status: 'PENDING', error: undefined });

      if (navigator.onLine) {
        await flushQueue(queryClient);
      }
    },
    [queryClient],
  );
}

export function useShiftClockEvents(shiftId: string | undefined) {
  return useQuery({
    queryKey: ['clock-events', 'shift', shiftId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/clock-events/shift/${shiftId}`);
      return data.data || data;
    },
    enabled: !!shiftId,
  });
}

/** Story 6.5: Ad-hoc clock-in for unscheduled shifts */
export function useAdHocClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      latitude?: number;
      longitude?: number;
      roleId?: string;
      locationId?: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post('/clock-events/adhoc-clock-in', params);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['clock-events'] });
    },
  });
}

// ─── Story 8.2: Employee's own clock history ─────────────────────────────────

export function useMyClockHistory(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: ['clock-events', 'my-history', from, to],
    queryFn: async () => {
      const { data } = await apiClient.get(`/clock-events/my-history${qs}`);
      return data.data || data;
    },
    enabled: !!from && !!to,
  });
}

// ─── Story 7.1: Manager Clock Event Adjustments ─────────────────────────────

export function useEmployeeClockHistory(employeeId: string | undefined, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: ['clock-events', 'employee', employeeId, from, to],
    queryFn: async () => {
      const { data } = await apiClient.get(`/clock-events/employee/${employeeId}${qs}`);
      return data.data || data;
    },
    enabled: !!employeeId,
  });
}

export function useCreateManualClockEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      shiftId: string;
      type: 'CLOCK_IN' | 'CLOCK_OUT';
      timestamp: string;
      reason: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post('/clock-events/manual', params);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clock-events'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
    },
  });
}

export function useAdjustClockEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      eventId: string;
      timestamp: string;
      reason: string;
      notes?: string;
    }) => {
      const { eventId, ...body } = params;
      const { data } = await apiClient.post(`/clock-events/${eventId}/adjust`, body);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clock-events'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
    },
  });
}
