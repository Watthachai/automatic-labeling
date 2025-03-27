'use client';

import { useState } from 'react';
import AuthWrapper from '../components/AuthWrapper';
import UserManagement from './components/UserManagement';
import HospitalManagement from './components/HospitalManagement';
import { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-right" />
        
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">ระบบจัดการ</h1>
            <button 
              onClick={() => {
                sessionStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ออกจากระบบ
            </button>
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                จัดการผู้ใช้งาน
              </button>
              <button
                onClick={() => setActiveTab('hospitals')}
                className={`${
                  activeTab === 'hospitals'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                จัดการโรงพยาบาล
              </button>
            </nav>
          </div>
          
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'hospitals' && <HospitalManagement />}
        </div>
      </div>
    </AuthWrapper>
  );
}