'use client';

import React, { useState } from 'react';

export default function ManualRobot() {
    const [status, setStatus] = useState('Stopped');
    const [selectedPort, setSelectedPort] = useState('COM3');

    const handleCommand = (command: string, side: 'left' | 'right') => {
        setStatus(`Sending ${command} to ${side} side`);
        console.log(`Sending ${command} to Arduino on ${selectedPort}`);
    };

    return (
        <div className="min-h-screen bg-[url('/circuit-pattern.png')] p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl shadow-2xl border-2 border-gray-700">
                <h1 className="text-2xl font-bold mb-8 text-center text-gray-200 font-mono">
                    Arduino Control Panel
                </h1>

                {/* COM Port Selector */}
                <div className="mb-6 flex justify-center gap-4">
                    <select 
                        value={selectedPort}
                        onChange={(e) => setSelectedPort(e.target.value)}
                        className="bg-gray-700 text-black px-4 py-2 rounded-lg">
                        <option value="COM3">COM3</option>
                        <option value="COM4">COM4</option>
                    </select>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status === 'Stopped' ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-gray-200">{status}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    {/* Left Side Controls */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-center text-gray-200 mb-4">ชุดควบคุมซ้าย (Left Control)</h2>
                        <div className="space-y-4">
                            <button onClick={() => handleCommand('A_FEED', 'left')}
                                className="w-full bg-gradient-to-b from-blue-400 to-blue-600 text-white p-3 rounded-lg
                                shadow-lg border border-blue-700 hover:from-blue-500 hover:to-blue-700">
                                A-ซ้าย Feed
                            </button>
                            <button onClick={() => handleCommand('B_BELT', 'left')}
                                className="w-full bg-gradient-to-b from-green-400 to-green-600 text-white p-3 rounded-lg
                                shadow-lg border border-green-700 hover:from-green-500 hover:to-green-700">
                                B-ซ้าย Belt
                            </button>
                            <button onClick={() => handleCommand('F_STOP', 'left')}
                                className="w-full bg-gradient-to-b from-red-400 to-red-600 text-white p-3 rounded-lg
                                shadow-lg border border-red-700 hover:from-red-500 hover:to-red-700">
                                F-ซ้าย Stop
                            </button>
                            <button onClick={() => handleCommand('JOG_SK', 'left')}
                                className="w-full bg-gradient-to-b from-purple-400 to-purple-600 text-white p-3 rounded-lg
                                shadow-lg border border-purple-700 hover:from-purple-500 hover:to-purple-700">
                                JOG-SK ซ้าย
                            </button>
                        </div>
                    </div>

                    {/* Right Side Controls */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-center text-gray-200 mb-4">ชุดควบคุมขวา (Right Control)</h2>
                        <div className="space-y-4">
                            <button onClick={() => handleCommand('A_FEED', 'right')}
                                className="w-full bg-gradient-to-b from-blue-400 to-blue-600 text-white p-3 rounded-lg
                                shadow-lg border border-blue-700 hover:from-blue-500 hover:to-blue-700">
                                A-ขวา Feed
                            </button>
                            <button onClick={() => handleCommand('B_BELT', 'right')}
                                className="w-full bg-gradient-to-b from-green-400 to-green-600 text-white p-3 rounded-lg
                                shadow-lg border border-green-700 hover:from-green-500 hover:to-green-700">
                                B-ขวา Belt
                            </button>
                            <button onClick={() => handleCommand('F_STOP', 'right')}
                                className="w-full bg-gradient-to-b from-red-400 to-red-600 text-white p-3 rounded-lg
                                shadow-lg border border-red-700 hover:from-red-500 hover:to-red-700">
                                F-ขวา Stop
                            </button>
                            <button onClick={() => handleCommand('JOG_SK', 'right')}
                                className="w-full bg-gradient-to-b from-purple-400 to-purple-600 text-white p-3 rounded-lg
                                shadow-lg border border-purple-700 hover:from-purple-500 hover:to-purple-700">
                                JOG-SK ขวา
                            </button>
                        </div>
                    </div>
                </div>

                {/* Connection Status */}
                <div className="mt-6 grid grid-cols-2 gap-4 text-center text-gray-200">
                    <div className="flex items-center justify-center gap-2">
                        <span>CON7 (ซ้าย):</span>
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span>CON6 (ขวา):</span>
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}