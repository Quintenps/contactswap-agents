'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, API_SECRET_STORAGE_KEY } from '@/lib/api';

type AuthState = 'pending' | 'authenticated' | 'unauthenticated';

export function AdminLink(): React.ReactNode {
  const [authState, setAuthState] = useState<AuthState>('pending');

  useEffect(() => {
    async function checkAuth(): Promise<void> {
      try {
        const secret = localStorage.getItem(API_SECRET_STORAGE_KEY);
        if (!secret) {
          setAuthState('unauthenticated');
          return;
        }
        await api.verifyApiSecret(secret);
        setAuthState('authenticated');
      } catch {
        setAuthState('unauthenticated');
      }
    }

    void checkAuth();
  }, []);

  if (authState !== 'authenticated') {
    return null;
  }

  return (
    <Link href="/config" className="material-button material-button-primary mt-8">
      Go to admin
    </Link>
  );
}
