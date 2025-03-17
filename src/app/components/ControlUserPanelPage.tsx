'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  [key: string]: string | number | boolean | string[] | undefined;
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
  const [remainingPrints, setRemainingPrints] = useState(0); // จำนวนที่เหลือที่จะปริ้นในรอบนี้
  const [totalPrints, setTotalPrints] = useState(0); // จำนวนที่ต้องการปริ้นทั้งหมด
  const [isStopRequested, setIsStopRequested] = useState(false);
  const [hasSentInitialCommand, setHasSentInitialCommand] = useState(false);
  const [hasSaved, setHasSaved] = useState(false); // Move this up with other state declarations
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    totalProduced: number;
    startTime: Date | null;
    endTime: Date | null;
    serialNumbers: string[];
  } | null>(null);

  // Add new state for kiosk mode
  // const [isKioskMode, setIsKioskMode] = useState(false); // Add this near other state declarations
  const isKioskMode = true; // Always use kiosk mode

  // Add isProcessing state
  const [isProcessing, setIsProcessing] = useState(false);

  // เพิ่มสถานะเพื่อติดตามว่ากำลังรอการตอบกลับจาก Arduino
  const [waitingForArduinoResponse, setWaitingForArduinoResponse] = useState(false);


  // 1️⃣ เพิ่มฟังก์ชันนี้ หลังจาก useState, useRef
    const printInitialQRCodes = async (target: number) => {
      const firstBatch = Math.min(target, 15); // พิมพ์มากสุด 15 ชิ้นก่อน
      console.log(`Printing first ${firstBatch} QR codes...`);

      for (let i = 1; i <= firstBatch; i++) {
        console.log(`Printing QR Code ${i}/${target}`);
        await handlePrintQR(qrCodeDataUrl, productionData as SheetData, false, target);
      }

      console.log(`Printed first ${firstBatch} QR codes.`);
      return firstBatch; // คืนค่าจำนวนที่พิมพ์แล้ว
    };

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

  // เพิ่ม printedCountRef เพื่อติดตามค่า printedCount ล่าสุด
  const printedCountRef = useRef(0);

  const isSaving = useRef(false);

  // เพิ่ม ref นี้ต่อจาก printedCountRef
const startTimeRef = useRef<Date | null>(null);

  // แก้ไขฟังก์ชัน handleStop เพื่อใช้ printedCountRef

    // เพิ่มฟังก์ชันใหม่เพื่อบันทึกข้อมูลการผลิตโดยไม่ต้องขึ้นกับ handleStop
const saveProductionData = useCallback(async () => {
  if (!user || !startTime || isSaving.current) {
    console.log('ไม่สามารถบันทึกได้');
    return;
  }

  try {
    isSaving.current = true;

    // ใช้ค่าจาก ref เพื่อให้แน่ใจว่าเป็นค่าล่าสุด
    const actualProduced = Math.max(printedCountRef.current, parseInt(currentCount) || 0, printedCount);

    console.log(`กำลังบันทึกข้อมูลการผลิต: ${actualProduced} units produced`);

    // สร้าง serial numbers ตามจำนวนที่ผลิตจริง
    const serialNumbers = Array.from(
      { length: actualProduced },
      (_, i) => `${productionData?.Batch}-${i + 1}`
    );

    // บันทึกข้อมูลการผลิตลง database
    const endTime = new Date();

    const productionLogData: ProductionLogData = {
      userId: user.id,
      username: user.username,
      date: new Date().toISOString().split('T')[0],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      startCount: parseInt(startCount) || 0,
      endCount: actualProduced,
      totalProduced: actualProduced,
      material: productionData?.Material || '',
      batch: productionData?.Batch || '',
      vendorBatch: productionData?.["Vendor Batch"] || '',
      materialDescription: productionData?.["Material Description"] || '',
      qrCodeData: JSON.stringify(productionData),
      qrCodeImage: generateQrCodeDataUrl(productionData),
      serialNumbers: serialNumbers,
    };

    // บันทึกข้อมูลการผลิต
    const savedLog = await saveProductionLog(productionLogData);
    console.log('Production log saved successfully:', savedLog);

    // แสดงข้อมูลการผลิตในหน้า completion modal
    setCompletionData({
      totalProduced: actualProduced,
      startTime: startTime,
      endTime: endTime,
      serialNumbers: serialNumbers
    });

    // แสดง modal สรุปการผลิต
    setShowCompletionModal(true);

    // รีเซ็ตค่าต่างๆ
    setWaitingForArduinoResponse(false);
    printedCountRef.current = 0;
    setPrintedCount(0);
    setCurrentCount('0');
    setStopCount('0');

    return true;
  } catch (error) {
    console.error('Error saving production data:', error);
    return false;
  } finally {
    isSaving.current = false;
  }
}, [user, startTime, currentCount, startCount, productionData, generateQrCodeDataUrl, printedCount]);

// แก้ไขฟังก์ชัน saveProductionDataWithRef

const saveProductionDataWithRef = useCallback(async () => {
  if (!user) {
    console.log('ไม่สามารถบันทึกข้อมูลด้วย ref: ไม่พบข้อมูลผู้ใช้');
    return false;
  }

  if (!startTimeRef.current && !startTime) {
    console.log('ไม่สามารถบันทึกข้อมูลด้วย ref: ไม่พบเวลาเริ่มต้น');
    return false;
  }

  if (isSaving.current) {
    console.log('ไม่สามารถบันทึกข้อมูลด้วย ref: กำลังบันทึกอยู่แล้ว');
    return false;
  }

  console.log('เริ่มบันทึกข้อมูลด้วย ref:', {
    user: !!user,
    startTime: !!startTime,
    startTimeRef: !!startTimeRef.current,
    isSaving: isSaving.current,
    printedCount,
    printedCountRef: printedCountRef.current,
    targetCount
  });

  try {
    isSaving.current = true;

    // ใช้ค่า targetCount เป็นค่าอ้างอิงเมื่อมีการหยุดการทำงานหลังเสร็จสิ้นครบตามเป้าหมาย
    const isCompletedRun = printedCountRef.current >= targetCount;

    // ใช้ค่าจาก targetCount เมื่อทำงานเสร็จครบตามเป้าหมาย
    // มิฉะนั้นใช้ค่าจริงที่นับได้
    const actualProduced = isCompletedRun ?
      targetCount :
      Math.max(printedCountRef.current, parseInt(currentCount) || 0, printedCount);

    console.log(`กำลังบันทึกข้อมูลการผลิต (ref): ${actualProduced} units produced, isCompleted: ${isCompletedRun}`);

    // สร้าง serial numbers ตามจำนวนที่ผลิตจริง
    const serialNumbers = Array.from(
      { length: actualProduced },
      (_, i) => `${productionData?.Batch}-${i + 1}`
    );

    // บันทึกข้อมูลการผลิตลง database
    const endTime = new Date();
    const effectiveStartTime = startTimeRef.current || startTime;

    if (!effectiveStartTime) {
      console.error('ไม่พบข้อมูลเวลาเริ่มต้น');
      return false;
    }

    const productionLogData = {
      userId: user.id,
      username: user.username,
      date: new Date().toISOString().split('T')[0],
      startTime: effectiveStartTime.toISOString(),
      endTime: endTime.toISOString(),
      startCount: parseInt(startCount) || 0,
      endCount: actualProduced,
      totalProduced: actualProduced,
      material: productionData?.Material || '',
      batch: productionData?.Batch || '',
      vendorBatch: productionData?.["Vendor Batch"] || '',
      materialDescription: productionData?.["Material Description"] || '',
      qrCodeData: JSON.stringify(productionData),
      qrCodeImage: productionData ? generateQrCodeDataUrl(productionData) : '',
      serialNumbers: serialNumbers,
    };

    // บันทึกข้อมูลการผลิต
    const savedLog = await saveProductionLog(productionLogData);
    console.log('Production log saved successfully (ref):', savedLog);

    // แสดงข้อมูลการผลิตในหน้า completion modal
    setCompletionData({
      totalProduced: actualProduced,
      startTime: effectiveStartTime,
      endTime: endTime,
      serialNumbers: serialNumbers
    });

    // แสดง modal สรุปการผลิต
    setShowCompletionModal(true);

    // รีเซ็ตค่าต่างๆ
    setWaitingForArduinoResponse(false);
    printedCountRef.current = 0;
    setPrintedCount(0);
    setCurrentCount('0');
    setStopCount('0');
    setIsStopRequested(false); // Reset stop request flag

    return true;
  } catch (error) {
    console.error('Error saving production data with ref:', error);
    return false;
  } finally {
    isSaving.current = false;
  }
}, [user, startTime, currentCount, startCount, productionData, generateQrCodeDataUrl, printedCount, targetCount]);

// Update the handleStop function to prevent duplicate saves
const handleStop = useCallback(async (forceStop: boolean = false) => {
  console.log('เริ่มการหยุดการทำงาน:', {
    forceStop,
    isRunning,
    user: !!user,
    startTime: !!startTime,
    startTimeRef: !!startTimeRef.current,
    isSaving: isSaving.current,
    hasSaved,
    saveActionRef: saveActionRef.current
  });

  // ป้องกันการเรียกซ้ำ
  if (isStopRequested || hasSaved || saveActionRef.current || isSaving.current) {
    console.log('Stop already requested or data already saved, skipping duplicate call');
    return;
  }

  // กำหนดตัวแปรที่บ่งบอกว่ากำลังมีการขอหยุดแล้ว
  setIsStopRequested(true);

  // ตรวจสอบเงื่อนไขพื้นฐาน - ใช้ startTimeRef แทน startTime
  if (!user || !startTimeRef.current) {
    console.log('ไม่สามารถหยุดได้: user:', !!user, 'startTime:', !!startTime, 'startTimeRef:', !!startTimeRef.current);
    setIsStopRequested(false);
    return;
  }

  try {
    // หยุดการทำงาน
    console.log('กำลังหยุดการทำงาน - ตั้งค่า isRunning เป็น false');

    // ส่งคำสั่ง 911 เพื่อหยุดการทำงานฉุกเฉิน
    console.log('Sending emergency stop command: 911');
    await sendCommand('911');

    // รอให้ Arduino มีเวลาประมวลผลคำสั่งหยุดฉุกเฉิน
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set the lock before changing isRunning, so the effect won't trigger a save
    saveActionRef.current = true;

    // Now change isRunning state - this will trigger the effect, but it won't save due to the lock
    setIsRunning(false);

    // ตรวจสอบว่ายังไม่ได้บันทึกก่อนที่จะบันทึกข้อมูล
    if (!hasSaved && !isSaving.current) {
      setHasSaved(true);
      await saveProductionDataWithRef();
    } else {
      console.log('ข้ามการบันทึกข้อมูลเนื่องจากได้บันทึกไปแล้ว');
    }

    // รีเซ็ตค่าทุกครั้งหลังจากเสร็จสิ้น
    setWaitingForArduinoResponse(false);

  } catch (error) {
    console.error('Error stopping production:', error);
    setError(error instanceof Error ? error.message : 'Failed to stop production');
    // Reset the flags in case of error
    saveActionRef.current = false;
    setHasSaved(false);
  } finally {
    setIsStopRequested(false);
    // Don't reset saveActionRef here, it needs to stay true to prevent the useEffect from triggering
    isSaving.current = false;
  }
}, [user, startTime, targetCount, printedCountRef, sendCommand, saveProductionDataWithRef, hasSaved]);

  // แก้ไขในส่วนของ handlePrintQR เพื่ออัพเดต ref ด้วย
  const handlePrintQR = useCallback(async (qrImage: string, qrData: SheetData, isBlank: boolean = false, currentTargetCount: number = 0) => {
    if (isPrinting) return false;

    try {
      setIsPrinting(true);

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

      iframeDocument.body.innerHTML = isBlank ? `
        <div class="print-section" style="width: 50mm; height: 20mm; display: flex; align-items: center; padding: 0mm; font-family: Arial, sans-serif;">
          <div style="width: 18mm; height: 18mm; flex-shrink: 0; margin: 1mm;">
            <img src="" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="flex-grow: 1; padding-left: 1mm; font-size: 5.5pt; line-height: 1.2;">
            <div style="font-weight: bold;">MAT:</div>
            <div style="font-weight: bold;">BATCH:</div>
            <div style="font-weight: bold;"></div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5mm; margin-top: 4mm;">
              <div>
                <div style="font-weight: bold;">UNIT</div>
                <div></div>
              </div>
              <div>
                <div style="font-weight: bold;">Expire date</div>
                <div></div>
              </div>
              <div>
                <div style="font-weight: bold;">Vendor Batch</div>
                <div></div>
              </div>
            </div>
          </div>
        </div>
      ` : `
        <div class="print-section" style="width: 50mm; height: 20mm; display: flex; align-items: center; padding: 0mm; font-family: Arial, sans-serif;">
          <div style="width: 18mm; height: 18mm; flex-shrink: 0; margin: 1mm;">
            <img src="${qrCodeDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="flex-grow: 1; padding-left: 1mm; font-size: 5.5pt; line-height: 1.2;">
            <div style="font-weight: bold;">MAT:${qrData.Material}-UNIT:${qrData.Unit}</div>
            <div style="font-weight: bold;">BATCH:${qrData.Batch}</div>
            <div style="font-weight: bold;">${qrData["Material Description"]}</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5mm; margin-top: 4mm;">
              <div>
                <div style="font-weight: bold;">UNIT</div>
                <div>${qrData.Unit}</div>
              </div>
              <div>
                <div style="font-weight: bold;">Expire date</div>
                <div>${qrData["SLED/BBD"] ? new Date((qrData["SLED/BBD"] - 25569) * 86400 * 1000).toLocaleDateString() : 'N/A'}</div>
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
          console.log('Printing in kiosk mode (isBlank: ' + isBlank + ')');
          iframe.contentWindow?.print();
          iframe.contentWindow?.addEventListener('afterprint', () => {
            cleanup();

            console.log(`พิมพ์เสร็จสิ้น - จะเพิ่มค่าจากเดิม ${printedCount}`);

            // อัพเดต ref และ state ทั้งหมดพร้อมกัน
            const newCount = printedCount + (isBlank ? 0 : 1); // only increase count if it's not blank print
            printedCountRef.current = newCount;

            // ใช้ฟังก์ชัน batch update หรือใช้ Promise.all เพื่อให้แน่ใจว่า state จะถูกอัพเดตพร้อมกัน
            Promise.all([
              new Promise(r => {
                setPrintedCount(newCount);
                setTimeout(r, 0);
              }),
              new Promise(r => {
                setCurrentCount(newCount.toString());
                setTimeout(r, 0);
              }),
              new Promise(r => {
                setStopCount(newCount.toString());
                setTimeout(r, 0);
              })
            ]).then(() => {
              console.log(`อัพเดตค่าเรียบร้อย - ตอนนี้เป็น ${newCount}`);

              // เพิ่มดีเลย์เล็กน้อยเพื่อให้ UI อัพเดตเสร็จก่อนเช็คเงื่อนไข
              setTimeout(() => {
                // ใช้ค่าที่ส่งผ่านพารามิเตอร์โดยตรงแทนการอ่านจาก state
                const effectiveTargetCount = currentTargetCount || targetCount;
                console.log(`ตรวจสอบเป้าหมาย: ${newCount}/${effectiveTargetCount}`);

                if (!isBlank && newCount >= effectiveTargetCount) { // only check target for non-blank prints
                  console.log('ถึงเป้าหมายแล้ว จะหยุดการผลิต');
                  handleStop(true);
                }
              }, 100);

              resolve(true);
            });
          });

          // ในส่วนของ timeout handler ในฟังก์ชัน handlePrintQR
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              cleanup();
              console.log('Print timeout - assuming completed');

              // ทำเหมือนกับด้านบน แต่เป็นกรณี timeout
              const newCount = printedCount + (isBlank ? 0 : 1);
              printedCountRef.current = newCount;

              // ใช้ batch update
              Promise.all([
                new Promise(r => {
                  setPrintedCount(newCount);
                  setTimeout(r, 0);
                }),
                new Promise(r => {
                  setCurrentCount(newCount.toString());
                  setTimeout(r, 0);
                }),
                new Promise(r => {
                  setStopCount(newCount.toString());
                  setTimeout(r, 0);
                })
              ]).then(() => {
                // ใช้ค่าที่ส่งผ่านพารามิเตอร์โดยตรงแทนการอ่านจาก state
                const effectiveTargetCount = currentTargetCount || targetCount;
                console.log(`อัพเดตค่าเรียบร้อย (timeout) - ตอนนี้เป็น ${newCount}, เป้าหมาย ${effectiveTargetCount}`);

                // ตรวจสอบกับ targetCount ที่ส่งมาโดยตรง ไม่ใช่ค่าเริ่มต้น
                if (!isBlank && newCount >= effectiveTargetCount) { // only check target for non-blank prints
                  console.log('ถึงเป้าหมายแล้ว จะหยุดการผลิต (timeout)');
                  handleStop(true);
                } else if (!isBlank) { // wait for arduino only for non-blank prints when target not met
                  // ถ้ายังไม่ถึงเป้าหมาย ให้รอสัญญาณจาก Arduino
                  console.log(`ยังไม่ถึงเป้าหมาย (${newCount}/${effectiveTargetCount}) - รอสัญญาณ Arduino สำหรับชิ้นถัดไป`);
                  setWaitingForArduinoResponse(true);
                }

                resolve(true);
              });
            }
          }, 3000);

        } else {
          const shouldPrint = window.confirm('พิมพ์ QR Code?');
          if (shouldPrint) {
            iframe.contentWindow?.print();
            iframe.contentWindow?.addEventListener('afterprint', () => {
              cleanup();
              const newPrintedCount = printedCount + 1;
              setPrintedCount(newPrintedCount);
              setRemainingPrints(prev => prev - 1);

              // อัพเดต stopCount ทุกครั้งที่พิมพ์สำเร็จ
              setStopCount(newPrintedCount.toString());

              console.log(`พิมพ์เสร็จสิ้น: ${newPrintedCount}/${targetCount}`);
              resolve(true);
            });

            // Add a fallback timeout in case afterprint doesn't fire
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                cleanup();
                const newPrintedCount = printedCount + 1;
                setPrintedCount(newPrintedCount);
                setRemainingPrints(prev => prev - 1);

                // อัพเดต stopCount ทุกครั้งที่พิมพ์สำเร็จ
                setStopCount(newPrintedCount.toString());

                console.log(`Print timeout - assuming completed: ${newPrintedCount}/${targetCount}`);
                resolve(true);
              }
            }, 1000);
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
  }, [isPrinting, isKioskMode, printedCount, targetCount, qrCodeDataUrl, onQrCodeGenerated, isRunning, isStopRequested, handleStop]);

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

// Arduino monitoring effect - แก้ไขเพื่อใช้ค่า state แทน ref
// Arduino monitoring effect - แก้ไขเงื่อนไขและเพิ่มดีเลย์
// Arduino monitoring effect - แก้ไขเพื่อให้ทำงานต่อเนื่องอย่างถูกต้อง
useEffect(() => {
  // ใช้ค่าล่าสุดจาก logs แทน lastLog
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

  if (lastLog?.type === 'received' && lastLog.message === '1' && waitingForArduinoResponse) {
    (async () => {
      console.log(`Arduino ส่งสัญญาณ '1' - ตรวจสอบจำนวน: ${printedCountRef.current}/${targetCount}`);

      // ตรวจสอบว่าถึงเป้าหมายแล้วหรือยัง (ใช้ค่า ref แทน state)
      if (printedCountRef.current >= targetCount) {
        console.log('ถึงเป้าหมายแล้ว - หยุดการผลิต');
        await handleStop(true);
        return;
      }

      try {
        setIsProcessing(true);
        setWaitingForArduinoResponse(false); // ยกเลิกการรอเพื่อป้องกันทริกเกอร์ซ้ำ

        // ตรวจสอบอีกครั้งว่าเรายังไม่ถึงเป้าหมาย
        const nextItemNumber = printedCount + 1;
        console.log(`กำลังพิมพ์ชิ้นที่ ${nextItemNumber}/${targetCount}`);

        // Generate QR code for next item
        const qrData = {
          ...productionData,
          serialNumber: `${productionData?.Batch}-${nextItemNumber}`,
          timestamp: new Date().toISOString()
        };
        const qrImage = generateQrCodeDataUrl(qrData as SheetData);

        // ส่งคำสั่งและพิมพ์
        await sendCommand('110');
        await handlePrintQR(qrImage, qrData as SheetData, false, targetCount);

        // เพิ่มดีเลย์เพื่อรอให้แน่ใจว่า state อัปเดตแล้ว
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ตั้งค่ารอสัญญาณครั้งใหม่ ถ้ายังไม่ถึงเป้าหมาย
        if (printedCount < targetCount && !isStopRequested) {
          console.log('ยังไม่ถึงเป้าหมาย - รอสัญญาณ Arduino ครั้งถัดไป');
          setWaitingForArduinoResponse(true);
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error);
        setError('เกิดข้อผิดพลาดในการผลิต');
      } finally {
        setIsProcessing(false);
      }
    })();
  }
}, [logs, isRunning, targetCount, productionData, handleStop, sendCommand, generateQrCodeDataUrl, handlePrintQR, waitingForArduinoResponse, printedCount, isStopRequested]);

// Replace the handleStartProduction function with this modified version
const handleStartProduction = useCallback(async (inputTarget?: number) => {
  try {
    setIsStopRequested(false);
    setHasSentInitialCommand(false);

    const activeTarget = inputTarget || targetCount;
    console.log(`เริ่มการผลิตด้วยเป้าหมาย ${activeTarget} ชิ้น`);

    // Reset all counters
    printedCountRef.current = 0;
    await Promise.all([
      new Promise<void>(resolve => {
        setPrintedCount(0);
        setTimeout(resolve, 0);
      }),
      new Promise<void>(resolve => {
        setCurrentCount('0');
        setTimeout(resolve, 0);
      }),
      new Promise<void>(resolve => {
        setStopCount('0');
        setTimeout(resolve, 0);
      })
    ]);

    // 1️⃣ พิมพ์ QR Code จริงจำนวน 20 ชิ้นแรก (หรือตามจำนวนทั้งหมดถ้าน้อยกว่า 20)
    const initialBatchSize = Math.min(activeTarget, 20);
    console.log(`กำลังพิมพ์ QR Code ${initialBatchSize} ชิ้นแรก...`);

    // Use a local counter to track how many QR codes have been printed in this batch
    let batchPrintedCount = 0;

    for (let i = 1; i <= initialBatchSize; i++) {
      console.log(`พิมพ์ QR Code ชิ้นที่ ${i}/${activeTarget}`);
      
      const qrData = {
        ...productionData,
        serialNumber: `${productionData?.Batch}-${i}`,
        timestamp: new Date().toISOString()
      };
      
      const qrImage = generateQrCodeDataUrl(qrData as SheetData);
      
      // Wait for print completion
      const printSuccess = await handlePrintQR(qrImage, qrData as SheetData, false, activeTarget);
      
      if (printSuccess) {
        batchPrintedCount++;
        
        // Manually update the ref to match what should be the current count
        printedCountRef.current = batchPrintedCount;
        
        // Force update the state values
        setPrintedCount(batchPrintedCount);
        setCurrentCount(batchPrintedCount.toString());
        setStopCount(batchPrintedCount.toString());
        
        // Add a small delay to allow the UI to refresh
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`Printed ${batchPrintedCount}/${initialBatchSize} QR codes so far`);
      
      // Check if target has been reached
      if (batchPrintedCount >= activeTarget) {
        console.log("Target reached during initial batch printing");
        break;
      }
    }

    console.log(`พิมพ์ QR Code จำนวน ${batchPrintedCount} ชิ้นเสร็จสิ้น`);

    // คำนวณจำนวนที่เหลือที่ต้องผลิต - use actual printed count
    const remainingItems = activeTarget - batchPrintedCount;

    if (remainingItems > 0) {
      console.log(`กำลังเริ่มผลิตชิ้นที่เหลืออีก ${remainingItems} ชิ้น...`);

      // 🆕 ส่งคำสั่ง 100 ให้ Arduino และรอสัญญาณ 2 กลับมา
    console.log('กำลังส่งคำสั่ง 100 ให้ Arduino เพื่อเริ่มการผลิต');
    await sendCommand('100');

    // รอให้ Arduino ส่งสัญญาณ 2 กลับมา
    console.log('กำลังรอ Arduino ส่งสัญญาณ 2 กลับมา...');

    // First check if signal "2" already exists in the logs
    let signal2Found = false;
    // Look through last 10 logs to see if we already received "2"
    const recentLogs = logs.slice(-10);
    for (const log of recentLogs) {
      if (log.type === 'received' && log.message === '2') {
        console.log('พบสัญญาณ 2 จาก Arduino ในประวัติล่าสุด - เริ่มการผลิต');
        signal2Found = true;
        break;
      }
    }

    // If not found in existing logs, wait for it
    if (!signal2Found) {
      // Get current logs length to check only new logs
      const currentLogsLength = logs.length;
      
      // Create a promise that resolves when Arduino sends "2"
      const waitFor2Signal = new Promise<void>((resolve) => {
        // Add a timeout
        const timeoutId = setTimeout(() => {
          console.log('หมดเวลารอสัญญาณ 2 - เริ่มการผลิตต่อ');
          resolve(); // Continue even if timeout
        }, 10000); // 10 seconds timeout
        
        const checkForSignal = () => {
          // Check if any new logs came in
          if (logs.length > currentLogsLength) {
            // Check all new logs since we started waiting
            for (let i = currentLogsLength; i < logs.length; i++) {
              const log = logs[i];
              if (log.type === 'received' && log.message === '2') {
                console.log('ได้รับสัญญาณ 2 จาก Arduino - เริ่มการผลิต');
                clearTimeout(timeoutId);
                resolve();
                return;
              }
            }
          }
          
          // Check again after a small delay
          setTimeout(checkForSignal, 100);
        };
        
        // Start checking
        checkForSignal();
      });
      
      // Wait for the "2" signal
      await waitFor2Signal;
      }
      
      // 2️⃣ ส่งคำสั่ง 110 สำหรับการผลิตส่วนที่เหลือ
      for (let i = 1; i <= remainingItems; i++) {
        // ตรวจสอบว่าถึงเป้าหมายหรือมีการขอหยุดหรือไม่
        if (printedCountRef.current >= activeTarget || isStopRequested) {
          console.log(`✅ ผลิตครบ ${activeTarget} ชิ้นแล้ว หรือมีการขอหยุด - หยุดส่งคำสั่ง 110`);
          break;
        }

        const itemNumber = batchPrintedCount + i;
        console.log(`กำลังผลิตชิ้นที่ ${itemNumber}/${activeTarget} - ส่งคำสั่ง 110`);
        
        // ส่งคำสั่ง 110 ให้ Arduino ทำงาน
        await sendCommand('110');
        
        // รอสัญญาณตอบกลับจาก Arduino ก่อนดำเนินการต่อ
        setWaitingForArduinoResponse(true);
        
        // รอให้ Arduino ส่งสัญญาณกลับมา (จะถูกจัดการโดย useEffect ที่ monitor logs)
        await new Promise(resolve => {
          const checkResponse = () => {
            if (!waitingForArduinoResponse) {
              resolve(true);
            } else {
              setTimeout(checkResponse, 100);
            }
          };
          setTimeout(checkResponse, 100);
        });
        
        // รอเล็กน้อยก่อนส่งคำสั่งถัดไป
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log("✅ กระบวนการผลิตเสร็จสิ้น - กำลังหยุดการผลิต...");
    await handleStop(true);

  } catch (error) {
    console.error('Start production error:', error);
    setError('ไม่สามารถเริ่มการผลิตได้');
    setIsRunning(false);
  }
}, [targetCount, sendCommand, handlePrintQR, generateQrCodeDataUrl, productionData, isStopRequested, waitingForArduinoResponse, handleStop, logs]);


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
    console.log('เริ่มต้นการผลิตด้วยเป้าหมาย:', target);

    if (isNaN(target) || target <= 0) {
      setError('กรุณาระบุจำนวนที่ต้องการผลิตให้ถูกต้อง');
      return;
    }

    try {
      // รีเซ็ตค่าทุกครั้งก่อนเริ่มการผลิตใหม่
      printedCountRef.current = 0;
      setPrintedCount(0);
      setCurrentCount('0');
      setStopCount('0');

      // สร้าง startTime ก่อนและเก็บไว้ในตัวแปร
      const newStartTime = new Date();

      // ตั้งค่า startTimeRef และ startTime พร้อมกัน
      startTimeRef.current = newStartTime;
      setStartTime(newStartTime);

      // ตั้งค่าเป้าหมายก่อน
      setTargetCount(target);

      // รอให้ state อัพเดต
      await new Promise(resolve => setTimeout(resolve, 100));

      // ตั้งค่า UI
      setShowTargetPrompt(false);
      setIsRunning(true);
      setStartCount('0'); // เริ่มที่ 0 เสมอ

      // เพิ่มการล็อกเพื่อดีบั๊ก
      console.log(`กำลังเริ่มผลิตด้วยเป้าหมาย: ${target} ชิ้น, targetCount:`, target);

      // รอให้ state อัพเดต
      await new Promise(resolve => setTimeout(resolve, 500));

      // Log เพื่อตรวจสอบว่า startTime และ targetCount ถูกตั้งค่าไว้แล้ว
      console.log('ตรวจสอบค่าก่อนเริ่มผลิต:', {
        startTime: startTime,
        startTimeRef: startTimeRef.current,
        targetCount: targetCount,
        target: target
      });

      // เริ่มการผลิตด้วยการส่งค่า target โดยตรง
      await handleStartProduction(target);

    } catch (error) {
      console.error('Error starting production:', error);
      setError('ไม่สามารถเริ่มการผลิตได้');
      setIsRunning(false);
    }
  }, [handleStartProduction]);

  // เพิ่ม useEffect สำหรับ monitor การเปลี่ยนแปลงของ state
  useEffect(() => {
    if (isRunning) {
      // อัพเดทค่า stopCount ให้ตรงกับ currentCount เพื่อให้แสดงค่าถูกต้อง
      setStopCount(currentCount);

      // Update console log เพื่อการดีบัก
      console.log('Production state updated:', {
        targetCount,
        currentCount,
        startCount,
        printedCount,
        isRunning,
        waitingForArduinoResponse
      });
    }
  }, [targetCount, currentCount, startCount, isRunning, printedCount, waitingForArduinoResponse]);

  // Monitor targetCount changes
  useEffect(() => {
    if (isRunning) {
      console.log('Target count updated:', targetCount);
    }
  }, [targetCount, isRunning]);

  // เพิ่ม useEffect สำหรับติดตาม waitingForArduinoResponse
  useEffect(() => {
    if (isRunning) {
      console.log(`[สถานะ Arduino] กำลังรอสัญญาณ: ${waitingForArduinoResponse ? 'ใช่' : 'ไม่'}, จำนวน: ${printedCount}/${targetCount}`);
    }
  }, [waitingForArduinoResponse, isRunning, printedCount, targetCount]);

// เพิ่ม useEffect สำหรับติดตาม isRunning เพื่อบันทึกข้อมูล
// ใช้ ref เพื่อป้องกันการทำงานซ้ำในรอบเดียวกัน
const saveActionRef = useRef(false);

// Update the useEffect that tracks isRunning and prevents duplicate saves

// Update the useEffect that tracks isRunning

useEffect(() => {
  console.log(`สถานะการทำงาน: ${isRunning ? 'กำลังทำงาน' : 'หยุดทำงาน'}`);

  // Add a small delay to make sure any direct save call from handleStop has a chance to set flags
  const timeoutId = setTimeout(() => {
    // Only save if isRunning is false AND not already saved AND no save is in progress
    if (!isRunning && printedCountRef.current > 0 && !showCompletionModal && !isSaving.current && !hasSaved && !saveActionRef.current) {
      console.log('isRunning เป็น false และมีการพิมพ์แล้ว - กำลังบันทึกข้อมูลผ่าน effect');
      // Lock to prevent multiple saves
      saveActionRef.current = true;
      setHasSaved(true);

      saveProductionDataWithRef()
        .finally(() => {
          // Only reset printedCount and other display values when the save operation is truly complete
          printedCountRef.current = 0;
          setPrintedCount(0);
          setCurrentCount('0');
          setStopCount('0');
          // Keep saveActionRef.current as true to prevent further saves until reset
        });
    }
  }, 100); // Small delay to ensure handleStop's direct save call has priority

  // รีเซ็ตค่า hasSaved และ saveActionRef เมื่อเริ่มการทำงานใหม่
  if (isRunning) {
    setHasSaved(false);
    saveActionRef.current = false;
  }

  return () => clearTimeout(timeoutId);
}, [isRunning, printedCountRef.current, showCompletionModal, saveProductionDataWithRef, hasSaved]);

  const material = productionData?.Material;
  const batch = productionData?.Batch;
  const vendorBatch = productionData?.["Vendor Batch"]; // Access with bracket notation for keys with spaces
  const materialDescription = productionData?.["Material Description"];

  // คำนวณ duration แบบละเอียด (นาทีและวินาที)
  const getDuration = (startTime: Date | null): string => {
    if (!startTime) return '0 นาที 0 วินาที';

    const totalSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes} นาที ${seconds} วินาที`;
  };

  // เพิ่มฟังก์ชันสำหรับการหยุดฉุกเฉินโดยเฉพาะ
const handleEmergencyStop = useCallback(async () => {
  try {
    // ส่งคำสั่งหยุดฉุกเฉินก่อนเป็นอันดับแรก
    console.log('Emergency stop activated!');
    await sendCommand('911');

    // จากนั้นค่อยเรียกฟังก์ชัน handleStop เพื่อบันทึกข้อมูล
    await handleStop(true);
  } catch (error) {
    console.error('Emergency stop error:', error);
    setError('ไม่สามารถหยุดการทำงานฉุกเฉินได้');
  }
}, [handleStop, sendCommand]);

// รีเซ็ตค่าทั้งหมด
const resetAllValues = useCallback(() => {
  printedCountRef.current = 0;
  setPrintedCount(0);
  setCurrentCount('0');
  setStopCount('0');
  setTargetCount(0);
  setStartCount('0');
  setShowCompletionModal(false);
  setHasSaved(false);
  saveActionRef.current = false;
  setIsStopRequested(false);
  isSaving.current = false;
}, []);

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
              สวัสดี, {user?.username}
            </h2>
            <p className="text-sm text-gray-600">
              รหัสโรงพยาบาล: {user?.hospitalId} • แผนก: {user?.department}
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
              ออกจากระบบ
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
          <h3 className="text-lg font-semibold text-white flex">รายละเอียดการผลิต 
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
              ยังไม่มีการสร้าง QR code
            </div>
          )}
        </h3>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">รหัสวัสดุ</label>
              <p className="text-lg font-semibold text-gray-900">{material || 'ไม่มีข้อมูล'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">รหัส Batch</label>
              <p className="text-lg font-semibold text-gray-900">{batch || 'ไม่มีข้อมูล'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">คำอธิบายวัสดุ</label>
              <p className="text-lg font-semibold text-gray-900">{materialDescription || 'ไม่มีข้อมูล'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">Vendor Batch</label>
              <p className="text-lg font-semibold text-gray-900">{vendorBatch || 'ไม่มีข้อมูล'}</p>
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
                <div className="text-2xl font-bold mb-2">เริ่มการผลิตอัตโนมัติ</div>
                <div className="text-sm opacity-90">
                  {!productionData 
                    ? 'กรุณาเลือกข้อมูลจาก Excel' 
                    : !connected 
                      ? 'รอการเชื่อมต่ออุปกรณ์' 
                      : `จำนวนปัจจุบัน: ${currentCount} (พิมพ์อัตโนมัติ)`
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

          {/* Emergency Stop Button - แสดงเฉพาะเมื่อกำลังทำงาน */}
          {isRunning && (
            <div className="mt-4">
              <button
                onClick={handleEmergencyStop}
                className="w-full p-4 bg-red-700 hover:bg-red-800 text-white font-bold text-lg rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                หยุดฉุกเฉิน (EMERGENCY STOP)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Production Stats */}
      {isRunning && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">สถิติการผลิตแบบเรียลไทม์</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">เวลาเริ่มต้น</div>
                <div className="text-lg font-bold text-purple-900">
                  {startTime?.toLocaleTimeString()}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">ระยะเวลา</div>
                <div className="text-lg font-bold text-purple-900">
                  {startTime ? getDuration(startTime) : '0 นาที 0 วินาที'}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">จำนวนที่ผลิตแล้ว</div>
                <div className="text-lg font-bold text-purple-900">
                  {printedCount} ชิ้น
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">สถานะ</div>
                <div className="text-lg font-bold text-green-600">กำลังทำงาน</div>
              </div>
              {/* Add Target Progress */}
              <div className="bg-purple-50 rounded-lg p-4 text-center md:col-span-2">
                <div className="text-sm font-medium text-purple-600">ความคืบหน้า</div>
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

      {/* Arduino Logs */}
      {isRunning && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-4">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">บันทึกการทำงาน</h3>
          </div>
          <div className="p-4 max-h-60 overflow-y-auto bg-gray-100 font-mono text-sm">
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div 
                  key={index}
                  className={`px-2 py-1 rounded ${
                    log.type === 'sent' ? 'bg-blue-100' : 
                    log.type === 'received' ? 'bg-green-100' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-gray-500">{log.timestamp}</span>
                  <span className={`ml-2 ${
                    log.type === 'sent' ? 'text-blue-700' : 
                    log.type === 'received' ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {log.type === 'sent' ? '↑ ' : log.type === 'received' ? '↓ ' : ''}
                    {log.message}
                  </span>
                </div>
              ))}
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
                    `${Math.floor((completionData.endTime.getTime() - completionData.startTime.getTime()) / 60000)} นาที 
                     ${Math.floor(((completionData.endTime.getTime() - completionData.startTime.getTime()) % 60000) / 1000)} วินาที` 
                    : 'ไม่มีข้อมูล'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">รหัสซีเรียล</div>
                <div className="mt-2 text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {completionData.serialNumbers.map((sn) => (
                    <div key={sn} className="py-1 border-b border-gray-100 last:border-0">
                      {sn}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={resetAllValues}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                รีเซ็ตค่าและปิด
              </button>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};