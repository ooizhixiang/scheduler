'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Tags,
  Building2,
  UsersRound,
  Bell,
  Settings,
  Calendar,
  MapPin,
  Clock,
  CalendarDays,
  ScrollText,
  ClipboardCheck,
  FileText,
  ClipboardList,
  CalendarOff,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUnreadCount } from '@/hooks/use-notifications';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles?: Role[];
  badge?: 'unread-count';
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedules', label: 'Schedules', icon: Calendar, roles: ['ADMIN', 'MANAGER'] },
  { href: '/my-schedule', label: 'My Schedule', icon: CalendarDays },
  { href: '/my-timesheet', label: 'My Timesheet', icon: FileText },
  { href: '/day-off', label: 'Day Off', icon: CalendarOff },
  { href: '/approvals', label: 'Approvals', icon: CheckCircle2, roles: ['ADMIN', 'MANAGER'] },
  { href: '/team-timesheets', label: 'Team Timesheets', icon: ClipboardList, roles: ['ADMIN', 'MANAGER'] },
  { href: '/attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['ADMIN', 'MANAGER'] },
  { href: '/employees', label: 'Employees', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { href: '/roles', label: 'Roles', icon: Tags, roles: ['ADMIN'] },
  { href: '/departments', label: 'Departments', icon: Building2, roles: ['ADMIN'] },
  { href: '/locations', label: 'Locations', icon: MapPin, roles: ['ADMIN'] },
  { href: '/availability', label: 'Availability', icon: Clock },
  { href: '/groups', label: 'Groups', icon: UsersRound, roles: ['ADMIN', 'MANAGER'] },
  { href: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread-count' },
  { href: '/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['SUPER_ADMIN'] },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isVisible(item: NavItem, userRole?: string): boolean {
  // No role restriction = visible to all
  if (!item.roles) return true;
  // SUPER_ADMIN sees everything
  if (userRole === 'SUPER_ADMIN') return true;
  // Check if user's role is in the allowed list
  return item.roles.includes(userRole as Role);
}

export function Sidebar() {
  const pathname = usePathname();
  const employee = useAuthStore((s) => s.employee);
  const { data: unreadCount } = useUnreadCount();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Scheduler</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => isVisible(item, employee?.systemRole))
          .map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge === 'unread-count' && unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
