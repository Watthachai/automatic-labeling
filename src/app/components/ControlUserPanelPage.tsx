"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveProductionLog } from "@/src/app/libs/productionLogs";
import LoadingScreen from "./LoadingScreen";
import { useArduino } from "../contexts/ArduinoContext";
import QRCode from "react-qr-code";
import ReactDOMServer from "react-dom/server";
import Image from "next/image";

// เก็บตัวแปรหลัก interfaces ไว้เหมือนเดิม
interface Props {
  productionData: SheetData | null;
  qrCodeDataUrl: string;
  onQrCodeGenerated?: (qrCodeUrl: string) => void;
}

interface SheetData {
  Material?: string;
  Batch?: string;
  "Vendor Batch"?: string;
  "Material Description"?: string;
  Unit?: string;
  "SLED/BBD"?: number;
  id?: string;
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

export default function ControlUserPanelPage({
  productionData,
  qrCodeDataUrl,
  onQrCodeGenerated,
}: Props) {
  const router = useRouter();
  const { connected, sendCommand, logs } = useArduino();
  const [user, setUser] = useState<UserData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startCount, setStartCount] = useState("0");
  const [currentCount, setCurrentCount] = useState("0");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [stopCount, setStopCount] = useState("0");
  const [targetCount, setTargetCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTargetPrompt, setShowTargetPrompt] = useState(false);
  const [inputTargetCount, setInputTargetCount] = useState<string>("");
  const [printedCount, setPrintedCount] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [remainingPrints, setRemainingPrints] = useState(0);
  const [totalPrints, setTotalPrints] = useState(0);
  const [isStopRequested, setIsStopRequested] = useState(false);
  const [hasSentInitialCommand, setHasSentInitialCommand] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    totalProduced: number;
    startTime: Date | null;
    endTime: Date | null;
    serialNumbers: string[];
  } | null>(null);
  
  // ตัวแปร refs
  const logsRef = useRef(logs);
  const printedCountRef = useRef(0);
  const isSaving = useRef(false);
  const startTimeRef = useRef<Date | null>(null);
  const saveActionRef = useRef(false);

  const isKioskMode = true;
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingForArduinoResponse, setWaitingForArduinoResponse] = useState(false);
  
  // เพิ่มสถานะใหม่สำหรับติดตามการรอสัญญาณ "2"
  const [waitingForSignal2, setWaitingForSignal2] = useState(false);

  // ฟังก์ชันสำหรับตรวจจับสัญญาณ "2" จาก Arduino - ปรับปรุงจากตัวอย่างโค้ดที่ทำงานได้
   // แก้ไขฟังก์ชัน useEffect สำหรับตรวจจับสัญญาณ "2"
   useEffect(() => {
    if (waitingForSignal2) {
      // ถ้ามีการเปลี่ยนแปลงของ logs
      const lastLog = logs[logs.length - 1];
      
      // แสดงข้อมูลเพื่อดีบักทุกครั้งที่มีการเปลี่ยนแปลง logs
      console.log(`[DEBUG SIGNAL2] ตรวจสอบ log ล่าสุด:`, {
        waitingForSignal2,
        logExists: !!lastLog,
        logType: lastLog?.type,
        message: lastLog?.message,
        fullLogs: logs.slice(-3) // แสดงเฉพาะ 3 logs ล่าสุดเพื่อไม่ให้ข้อมูลเยอะเกินไป
      });
      
      if (lastLog?.type === "received") {
        // ล้างค่าข้อความทั้งหมด (ตัด whitespace)
        const trimmedMessage = lastLog.message.trim();
        
        console.log(`[DEBUG SIGNAL2] ตรวจสอบข้อความ: '${trimmedMessage}' (length: ${trimmedMessage.length})`);
        
        // ตรวจสอบว่าเป็นเลข 2 แบบแม่นยำ - เป็นข้อความ "2" เท่านั้น
        const isExactly2 = trimmedMessage === "2";
        console.log(`[DEBUG SIGNAL2] ตรวจสอบว่าเป็น "2" ทั้งข้อความ: ${isExactly2}`);
        
        // ตรวจสอบเฉพาะเมื่อข้อความเป็น "2" เท่านั้น (ไม่ใช่ส่วนหนึ่งของข้อความอื่น)
        if (isExactly2) {
          console.log("✅ [DEBUG SIGNAL2] พบสัญญาณ '2' จาก Arduino!");
          setWaitingForSignal2(false);
          setWaitingForArduinoResponse(true); // พร้อมสำหรับขั้นตอนถัดไป
        } else {
          console.log("❌ [DEBUG SIGNAL2] ข้อความไม่ใช่ '2' ที่ต้องการ (พบส่วนหนึ่งของข้อความต้อนรับ)");
        }
      }
    }
  }, [logs, waitingForSignal2]);

  const printInitialQRCodes = async (target: number) => {
    const firstBatch = Math.min(target, 15);
    console.log(`Printing first ${firstBatch} QR codes...`);

    for (let i = 1; i <= firstBatch; i++) {
      console.log(`Printing QR Code ${i}/${target}`);
      await handlePrintQR(
        qrCodeDataUrl,
        productionData as SheetData,
        false,
        target
      );
    }

    console.log(`Printed first ${firstBatch} QR codes.`);
    return firstBatch;
  };

  const generateQrCodeDataUrl = useCallback((data: SheetData): string => {
    const qrCodeData = JSON.stringify(data);
    const qrCodeElement = (
      <QRCode
        value={qrCodeData}
        size={100}
        level="L"
      />
    );
    const qrCodeSVG = ReactDOMServer.renderToString(qrCodeElement);
    return `data:image/svg+xml;base64,${btoa(qrCodeSVG)}`;
  }, []);

  const saveProductionData = useCallback(async () => {
    if (!user || !startTime || isSaving.current) {
      console.log("ไม่สามารถบันทึกได้");
      return;
    }

    try {
      isSaving.current = true;

      const actualProduced = Math.max(
        printedCountRef.current,
        parseInt(currentCount) || 0,
        printedCount
      );

      console.log(`กำลังบันทึกข้อมูลการผลิต: ${actualProduced} units produced`);

      const serialNumbers = Array.from(
        { length: actualProduced },
        (_, i) => `${productionData?.Batch}-${i + 1}`
      );

      const endTime = new Date();

      const productionLogData: ProductionLogData = {
        userId: user.id,
        username: user.username,
        date: new Date().toISOString().split("T")[0],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        startCount: parseInt(startCount) || 0,
        endCount: actualProduced,
        totalProduced: actualProduced,
        material: productionData?.Material || "",
        batch: productionData?.Batch || "",
        vendorBatch: productionData?.["Vendor Batch"] || "",
        materialDescription: productionData?.["Material Description"] || "",
        qrCodeData: JSON.stringify(productionData),
        qrCodeImage: generateQrCodeDataUrl(productionData),
        serialNumbers: serialNumbers,
      };

      const savedLog = await saveProductionLog(productionLogData);
      console.log("Production log saved successfully:", savedLog);

      setCompletionData({
        totalProduced: actualProduced,
        startTime: startTime,
        endTime: endTime,
        serialNumbers: serialNumbers,
      });

      setShowCompletionModal(true);

      setWaitingForArduinoResponse(false);
      printedCountRef.current = 0;
      setPrintedCount(0);
      setCurrentCount("0");
      setStopCount("0");

      return true;
    } catch (error) {
      console.error("Error saving production data:", error);
      return false;
    } finally {
      isSaving.current = false;
    }
  }, [
    user,
    startTime,
    currentCount,
    startCount,
    productionData,
    generateQrCodeDataUrl,
    printedCount,
  ]);

  const saveProductionDataWithRef = useCallback(async () => {
    if (!user) {
      console.log("ไม่สามารถบันทึกข้อมูลด้วย ref: ไม่พบข้อมูลผู้ใช้");
      return false;
    }

    if (!startTimeRef.current && !startTime) {
      console.log("ไม่สามารถบันทึกข้อมูลด้วย ref: ไม่พบเวลาเริ่มต้น");
      return false;
    }

    if (isSaving.current) {
      console.log("ไม่สามารถบันทึกข้อมูลด้วย ref: กำลังบันทึกอยู่แล้ว");
      return false;
    }

    console.log("เริ่มบันทึกข้อมูลด้วย ref:", {
      user: !!user,
      startTime: !!startTime,
      startTimeRef: !!startTimeRef.current,
      isSaving: isSaving.current,
      printedCount,
      printedCountRef: printedCountRef.current,
      targetCount,
    });

    try {
      isSaving.current = true;

      const isCompletedRun = printedCountRef.current >= targetCount;

      const actualProduced = isCompletedRun
        ? targetCount
        : Math.max(
            printedCountRef.current,
            parseInt(currentCount) || 0,
            printedCount
          );

      console.log(
        `กำลังบันทึกข้อมูลการผลิต (ref): ${actualProduced} units produced, isCompleted: ${isCompletedRun}`
      );

      const serialNumbers = Array.from(
        { length: actualProduced },
        (_, i) => `${productionData?.Batch}-${i + 1}`
      );

      const endTime = new Date();
      const effectiveStartTime = startTimeRef.current || startTime;

      if (!effectiveStartTime) {
        console.error("ไม่พบข้อมูลเวลาเริ่มต้น");
        return false;
      }

      const productionLogData = {
        userId: user.id,
        username: user.username,
        date: new Date().toISOString().split("T")[0],
        startTime: effectiveStartTime.toISOString(),
        endTime: endTime.toISOString(),
        startCount: parseInt(startCount) || 0,
        endCount: actualProduced,
        totalProduced: actualProduced,
        material: productionData?.Material || "",
        batch: productionData?.Batch || "",
        vendorBatch: productionData?.["Vendor Batch"] || "",
        materialDescription: productionData?.["Material Description"] || "",
        qrCodeData: JSON.stringify(productionData),
        qrCodeImage: productionData
          ? generateQrCodeDataUrl(productionData)
          : "",
        serialNumbers: serialNumbers,
      };

      const savedLog = await saveProductionLog(productionLogData);
      console.log("Production log saved successfully (ref):", savedLog);

      setCompletionData({
        totalProduced: actualProduced,
        startTime: effectiveStartTime,
        endTime: endTime,
        serialNumbers: serialNumbers,
      });

      setShowCompletionModal(true);

      setWaitingForArduinoResponse(false);
      printedCountRef.current = 0;
      setPrintedCount(0);
      setCurrentCount("0");
      setStopCount("0");
      setIsStopRequested(false);

      return true;
    } catch (error) {
      console.error("Error saving production data with ref:", error);
      return false;
    } finally {
      isSaving.current = false;
    }
  }, [
    user,
    startTime,
    currentCount,
    startCount,
    productionData,
    generateQrCodeDataUrl,
    printedCount,
    targetCount,
  ]);

  const handleStop = useCallback(
    async (forceStop: boolean = false) => {
      console.log("🛑 เริ่มการหยุดการทำงาน:", {
        forceStop,
        isRunning,
        user: !!user,
        startTime: !!startTime,
        startTimeRef: !!startTimeRef.current,
        isSaving: isSaving.current,
        hasSaved,
        saveActionRef: saveActionRef.current,
        printedCount: printedCountRef.current, 
        targetCount,
      });
  
      // ตรวจสอบเงื่อนไขการหยุดซ้ำหรือกำลังบันทึกอยู่แล้ว
      if (
        isStopRequested ||
        hasSaved ||
        saveActionRef.current ||
        isSaving.current
      ) {
        console.log("⚠️ Stop already requested or data already saved, skipping duplicate call");
        return;
      }
  
      // ตั้งค่า flag ทั้งหมดเพื่อป้องกันการเรียกซ้ำโดยเด็ดขาด
      setIsStopRequested(true);
      saveActionRef.current = true;
  
      if (!user || !startTimeRef.current) {
        console.log(
          "❌ ไม่สามารถหยุดได้: user:",
          !!user,
          "startTime:",
          !!startTime,
          "startTimeRef:",
          !!startTimeRef.current
        );
        setIsStopRequested(false);
        saveActionRef.current = false;
        return;
      }
  
      try {
        console.log("✅ กำลังหยุดการทำงาน - ตั้งค่า isRunning เป็น false");
  
        // ส่งคำสั่ง stop ไปยัง Arduino
        console.log("Sending emergency stop command: 911");
        await sendCommand("911");
  
        // รอให้ Arduino ประมวลผลคำสั่งก่อน
        await new Promise((resolve) => setTimeout(resolve, 1000));
  
        // ตั้งค่า UI และสถานะต่างๆ
        setIsRunning(false);
        setWaitingForArduinoResponse(false);
        setWaitingForSignal2(false);
  
        // บันทึกข้อมูลเพียงครั้งเดียว
        if (!hasSaved && !isSaving.current) {
          setHasSaved(true);
          await saveProductionDataWithRef();
        } else {
          console.log("ℹ️ ข้ามการบันทึกข้อมูลเนื่องจากได้บันทึกไปแล้ว");
        }
      } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการหยุดการผลิต:", error);
        setError(
          error instanceof Error ? error.message : "Failed to stop production"
        );
        saveActionRef.current = false;
        setHasSaved(false);
      } finally {
        // รีเซ็ตสถานะที่เกี่ยวข้องกับการหยุด
        setIsStopRequested(false);
        // ไม่รีเซ็ต saveActionRef เพื่อป้องกันการบันทึกซ้ำ
        isSaving.current = false;
      }
    },
    [
      user,
      startTime,
      targetCount,
      printedCountRef,
      sendCommand,
      saveProductionDataWithRef,
      hasSaved,
    ]
  );

  const handlePrintQR = useCallback(
    async (
      qrImage: string,
      qrData: SheetData,
      isBlank: boolean = false,
      currentTargetCount: number = 0
    ) => {
      if (isPrinting) return false;

      try {
        setIsPrinting(true);

        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        const iframeDocument =
          iframe.contentDocument || iframe.contentWindow?.document;
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

        iframeDocument.body.innerHTML = isBlank
          ? `
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
      `
          : `
        <div class="print-section" style="width: 50mm; height: 20mm; display: flex; align-items: center; padding: 0mm; font-family: Arial, sans-serif;">
          <div style="width: 18mm; height: 18mm; flex-shrink: 0; margin: 1mm;">
            <img src="${qrCodeDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div style="flex-grow: 1; padding-left: 1mm; font-size: 5.5pt; line-height: 1.2;">
            <div style="font-weight: bold;">MAT:${qrData.Material}-UNIT:${
              qrData.Unit
            }</div>
            <div style="font-weight: bold;">BATCH:${qrData.Batch}</div>
            <div style="font-weight: bold;">${
              qrData["Material Description"]
            }</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5mm; margin-top: 4mm;">
              <div>
                <div style="font-weight: bold;">UNIT</div>
                <div>${qrData.Unit}</div>
              </div>
              <div>
                <div style="font-weight: bold;">Expire date</div>
                <div>${
                  qrData["SLED/BBD"]
                    ? new Date(
                        (qrData["SLED/BBD"] - 25569) * 86400 * 1000
                      ).toLocaleDateString()
                    : "N/A"
                }</div>
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
            console.log("Printing in kiosk mode (isBlank: " + isBlank + ")");
            iframe.contentWindow?.print();
            iframe.contentWindow?.addEventListener("afterprint", async () => {
              cleanup();

              // ป้องกันการเพิ่มค่าหากกำลังจะหยุดแล้ว
              if (isStopRequested || saveActionRef.current) {
                console.log("⚠️ มีการขอหยุดหรือกำลังบันทึกข้อมูลแล้ว - ไม่เพิ่มจำนวน");
                resolve(false);
                return;
              }
            
              // เก็บค่าเดิมเพื่อเปรียบเทียบ
              const oldCount = printedCountRef.current;
              
              // ไม่เพิ่มค่าถ้าถึงเป้าหมายแล้ว
              if (!isBlank && oldCount >= (currentTargetCount || targetCount)) {
                console.log(`⚠️ ถึงเป้าหมายแล้ว (${oldCount}/${currentTargetCount || targetCount}) - ไม่เพิ่มจำนวน`);
                resolve(false);
                return;
              }
              
              // เพิ่มค่าใหม่ทันที
              const newCount = oldCount + (isBlank ? 0 : 1);
              // บันทึกค่าในตัวแปร ref ก่อน
              printedCountRef.current = newCount;
            
              console.log(`🖨️ พิมพ์เสร็จสิ้น - เพิ่มค่าจาก ${oldCount} เป็น ${newCount}`);
            
              // อัพเดต state ทั้งหมดให้ตรงกัน
              await Promise.all([
                new Promise<void>((r) => {
                  setPrintedCount(newCount);
                  setTimeout(r, 0);
                }),
                new Promise<void>((r) => {
                  setCurrentCount(newCount.toString());
                  setTimeout(r, 0);
                }),
                new Promise<void>((r) => {
                  setStopCount(newCount.toString());
                  setTimeout(r, 0);
                }),
              ]);
            
              console.log(`✅ อัพเดตค่าทั้งหมดเรียบร้อย - ค่าปัจจุบัน: ${newCount}`);
            
              // ตรวจสอบทันทีว่าถึงเป้าหมายหรือยัง
              const effectiveTarget = currentTargetCount || targetCount;
              console.log(`🔍 ตรวจสอบเป้าหมาย: ${newCount}/${effectiveTarget}`);
            
              // ตรวจสอบเงื่อนไขอย่างเข้มงวด
              if (!isBlank && newCount >= effectiveTarget && !isStopRequested && !saveActionRef.current) {
                console.log(`🎯 ถึงเป้าหมายแล้ว (${newCount}/${effectiveTarget}) - หยุดการทำงาน`);
                // ยกเลิกการรอสัญญาณทันที
                setWaitingForArduinoResponse(false);
                // หยุดการทำงาน
                await handleStop(true);
                resolve(true);
                return;
              }
            
              resolve(true);
            });

            const printTimeout = setTimeout(() => {
              if (document.body.contains(iframe)) {
                cleanup();
                console.log("⏱️ Print timeout - assuming completed");
            
                // ป้องกันการเพิ่มค่าหากกำลังจะหยุดแล้ว
                if (isStopRequested || saveActionRef.current) {
                  console.log("⚠️ มีการขอหยุดหรือกำลังบันทึกข้อมูลแล้ว - ไม่เพิ่มจำนวน (timeout)");
                  resolve(false);
                  return;
                }
            
                // ตรวจสอบอีกครั้งว่าไม่เกินเป้าหมาย
                const currentValue = printedCountRef.current;
                const effectiveTargetCount = currentTargetCount || targetCount;
                
                if (!isBlank && currentValue >= effectiveTargetCount) {
                  console.log(`⚠️ ถึงเป้าหมายแล้ว (${currentValue}/${effectiveTargetCount}) - ไม่เพิ่มจำนวน (timeout)`);
                  resolve(false);
                  return;
                }
            
                const newCount = currentValue + (isBlank ? 0 : 1);
                printedCountRef.current = newCount;
            
                Promise.all([
                  new Promise((r) => {
                    setPrintedCount(newCount);
                    setTimeout(r, 0);
                  }),
                  new Promise((r) => {
                    setCurrentCount(newCount.toString());
                    setTimeout(r, 0);
                  }),
                  new Promise((r) => {
                    setStopCount(newCount.toString());
                    setTimeout(r, 0);
                  }),
                ]).then(() => {
                  console.log(`✅ อัพเดตค่าเรียบร้อย (timeout) - ตอนนี้เป็น ${newCount}, เป้าหมาย ${effectiveTargetCount}`);
            
                  if (!isBlank && newCount >= effectiveTargetCount) {
                    console.log("🎯 ถึงเป้าหมายแล้ว จะหยุดการผลิต (timeout)");
                    handleStop(true);
                  } else if (!isBlank) {
                    console.log(`ยังไม่ถึงเป้าหมาย (${newCount}/${effectiveTargetCount}) - รอสัญญาณ Arduino สำหรับชิ้นถัดไป`);
                    setWaitingForArduinoResponse(true);
                  }
            
                  resolve(true);
                });
              }
            }, 100);
            
            // เพิ่มการทำความสะอาด timeout ใน cleanup
            return () => {
              clearTimeout(printTimeout);
            };
          } else {
            const shouldPrint = window.confirm("พิมพ์ QR Code?");
            if (shouldPrint) {
              iframe.contentWindow?.print();
              iframe.contentWindow?.addEventListener("afterprint", () => {
                cleanup();
                const newPrintedCount = printedCount + 1;
                setPrintedCount(newPrintedCount);
                setRemainingPrints((prev) => prev - 1);

                setStopCount(newPrintedCount.toString());

                console.log(
                  `พิมพ์เสร็จสิ้น: ${newPrintedCount}/${targetCount}`
                );
                resolve(true);
              });

              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  cleanup();
                  const newPrintedCount = printedCount + 1;
                  setPrintedCount(newPrintedCount);
                  setRemainingPrints((prev) => prev - 1);

                  setStopCount(newPrintedCount.toString());

                  console.log(
                    `Print timeout - assuming completed: ${newPrintedCount}/${targetCount}`
                  );
                  resolve(true);
                }
              }, 100);
            } else {
              cleanup();
              resolve(false);
            }
          }
        });
      } catch (error) {
        console.error("Print error:", error);
        setError("ไม่สามารถพิมพ์ QR code ได้");
        return false;
      } finally {
        setIsPrinting(false);
      }
    },
    [
      isPrinting,
      isKioskMode,
      printedCount,
      targetCount,
      qrCodeDataUrl,
      onQrCodeGenerated,
      isRunning,
      isStopRequested,
      handleStop,
    ]
  );

  useEffect(() => {
    const verifySession = async () => {
      setIsLoading(true);
      setError(null);

      const token = sessionStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/verify-session", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Session verification failed");
        }

        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Session verification failed"
        );
        sessionStorage.removeItem("token");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [router]);

  useEffect(() => {
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  
    if (
      lastLog?.type === "received" &&
      lastLog.message === "1" &&
      waitingForArduinoResponse &&
      !isStopRequested && // เพิ่มเงื่อนไขป้องกันไม่ให้ทำงานถ้ามีการขอหยุดแล้ว
      !saveActionRef.current // เพิ่มเงื่อนไขป้องกันไม่ให้ทำงานถ้ากำลังบันทึกข้อมูล
    ) {
      (async () => {
        // ตรวจสอบอีกครั้งว่าจำนวนปัจจุบันไม่เกินเป้าหมาย
        const currentPrintedCount = printedCountRef.current;
        console.log(`🔄 Arduino ส่งสัญญาณ '1' - ตรวจสอบจำนวน: ${currentPrintedCount}/${targetCount}`);
  
        // ไม่ดำเนินการต่อถ้าถึงหรือเกินเป้าหมายแล้ว
        if (currentPrintedCount >= targetCount) {
          console.log(`🎯 ถึงเป้าหมายแล้ว (${currentPrintedCount}/${targetCount}) - หยุดการผลิต`);
          setWaitingForArduinoResponse(false);
          
          // ตรวจสอบเงื่อนไขก่อนเรียก handleStop
          if (!isStopRequested && !saveActionRef.current) {
            await handleStop(true);
          } else {
            console.log("⚠️ ไม่เรียก handleStop ซ้ำเนื่องจากมีการขอหยุดหรือกำลังบันทึกอยู่แล้ว");
          }
          return;
        }
  
        try {
          setIsProcessing(true);
          setWaitingForArduinoResponse(false);
  
          // ใช้ค่าที่เก็บไว้เพื่อให้แน่ใจว่าไม่มีการเปลี่ยนแปลงระหว่างทาง
          const nextItemNumber = currentPrintedCount + 1;
          
          // ตรวจสอบอีกครั้งว่าชิ้นถัดไปจะไม่เกินเป้าหมาย
          if (nextItemNumber > targetCount) {
            console.log(`⚠️ จำนวนเกินเป้าหมาย (${nextItemNumber} > ${targetCount}) - หยุดการผลิต`);
            if (!isStopRequested && !saveActionRef.current) {
              await handleStop(true);
            }
            return;
          }
          
          console.log(`กำลังพิมพ์ชิ้นที่ ${nextItemNumber}/${targetCount}`);
  
          try {
            setIsProcessing(true);
            setWaitingForArduinoResponse(false);
    
            // ใช้ printedCountRef แทน printedCount เพื่อให้แน่ใจว่าใช้ค่าปัจจุบันจริงๆ
            const nextItemNumber = printedCountRef.current + 1;
            console.log(`กำลังพิมพ์ชิ้นที่ ${nextItemNumber}/${targetCount}`);
    
            // ตรวจสอบป้องกันอีกครั้ง
            if (nextItemNumber > targetCount) {
              console.log(`จำนวนเกินเป้าหมาย (${nextItemNumber} > ${targetCount}) - หยุดการผลิต`);
              await handleStop(true);
              return;
            }
    
            const qrData = {
              ...productionData,
              serialNumber: `${productionData?.Batch}-${nextItemNumber}`,
              timestamp: new Date().toISOString(),
            };
            const qrImage = generateQrCodeDataUrl(qrData as SheetData);
    
            await sendCommand("110");
            await handlePrintQR(qrImage, qrData as SheetData, false, targetCount);
    
            // ตรวจสอบเป้าหมายอีกครั้งทันทีหลังพิมพ์
            if (printedCountRef.current >= targetCount) {
              console.log(`ถึงเป้าหมายแล้วหลังพิมพ์ (${printedCountRef.current}/${targetCount}) - หยุดการผลิต`);
              await handleStop(true);
              return;
            }
    
            // รอซักครู่
            await new Promise((resolve) => setTimeout(resolve, 1000));
    
            // ตั้งค่าให้รอสัญญาณต่อไปหากยังไม่ถึงเป้าหมาย
            if (printedCountRef.current < targetCount && !isStopRequested) {
              console.log(`ยังไม่ถึงเป้าหมาย (${printedCountRef.current}/${targetCount}) - รอสัญญาณ Arduino ครั้งถัดไป`);
              setWaitingForArduinoResponse(true);
            } else {
              // ถึงเป้าหมายแล้ว - หยุดการผลิต
              console.log(`ถึงเป้าหมายแล้ว (${printedCountRef.current}/${targetCount}) - หยุดการผลิต`);
              await handleStop(true);
            }
          } catch (error) {
            console.error("เกิดข้อผิดพลาด:", error);
            setError("เกิดข้อผิดพลาดในการผลิต");
          } finally {
            setIsProcessing(false);
          }
        } catch (error) {
          console.error("เกิดข้อผิดพลาดในการประมวลผล:", error);
          setError("เกิดข้อผิดพลาดในการผลิต");
        } finally {
          setIsProcessing(false);
        }
      })();
    }
  }, [
    logs,
    isRunning,
    targetCount,
    productionData,
    handleStop,
    sendCommand,
    generateQrCodeDataUrl,
    handlePrintQR,
    waitingForArduinoResponse,
    isStopRequested,
    saveActionRef, // เพิ่ม dependency
  ]);

// แก้ไขฟังก์ชัน handleStartProduction 
const handleStartProduction = useCallback(
  async (inputTarget?: number) => {
    try {
      setIsStopRequested(false);
      setHasSentInitialCommand(false);

      const activeTarget = inputTarget || targetCount;
      console.log(`เริ่มการผลิตด้วยเป้าหมาย ${activeTarget} ชิ้น`);

      // Reset all counters
      printedCountRef.current = 0;
      await Promise.all([
        new Promise<void>((resolve) => {
          setPrintedCount(0);
          setTimeout(resolve, 0);
        }),
        new Promise<void>((resolve) => {
          setCurrentCount("0");
          setTimeout(resolve, 0);
        }),
        new Promise<void>((resolve) => {
          setStopCount("0");
          setTimeout(resolve, 0);
        }),
      ]);

      // 1️⃣ พิมพ์ QR Code จริงจำนวน 20 ชิ้นแรก (หรือตามจำนวนทั้งหมดถ้าน้อยกว่า 20)
      const initialBatchSize = Math.min(activeTarget, 20);
      console.log(`กำลังพิมพ์ QR Code ${initialBatchSize} ชิ้นแรก...`);

      // Use a local counter to track how many QR codes have been printed in this batch
      let batchPrintedCount = 0;

      for (let i = 1; i <= initialBatchSize; i++) {
        // ตรวจสอบก่อนว่าไม่เกินเป้าหมาย
        if (batchPrintedCount >= activeTarget) {
          console.log(`🛑 ถึงเป้าหมายแล้วในระหว่างพิมพ์ชุดแรก (${batchPrintedCount}/${activeTarget}) - หยุดพิมพ์`);
          break;
        }
      
        console.log(`พิมพ์ QR Code ชิ้นที่ ${i}/${activeTarget}`);
      
        const qrData = {
          ...productionData,
          serialNumber: `${productionData?.Batch}-${i}`,
          timestamp: new Date().toISOString(),
        };

        const qrImage = generateQrCodeDataUrl(qrData as SheetData);

        // Wait for print completion
        const printSuccess = await handlePrintQR(
          qrImage,
          qrData as SheetData,
          false,
          activeTarget
        );

        if (printSuccess) {
          batchPrintedCount++;

          // Manually update the ref to match what should be the current count
          printedCountRef.current = batchPrintedCount;

          // Force update the state values
          setPrintedCount(batchPrintedCount);
          setCurrentCount(batchPrintedCount.toString());
          setStopCount(batchPrintedCount.toString());

          // Add a small delay to allow the UI to refresh
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        console.log(
          `Printed ${batchPrintedCount}/${initialBatchSize} QR codes so far`
        );

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
        console.log(
          `กำลังเริ่มผลิตชิ้นที่เหลืออีก ${remainingItems} ชิ้น...`
        );

        // ตั้งค่าให้รอสัญญาณ 2 ก่อน
        setWaitingForSignal2(true);
        
        // แก้ไขการรอสัญญาณ "2" ในฟังก์ชัน handleStartProduction

// เช็ค log ใหม่ที่เข้ามาโดยตรงแทนการใช้ waitingForSignal2 state
console.log("ส่งคำสั่ง 100 ไปยัง Arduino และเริ่มรอสัญญาณ 2...");
await sendCommand("100");

// บันทึกจำนวน logs ปัจจุบันก่อนเริ่มรอ
const currentLogsLength = logs.length;

// รอสัญญาณ "2" จาก Arduino โดยตรง
let signal2Received = false;

await new Promise<void>((resolve) => {
  console.log("เริ่มรอสัญญาณ 2 จาก Arduino แบบ realtime...");
  
  // เพิ่มการตรวจสอบหมดเวลา
  const startTime = Date.now();
  const MAX_WAIT_TIME = 20000; // รอไม่เกิน 50 วินาที
  
  // สร้างฟังก์ชันตรวจสอบ logs ใหม่
  const checkNewLogs = () => {
    // คำนวณระยะเวลาที่รอไปแล้ว
    const elapsedTime = Date.now() - startTime;
    
    // ตรวจสอบว่ามี logs ใหม่เข้ามาหรือไม่
    if (logs.length > currentLogsLength) {
      console.log(`พบ logs ใหม่จำนวน ${logs.length - currentLogsLength} รายการ`);
      
      // ตรวจสอบเฉพาะ logs ใหม่
      for (let i = currentLogsLength; i < logs.length; i++) {
        const log = logs[i];
        
        if (log.type === "received") {
          console.log(`[CHECKING] ตรวจสอบข้อความ: '${log.message}'`);
          
          // ตรวจสอบว่ามีข้อความเป็น "2" หรือไม่
          if (log.message.trim() === "2") {
            console.log("✅ พบสัญญาณ '2' จาก Arduino!");
            signal2Received = true;
            resolve();
            return;
          }
        }
      }
    }
    
    // ตรวจสอบเงื่อนไขการหยุดรอ
    if (isStopRequested) {
      console.log("❌ มีการขอหยุดระหว่างรอสัญญาณ 2");
      resolve();
      return;
    }
    
    // ตรวจสอบหมดเวลา
    if (elapsedTime > MAX_WAIT_TIME) {
      console.log(`⏱️ รอสัญญาณ 2 เกินเวลาที่กำหนด (${MAX_WAIT_TIME/1000} วินาที)`);
      console.log("⚠️ ข้ามการรอสัญญาณโดยอัตโนมัติ");
      
      // เพิ่มปุ่มข้ามการรอสัญญาณ
      signal2Received = true; // ให้ดำเนินการต่อแม้ไม่ได้รับสัญญาณ
      resolve();
      return;
    }
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(checkNewLogs, 100);
  };
  
  // เริ่มตรวจสอบ
  checkNewLogs();
});

// ไม่จำเป็นต้องใช้ waitingForSignal2 state อีกต่อไป
// เราอาศัยตัวแปร signal2Received แทน

// หากไม่มีการขอหยุดและได้รับสัญญาณ 2 แล้ว จึงดำเนินการต่อ
if (!isStopRequested && signal2Received) {
  console.log("✅ เริ่มส่งคำสั่งผลิต 110");
  
  // รอเพิ่มอีกเล็กน้อยเพื่อให้แน่ใจว่า Arduino พร้อม
  await new Promise(resolve => setTimeout(resolve, 500));
  
          for (let i = 1; i <= remainingItems; i++) {
            // ตรวจสอบว่าถึงเป้าหมายหรือมีการขอหยุดหรือไม่
            if (printedCountRef.current >= activeTarget || isStopRequested) {
              console.log(
                `✅ ผลิตครบ ${activeTarget} ชิ้นแล้ว (${printedCountRef.current}/${activeTarget}) หรือมีการขอหยุด - หยุดส่งคำสั่ง 110`
              );
              break;
            }

            const itemNumber = batchPrintedCount + i;
            console.log(
              `กำลังผลิตชิ้นที่ ${itemNumber}/${activeTarget} - ส่งคำสั่ง 110`
            );

            const qrData = {
              ...productionData,
              serialNumber: `${productionData?.Batch}-${itemNumber}`,
              timestamp: new Date().toISOString(),
            };
            const qrImage = generateQrCodeDataUrl(qrData as SheetData);
            
            console.log(`กำลังพิมพ์ QR Code สำหรับชิ้นที่ ${itemNumber}/${activeTarget}`);
            await handlePrintQR(qrImage, qrData as SheetData, false, activeTarget);
            
            // หลังจากพิมพ์เสร็จ ค่อยส่งคำสั่ง 110
            console.log(`พิมพ์ QR Code เสร็จแล้ว - ส่งคำสั่ง 110 สำหรับชิ้นที่ ${itemNumber}`);
            await sendCommand("110");
          
            // ส่วนที่เหลือยังคงเหมือนเดิม
            setWaitingForArduinoResponse(true);

            // รอสัญญาณ "1" จาก Arduino โดยเฉพาะ
            console.log(
              `รอสัญญาณ "1" จาก Arduino สำหรับชิ้นที่ ${itemNumber}...`
            );

            // จำนวน logs ปัจจุบันเพื่อใช้ตรวจสอบเฉพาะ logs ใหม่
            const currentLogsLength = logs.length;

            // รอสัญญาณ "1" จาก Arduino (ไม่มีกำหนดเวลา)
            await new Promise<void>((resolve) => {
              const checkForSignal = () => {
                // ตรวจสอบว่ามี logs ใหม่เข้ามาหรือไม่
                if (logs.length > currentLogsLength) {
                  // ตรวจสอบเฉพาะ logs ใหม่
                  for (let i = currentLogsLength; i < logs.length; i++) {
                    const log = logs[i];
                    if (log.type === "received" && log.message === "1") {
                      console.log(
                        `ได้รับสัญญาณ "1" จาก Arduino สำหรับชิ้นที่ ${itemNumber}`
                      );
                      setWaitingForArduinoResponse(false);
                      resolve();
                      return;
                    }
                  }
                }

                // ตรวจสอบอีกครั้งหลังจากรอเล็กน้อย
                setTimeout(checkForSignal, 100);
              };

              // เริ่มตรวจสอบ
              checkForSignal();
            });

            // รอเล็กน้อยหลังจากได้รับสัญญาณแล้วก่อนส่งคำสั่งถัดไป
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } else {
          console.log("❌ ไม่ได้รับสัญญาณ 2 หรือมีการขอหยุด - ข้ามการผลิตส่วนที่เหลือ");
        }
      }

      console.log("✅ กระบวนการผลิตเสร็จสิ้น - กำลังหยุดการผลิต...");
      await handleStop(true);
    } catch (error) {
      console.error("Start production error:", error);
      setError("ไม่สามารถเริ่มการผลิตได้");
      setIsRunning(false);
    }
  },
  [
    targetCount,
    sendCommand,
    handlePrintQR,
    generateQrCodeDataUrl,
    productionData,
    isStopRequested,
    waitingForArduinoResponse,
    handleStop,
    logs,
    waitingForSignal2,
  ]
);

  const handleStart = useCallback(() => {
    if (!productionData) {
      setError("กรุณาเลือกข้อมูลจาก Excel ก่อนเริ่มการผลิต");
      return;
    }

    if (!productionData.Batch || !productionData.Material) {
      setError("ข้อมูลการผลิตไม่ครบถ้วน กรุณาตรวจสอบไฟล์ Excel");
      return;
    }

    if (!connected) {
      setError("กรุณาเชื่อมต่อ Arduino ก่อนเริ่มการผลิต");
      return;
    }

    setShowTargetPrompt(true);
  }, [productionData, connected]);

  const confirmStart = useCallback(
    async (target: number) => {
      console.log("เริ่มต้นการผลิตด้วยเป้าหมาย:", target);

      if (isNaN(target) || target <= 0) {
        setError("กรุณาระบุจำนวนที่ต้องการผลิตให้ถูกต้อง");
        return;
      }

      try {
        // รีเซ็ตค่าทุกครั้งก่อนเริ่มการผลิตใหม่
        printedCountRef.current = 0;
        setPrintedCount(0);
        setCurrentCount("0");
        setStopCount("0");

        // สร้าง startTime ก่อนและเก็บไว้ในตัวแปร
        const newStartTime = new Date();

        // ตั้งค่า startTimeRef และ startTime พร้อมกัน
        startTimeRef.current = newStartTime;
        setStartTime(newStartTime);

        // ตั้งค่าเป้าหมายก่อน
        setTargetCount(target);

        // รอให้ state อัพเดต
        await new Promise((resolve) => setTimeout(resolve, 100));

        // ตั้งค่า UI
        setShowTargetPrompt(false);
        setIsRunning(true);
        setStartCount("0"); // เริ่มที่ 0 เสมอ

        // เพิ่มการล็อกเพื่อดีบั๊ก
        console.log(
          `กำลังเริ่มผลิตด้วยเป้าหมาย: ${target} ชิ้น, targetCount:`,
          target
        );

        // รอให้ state อัพเดต
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Log เพื่อตรวจสอบว่า startTime และ targetCount ถูกตั้งค่าไว้แล้ว
        console.log("ตรวจสอบค่าก่อนเริ่มผลิต:", {
          startTime: startTime,
          startTimeRef: startTimeRef.current,
          targetCount: targetCount,
          target: target,
        });

        // เริ่มการผลิตด้วยการส่งค่า target โดยตรง
        await handleStartProduction(target);
      } catch (error) {
        console.error("Error starting production:", error);
        setError("ไม่สามารถเริ่มการผลิตได้");
        setIsRunning(false);
      }
    },
    [handleStartProduction]
  );

  useEffect(() => {
    if (isRunning) {
      // อัพเดทค่า stopCount ให้ตรงกับ currentCount เพื่อให้แสดงค่าถูกต้อง
      setStopCount(currentCount);

      // Update console log เพื่อการดีบัก
      console.log("Production state updated:", {
        targetCount,
        currentCount,
        startCount,
        printedCount,
        isRunning,
        waitingForArduinoResponse,
      });
    }
  }, [
    targetCount,
    currentCount,
    startCount,
    isRunning,
    printedCount,
    waitingForArduinoResponse,
  ]);

  useEffect(() => {
    if (isRunning) {
      console.log("Target count updated:", targetCount);
    }
  }, [targetCount, isRunning]);

  useEffect(() => {
    if (isRunning) {
      console.log(
        `[สถานะ Arduino] กำลังรอสัญญาณ: ${
          waitingForArduinoResponse ? "ใช่" : "ไม่"
        }, จำนวน: ${printedCount}/${targetCount}`
      );
    }
  }, [waitingForArduinoResponse, isRunning, printedCount, targetCount]);

  useEffect(() => {
    console.log(`สถานะการทำงาน: ${isRunning ? "กำลังทำงาน" : "หยุดทำงาน"}`);

    // Add a small delay to make sure any direct save call from handleStop has a chance to set flags
    const timeoutId = setTimeout(() => {
      // Only save if isRunning is false AND not already saved AND no save is in progress
      if (
        !isRunning &&
        printedCountRef.current > 0 &&
        !showCompletionModal &&
        !isSaving.current &&
        !hasSaved &&
        !saveActionRef.current
      ) {
        console.log(
          "isRunning เป็น false และมีการพิมพ์แล้ว - กำลังบันทึกข้อมูลผ่าน effect"
        );
        // Lock to prevent multiple saves
        saveActionRef.current = true;
        setHasSaved(true);

        saveProductionDataWithRef().finally(() => {
          // Only reset printedCount and other display values when the save operation is truly complete
          printedCountRef.current = 0;
          setPrintedCount(0);
          setCurrentCount("0");
          setStopCount("0");
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
  }, [
    isRunning,
    printedCountRef.current,
    showCompletionModal,
    saveProductionDataWithRef,
    hasSaved,
  ]);

  const material = productionData?.Material;
  const batch = productionData?.Batch;
  const vendorBatch = productionData?.["Vendor Batch"]; // Access with bracket notation for keys with spaces
  const materialDescription = productionData?.["Material Description"];

  // คำนวณ duration แบบละเอียด (นาทีและวินาที)
  const getDuration = (startTime: Date | null): string => {
    if (!startTime) return "0 นาที 0 วินาที";

    const totalSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes} นาที ${seconds} วินาที`;
  };

  // เพิ่มฟังก์ชันสำหรับการหยุดฉุกเฉินโดยเฉพาะ
  const handleEmergencyStop = useCallback(async () => {
    try {
      // ส่งคำสั่งหยุดฉุกเฉินก่อนเป็นอันดับแรก
      console.log("Emergency stop activated!");
      await sendCommand("911");

      // จากนั้นค่อยเรียกฟังก์ชัน handleStop เพื่อบันทึกข้อมูล
      await handleStop(true);
    } catch (error) {
      console.error("Emergency stop error:", error);
      setError("ไม่สามารถหยุดการทำงานฉุกเฉินได้");
    }
  }, [handleStop, sendCommand]);

  // รีเซ็ตค่าทั้งหมด
  const resetAllValues = useCallback(() => {
    printedCountRef.current = 0;
    setPrintedCount(0);
    setCurrentCount("0");
    setStopCount("0");
    setTargetCount(0);
    setStartCount("0");
    setShowCompletionModal(false);
    setHasSaved(false);
    saveActionRef.current = false;
    setIsStopRequested(false);
    isSaving.current = false;
    setWaitingForSignal2(false); // รีเซ็ตสถานะการรอสัญญาณ 2 ด้วย
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
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                {connected ? "อุปกรณ์พร้อมใช้งาน" : "ไม่พบการเชื่อมต่ออุปกรณ์"}
              </span>
            </div>
            {/* Logout Button */}
            <button
              onClick={() => {
                sessionStorage.removeItem("token");
                router.push("/login");
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
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              พบข้อผิดพลาด
            </h3>
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
            <h3 className="text-lg font-semibold mb-4">
              กรุณาระบุจำนวนที่ต้องการผลิต
            </h3>
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
          <h3 className="text-lg font-semibold text-white flex">
            รายละเอียดการผลิต
            {qrCodeDataUrl ? (
              <Image
                src={qrCodeDataUrl}
                alt="QR Code"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            ) : (
              <div className="text-gray-500">ยังไม่มีการสร้าง QR code</div>
            )}
          </h3>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">
                รหัสวัสดุ
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {material || "ไม่มีข้อมูล"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">
                รหัส Batch
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {batch || "ไม่มีข้อมูล"}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">
                คำอธิบายวัสดุ
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {materialDescription || "ไม่มีข้อมูล"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500">
                Vendor Batch
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {vendorBatch || "ไม่มีข้อมูล"}
              </p>
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
                  ? "bg-gray-100 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              }`}
            >
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">
                  เริ่มการผลิตอัตโนมัติ
                </div>
                <div className="text-sm opacity-90">
                  {!productionData
                    ? "กรุณาเลือกข้อมูลจาก Excel"
                    : !connected
                    ? "รอการเชื่อมต่ออุปกรณ์"
                    : `จำนวนปัจจุบัน: ${currentCount} (พิมพ์อัตโนมัติ)`}
                </div>
              </div>
            </button>

            {/* Stop Button */}
            <button
              onClick={() => handleStop(true)}
              disabled={!isRunning}
              className={`flex-1 p-6 rounded-lg transition-all ${
                !isRunning
                  ? "bg-gray-100 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              }`}
            >
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">หยุดการผลิต</div>
                <div className="text-sm opacity-90">
                  จำนวนปัจจุบัน: {stopCount}
                </div>
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
            <h3 className="text-lg font-semibold text-white">
              สถิติการผลิตแบบเรียลไทม์
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">
                  เวลาเริ่มต้น
                </div>
                <div className="text-lg font-bold text-purple-900">
                  {startTime?.toLocaleTimeString()}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">
                  ระยะเวลา
                </div>
                <div className="text-lg font-bold text-purple-900">
                  {startTime ? getDuration(startTime) : "0 นาที 0 วินาที"}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">
                  จำนวนที่ผลิตแล้ว
                </div>
                <div className="text-lg font-bold text-purple-900">
                  {printedCount} ชิ้น
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-purple-600">สถานะ</div>
                <div className="text-lg font-bold text-green-600">
                  กำลังทำงาน
                </div>
              </div>
              {/* Add Target Progress */}
              <div className="bg-purple-50 rounded-lg p-4 text-center md:col-span-2">
                <div className="text-sm font-medium text-purple-600">
                  ความคืบหน้า
                </div>
                <div className="text-lg font-bold text-purple-900">
                  {printedCount} / {targetCount}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (printedCount / targetCount) * 100,
                          100
                        )}%`,
                      }}
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
                    log.type === "sent"
                      ? "bg-blue-100"
                      : log.type === "received"
                      ? "bg-green-100"
                      : "bg-gray-50"
                  }`}
                >
                  <span className="text-gray-500">{log.timestamp}</span>
                  <span
                    className={`ml-2 ${
                      log.type === "sent"
                        ? "text-blue-700"
                        : log.type === "received"
                        ? "text-green-700"
                        : "text-gray-700"
                    }`}
                  >
                    {log.type === "sent"
                      ? "↑ "
                      : log.type === "received"
                      ? "↓ "
                      : ""}
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
            <h3 className="text-2xl font-semibold mb-4 text-green-600">
              การผลิตเสร็จสมบูรณ์
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">
                  จำนวนที่ผลิต
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {completionData.totalProduced} ชิ้น
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">
                  ระยะเวลาการผลิต
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {completionData.startTime && completionData.endTime
                    ? `${Math.floor(
                        (completionData.endTime.getTime() -
                          completionData.startTime.getTime()) /
                          60000
                      )} นาที 
                     ${Math.floor(
                       ((completionData.endTime.getTime() -
                         completionData.startTime.getTime()) %
                         60000) /
                         1000
                     )} วินาที`
                    : "ไม่มีข้อมูล"}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">
                  รหัสซีเรียล
                </div>
                <div className="mt-2 text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {completionData.serialNumbers.map((sn) => (
                    <div
                      key={sn}
                      className="py-1 border-b border-gray-100 last:border-0"
                    >
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
}