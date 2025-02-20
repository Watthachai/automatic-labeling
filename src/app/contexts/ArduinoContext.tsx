'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ArduinoContextType {
  status: string;
  connected: boolean;
  logs: string[];
  availablePorts: SerialPort[];
  sendCommand: (command: string) => Promise<void>;
  requestPort: () => Promise<SerialPort>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const ArduinoContext = createContext<ArduinoContextType | null>(null);

export function ArduinoProvider({ children }: { children: React.ReactNode }) {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [status, setStatus] = useState('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<SerialPort[]>([]);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const startReading = useCallback(async (port: SerialPort) => {
    let accumulatedText = '';
    while (port.readable) {
      const reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = new TextDecoder().decode(value);
          accumulatedText += text;
          if (accumulatedText.includes('\n')) {
            const lines = accumulatedText.split('\n');
            lines.forEach((line, index) => {
              if (index < lines.length - 1) {
                addLog(`Received: ${line}`);
              } else {
                accumulatedText = line;
              }
            });
          }
        }
      } catch (err) {
        addLog('Read error: ' + err);
        if ((err as Error).name === 'NetworkError') {
          setStatus('Disconnected');
          setConnected(false);
          autoConnect();
        }
      } finally {
        reader.releaseLock();
      }
    }
  }, [addLog]);

  const autoConnect = useCallback(async () => {
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const testPort = ports[0];
        await testPort.open({ baudRate: 115200 });

        const writer = testPort.writable?.getWriter();
        if (writer) {
          const testMessage = new TextEncoder().encode('test\n');
          await writer.write(testMessage);
          writer.releaseLock();
        } else {
          throw new Error('Failed to verify port');
        }

        setPort(testPort);
        setConnected(true);
        setStatus('Connected');
        addLog('Auto-connected to Arduino');
        startReading(testPort);
      }
    } catch (err) {
      setStatus('Connection failed');
      addLog('Auto-connect failed: ' + err);
    }
  }, [addLog, startReading]);

  const sendCommand = async (command: string) => {
    if (!port || !connected) {
      addLog('Error: Not connected to Arduino');
      return;
    }

    try {
      const writer = port.writable?.getWriter();
      if (writer) {
        const data = new TextEncoder().encode(`${command}\n`);
        await writer.write(data);
        writer.releaseLock();
        addLog(`Sent command: ${command}`);
      }
    } catch (err) {
      addLog(`Error sending command: ${err}`);
      setStatus('Send failed');
    }
  };

  useEffect(() => {
    autoConnect();
    return () => {
      if (port) port.close();
    };
  }, [autoConnect, port]);
  const value = {
    status,
    logs,
    connected,
    availablePorts,
    connect: autoConnect,
    disconnect: async () => {
      if (port) {
        await port.close();
        setPort(null);
        setConnected(false);
        setStatus('Disconnected');
      }
    },
    requestPort: async () => {
      try {
        const port = await navigator.serial.requestPort();
        setAvailablePorts([port]);
        return port;
      } catch (err) {
        addLog('Error requesting port: ' + err);
        throw err;
      }
    },
    sendCommand
  };

  return <ArduinoContext.Provider value={value}>{children}</ArduinoContext.Provider>;
}

export const useArduino = () => {
  const context = useContext(ArduinoContext);
  if (!context) {
    throw new Error('useArduino must be used within an ArduinoProvider');
  }
  return context;
};