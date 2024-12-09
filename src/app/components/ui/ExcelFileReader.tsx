import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SheetData {
  [key: string]: string | number;
}

const ExcelFileReader: React.FC = () => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRowData, setSelectedRowData] = useState<SheetData | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
        setSelectedFile(file || null)
      if (!file) return;

      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          setError("");
        } catch (err) {
          setError("Error reading file");
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError("Error reading file");
      console.error(err);
    }
  };

  const handleSheetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sheetName = event.target.value;
    setSelectedSheet(sheetName);
    if (sheetName && workbook) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<SheetData>(worksheet);
        setSheetData(data);
        setError("");
      } catch (err) {
        setError("Error reading sheet");
        console.error(err);
      }
    }
  };

  const convertExcelDateToJSDate = (excelDate: number): string => {
    const jsDate = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
    
    return jsDate.toLocaleDateString();
  }

  const handlePrint = () => {
    // Add print-specific styles
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: 50mm 20mm;
          margin: 0;
        }
        html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: 20mm;
      overflow: hidden;
    }

    /* Only show print section */
    .print-section {
      display: block !important;
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 50mm !important;
      height: 20mm !important;
      margin: 0 !important;
      padding: 1mm !important;
      overflow: hidden !important;
    }
        .print-section, .print-section * {
          visibility: visible;
        }
        .print-section {
          position: absolute;
          left: 0;
          top: 0;
          width: 50mm;
          height: 20mm;
          padding: 1mm !important;
          overflow: hidden;
          transform: scale(1);
          transform-origin: top left;
        }
        /* QR Code sizing */
        .print-section .qr-code-print {
          width: 15mm !important;
          height: 15mm !important;
        }
        .print-section .qr-code-print canvas,
        .print-section .qr-code-print svg {
          width: 15mm !important;
          height: 15mm !important;
        }
        /* Text adjustments */
        .print-section .text-lg {
          font-size: 6pt !important;
          line-height: 1.1 !important;
          margin: 0 !important;
        }
        .print-section .text-sm {
          font-size: 5pt !important;
          line-height: 1 !important;
          margin: 0 !important;
        }
        .print-section .grid {
          gap: 0.5mm !important;
        }
        .print-section .space-y-0 > * + * {
          margin-top: 0 !important;
        }
        .print-section .mb-0,
        .print-section .mb-2 {
          margin-bottom: 0.5mm !important;
        }
        .print-section .flex {
          gap: 2mm !important;
        }
        /* Keep existing QR and text styles */
    .print-section .qr-code-print {
      width: 15mm !important;
      height: 15mm !important;
    }

    .print-section .flex {
      display: flex !important;
      gap: 2mm !important;
    }

    .print-section * {
      display: block !important;
    }
      }
    `;
    return new Promise((resolve) => {
      document.head.appendChild(style);
      
      // Print settings optimized for PDF
      const printSettings = {
        destination: 'Save as PDF',
        printBackground: true,
        pageSize: {
          width: 50000, // in micrometers (50mm)
          height: 20000 // in micrometers (20mm)
        },
        margins: {
          marginType: 'none'
        }
      };
  
      try {
        // @ts-ignore - Chrome-specific PDF print settings
        window.print(printSettings);
      } catch {
        // Fallback to regular print dialog
        window.print();
      }
  
      setTimeout(() => {
        document.head.removeChild(style);
        resolve(true);
      }, 1000);
    });
  };

  const handlePrintToPDF = async () => {
    try {
      const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: 50mm 20mm;
          margin: 0;
        }
        html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: 20mm;
      overflow: hidden;
    }

    /* Only show print section */
    .print-section {
      display: block !important;
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 50mm !important;
      height: 20mm !important;
      margin: 0 !important;
      padding: 1mm !important;
      overflow: hidden !important;
    }
        .print-section, .print-section * {
          visibility: visible;
        }
        .print-section {
          position: absolute;
          left: 0;
          top: 0;
          width: 50mm;
          height: 20mm;
          padding: 1mm !important;
          overflow: hidden;
          transform: scale(1);
          transform-origin: top left;
        }
        /* QR Code sizing */
        .print-section .qr-code-print {
          width: 15mm !important;
          height: 15mm !important;
        }
        .print-section .qr-code-print canvas,
        .print-section .qr-code-print svg {
          width: 15mm !important;
          height: 15mm !important;
        }
        /* Text adjustments */
        .print-section .text-lg {
          font-size: 6pt !important;
          line-height: 1.1 !important;
          margin: 0 !important;
        }
        .print-section .text-sm {
          font-size: 5pt !important;
          line-height: 1 !important;
          margin: 0 !important;
        }
        .print-section .grid {
          gap: 0.5mm !important;
        }
        .print-section .space-y-0 > * + * {
          margin-top: 0 !important;
        }
        .print-section .mb-0,
        .print-section .mb-2 {
          margin-bottom: 0.5mm !important;
        }
        .print-section .flex {
          gap: 2mm !important;
        }
        /* Keep existing QR and text styles */
    .print-section .qr-code-print {
      width: 15mm !important;
      height: 15mm !important;
    }

    .print-section .flex {
      display: flex !important;
      gap: 2mm !important;
    }

    .print-section * {
      display: block !important;
    }
      }
    `;
    
      // Get the print section element
      const printSection = document.querySelector('.print-section');
      if (!printSection) return;
  
      // Convert to canvas
      const canvas = await html2canvas(printSection, {
        scale: 2, // Higher quality
        useCORS: true, // Handle QR code image
        width: 188.9, // 50mm in pixels (at 96 DPI)
        height: 75.6, // 20mm in pixels
        backgroundColor: '#ffffff'
      });
  
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [20, 50] // height, width
      });
  
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 50, 20);
  
      // Save PDF
      pdf.save(`label-${selectedRowData?.Material}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };
  
  return (
    // File upload area
<div className="w-full max-w-2xl mx-auto p-6">
  <div className={`border-2 border-dashed ${selectedFile ? 'border-blue-500' : 'border-gray-300'} rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer`}>
    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx,.xls"
      onChange={handleFileUpload}
      className="hidden"
      id="file-upload"
    />
    <label htmlFor="file-upload" className="cursor-pointer">
      {!selectedFile ? (
        <>
          <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-1 text-sm text-gray-500">Drop Excel file or click</p>
        </>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <svg className="h-14 w-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-gray-600 mx-auto text-green-700">{selectedFile.name}</span>
          <button 
            onClick={(e) => {
              e.preventDefault();
              setSelectedFile(null);
              setSheetNames([]);
              setSheetData([]);
              setSelectedSheet("");
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            className="text-gray-400 hover:text-red-500"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </label>
  </div>

  {error && <div className="text-red-500 p-4 mt-4 bg-red-50 rounded-md">{error}</div>}

  {sheetNames.length >= 0 && (
    <div className="my-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">Select Sheet</label>
      <select 
        onChange={handleSheetChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      >
        <option value="">Select a sheet</option>
        {sheetNames.map((name, index) => (
          <option key={index} value={name}>{name}</option>
        ))}
      </select>
    </div>
  )}

  {!sheetNames.length && (
    <div className="mt-8 rounded-lg shadow border border-gray-200">
      <div className="max-h-[70vh] overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-gray-400 text-sm">Upload an Excel file to view data</p>
        </div>
        <table className="min-w-full divide-y divide-gray-200 opacity-50">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(5)].map((_, index) => (
                <th key={index} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(5)].map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )}

{selectedFile && !selectedSheet && (
  <div className="mt-8 rounded-lg shadow border border-gray-200">
    <div className="max-h-[70vh] overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <p className="text-gray-400 text-sm">Please select a sheet to view data</p>
      </div>
      <table className="min-w-full divide-y divide-gray-200 opacity-40">
        <thead className="bg-gray-50">
          <tr>
            {[...Array(5)].map((_, index) => (
              <th key={index} className="px-6 py-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(5)].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {[...Array(5)].map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
  
  {selectedSheet && sheetData.length > 0 && (
    <div className="mt-8 rounded-lg shadow border border-gray-200">
      {/* Fixed header wrapper */}
      <div className="max-h-[40vh] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {Object.keys(sheetData[0]).map((header, index) => (
                <th 
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sheetData.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedRowData(row)}
                >
                {Object.values(row).map((value, cellIndex) => (
                  <td 
                    key={cellIndex}
                    className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap"
                  >
                    {typeof value === 'number' && value > 25569 && value < 47483
                      ? convertExcelDateToJSDate(value)
                      : value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )}


  {/* QR Code and Data Section */}
{selectedRowData && (
    <div className="mt-8 p-6 border rounded-lg relative">
      <button
        className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full no-print"
        title="Print"
        onClick={handlePrintToPDF}
      >
        {/* Print button SVG */}
        <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-6 w-6" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
        />
      </svg>
      </button>
      
      <div className="print-section">
      <div className="flex gap-8">
        {/* Left side - QR Code */}
        <div className="flex-shrink-0">
          <QRCode
            value={JSON.stringify(selectedRowData)}
            size={150}
            className="qr-code-print"
            level="L"
          />
      </div>

        {/* Right side - Data Display */}
        <div className="flex-grow font-bold">
          <div className="mb-0 text-lg">
            <span className="mr-2">MAT:{selectedRowData.Material}-UNIT:{selectedRowData.Unit}</span>
          </div>
          <div className="mb-0">
            <span className="text-lg">BATCH:{selectedRowData.Batch}</span>
          </div>
          <div className="text-lg mb-2">
            {selectedRowData["Material Description"]}
          </div>

          <div className="space-y-0">
            <div className="grid grid-cols-4">
              <div className="text-sm">UNIT <br/> {selectedRowData.Unit}
              </div>
              <div className="text-sm">Expire date <br/>
              {typeof selectedRowData["SLED/BBD"] === 'number'
                ? convertExcelDateToJSDate(selectedRowData["SLED/BBD"])
                : selectedRowData["SLED/BBD"]}</div>
              <div className="text-sm">Vendor Batch <br/>
              {selectedRowData["Vendor Batch"]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

)}
  </div>
  );
};

export default ExcelFileReader;