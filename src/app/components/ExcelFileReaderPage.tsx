"use client";

import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'react-qr-code';
import ReactDOMServer from 'react-dom/server';
import Image from 'next/image';

interface SheetData {
  [key: string]: string | number | undefined;
}

interface Props {
  onDataSelect: (rowData: SheetData, qrCodeDataUrl: string) => void;
  onQrCodeGenerated?: (qrCodeUrl: string) => void;
}

const ExcelFileReaderPage: React.FC<Props> = ({ onDataSelect, onQrCodeGenerated }) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRowData, setSelectedRowData] = useState<SheetData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const qrCodeDataUrlRef = useRef<string>("");

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      setSelectedFile(file || null);
      if (!file) return;

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
  }, []);

  const handleSheetChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
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
  }, [workbook]);

  const convertExcelDateToJSDate = useCallback((excelDate: number): string => {
    const jsDate = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
    return jsDate.toLocaleDateString();
  }, []);

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

  const handlePrint = useCallback(() => {
    if (!selectedRowData) return;

    // Create a new hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Get the iframe's document
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDocument) {
      console.error("Could not get iframe document");
      return;
    }

    const newQrCodeDataUrl = generateQrCodeDataUrl(selectedRowData);
    qrCodeDataUrlRef.current = newQrCodeDataUrl;

    // Add this line to pass the QR code URL up
    if (onQrCodeGenerated) {
      onQrCodeGenerated(newQrCodeDataUrl);
    }

    // Add content to the iframe
    iframeDocument.body.innerHTML = `
    <div class="print-section" style="width: 50mm; height: 20mm; display: flex; align-items: center; padding: 0mm; font-family: Arial, sans-serif;">
      
      <!-- QR Code Section -->
      <div style="width: 20mm; height: 20mm; flex-shrink: 0;">
        <img src="${qrCodeDataUrlRef.current}" style="width: 100%; height: 100%;" />
      </div>

      <!-- Text Section -->
      <div style="flex-grow: 1; padding-left: 2mm; font-size: 5pt; line-height: 1.2;">
        <div style="font-weight: bold;">MAT: ${selectedRowData.Material}-UNIT:${selectedRowData.Unit}</div>
        <div style="font-weight: bold;">BATCH: ${selectedRowData.Batch}</div>
        <div style="font-weight: bold;">${selectedRowData["Material Description"]}</div>

        <!-- Row for UNIT, Expiry, Vendor Batch -->
        <div style="display: flex; margin-top: 1mm; font-size: 5pt;">
          <div style="flex: 1;"><b>UNIT</b><br>${selectedRowData.Unit}</div>
          <div style="flex: 1;"><b>Expire date</b><br>${typeof selectedRowData["SLED/BBD"] === 'number'
            ? convertExcelDateToJSDate(selectedRowData["SLED/BBD"])
            : selectedRowData["SLED/BBD"]}</div>
          <div style="flex: 1;"><b>Vendor Batch</b><br>${selectedRowData["Vendor Batch"]}</div>
        </div>
      </div>

    </div>
  `;

    // Print the iframe
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Remove the iframe after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 100);
  }, [generateQrCodeDataUrl, selectedRowData, convertExcelDateToJSDate, onQrCodeGenerated]);

  const togglePreview = useCallback(() => {
    setIsPreviewVisible(!isPreviewVisible);
  }, [isPreviewVisible]);

  const handleRowClick = useCallback((row: SheetData) => {
    const newQrCodeDataUrl = generateQrCodeDataUrl(row);
    setQrCodeDataUrl(newQrCodeDataUrl);
    qrCodeDataUrlRef.current = newQrCodeDataUrl;
    setSelectedRowData(row);
    onDataSelect(row, newQrCodeDataUrl); // Pass QR code data URL
  }, [generateQrCodeDataUrl, onDataSelect]);

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
          <span className="text-sm text-green-700 mx-auto">{selectedFile.name}</span>
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
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 011.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
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
    <div className="mt-6 rounded-lg shadow border border-gray-200">
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
                onClick={() => handleRowClick(row)}
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
        className="absolute top-4 right-14 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full no-print"
        title="Toggle Preview"
        onClick={togglePreview}
      >
        {/* Preview button SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7 1.274 4.057 1.274 8.057 0 12.114-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7-1.274-4.057-1.274-8.057 0-12.114z" />
        </svg>
      </button>
      
      <div className="print-section">
      <div className="flex gap-2" style={{width: 'auto'}}>
        {/* Left side - QR Code */}
        <div className="flex-shrink-0" style={{width: 'auto'}}>
          <QRCode
            value={JSON.stringify(selectedRowData)}
            size={150}
            className="qr-code-print"
            level="L"
          />
      </div>

        {/* Right side - Data Display */}
        <div className="flex-grow font-bold pl-4" style={{width: 'auto'}}> {/* Changed padding-left-40 to pl-4 */}
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
{isPreviewVisible && selectedRowData && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-xl w-full">
            <h2 className="text-2xl font-bold mb-4">Print Preview</h2>
              <div className="print-section">
               <div className="flex gap-2" style={{width: 'auto'}}>
                 
                 <div className="flex-shrink-0" style={{width: 'auto'}}>
                   <Image
                     src={qrCodeDataUrl}
                     alt="QR Code"
                     width={150}
                     height={150}
                     style={{ width: '32mm', height: '32mm', padding: '2mm 0mm 0mm 0mm' }}
                   />
                 </div>

                
                 <div className="flex-grow font-bold pl-4" style={{width: 'auto'}}>
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
            
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
              onClick={() => {
                handlePrint();
                setIsPreviewVisible(false);
              }}
            >
              Print
            </button>
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded ml-2 mt-4"
              onClick={() => setIsPreviewVisible(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
  </div>
  );
};

export default ExcelFileReaderPage;