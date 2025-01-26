import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface ProductionLog {
  date: string;
  startTime: string;
  endTime: string;
  material: string;
  materialDescription: string;
  batch: string;
  vendorBatch: string;
  startCount: number;
  endCount: number;
  totalProduced: number;
  operator: string;
  status: 'Completed' | 'In Progress';
}

const ProductionLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ProductionLog[]>([]);

  // Function to add new log from production data
  const addProductionLog = (productionData: {
    startTime: string;
    endTime: string;
    startCount: string;
    stopCount: string;
    operator: string;
    material?: string;
    batch?: string;
  }) => {
    const newLog: ProductionLog = {
      date: new Date(productionData.startTime).toISOString().split('T')[0],
      startTime: productionData.startTime,
      endTime: productionData.endTime,
      material: productionData.material || '',
      materialDescription: '',
      batch: productionData.batch || '',
      vendorBatch: '',
      startCount: parseInt(productionData.startCount),
      endCount: parseInt(productionData.stopCount),
      totalProduced: parseInt(productionData.stopCount) - parseInt(productionData.startCount),
      operator: productionData.operator,
      status: 'Completed'
    };

    setLogs(prevLogs => [...prevLogs, newLog]);
  };

  // Export function remains the same
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(logs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Production Logs");
    
    const colWidths = [
      { wch: 12 }, // date
      { wch: 15 }, // material
      { wch: 30 }, // description
      { wch: 15 }, // batch
      { wch: 15 }, // vendor batch
      { wch: 10 }, // start count
      { wch: 10 }, // end count
      { wch: 10 }, // total
      { wch: 15 }, // operator
      { wch: 12 }, // status
      { wch: 20 }, // remarks
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, "production_logs.xlsx");
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {/* Header and Export Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Production Logs</h2>
          <button
            onClick={exportToExcel}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 
              transition-colors duration-200 flex items-center gap-2 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export to Excel
          </button>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{log.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(log.startTime).toLocaleTimeString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.operator}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.startCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.endCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.totalProduced}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductionLogPage;