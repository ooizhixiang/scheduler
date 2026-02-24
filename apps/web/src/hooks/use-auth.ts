'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth({ required = true }: { required?: boolean } = {}) {
  const router = useRouter();
  const { isAuthenticated, employee, getAccessToken } = useAuthStore();

  useEffect(() => {
    if (required && !isAuthenticated) {
      router.push('/login');
    }
  }, [required, isAuthenticated, router]);

  return { isAuthenticated, employee, getAccessToken };
}
