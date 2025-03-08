'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
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

const ProductionLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [production, setProduction] = useState({
    targetCount: 0,
    currentCount: 0,
    isRunning: false
  });
  const { connected, sendCommand } = useArduino();

  const fetchLogs = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/production-logs?date=${encodeURIComponent(date)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch logs');
      }
      
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [selectedDate, fetchLogs]);

  const exportToExcel = useCallback(async () => {
    try {
      // Prepare data for export, excluding large fields
      const exportData = logs.map(log => ({
        Date: new Date(log.startTime).toLocaleDateString(),
        Time: new Date(log.startTime).toLocaleTimeString(),
        Material: log.material,
        'Material Description': log.materialDescription,
        Batch: log.batch,
        'Vendor Batch': log.vendorBatch,
        'Units Produced': log.totalProduced,
        Operator: log.username,
        Duration: `${Math.floor((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 60000)} min`
      }));

      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 15 }, // Material
        { wch: 30 }, // Material Description
        { wch: 15 }, // Batch
        { wch: 15 }, // Vendor Batch
        { wch: 15 }, // Units Produced
        { wch: 20 }, // Operator
        { wch: 10 }  // Duration
      ];

      // Add workbook to sheet
      XLSX.utils.book_append_sheet(wb, ws, 'Production Logs');

      // Save file
      XLSX.writeFile(wb, `production_logs_${selectedDate}.xlsx`);

    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data');
    }
  }, [logs, selectedDate]);

  const handleStartProduction = async (productionData: any) => {
    try {
      const response = await fetch('/api/production/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          materialId: productionData.Material,
          batch: productionData.Batch,
          targetCount: productionData.targetCount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start production');
      }

      const data = await response.json();
      setProduction({
        ...production,
        isRunning: true,
        targetCount: data.targetCount
      });

      // Start Arduino counting
      if (connected) {
        sendCommand('START');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Daily Production Logs</h3>
        <div className="flex gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md px-3 py-1 text-sm"
          />
          <button
            onClick={exportToExcel}
            disabled={logs.length === 0}
            className="px-4 py-1 bg-white text-indigo-700 rounded-md text-sm font-medium 
              hover:bg-indigo-50 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Export to Excel
          </button>
        </div>
      </div>
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
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
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading logs...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={log.id || index}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(log.startTime).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.batch || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.totalProduced}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No production logs found for this date</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionLogPage;