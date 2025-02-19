'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logAudit } from '../lib/audit';

interface Props {
  productionData: SheetData | null;
  onLogProduction?: (logData: ProductionLog) => void;
}

interface SheetData {
  [key: string]: string | number | undefined;
}

interface User {
  id: string;
  username: string;
  hospitalId: string;
  department: string;
}

export default function ControlUserPanelPage({ productionData }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startCount, setStartCount] = useState('0000');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [stopCount, setStopCount] = useState('0000');

  useEffect(() => {
    // Verify authentication on component mount
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Verify token and get user data
    const verifySession = async () => {
      const response = await fetch('/api/verify-session', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        sessionStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const userData = await response.json();
      setUser(userData);
    };

    verifySession();
  }, []);

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
    // Save start count
    setStartCount(currentCount);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (onLogProduction && startTime) {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      
      onLogProduction({
        userId: currentUser.id,
        username: currentUser.username,
        date: new Date().toISOString().split('T')[0],
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        startCount: parseInt(startCount),
        endCount: parseInt(stopCount),
        totalProduced: parseInt(stopCount) - parseInt(startCount),
        material: productionData?.Material,
        batch: productionData?.Batch,
        vendorBatch: productionData?.["Vendor Batch"],
        materialDescription: productionData?.["Material Description"]
      });
    }
  };

  const handleStartProduction = async () => {
    // Log production start
    await logAudit(
      user.id,
      'START_PRODUCTION',
      `Started production for batch ${productionData.batch}`,
      productionData.id,
      window.location.hostname
    );
  };

  const material = productionData?.Material;
  const batch = productionData?.Batch;
  const vendorBatch = productionData?.["Vendor Batch"]; // Access with bracket notation for keys with spaces
  const materialDescription = productionData?.["Material Description"];


  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* User Info Header */}
      <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-blue-500">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Welcome, {user?.username}
            </h2>
            <p className="text-sm text-gray-600">
              Hospital ID: {user?.hospitalId} • Department: {user?.department}
            </p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('token');
              router.push('/login');
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Production Details Card */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Production Details</h3>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">Material</label>
              <p className="text-lg font-semibold text-gray-900">{material || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">Batch Number</label>
              <p className="text-lg font-semibold text-gray-900">{batch || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">Material Description</label>
              <p className="text-lg font-semibold text-gray-900">{materialDescription || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">Vendor Batch</label>
              <p className="text-lg font-semibold text-gray-900">{vendorBatch || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Production Controls */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Production Controls</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={isRunning}
              className={`flex-1 p-6 rounded-lg transition-all transform hover:scale-105 ${
                isRunning
                  ? 'bg-gray-100 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg'
              }`}
            >
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">Start Production</div>
                <div className="text-sm opacity-90">Current Count: {startCount}</div>
              </div>
            </button>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className={`flex-1 p-6 rounded-lg transition-all transform hover:scale-105 ${
                !isRunning
                  ? 'bg-gray-100 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg'
              }`}
            >
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">Stop Production</div>
                <div className="text-sm opacity-90">Current Count: {stopCount}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Production Stats */}
      {isRunning && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">Live Statistics</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">Start Time</div>
                <div className="text-lg font-bold text-purple-900">
                  {startTime?.toLocaleTimeString()}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">Duration</div>
                <div className="text-lg font-bold text-purple-900">
                  {startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0} min
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">Units Produced</div>
                <div className="text-lg font-bold text-purple-900">
                  {parseInt(stopCount) - parseInt(startCount)}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">Status</div>
                <div className="text-lg font-bold text-green-600">Active</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}