'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from './LoadingScreen';
import { toast } from 'react-hot-toast';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthWrapper({ children, requireAdmin = false }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Removed unused state variable userRole

  useEffect(() => {
    // Skip verification for login page
    if (pathname === '/login') {
      setIsLoading(false);
      return;
    }

    const verifySession = async () => {
      setIsLoading(true);
      
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
        router.push('/login');
        return;
      }

      try {
        console.log('Verifying with token...');
        const response = await fetch('/api/auth/verify', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error('Session verification failed');
        }

        const userData = await response.json();
        console.log('User verified:', userData);
        // No need to set userRole since we're not using it
        setIsAuthenticated(true);

        // If admin access is required but user is not admin
        if (requireAdmin && userData.role !== 'ADMIN') {
          toast.error('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
          router.push('/');
        }
      } catch (err) {
        console.error('Authentication error:', err);
        sessionStorage.removeItem('token');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [pathname, router, requireAdmin]);

  // Only show loading screen on initial load and for protected routes
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not on login page and not authenticated, don't render anything yet
  if (pathname !== '/login' && !isAuthenticated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}