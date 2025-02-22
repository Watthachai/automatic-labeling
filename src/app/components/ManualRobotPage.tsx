'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useArduino } from '../contexts/ArduinoContext';

// Define log entry type
interface LogEntry {
    type: 'send' | 'receive';
    timestamp: number;
    message: string;
}

const ManualRobotPage: React.FC = () => {
    const { 
        status, 
        connected, 
        logs,
        requestPort,
        disconnect,
        sendCommand
    } = useArduino();

    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    const [debugMode, setDebugMode] = useState(false);

    // Improved auto-scroll that only affects the logs container
    useEffect(() => {
        if (logsContainerRef.current) {
            const container = logsContainerRef.current;
            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 150;
            
            if (isScrolledToBottom) {
                logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }
    }, [logs]);

    const enterDebugMode = () => {
        sendCommand('1');
        setDebugMode(true);
    };

    const exitDebugMode = () => {
        sendCommand('1');
        setDebugMode(false);
    };

    const sendDebugCommand = (command: string) => {
        sendCommand(command);
    };

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl shadow-2xl border-2 border-gray-700">
                <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-200 font-mono">
                            Arduino Control Panel
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-gray-200">{status}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button
                            onClick={requestPort}
                            disabled={connected}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-500"
                        >
                            Select Port
                        </button>
                        <button
                            onClick={disconnect}
                            disabled={!connected}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-500"
                        >
                            Disconnect
                        </button>
                    </div>
                    
                    {/* Command button section */}
                    <div className="mt-4">
                        <button
                            onClick={() => sendCommand('11234')}
                            disabled={!connected}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-500"
                        >
                            Send Command 11234
                        </button>
                    </div>

                     {/* Debug Mode Section */}
                     <div className="mt-4">
                        {!debugMode ? (
                            <button
                                onClick={enterDebugMode}
                                disabled={!connected}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-500"
                            >
                                Enter Debug Mode
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={exitDebugMode}
                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                                >
                                    Exit Debug Mode
                                </button>
                                <div className="mt-2">
                                    <button
                                        onClick={() => sendDebugCommand('11')}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                        ขึ้น
                                    </button>
                                    <button
                                        onClick={() => sendDebugCommand('12')}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                        ลง
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Communication logs section */}
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold text-gray-200 mb-2">Communication Logs</h2>
                        <div 
                            ref={logsContainerRef}
                            className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono"
                        >
                            {Array.isArray(logs) && logs.map((log, index) => {
                                // Check if log is already a LogEntry, if not, transform it
                                const logEntry: LogEntry = typeof log === 'string' ? {
                                    type: log.toLowerCase().startsWith('sent:') ? 'send' : 'receive', // Check if log is already a LogEntry, if not, transform it
                                    timestamp: Date.now(),
                                    message: log,
                                } : log;

                                return (
                                    <div 
                                        key={index} 
                                        className={`mb-1 ${
                                            logEntry.type === 'send' ? 'text-blue-400' : 'text-green-400'
                                        }`}
                                    >
                                        <span className="text-gray-500">
                                            [{new Date(logEntry.timestamp).toLocaleTimeString()}]
                                        </span>{' '}
                                        <span className="text-gray-300">
                                            {logEntry.type === 'send' ? '→' : '←'}
                                        </span>{' '}
                                        {logEntry.message}
                                    </div>
                                );
                            })}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualRobotPage;