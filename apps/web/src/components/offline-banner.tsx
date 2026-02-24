'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';

/** AC6: Offline mode indicator for non-clock operations */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 text-sm text-yellow-800">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        You&apos;re offline. Clock-in/out still works, but other features require a connection.
      </span>
    </div>
  );
}
