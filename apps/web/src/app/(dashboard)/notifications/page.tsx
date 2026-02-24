'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDismissNotification,
} from '@/hooks/use-notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  AlertTriangle,
  UserPlus,
  KeyRound,
  Shield,
  Building2,
  Users,
  Settings,
  UserMinus,
  UserCheck,
  Eye,
  X,
  BookOpen,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

// --- Notification type classification ---

const ACTIONABLE_TYPES = new Set([
  'LEAVE_NUDGE',
  'LEAVE_ESCALATED',
  'ACCOUNT_INVITE',
  'PASSWORD_RESET',
  'MISSING_CLOCK_IN_REMINDER',
]);

// CTA config for actionable types
const CTA_CONFIG: Record<string, { label: string; defaultLink: string }> = {
  LEAVE_NUDGE: { label: 'Review', defaultLink: '/approvals' },
  LEAVE_ESCALATED: { label: 'Review', defaultLink: '/approvals' },
  MISSING_CLOCK_IN_REMINDER: { label: 'Clock In', defaultLink: '/my-schedule' },
  ACCOUNT_INVITE: { label: 'Set Password', defaultLink: '/set-password' },
  PASSWORD_RESET: { label: 'Reset', defaultLink: '/reset-password' },
};

// Icon + color config per notification type
const TYPE_STYLE: Record<string, { icon: any; color: string }> = {
  SCHEDULE_PUBLISHED: { icon: Calendar, color: 'text-blue-600 bg-blue-100' },
  SCHEDULE_UNPUBLISHED: { icon: CalendarX, color: 'text-slate-600 bg-slate-100' },
  SCHEDULE_AMENDED: { icon: Calendar, color: 'text-orange-600 bg-orange-100' },
  SCHEDULE_VIEW_REMINDER: { icon: Eye, color: 'text-purple-600 bg-purple-100' },
  LEAVE_APPROVED: { icon: CalendarCheck, color: 'text-green-600 bg-green-100' },
  LEAVE_REJECTED: { icon: CalendarX, color: 'text-red-600 bg-red-100' },
  LEAVE_NUDGE: { icon: Clock, color: 'text-amber-600 bg-amber-100' },
  LEAVE_ESCALATED: { icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  ACCOUNT_INVITE: { icon: UserPlus, color: 'text-blue-600 bg-blue-100' },
  PASSWORD_RESET: { icon: KeyRound, color: 'text-slate-600 bg-slate-100' },
  ROLE_ASSIGNED: { icon: Shield, color: 'text-indigo-600 bg-indigo-100' },
  ROLE_REMOVED: { icon: Shield, color: 'text-slate-600 bg-slate-100' },
  DEPARTMENT_CHANGED: { icon: Building2, color: 'text-teal-600 bg-teal-100' },
  GROUP_ADDED: { icon: Users, color: 'text-cyan-600 bg-cyan-100' },
  GROUP_REMOVED: { icon: Users, color: 'text-slate-600 bg-slate-100' },
  SETTINGS_UPDATED: { icon: Settings, color: 'text-slate-600 bg-slate-100' },
  EMPLOYEE_ARCHIVED: { icon: UserMinus, color: 'text-red-600 bg-red-100' },
  EMPLOYEE_REACTIVATED: { icon: UserCheck, color: 'text-green-600 bg-green-100' },
  EMPLOYEE_JOINED: { icon: UserPlus, color: 'text-green-600 bg-green-100' },
  MISSING_EMPLOYEES: { icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  ALL_CLEAR: { icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
  ADHOC_CLOCK_IN: { icon: Clock, color: 'text-blue-600 bg-blue-100' },
  MISSING_CLOCK_IN_REMINDER: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-100' },
  CLOCK_OUT_WARNING: { icon: Clock, color: 'text-orange-600 bg-orange-100' },
  AUTO_CLOCK_OUT: { icon: Clock, color: 'text-slate-600 bg-slate-100' },
};

const DEFAULT_STYLE = { icon: Bell, color: 'text-slate-600 bg-slate-100' };

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Swipeable notification item (mobile) ---

interface SwipeableProps {
  children: React.ReactNode;
  onDismiss: () => void;
  onMarkRead: () => void;
  isRead: boolean;
}

function SwipeableNotification({ children, onDismiss, onMarkRead, isRead }: SwipeableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const swipingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    swipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = startXRef.current - e.touches[0].clientX;
    if (diff > 10) {
      swipingRef.current = true;
      currentXRef.current = Math.min(diff, 160);
      if (containerRef.current) {
        containerRef.current.style.transform = `translateX(-${currentXRef.current}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (containerRef.current) {
      if (currentXRef.current > 80) {
        containerRef.current.style.transform = 'translateX(-160px)';
      } else {
        containerRef.current.style.transform = 'translateX(0)';
      }
      containerRef.current.style.transition = 'transform 0.2s ease-out';
      setTimeout(() => {
        if (containerRef.current) containerRef.current.style.transition = '';
      }, 200);
    }
    swipingRef.current = false;
  }, []);

  const resetSwipe = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.2s ease-out';
      containerRef.current.style.transform = 'translateX(0)';
      setTimeout(() => {
        if (containerRef.current) containerRef.current.style.transition = '';
      }, 200);
    }
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg lg:overflow-visible">
      {/* Hidden action buttons (revealed on swipe) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch lg:hidden">
        {!isRead && (
          <button
            className="flex w-20 items-center justify-center bg-blue-500 text-white text-xs font-medium"
            onClick={() => { onMarkRead(); resetSwipe(); }}
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Read
          </button>
        )}
        <button
          className="flex w-20 items-center justify-center bg-red-500 text-white text-xs font-medium"
          onClick={() => { onDismiss(); }}
        >
          <X className="h-4 w-4 mr-1" />
          Dismiss
        </button>
      </div>
      {/* Swipeable card */}
      <div
        ref={containerRef}
        className="relative z-10 bg-card"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// --- Main page ---

export default function NotificationsPage() {
  useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const dismiss = useDismissNotification();

  const handleNotificationClick = (notification: any) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    // Navigate to link if present
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated on schedules, approvals, and team events
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !data?.items?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">You're all caught up!</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Notifications about schedules, approvals, and team updates will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map((notification: any) => {
              const style = TYPE_STYLE[notification.type] || DEFAULT_STYLE;
              const Icon = style.icon;
              const isActionable = ACTIONABLE_TYPES.has(notification.type);
              const cta = CTA_CONFIG[notification.type];

              return (
                <SwipeableNotification
                  key={notification.id}
                  isRead={notification.isRead}
                  onDismiss={() => dismiss.mutate(notification.id)}
                  onMarkRead={() => markRead.mutate(notification.id)}
                >
                  <Card
                    className={`transition-colors ${
                      !notification.isRead
                        ? 'border-primary/30 bg-primary/5'
                        : ''
                    } ${notification.link ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="flex items-start gap-3 py-4">
                      {/* Type icon */}
                      <div className={`mt-0.5 rounded-full p-2 shrink-0 ${style.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {getRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.body}
                        </p>

                        {/* CTA for actionable notifications */}
                        {isActionable && cta && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notification.isRead) markRead.mutate(notification.id);
                              router.push(notification.link || cta.defaultLink);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {cta.label}
                          </Button>
                        )}
                      </div>

                      {/* Unread dot + desktop actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!notification.isRead && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                        {/* Desktop-only dismiss button */}
                        <button
                          className="hidden lg:flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Dismiss"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss.mutate(notification.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableNotification>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
