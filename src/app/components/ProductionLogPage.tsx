import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';


const ProductionLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ProductionLog[]>([]);


  // Modify the exportToExcel function in ProductionLogPage.tsx
  const exportToExcel = () => {
    // Add username to the logs data
    const logsWithUser = logs.map(log => ({
      ...log,
      operator: log.username // Include the username in the export
    }));

    const worksheet = XLSX.utils.json_to_sheet(logsWithUser);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Production Logs");
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // date
      { wch: 15 }, // operator (username)
      { wch: 15 }, // material
      { wch: 30 }, // description
      { wch: 15 }, // batch
      { wch: 15 }, // vendor batch
      { wch: 10 }, // start count
      { wch: 10 }, // end count
      { wch: 10 }, // total
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