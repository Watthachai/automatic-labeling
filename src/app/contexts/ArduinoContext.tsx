'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SerialPort {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
}

type CustomSerialPort = SerialPort & {
  readable: ReadableStream<Uint8Array>;
};

// Define types
interface ArduinoContextType {
  status: string;
  connected: boolean;
  logs: string[];
  requestPort: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
}

// Create context
const ArduinoContext = createContext<ArduinoContextType | null>(null);

// Custom hook
export function useArduino() {
  const context = useContext(ArduinoContext);
  if (!context) {
    throw new Error('useArduino must be used within ArduinoProvider');
  }
  return context;
}

export function ArduinoProvider({ children }: { children: React.ReactNode }) {
  // State
  const [port, setPort] = useState<SerialPort | null>(null);
  const [status, setStatus] = useState('Awaiting port selection');
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Utility function for logging
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  }, []);

  // Handle serial port reading
  const startReading = useCallback(async (port: SerialPort) => {
    if (!port?.readable) return;

    try {
      const reader = port.readable.getReader();
      readerRef.current = reader;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        if (text.trim()) {
          addLog(`Received: ${text.trim()}`);
        }
      }
    } catch (err) {
      console.error('Read error:', err);
    } finally {
      if (readerRef.current) {
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
    }
  }, [addLog]);

  // Request and connect to port
  const requestPort = useCallback(async () => {
    try {
      setStatus('Selecting port...');
      const selectedPort = await navigator.serial.requestPort();
      
      await selectedPort.open({ baudRate: 115200 });
      if (selectedPort.readable) {
        setPort(selectedPort);
      } else {
        setPort(selectedPort as SerialPort);
      }
      setConnected(true);
      setStatus('Connected');
      addLog('Connected to Arduino');
      
      startReading(selectedPort);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('No port selected')) {
          setStatus('Awaiting port selection');
        } else {
          setStatus('Connection failed');
          addLog(`Connection error: ${err.message}`);
        }
      }
      throw err;
    }
  }, [addLog, startReading]);

  // Disconnect from port
  const disconnect = useCallback(async () => {
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
      } catch (err) {
        console.error('Error cleaning up reader:', err);
      }
      readerRef.current = null;
    }

    if (port) {
      try {
        await port.close();
      } catch (err) {
        console.error('Error closing port:', err);
      }
    }

    setPort(null);
    setConnected(false);
    setStatus('Awaiting port selection');
    addLog('Disconnected from Arduino');
  }, [port, addLog]);

  // Send command to Arduino
  const sendCommand = useCallback(async (command: string) => {
    if (!port || !connected) {
      addLog('Error: Not connected to Arduino');
      return;
    }

    try {
      console.log('Sending command:', command); // Add this log
      const writer = port.writable.getWriter();
      try {
        const data = new TextEncoder().encode(command + '\n');
        await writer.write(data);
        addLog(`Sent: ${command}`);
      } finally {
        writer.releaseLock();
      }
    } catch (err) {
      addLog(`Send error: ${err}`);
      console.error('Send error:', err);
    }
  }, [port, connected, addLog]);

  // Context value
  const value = {
    status,
    connected,
    logs,
    requestPort,
    disconnect,
    sendCommand
  };

  return (
    <ArduinoContext.Provider value={value}>
      {children}
    </ArduinoContext.Provider>
  );
}