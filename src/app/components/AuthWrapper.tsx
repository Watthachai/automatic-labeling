'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const token = sessionStorage.getItem('token');
      
      // If we're on the login page, don't check auth
      if (pathname === '/login') {
        setIsLoading(false);
        return;
      }

      if (!token) {
        router.push('/login');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/verify-session', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          sessionStorage.removeItem('token');
          router.push('/login');
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        sessionStorage.removeItem('token');
        router.push('/login');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If on login page or authenticated, render children
  if (pathname === '/login' || isAuthenticated) {
    return <>{children}</>;
  }

  // Otherwise, return null and let the redirect handle it
  return null;
}