'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logAudit } from '@/src/app/libs/audit';
import { saveProductionLog } from '@/src/app/libs/productionLogs';
import LoadingScreen from './LoadingScreen';
import { useArduino } from '../contexts/ArduinoContext';
import QRCode from 'react-qr-code';
import ReactDOMServer from 'react-dom/server';
import Image from 'next/image';

interface Props {
  productionData: SheetData | null;
  qrCodeDataUrl: string;
  onQrCodeGenerated?: (qrCodeUrl: string) => void;
}

interface SheetData {
  Material?: string;          // e.g., "300028287"
  Batch?: string;            // e.g., "310257947"
  "Vendor Batch"?: string;   // e.g., "2303138"
  "Material Description"?: string; // e.g., "Luer Lock (Infusion Pump Set)"
  Unit?: string;             // e.g., "PCS"
  "SLED/BBD"?: number;       // e.g., 45808
  id?: string;               // Generated if missing
  qrCode?: string;
  serialNumbers?: string[];
  timestamp?: string;
  [key: string]: string | number | string[] | undefined;
}

interface UserData {
  id: string;
  username: string;
  hospitalId: string;
  department: string;
}

// Add ProductionLogData interface
interface ProductionLogData {
  userId: string;
  username: string;
  date: string;
  startTime: string;
  endTime: string;
  startCount: number;
  endCount: number;
  totalProduced: number;
  material: string;
  batch: string;
  vendorBatch: string;
  materialDescription: string;
  qrCodeData: string;
  qrCodeImage: string;
  serialNumbers: string[];
  [key: string]: string | number | boolean | Date | string[] | undefined;
}

export default function ControlUserPanelPage({ productionData, qrCodeDataUrl, onQrCodeGenerated }: Props) {
  
  const router = useRouter();
  const {connected, sendCommand, logs } = useArduino();
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
  const [inputTargetCount, setInputTargetCount] = useState<string>(''); // Added state for input value
  const [printedCount, setPrintedCount] = useState(0); // Add state for tracking printed QR codes
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastPrintTime, setLastPrintTime] = useState<number>(0);

  // Add new state for completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    totalProduced: number;
    startTime: Date | null;
    endTime: Date | null;
    serialNumbers: string[];
  } | null>(null);

  // Add new state for kiosk mode
  const [isKioskMode, setIsKioskMode] = useState(false); // Add this near other state declarations

  // Add isProcessing state
  const [isProcessing, setIsProcessing] = useState(false);

  const generateQrCodeDataUrl = useCallback((data: SheetData): string => {
    const qrCodeData = JSON.stringify(data);
    const qrCodeElement = (
      <QRCode
        value={qrCodeData}
        size={100} // Reduced size
        level="L"
      />
    );
    const qrCodeSVG = ReactDOMServer.renderToString(qrCodeElement);
    return `data:image/svg+xml;base64,${btoa(qrCodeSVG)}`;
  }, []);
  
  const handlePrintQR = useCallback(async (qrImage: string, qrData: any) => {
    if (isPrinting) return false;

    try {
      setIsPrinting(true);
      
      // Use the passed qrCodeDataUrl if available
      const qrImageToUse = qrImage || qrCodeDataUrl;
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
  
      const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDocument) {
        throw new Error("Could not get iframe document");
      }
  
      iframeDocument.head.innerHTML = `
        <style>
          @media print {
            @page {
              size: 50mm 20mm;
              margin: 0;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      `;
  
      // In the handlePrintQR function, update the template
    iframeDocument.body.innerHTML = `
      <div class="print-section" style="width: 50mm; height: 20mm; display: flex; align-items: center; padding: 0mm; font-family: Arial, sans-serif;">
        <!-- QR Code Section -->
        <div style="width: 18mm; height: 18mm; flex-shrink: 0; margin: 1mm;">
          <img src="${qrCodeDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>

        <!-- Text Section -->
        <div style="flex-grow: 1; padding-left: 1mm; font-size: 4pt; line-height: 1.2;">
          <div style="font-weight: bold;">MAT:${qrData.Material}-UNIT:${qrData.Unit}</div>
          <div style="font-weight: bold;">BATCH:${qrData.Batch}</div>
          <div style="font-weight: bold;">${qrData["Material Description"]}</div>

          <!-- Details Grid -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5mm; margin-top: 0.5mm;">
            <div>
              <div style="font-weight: bold;">UNIT</div>
              <div>${qrData.Unit}</div>
            </div>
            <div>
              <div style="font-weight: bold;">Expire date</div>
              <div>${new Date((qrData["SLED/BBD"] - 25569) * 86400 * 1000).toLocaleDateString()}</div>
            </div>
            <div>
              <div style="font-weight: bold;">Vendor Batch</div>
              <div>${qrData["Vendor Batch"]}</div>
            </div>
          </div>
        </div>
      </div>
      `;
  
      return new Promise<boolean>((resolve) => {
        const cleanup = () => {
          if (iframe && document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        };
  
        if (isKioskMode) {
          iframe.contentWindow?.print();
          iframe.contentWindow?.addEventListener('afterprint', () => {
            cleanup();
            setPrintedCount(prev => prev + 1);
            console.log(`Print completed: ${printedCount + 1}/${targetCount}`);
            resolve(true);
          });
        } else {
          const shouldPrint = window.confirm('พิมพ์ QR Code?');
          if (shouldPrint) {
            iframe.contentWindow?.print();
            iframe.contentWindow?.addEventListener('afterprint', () => {
              cleanup();
              setPrintedCount(prev => prev + 1);
              console.log(`Print completed: ${printedCount + 1}/${targetCount}`);
              resolve(true);
            });
          } else {
            cleanup();
            resolve(false);
          }
        }
      });
  
    } catch (error) {
      console.error('Print error:', error);
      setError('ไม่สามารถพิมพ์ QR code ได้');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isPrinting, isKioskMode, printedCount, targetCount, qrCodeDataUrl, onQrCodeGenerated]);

  const isSaving = useRef(false);

  // Modify handleStop to show completion modal
  const handleStop = useCallback(async (forceStop: boolean = false) => {
    if (!user || !startTime) return;
    
    // Prevent multiple stop calls
    if (!isRunning || isSaving.current) return;
    
    // Only stop if we've reached target count or force stop
    if (!forceStop && parseInt(currentCount) < targetCount) {
      console.log('Production not complete yet');
      return;
    }
  
    try {
      // Set flag to prevent duplicate saves
      isSaving.current = true;
      
      // Set isRunning to false immediately to prevent duplicate calls
      setIsRunning(false);
      
      const finalCount = parseInt(currentCount);
      const initialCount = parseInt(startCount);
      const actualProduced = finalCount - initialCount;
  
      console.log(`Production complete: ${actualProduced} units produced`);
  
      // Create unique serial numbers
      const serialNumbers = Array.from(
        { length: actualProduced },
        (_, i) => `${productionData?.Batch}-${i + 1}`
      );
  
      const qrData = {
        ...productionData,
        serialNumbers,
        timestamp: new Date().toISOString(),
        finalCount,
        initialCount,
        actualProduced
      };
  
      // Generate final QR code
      const qrCodeImage = generateQrCodeDataUrl({
        ...qrData,
        type: 'SUMMARY'
      });
  
      const logData: ProductionLogData = {
        userId: user.id,
        username: user.username,
        date: new Date().toISOString().split('T')[0],
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        startCount: initialCount,
        endCount: finalCount,
        totalProduced: actualProduced,
        material: productionData?.Material ?? '',
        batch: productionData?.Batch ?? '',
        vendorBatch: productionData?.["Vendor Batch"] ?? '',
        materialDescription: productionData?.["Material Description"] ?? '',
        qrCodeData: JSON.stringify(qrData),
        qrCodeImage: qrCodeImage,
        serialNumbers
      };
  
      // Save production log
      const savedLog = await saveProductionLog(logData);
      console.log('Production log saved successfully:', savedLog);
      
      // Show completion modal after successful save
      setCompletionData({
        totalProduced: actualProduced,
        startTime,
        endTime: new Date(),
        serialNumbers
      });
      setShowCompletionModal(true);
      
      // Clear states only after successful save
      setPrintedCount(0);
      setCurrentCount('0');
      setStopCount('0');
      setTargetCount(0);
      setStartTime(null);
      
    } catch (error) {
      console.error('Error saving production log:', error);
      setError(error instanceof Error ? error.message : 'Failed to save production log');
      setIsRunning(true); // Restore running state if save fails
    } finally {
      // Reset save flag
      isSaving.current = false;
    }
  }, [
    user,
    startTime,
    currentCount,
    targetCount,
    startCount,
    productionData,
    generateQrCodeDataUrl,
    isRunning
  ]);

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

  // แก้ไข Arduino monitoring effect
  useEffect(() => {
    if (!logs.length || !isRunning) return;
  
    const lastLog = logs[logs.length - 1];
    console.log('Arduino log received:', lastLog);
  
    if (lastLog.includes('112') && !isPrinting && !isProcessing) {
      (async () => {
        try {
          setIsProcessing(true);
  
          // ตรวจสอบจำนวนปัจจุบันก่อนเพิ่ม
          const nextCount = parseInt(currentCount) + 1;
          console.log(`Processing item ${nextCount} of ${targetCount}`);
  
          // สร้างข้อมูล QR
          const qrData = {
            ...productionData,
            serialNumber: `${productionData?.Batch}-${nextCount}`,
            timestamp: new Date().toISOString()
          };
          
          const qrImage = generateQrCodeDataUrl(qrData);
          
          // พิมพ์ QR Code
          const printSuccess = await handlePrintQR(qrImage, qrData);
          
          if (printSuccess) {
            // อัพเดท state หลังจากพิมพ์สำเร็จ
            setCurrentCount(nextCount.toString());
            console.log(`Successfully printed item ${nextCount}`);
  
            // ถ้ายังไม่ครบจำนวน ส่งคำสั่งผลิตชิ้นต่อไป
            if (nextCount < targetCount) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log('Starting next production cycle');
              await sendCommand('111');
            } else {
              console.log('Production complete');
              await handleStop();
            }
          } else {
            console.log('Print failed');
          }
        } catch (error) {
          console.error('Error processing product:', error);
          setError('เกิดข้อผิดพลาดในการผลิต');
        } finally {
          setIsProcessing(false);
        }
      })();
    }
  }, [
    logs,
    isRunning,
    targetCount,
    currentCount,
    productionData,
    handleStop,
    sendCommand,
    generateQrCodeDataUrl,
    handlePrintQR,
    isPrinting,
    isProcessing
  ]);

  // แก้ไข handleStartProduction
  const handleStartProduction = useCallback(async (inputTarget?: number) => {
    try {
      const activeTarget = inputTarget || targetCount;
  
      // Validation checks
      if (!user?.id || !productionData?.Batch || !productionData?.Material) {
        throw new Error('ข้อมูลไม่ครบถ้วน');
      }
  
      // สร้างและพิมพ์ QR Code แรก
      const qrData = {
        ...productionData,
        serialNumber: `${productionData.Batch}-1`,
        timestamp: new Date().toISOString()
      };
      
      const qrImage = generateQrCodeDataUrl(qrData);
      const printSuccess = await handlePrintQR(qrImage, qrData);
  
      if (printSuccess) {
        // เริ่มการผลิตหลังจากพิมพ์สำเร็จ
        console.log('Starting production with target:', activeTarget);
        await sendCommand('111');
      } else {
        throw new Error('การพิมพ์ QR Code ไม่สำเร็จ');
      }
  
    } catch (error) {
      console.error('Start production error:', error);
      setError('ไม่สามารถเริ่มการผลิตได้: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsRunning(false);
      throw error;
    }
  }, [user, productionData, targetCount, sendCommand, handlePrintQR, generateQrCodeDataUrl]);

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

  const confirmStart = useCallback(async (target: number) => {
    console.log('confirmStart called with target:', target);

    if (isNaN(target) || target <= 0) {
      setError('กรุณาระบุจำนวนที่ต้องการผลิตให้ถูกต้อง');
      return;
    }

    try {
      // Set target count first
      setTargetCount(target);
      setShowTargetPrompt(false);
      setIsRunning(true);
      setStartTime(new Date());
      setStartCount(currentCount);

      // Add delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then start production with the target value directly
      await handleStartProduction(target); // Pass target directly
      
    } catch (error) {
      console.error('Error starting production:', error);
      setError('ไม่สามารถเริ่มการผลิตได้');
      setIsRunning(false);
    }
  }, [currentCount, handleStartProduction]); // Remove setTargetCount from dependencies

  // เพิ่ม useEffect สำหรับ monitor การเปลี่ยนแปลงของ state
  useEffect(() => {
    if (isRunning) {
      console.log('Production state updated:', {
        targetCount,
        currentCount,
        startCount,
        isRunning
      });
    }
  }, [targetCount, currentCount, startCount, isRunning]);

  // Monitor targetCount changes
  useEffect(() => {
    if (isRunning) {
      console.log('Target count updated:', targetCount);
    }
  }, [targetCount, isRunning]);

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

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-lg">
            <h3 className="text-lg font-semibold mb-4 text-red-600">พบข้อผิดพลาด</h3>
            <div className="mb-6 whitespace-pre-line text-gray-700">
              {error}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                ปิด
              </button>
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
              value={inputTargetCount} // Bind input value to state
              onChange={(e) => setInputTargetCount(e.target.value)} // Update input value state
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowTargetPrompt(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => confirmStart(parseInt(inputTargetCount))}
                disabled={!inputTargetCount}
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
          <h3 className="text-lg font-semibold text-white flex">Production Details 
          {qrCodeDataUrl ? (
              <Image 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                width={32}
                height={32}
                className="w-8 h-8"
            />
          ) : (
            <div className="text-gray-500">
              No QR code generated yet
            </div>
          )}
        </h3>
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
              onClick={() => handleStop(true)}
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

      {/* Add Kiosk Mode Toggle */}
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          id="kioskMode"
          checked={isKioskMode}
          onChange={(e) => setIsKioskMode(e.target.checked)}
          className="form-checkbox h-4 w-4 text-blue-600"
        />
        <label htmlFor="kioskMode" className="text-sm text-gray-600">
          โหมดการพิมพ์อัตโนมัติ (Kiosk Mode)
        </label>
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
                  {printedCount} / {targetCount}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((printedCount / targetCount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Completion Modal */}
      {showCompletionModal && completionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[32rem] max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-semibold mb-4 text-green-600">การผลิตเสร็จสมบูรณ์</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">จำนวนที่ผลิต</div>
                <div className="text-2xl font-bold text-gray-900">{completionData.totalProduced} ชิ้น</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">ระยะเวลาการผลิต</div>
                <div className="text-2xl font-bold text-gray-900">
                  {completionData.startTime && completionData.endTime ? 
                    `${Math.floor((completionData.endTime.getTime() - completionData.startTime.getTime()) / 60000)} นาที` 
                    : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Serial Numbers</div>
                <div className="mt-2 text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {completionData.serialNumbers.map((sn, index) => (
                    <div key={sn} className="py-1 border-b border-gray-100 last:border-0">
                      {sn}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}