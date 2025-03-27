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
  
  // Update logsRef whenever logs changes
  useEffect(() => {
    logsRef.current = logs;
    
    // Debug: แสดง log ล่าสุดเพื่อตรวจสอบข้อความที่ได้รับ
    if (logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      console.log(`Log ล่าสุด: ${lastLog.type} - '${lastLog.message}'`);
    }
  }, [logs]);

  const isKioskMode = true;
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingForArduinoResponse, setWaitingForArduinoResponse] = useState(false);
  
  // เพิ่มสถานะใหม่สำหรับติดตามการรอสัญญาณ "2"
  const [waitingForSignal2, setWaitingForSignal2] = useState(false);

  // ฟังก์ชันสำหรับตรวจจับสัญญาณ "2" จาก Arduino - ปรับปรุงจากตัวอย่างโค้ดที่ทำงานได้
  useEffect(() => {
    if (waitingForSignal2) {
      const lastLog = logs[logs.length - 1];
      if (lastLog?.type === "received") {
        console.log(`ตรวจสอบข้อความ: '${lastLog.message}'`);
        
        // ตรวจสอบรูปแบบต่างๆ ของข้อความ "2"
        if (
          lastLog.message === "2" || 
          lastLog.message.trim() === "2" ||
          lastLog.message.includes("2")
        ) {
          console.log("✅ พบสัญญาณ '2' จาก Arduino!");
          setWaitingForSignal2(false);
          setWaitingForArduinoResponse(true); // พร้อมสำหรับขั้นตอนถัดไป
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
      console.log("เริ่มการหยุดการทำงาน:", {
        forceStop,
        isRunning,
        user: !!user,
        startTime: !!startTime,
        startTimeRef: !!startTimeRef.current,
        isSaving: isSaving.current,
        hasSaved,
        saveActionRef: saveActionRef.current,
      });

      if (
        isStopRequested ||
        hasSaved ||
        saveActionRef.current ||
        isSaving.current
      ) {
        console.log(
          "Stop already requested or data already saved, skipping duplicate call"
        );
        return;
      }

      setIsStopRequested(true);

      if (!user || !startTimeRef.current) {
        console.log(
          "ไม่สามารถหยุดได้: user:",
          !!user,
          "startTime:",
          !!startTime,
          "startTimeRef:",
          !!startTimeRef.current
        );
        setIsStopRequested(false);
        return;
      }

      try {
        console.log("กำลังหยุดการทำงาน - ตั้งค่า isRunning เป็น false");

        console.log("Sending emergency stop command: 911");
        await sendCommand("911");

        await new Promise((resolve) => setTimeout(resolve, 1000));

        saveActionRef.current = true;

        setIsRunning(false);

        if (!hasSaved && !isSaving.current) {
          setHasSaved(true);
          await saveProductionDataWithRef();
        } else {
          console.log("ข้ามการบันทึกข้อมูลเนื่องจากได้บันทึกไปแล้ว");
        }

        setWaitingForArduinoResponse(false);
        setWaitingForSignal2(false); // รีเซ็ตสถานะการรอสัญญาณ 2 ด้วย
      } catch (error) {
        console.error("Error stopping production:", error);
        setError(
          error instanceof Error ? error.message : "Failed to stop production"
        );
        saveActionRef.current = false;
        setHasSaved(false);
      } finally {
        setIsStopRequested(false);
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
            iframe.contentWindow?.addEventListener("afterprint", () => {
              cleanup();

              console.log(`พิมพ์เสร็จสิ้น - จะเพิ่มค่าจากเดิม ${printedCount}`);

              const newCount = printedCount + (isBlank ? 0 : 1);
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
                console.log(`อัพเดตค่าเรียบร้อย - ตอนนี้เป็น ${newCount}`);

                setTimeout(() => {
                  const effectiveTargetCount =
                    currentTargetCount || targetCount;
                  console.log(
                    `ตรวจสอบเป้าหมาย: ${newCount}/${effectiveTargetCount}`
                  );

                  if (!isBlank && newCount >= effectiveTargetCount) {
                    console.log("ถึงเป้าหมายแล้ว จะหยุดการผลิต");
                    handleStop(true);
                  }
                }, 100);

                resolve(true);
              });
            });

            setTimeout(() => {
              if (document.body.contains(iframe)) {
                cleanup();
                console.log("Print timeout - assuming completed");

                const newCount = printedCount + (isBlank ? 0 : 1);
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
                  const effectiveTargetCount =
                    currentTargetCount || targetCount;
                  console.log(
                    `อัพเดตค่าเรียบร้อย (timeout) - ตอนนี้เป็น ${newCount}, เป้าหมาย ${effectiveTargetCount}`
                  );

                  if (!isBlank && newCount >= effectiveTargetCount) {
                    console.log("ถึงเป้าหมายแล้ว จะหยุดการผลิต (timeout)");
                    handleStop(true);
                  } else if (!isBlank) {
                    console.log(
                      `ยังไม่ถึงเป้าหมาย (${newCount}/${effectiveTargetCount}) - รอสัญญาณ Arduino สำหรับชิ้นถัดไป`
                    );
                    setWaitingForArduinoResponse(true);
                  }

                  resolve(true);
                });
              }
            }, 3000);
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
              }, 1000);
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
      waitingForArduinoResponse
    ) {
      (async () => {
        console.log(
          `Arduino ส่งสัญญาณ '1' - ตรวจสอบจำนวน: ${printedCountRef.current}/${targetCount}`
        );

        if (printedCountRef.current >= targetCount) {
          console.log("ถึงเป้าหมายแล้ว - หยุดการผลิต");
          await handleStop(true);
          return;
        }

        try {
          setIsProcessing(true);
          setWaitingForArduinoResponse(false);

          const nextItemNumber = printedCount + 1;
          console.log(`กำลังพิมพ์ชิ้นที่ ${nextItemNumber}/${targetCount}`);

          const qrData = {
            ...productionData,
            serialNumber: `${productionData?.Batch}-${nextItemNumber}`,
            timestamp: new Date().toISOString(),
          };
          const qrImage = generateQrCodeDataUrl(qrData as SheetData);

          await sendCommand("110");
          await handlePrintQR(qrImage, qrData as SheetData, false, targetCount);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (printedCount < targetCount && !isStopRequested) {
            console.log("ยังไม่ถึงเป้าหมาย - รอสัญญาณ Arduino ครั้งถัดไป");
            setWaitingForArduinoResponse(true);
          }
        } catch (error) {
          console.error("เกิดข้อผิดพลาด:", error);
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
    printedCount,
    isStopRequested,
  ]);

  // แก้ไขฟังก์ชัน handleStartProduction ให้ใช้การตรวจจับสัญญาณ "2" แบบใหม่
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

          console.log("ส่งคำสั่ง 100 ไปยัง Arduino และรอสัญญาณ 2 กลับมา");
          await sendCommand("100");
          
          // เริ่มรอสัญญาณ "2" โดยใช้สถานะใหม่
          setWaitingForSignal2(true);
          console.log("กำลังรอสัญญาณ '2' จาก Arduino...");

          // ใช้ Promise เพื่อรอจนกว่าสถานะ waitingForSignal2 จะเป็น false (ได้รับสัญญาณแล้ว)
          await new Promise<void>((resolve) => {
            const checkSignal2Status = () => {
              if (!waitingForSignal2) {
                console.log("ตรวจพบว่าได้รับสัญญาณ 2 แล้ว - ดำเนินการต่อ");
                resolve();
              } else {
                setTimeout(checkSignal2Status, 100);
              }
            };
            checkSignal2Status();
          });

          // หลังจากได้รับสัญญาณ 2 แล้ว ดำเนินการต่อ
          console.log("✅ ได้รับสัญญาณ 2 แล้ว - เริ่มส่งคำสั่งผลิต 110");

          // 2️⃣ ส่งคำสั่ง 110 สำหรับการผลิตส่วนที่เหลือ
          for (let i = 1; i <= remainingItems; i++) {
            // ตรวจสอบว่าถึงเป้าหมายหรือมีการขอหยุดหรือไม่
            if (printedCountRef.current >= activeTarget || isStopRequested) {
              console.log(
                `✅ ผลิตครบ ${activeTarget} ชิ้นแล้ว หรือมีการขอหยุด - หยุดส่งคำสั่ง 110`
              );
              break;
            }

            const itemNumber = batchPrintedCount + i;
            console.log(
              `กำลังผลิตชิ้นที่ ${itemNumber}/${activeTarget} - ส่งคำสั่ง 110`
            );

            // ส่งคำสั่ง 110 ให้ Arduino ทำงาน
            await sendCommand("110");

            // รอสัญญาณตอบกลับจาก Arduino ก่อนดำเนินการต่อ
            setWaitingForArduinoResponse(true);

            // รอสัญญาณ "1" จาก Arduino โดยเฉพาะ
            console.log(
              `รอสัญญาณ "1" จาก Arduino สำหรับชิ้นที่ ${itemNumber}...`
            );

            // Get current logs length to check only new logs
            const currentLogsLength = logs.length;

            // รอสัญญาณ "1" จาก Arduino (ไม่มีกำหนดเวลา)
            await new Promise<void>((resolve) => {
              const checkForSignal = () => {
                // Check if any new logs came in
                if (logs.length > currentLogsLength) {
                  // Check all new logs since we started waiting
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

                // Check again after a small delay
                setTimeout(checkForSignal, 100);
              };

              // Start checking
              checkForSignal();
            });

            // รอเล็กน้อยหลังจากได้รับสัญญาณแล้วก่อนส่งคำสั่งถัดไป
            await new Promise((resolve) => setTimeout(resolve, 500));
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
