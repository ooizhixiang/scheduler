'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { OfflineBanner } from '@/components/offline-banner';
import { useQueueFlush } from '@/hooks/use-clock-events';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // AC3 (Story 6.4): Auto-flush queued clock events when connectivity returns
  useQueueFlush();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
