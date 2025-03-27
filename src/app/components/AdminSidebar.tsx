import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface AdminSidebarProps {
  active: 'dashboard' | 'users' | 'reports';
}

export default function AdminSidebar({ active }: AdminSidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleLogout = () => {
    // ลบ token จาก session storage
    sessionStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <aside className={`bg-gray-800 text-white ${isExpanded ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isExpanded && (
            <Image src="/logo.png" alt="Logo" width={32} height={32} />
          )}
          {isExpanded && <span className="font-bold text-xl">Admin Panel</span>}
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-300 hover:text-white"
        >
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      <nav className="mt-5">
        <Link href="/admin" className={`flex items-center ${active === 'dashboard' ? 'bg-blue-700' : 'hover:bg-gray-700'} px-4 py-3 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {isExpanded && <span className="ml-3">แดชบอร์ด</span>}
        </Link>
        
        <Link href="/admin/users" className={`flex items-center ${active === 'users' ? 'bg-blue-700' : 'hover:bg-gray-700'} px-4 py-3 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {isExpanded && <span className="ml-3">จัดการผู้ใช้งาน</span>}
        </Link>
        
        <Link href="/admin/reports" className={`flex items-center ${active === 'reports' ? 'bg-blue-700' : 'hover:bg-gray-700'} px-4 py-3 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExpanded && <span className="ml-3">รายงาน</span>}
        </Link>
        
        <hr className="my-4 border-gray-600" />
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center hover:bg-gray-700 px-4 py-3 transition-colors text-left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isExpanded && <span className="ml-3">ออกจากระบบ</span>}
        </button>
      </nav>
    </aside>
  );
}