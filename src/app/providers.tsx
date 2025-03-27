'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArduinoProvider } from './contexts/ArduinoContext';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip verification for login page
    if (pathname === '/login') {
      setIsLoading(false);
      return;
    }

    const verifySession = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          return;
        }

        // Update endpoint to match your verify endpoint
        const response = await fetch('/api/auth/verify', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error('Session verification failed');
        }
      } catch (error) {
        // Silent error handling - AuthWrapper will handle redirects
        console.error('Provider verification error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [pathname, router]);

  if (isLoading && pathname !== '/login') {
    return <div>Loading...</div>; // Or your preferred loading indicator
  }

  return (
    <ArduinoProvider>
      {children}
      <Toaster position="top-right" />
    </ArduinoProvider>
  );
}