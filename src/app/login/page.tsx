'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LoadingScreen from '../components/LoadingScreen';

interface LoginResponse {
  token: string;
  error?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    hospitalId: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json() as LoginResponse;

      if (!response.ok) {
        throw new Error(data.error || 'เข้าสู่ระบบล้มเหลว');
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('token', data.token);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 md:bg-gray-50 md:flex md:flex-row">

      {/* Hero Section - Shown differently on mobile */}
      <div className="w-full px-4 pt-8 pb-6 text-center text-white md:hidden">
        <h1 className="text-2xl font-bold mb-2">ระบบการผลิตโรงพยาบาล</h1>
        <p className="text-sm opacity-90">ระบบติดตามการผลิตทางการแพทย์ที่ปลอดภัยและมีประสิทธิภาพ</p>
      </div>

      {/* Desktop Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 justify-center items-center p-6 lg:p-12">
        <div className="max-w-xl text-white space-y-4 lg:space-y-6">
          <h1 className="text-3xl lg:text-4xl font-bold">
            ระบบการผลิตโรงพยาบาล
          </h1>
          <p className="text-lg lg:text-xl opacity-90">
            ระบบติดตามการผลิตทางการแพทย์ที่ปลอดภัยและมีประสิทธิภาพ
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-semibold">การเข้าถึงที่ปลอดภัย</h3>
              <p className="text-sm opacity-80">ระบบความปลอดภัยหลายชั้น</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-semibold">ติดตามแบบเรียลไทม์</h3>
              <p className="text-sm opacity-80">ตรวจสอบสถานะการผลิตได้ทันที</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-md bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Logo and Welcome Text */}
          <div className="text-center">
            <Image
              src="/hospital-logo.png"
              alt="โลโก้โรงพยาบาล"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              ยินดีต้อนรับ
            </h2>
            <p className="mt-2 text-sm text-gray-600">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="hospitalId" className="block text-sm font-medium text-gray-700">
                รหัสโรงพยาบาล
              </label>
              <input
                id="hospitalId"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 md:px-4 md:py-3 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-sm md:text-base"
                placeholder="กรอกรหัสโรงพยาบาล"
                value={credentials.hospitalId}
                onChange={(e) => setCredentials({...credentials, hospitalId: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 md:px-4 md:py-3 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-sm md:text-base"
                placeholder="กรอกชื่อผู้ใช้"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 md:px-4 md:py-3 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-sm md:text-base"
                placeholder="กรอกรหัสผ่าน"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full flex justify-center py-2 md:py-3 px-4 rounded-lg text-white text-sm md:text-base font-semibold
                ${isLoading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
                transition duration-150
              `}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 md:w-5 md:h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2 md:mr-3"></div>
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs md:text-sm text-gray-600">
              ต้องการความช่วยเหลือ? ติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}