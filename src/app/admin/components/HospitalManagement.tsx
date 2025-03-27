'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Hospital {
  id: string;
  name: string;
}

export default function HospitalManagement() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: ''
  });

  // Fetch hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch('/api/admin/hospitals', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch hospitals');
        const data = await response.json();
        setHospitals(data);
      } catch (error) {
        console.error('Error fetching hospitals:', error);
        toast.error('ไม่สามารถดึงข้อมูลโรงพยาบาลได้');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setSelectedHospital(null);
    setFormData({
      id: '',
      name: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setFormData({
      id: hospital.id,
      name: hospital.name
    });
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.id.trim()) {
      toast.error('กรุณากรอกรหัสโรงพยาบาล');
      return false;
    }
    
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อโรงพยาบาล');
      return false;
    }
    
    // ตรวจสอบรหัสซ้ำ (กรณีเพิ่มใหม่)
    if (!selectedHospital && hospitals.some(h => h.id === formData.id)) {
      toast.error('รหัสโรงพยาบาลนี้มีอยู่แล้ว');
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
      
      const url = selectedHospital
        ? `/api/admin/hospitals/${selectedHospital.id}`
        : '/api/admin/hospitals';
        
      const method = selectedHospital ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'เกิดข้อผิดพลาด');
      }
      
      // รีเฟรชข้อมูลโรงพยาบาล
      const hospitalsResponse = await fetch('/api/admin/hospitals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const updatedHospitals = await hospitalsResponse.json();
      setHospitals(updatedHospitals);
      
      setIsModalOpen(false);
      toast.success(selectedHospital ? 'อัพเดทโรงพยาบาลสำเร็จ' : 'เพิ่มโรงพยาบาลสำเร็จ');
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (hospital: Hospital) => {
    if (!confirm(`คุณต้องการลบโรงพยาบาล ${hospital.name} ใช่หรือไม่?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`/api/admin/hospitals/${hospital.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ไม่สามารถลบโรงพยาบาลได้');
      }
      
      // อัพเดทข้อมูลโรงพยาบาลในสเตท
      setHospitals(prev => prev.filter(h => h.id !== hospital.id));
      toast.success('ลบโรงพยาบาลสำเร็จ');
    } catch (error) {
      console.error('Error deleting hospital:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบโรงพยาบาล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-xl font-medium text-gray-900">จัดการโรงพยาบาล</h1>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          เพิ่มโรงพยาบาลใหม่
        </button>
      </div>

      {loading && hospitals.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
          <p className="mt-2 text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {hospitals.length === 0 ? (
            <div className="text-center py-6 text-gray-500">ไม่พบข้อมูลโรงพยาบาล</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รหัส
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อโรงพยาบาล
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hospitals.map((hospital) => (
                  <tr key={hospital.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{hospital.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hospital.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => openEditModal(hospital)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        แก้ไข
                      </button>
                      <button 
                        onClick={() => handleDelete(hospital)}
                        className="text-red-600 hover:text-red-900"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Hospital Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedHospital ? 'แก้ไขข้อมูลโรงพยาบาล' : 'เพิ่มโรงพยาบาลใหม่'}
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
                <label htmlFor="id" className="block text-sm font-medium text-gray-700">
                  รหัสโรงพยาบาล
                </label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={!!selectedHospital} // ไม่ให้แก้ไขรหัสถ้าเป็นการแก้ไขข้อมูล
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  ชื่อโรงพยาบาล
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
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
                  {selectedHospital ? 'บันทึกการแก้ไข' : 'เพิ่มโรงพยาบาล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}