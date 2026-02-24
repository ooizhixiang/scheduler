'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CalendarDays, Calendar, Bell, Settings } from 'lucide-react';
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

const mobileNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/my-schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/schedules', label: 'Builder', icon: Calendar, roles: ['ADMIN', 'MANAGER'] },
  { href: '/notifications', label: 'Alerts', icon: Bell, badge: 'unread-count' },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isVisible(item: NavItem, userRole?: string): boolean {
  if (!item.roles) return true;
  if (userRole === 'SUPER_ADMIN') return true;
  return item.roles.includes(userRole as Role);
}

export function MobileNav() {
  const pathname = usePathname();
  const employee = useAuthStore((s) => s.employee);
  const { data: unreadCount } = useUnreadCount();

  const visibleItems = mobileNavItems.filter((item) =>
    isVisible(item, employee?.systemRole),
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card lg:hidden">
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-1 py-2 px-3 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge === 'unread-count' && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
