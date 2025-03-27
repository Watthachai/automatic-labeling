"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import LoadingScreen from "../../components/LoadingScreen";

interface User {
  id: string;
  username: string;
  phoneNumber: string;
  department: string;
  hospitalId: string;
  role: string;
  isActive: boolean;
  is2FAEnabled: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    department: '',
    hospitalId: '',
    role: 'OPERATOR',
    isActive: true,
    is2FAEnabled: true
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      
      try {
        const token = sessionStorage.getItem('token');
        
        if (!token) {
          router.push('/login');
          return;
        }
        
        const response = await fetch('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
          department: formData.department,
          hospitalId: formData.hospitalId,
          role: formData.role,
          isActive: formData.isActive,
          is2FAEnabled: formData.is2FAEnabled
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ไม่สามารถเพิ่มผู้ใช้งานได้');
      }
      
      // Refresh user list
      const updatedUsersResponse = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (updatedUsersResponse.ok) {
        const updatedUsers = await updatedUsersResponse.json();
        setUsers(updatedUsers);
      }
      
      // Reset form and close modal
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        phoneNumber: '',
        department: '',
        hospitalId: '',
        role: 'OPERATOR',
        isActive: true,
        is2FAEnabled: true
      });
      setShowAddUserModal(false);
    } catch (error) {
      console.error('Error adding user:', error);
      setError(error instanceof Error ? error.message : 'ไม่สามารถเพิ่มผู้ใช้งานได้');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      phoneNumber: user.phoneNumber,
      department: user.department,
      hospitalId: user.hospitalId,
      role: user.role,
      isActive: user.isActive,
      is2FAEnabled: user.is2FAEnabled
    });
    setShowAddUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    
    try {
      const token = sessionStorage.getItem('token');
      
      const userData = {
        username: formData.username,
        phoneNumber: formData.phoneNumber,
        department: formData.department,
        hospitalId: formData.hospitalId,
        role: formData.role,
        isActive: formData.isActive,
        is2FAEnabled: formData.is2FAEnabled
      };
      
      // Only include password if it was changed
      if (formData.password) {
        Object.assign(userData, { password: formData.password });
      }
      
      const response = await fetch(`/api/admin/users/${editingUser?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ไม่สามารถอัพเดทผู้ใช้งานได้');
      }
      
      // Refresh user list
      const updatedUsersResponse = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (updatedUsersResponse.ok) {
        const updatedUsers = await updatedUsersResponse.json();
        setUsers(updatedUsers);
      }
      
      // Reset form and close modal
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        phoneNumber: '',
        department: '',
        hospitalId: '',
        role: 'OPERATOR',
        isActive: true,
        is2FAEnabled: true
      });
      setEditingUser(null);
      setShowAddUserModal(false);
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error instanceof Error ? error.message : 'ไม่สามารถอัพเดทผู้ใช้งานได้');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !isActive })
      });
      
      if (!response.ok) {
        throw new Error('ไม่สามารถเปลี่ยนสถานะผู้ใช้งานได้');
      }
      
      // Update user in the list
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !isActive } : user
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError(error instanceof Error ? error.message : 'ไม่สามารถเปลี่ยนสถานะผู้ใช้งานได้');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar active="users" />
      
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">จัดการผู้ใช้งาน</h1>
            <p className="text-gray-600">เพิ่ม แก้ไข หรือระงับการใช้งานของผู้ปฏิบัติงาน</p>
          </div>
          
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: '',
                password: '',
                confirmPassword: '',
                phoneNumber: '',
                department: '',
                hospitalId: '',
                role: 'OPERATOR',
                isActive: true,
                is2FAEnabled: true
              });
              setShowAddUserModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            เพิ่มผู้ใช้งานใหม่
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button
              className="float-right font-bold"
              onClick={() => setError(null)}
            >
              &times;
            </button>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อผู้ใช้
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เบอร์โทรศัพท์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  แผนก
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  โรงพยาบาล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  บทบาท
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  การจัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.hospitalId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'ผู้ปฏิบัติงาน'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                      className={`${
                        user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {user.isActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      
      {/* Add/Edit User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[28rem] max-w-[95vw]">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
            </h2>
            
            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อผู้ใช้</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!editingUser} // ถ้าเป็นการแก้ไข ไม่ให้แก้ไขชื่อผู้ใช้
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">รหัสผ่าน{editingUser ? ' (เว้นว่างหากไม่ต้องการเปลี่ยน)' : ''}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser} // ไม่บังคับกรอกรหัสผ่านหากเป็นการแก้ไข
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">ยืนยันรหัสผ่าน</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!editingUser || formData.password !== ''} // ต้องกรอกถ้าเป็นการเพิ่มหรือกรอกรหัสผ่านใหม่
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์ (รูปแบบ +66XXXXXXXXX)</label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    pattern="^\+[1-9]\d{1,14}$"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">แผนก</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">รหัสโรงพยาบาล</label>
                  <input
                    type="text"
                    name="hospitalId"
                    value={formData.hospitalId}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">บทบาท</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="OPERATOR">ผู้ปฏิบัติงาน</option>
                    <option value="ADMIN">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-700">เปิดใช้งาน</label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is2FAEnabled"
                    checked={formData.is2FAEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-700">เปิดใช้งานการยืนยัน 2 ขั้นตอน</label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}