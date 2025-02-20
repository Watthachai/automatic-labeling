'use client';

import React from 'react';
import { useArduino } from '../contexts/ArduinoContext';

export default function ManualRobot() {
    const { 
        status, 
        connected, 
        logs, 
        sendCommand,
        requestPort,
        connect,
        disconnect,
        availablePorts 
    } = useArduino();

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl shadow-2xl border-2 border-gray-700">
                {/* Connection Controls */}
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
                            onClick={connect}
                            disabled={connected || availablePorts.length === 0}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-500"
                        >
                            Connect
                        </button>
                        <button
                            onClick={disconnect}
                            disabled={!connected}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-500"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>

                {/* Control Buttons Grid */}
                <div className="grid grid-cols-3 gap-8">
                    {/* Lift System */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-center text-gray-200 mb-4">ระบบลิฟต์ซองยา</h2>
                        <div className="space-y-4">
                            <button onClick={() => sendCommand('11')}
                                className="w-full bg-gradient-to-b from-blue-400 to-blue-600 text-white p-3 rounded-lg
                                shadow-lg border border-blue-700 hover:from-blue-500 hover:to-blue-700">
                                ลิฟต์ขึ้น (11)
                            </button>
                            <button onClick={() => sendCommand('12')}
                                className="w-full bg-gradient-to-b from-red-400 to-red-600 text-white p-3 rounded-lg
                                shadow-lg border border-red-700 hover:from-red-500 hover:to-red-700">
                                ลิฟต์ลง (12)
                            </button>
                        </div>
                    </div>

                    {/* Sticker System */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-center text-gray-200 mb-4">ระบบติดสติกเกอร์</h2>
                        <div className="space-y-4">
                            <button onClick={() => sendCommand('21')}
                                className="w-full bg-gradient-to-b from-green-400 to-green-600 text-white p-3 rounded-lg">
                                เลื่อนเข้า (21)
                            </button>
                            <button onClick={() => sendCommand('22')}
                                className="w-full bg-gradient-to-b from-green-400 to-green-600 text-white p-3 rounded-lg">
                                เลื่อนออก (22)
                            </button>
                            <button onClick={() => sendCommand('23')}
                                className="w-full bg-gradient-to-b from-yellow-400 to-yellow-600 text-white p-3 rounded-lg">
                                หมุนตามเข็ม (23)
                            </button>
                            <button onClick={() => sendCommand('24')}
                                className="w-full bg-gradient-to-b from-yellow-400 to-yellow-600 text-white p-3 rounded-lg">
                                หมุนทวนเข็ม (24)
                            </button>
                        </div>
                    </div>

                    {/* Robot Arm System */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-center text-gray-200 mb-4">ระบบแขนกล</h2>
                        <div className="space-y-4">
                            <button onClick={() => sendCommand('31')}
                                className="w-full bg-gradient-to-b from-purple-400 to-purple-600 text-white p-3 rounded-lg">
                                แขนขึ้น (31)
                            </button>
                            <button onClick={() => sendCommand('32')}
                                className="w-full bg-gradient-to-b from-purple-400 to-purple-600 text-white p-3 rounded-lg">
                                แขนลง (32)
                            </button>
                            <button onClick={() => sendCommand('33')}
                                className="w-full bg-gradient-to-b from-indigo-400 to-indigo-600 text-white p-3 rounded-lg">
                                แขนใน + (33)
                            </button>
                            <button onClick={() => sendCommand('34')}
                                className="w-full bg-gradient-to-b from-indigo-400 to-indigo-600 text-white p-3 rounded-lg">
                                แขนใน - (34)
                            </button>
                            <button onClick={() => sendCommand('35')}
                                className="w-full bg-gradient-to-b from-pink-400 to-pink-600 text-white p-3 rounded-lg">
                                แขนนอก + (35)
                            </button>
                            <button onClick={() => sendCommand('36')}
                                className="w-full bg-gradient-to-b from-pink-400 to-pink-600 text-white p-3 rounded-lg">
                                แขนนอก - (36)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Command Logs */}
                <div className="mt-6 bg-gray-900 rounded-lg p-4">
                    <h3 className="text-gray-200 font-semibold mb-2">Command Logs</h3>
                    <div className="h-40 overflow-y-auto text-gray-300 text-sm">
                        {logs.map((log, index) => (
                            <div key={index} className="py-1 border-b border-gray-800">
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}