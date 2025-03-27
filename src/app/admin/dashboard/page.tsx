'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/src/app/components/AuthWrapper';
import UserManagement from '@/src/app/components/admin/UserManagement';
import HospitalManagement from '@/src/app/components/admin/HospitalManagement';
import AuditLogViewer from '@/src/app/components/admin/AuditLogViewer';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('users');

  // เช็คว่าผู้ใช้เป็น Admin หรือไม่
  useEffect(() => {
    const checkAdminRole = async () => {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // ดึงข้อมูลผู้ใช้จาก token
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Invalid session');
        }
        
        const userData = await response.json();
        
        if (userData.role !== 'ADMIN') {
          router.push('/');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/login');
      }
    };

    checkAdminRole();
  }, [router]);

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-800">Hospital Admin</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setCurrentTab('users')}
                className={`${
                  currentTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                ผู้ใช้งาน
              </button>
              <button
                onClick={() => setCurrentTab('hospitals')}
                className={`${
                  currentTab === 'hospitals'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                โรงพยาบาล
              </button>
              <button
                onClick={() => setCurrentTab('logs')}
                className={`${
                  currentTab === 'logs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                ประวัติการใช้งาน
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {currentTab === 'users' && <UserManagement />}
          {currentTab === 'hospitals' && <HospitalManagement />}
          {currentTab === 'logs' && <AuditLogViewer />}
        </div>
      </div>
    </AuthWrapper>
  );
}