'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  role: 'OPERATOR' | 'ADMIN';
  phoneNumber: string;
  department: string;
  hospitalId: string;
  hospital?: {
    name: string;
  };
  isActive: boolean;
  is2FAEnabled: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hospitals, setHospitals] = useState<{id: string, name: string}[]>([]);
  
  // Form states - ensure all string values are initialized as empty strings, not null
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    department: '',
    hospitalId: '',
    role: 'OPERATOR' as const, // Use const assertion to help TypeScript
    isActive: true,
    is2FAEnabled: true
  });

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          toast.error('ไม่พบข้อมูลการเข้าสู่ระบบ');
          return;
        }
        
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
      } finally {
        setLoading(false);
      }
    };

    const fetchHospitals = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/admin/hospitals', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch hospitals');
        const data = await response.json();
        setHospitals(data);
        
        // Initialize hospitalId with first hospital if available
        if (data.length > 0 && !formData.hospitalId) {
          setFormData(prev => ({
            ...prev,
            hospitalId: data[0].id
          }));
        }
      } catch (error) {
        console.error('Error fetching hospitals:', error);
      }
    };

    fetchUsers();
    fetchHospitals();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      // Ensure value is never null - use empty string if needed
      setFormData(prev => ({ ...prev, [name]: value ?? '' }));
    }
  };

  const openAddModal = () => {
    setSelectedUser(null);
    // Ensure all string values are empty strings, not null
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      department: '',
      hospitalId: hospitals.length > 0 ? hospitals[0].id : '',
      role: 'OPERATOR',
      isActive: true,
      is2FAEnabled: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    // Ensure all properties have valid values, not null
    setFormData({
      username: user.username || '',
      password: '',
      confirmPassword: '',
      phoneNumber: user.phoneNumber || '',
      department: user.department || '',
      hospitalId: user.hospitalId || '',
      role: user.role || 'OPERATOR',
      isActive: user.isActive !== undefined ? user.isActive : true,
      is2FAEnabled: user.is2FAEnabled !== undefined ? user.is2FAEnabled : true
    });
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.username) {
      toast.error('กรุณากรอกชื่อผู้ใช้');
      return false;
    }
    
    if (!selectedUser && !formData.password) {
      toast.error('กรุณากรอกรหัสผ่าน');
      return false;
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return false;
    }
    
    if (!formData.phoneNumber) {
      toast.error('กรุณากรอกเบอร์โทรศัพท์');
      return false;
    }
    
    if (!formData.hospitalId) {
      toast.error('กรุณาเลือกโรงพยาบาล');
      return false;
    }
    
    // ตรวจสอบรูปแบบเบอร์โทรศัพท์
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast.error('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย + และตามด้วยตัวเลข)');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      if (!token) {
        toast.error('ไม่พบข้อมูลการเข้าสู่ระบบ');
        return;
      }
      
      const url = selectedUser 
        ? `/api/admin/users/${selectedUser.id}` 
        : '/api/admin/users';
        
      const method = selectedUser ? 'PUT' : 'POST';
      
      // สร้างข้อมูลสำหรับส่ง API
      const apiData = { ...formData };
      
      // ลบ confirmPassword ออก
      delete apiData.confirmPassword;
      
      // ถ้าเป็นการแก้ไขและไม่ได้กรอกรหัสผ่าน ให้ลบออก
      if (selectedUser && !formData.password) {
        delete apiData.password;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'เกิดข้อผิดพลาด');
      }
      
      // รีเฟรชข้อมูลผู้ใช้
      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!usersResponse.ok) {
        throw new Error('Failed to refresh user list');
      }
      
      const updatedUsers = await usersResponse.json();
      setUsers(updatedUsers);
      
      setIsModalOpen(false);
      toast.success(selectedUser ? 'อัพเดทผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ');
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
      
      // อัพเดทสถานะในข้อมูลท้องถิ่น
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, isActive: !u.isActive } : u
      ));
      
      toast.success(`${user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} บัญชีผู้ใช้สำเร็จ`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะผู้ใช้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-xl font-medium text-gray-900">จัดการผู้ใช้งาน</h1>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          เพิ่มผู้ใช้ใหม่
        </button>
      </div>

      {loading && users.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
          <p className="mt-2 text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {users.length === 0 ? (
            <div className="text-center py-6 text-gray-500">ไม่พบข้อมูลผู้ใช้งาน</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อผู้ใช้
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    โรงพยาบาล
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    แผนก
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สิทธิ์
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.phoneNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.hospital?.name || user.hospitalId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'ผู้ปฏิบัติงาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        แก้ไข
                      </button>
                      <button 
                        onClick={() => toggleUserStatus(user)}
                        className={`${
                          user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={!!selectedUser} // ไม่ให้แก้ไขชื่อผู้ใช้ถ้าเป็นการแก้ไข
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  รหัสผ่าน {selectedUser && '(เว้นว่างถ้าไม่ต้องการเปลี่ยนแปลง)'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required={!selectedUser}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required={!selectedUser || formData.password !== ''}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  เบอร์โทรศัพท์ (รูปแบบ +66812345678)
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  แผนก
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="hospitalId" className="block text-sm font-medium text-gray-700">
                  โรงพยาบาล
                </label>
                <select
                  id="hospitalId"
                  name="hospitalId"
                  value={formData.hospitalId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  {hospitals.length > 0 ? (
                    hospitals.map(hospital => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </option>
                    ))
                  ) : (
                    <option value="">โปรดเพิ่มโรงพยาบาลก่อน</option>
                  )}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  สิทธิ์
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="OPERATOR">ผู้ปฏิบัติงาน</option>
                  <option value="ADMIN">ผู้ดูแลระบบ</option>
                </select>
              </div>
              
              <div className="flex items-center mb-4">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  เปิดใช้งาน
                </label>
              </div>
              
              <div className="flex items-center mb-4">
                <input
                  id="is2FAEnabled"
                  name="is2FAEnabled"
                  type="checkbox"
                  checked={formData.is2FAEnabled}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is2FAEnabled" className="ml-2 block text-sm text-gray-900">
                  เปิดใช้งานยืนยันตัวตน 2 ขั้นตอน
                </label>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {selectedUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}