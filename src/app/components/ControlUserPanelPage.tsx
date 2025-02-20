'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logAudit } from '@/app/lib/audit';
import { saveProductionLog } from '@/lib/productionLogs';
import LoadingScreen from './LoadingScreen';
import { useArduino } from '../contexts/ArduinoContext';

interface ProductionLog {
  id?: string;
  userId: string;
  username: string;
  date: string;
  startTime: string;
  endTime: string;
  startCount: number;
  endCount: number;
  totalProduced: number;
  material?: string;
  batch?: string;
  vendorBatch?: string;
  materialDescription?: string;
  createdAt?: Date;
}

interface Props {
  productionData: SheetData | null;
}

interface SheetData {
  Material?: string;
  Batch?: string;
  "Vendor Batch"?: string;
  "Material Description"?: string;
  id?: string;
  [key: string]: string | number | undefined;
}

interface UserData {
  id: string;
  username: string;
  hospitalId: string;
  department: string;
}

export default function ControlUserPanelPage({ productionData }: Props) {
  const router = useRouter();
  const { status, connected, sendCommand, logs } = useArduino();
  const [user, setUser] = useState<UserData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startCount, setStartCount] = useState('0');
  const [currentCount, setCurrentCount] = useState('0');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [stopCount, setStopCount] = useState('0');
  const [targetCount, setTargetCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTargetPrompt, setShowTargetPrompt] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      setIsLoading(true);
      setError(null);
      
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/verify-session', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Session verification failed');
        }

        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Session verification failed');
        sessionStorage.removeItem('token');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [router]);

  // Monitor Arduino logs for count updates
  useEffect(() => {
    if (logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      if (lastLog.includes('COUNT:')) {
        const count = lastLog.split('COUNT:')[1].trim();
        setCurrentCount(count);
        if (isRunning) {
          setStopCount(count);
          
          // Check if target count is reached
          if (parseInt(count) >= targetCount) {
            handleStop();
          }
        }
      }
    }
  }, [logs, isRunning, targetCount]);

  const handleStartProduction = useCallback(async () => {
    if (!user?.id || !productionData?.Batch || !productionData?.id || !targetCount) {
      setError('กรุณาระบุจำนวนที่ต้องการผลิต');
      return;
    }

    if (!connected) {
      setError('กรุณาเชื่อมต่อ Arduino ก่อน');
      return;
    }

    try {
      await sendCommand('START');
      await logAudit(
        user.id,
        'START_PRODUCTION',
        `Started production for batch ${productionData.Batch} (Target: ${targetCount})`,
        productionData.id,
        window.location.hostname
      );
    } catch (error) {
      console.error('Failed to start production:', error);
      setError('ไม่สามารถเริ่มการผลิตได้');
    }
  }, [user?.id, productionData?.Batch, productionData?.id, targetCount, connected, sendCommand]);

  const handleStart = useCallback(() => {
    if (!productionData) {
      setError('กรุณาเลือกข้อมูลจาก Excel ก่อนเริ่มการผลิต');
      return;
    }
    
    if (!productionData.Batch || !productionData.Material) {
      setError('ข้อมูลการผลิตไม่ครบถ้วน กรุณาตรวจสอบไฟล์ Excel');
      return;
    }

    if (!connected) {
      setError('กรุณาเชื่อมต่อ Arduino ก่อนเริ่มการผลิต');
      return;
    }

    setShowTargetPrompt(true);
  }, [productionData, connected]);

  const confirmStart = useCallback((target: number) => {
    setTargetCount(target);
    setShowTargetPrompt(false);
    setIsRunning(true);
    setStartTime(new Date());
    setStartCount(currentCount);
    handleStartProduction();
  }, [currentCount, handleStartProduction]);

  const handleStop = useCallback(async () => {
    if (!user || !startTime) return;
    setIsRunning(false);

    const logData = {
      userId: user.id,
      username: user.username,
      date: new Date().toISOString().split('T')[0],
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      startCount: parseInt(startCount),
      endCount: parseInt(stopCount),
      totalProduced: parseInt(stopCount) - parseInt(startCount),
      material: productionData?.Material ?? undefined,
      batch: productionData?.Batch ?? undefined,
      vendorBatch: productionData?.["Vendor Batch"] ?? undefined,
      materialDescription: productionData?.["Material Description"] ?? undefined
    };

    try {
      await saveProductionLog(logData);
    } catch (error) {
      console.error('Error saving production log:', error);
      setError(error instanceof Error ? error.message : 'Failed to save production log');
    }
  }, [user, startTime, startCount, stopCount, productionData]);

  const handleCountUpdate = useCallback((count: string) => {
    setCurrentCount(count);
    if (isRunning) {
      setStopCount(count);
    }
  }, [isRunning]);

  const material = productionData?.Material;
  const batch = productionData?.Batch;
  const vendorBatch = productionData?.["Vendor Batch"]; // Access with bracket notation for keys with spaces
  const materialDescription = productionData?.["Material Description"];

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* User Info Header with Arduino Status */}
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
          <div className="flex items-center space-x-4">
            {/* Arduino Status */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
              <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {connected ? 'อุปกรณ์พร้อมใช้งาน' : 'ไม่พบการเชื่อมต่ออุปกรณ์'}
              </span>
            </div>
            {/* Logout Button */}
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
      </div>

      {/* Error Alert - Show at the top if there's an error */}
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

      {/* Target Count Prompt Modal */}
      {showTargetPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">กรุณาระบุจำนวนที่ต้องการผลิต</h3>
            <input
              type="number"
              min="1"
              className="w-full px-4 py-2 border rounded-lg mb-4"
              placeholder="จำนวนที่ต้องการผลิต"
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowTargetPrompt(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => confirmStart(targetCount)}
                disabled={!targetCount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
              >
                เริ่มผลิต
              </button>
            </div>
          </div>
        </div>
      )}

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
          <h3 className="text-lg font-semibold text-white">การควบคุมการผลิต</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={isRunning || !connected || !productionData}
              className={`flex-1 p-6 rounded-lg transition-all ${
                isRunning || !connected || !productionData
                  ? 'bg-gray-100 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">เริ่มการผลิต</div>
                <div className="text-sm opacity-90">
                  {!productionData 
                    ? 'กรุณาเลือกข้อมูลจาก Excel' 
                    : !connected 
                      ? 'รอการเชื่อมต่ออุปกรณ์' 
                      : `จำนวนปัจจุบัน: ${currentCount}`
                  }
                </div>
              </div>
            </button>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className={`flex-1 p-6 rounded-lg transition-all ${
                !isRunning
                  ? 'bg-gray-100 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">หยุดการผลิต</div>
                <div className="text-sm opacity-90">จำนวนปัจจุบัน: {stopCount}</div>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              {/* Add Target Progress */}
              <div className="bg-purple-50 rounded-lg p-4 text-center md:col-span-2">
                <div className="text-sm font-medium text-purple-600">Progress</div>
                <div className="text-lg font-bold text-purple-900">
                  {currentCount} / {targetCount}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((parseInt(currentCount) / targetCount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}