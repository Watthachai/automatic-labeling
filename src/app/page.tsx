// page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import ExcelFileReader from '@/app/components/ExcelFileReaderPage';
import ControlPanel from '@/app/components/ControlUserPanelPage';
import Tabs from '@/app/components/Tabs';
import ManualRobot from './components/ManualRobotPage';

interface SheetData {
  [key: string]: string | number | undefined; // Make sure types match your data
}


export default function MainPage() {
  const [port, setPort] = useState<SerialPort | null>(null)
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState('Disconnected')
  const [selectedRowData, setSelectedRowData] = useState<SheetData | null>(null)
  const TabContent: React.FC<{ label: string; children: React.ReactNode }> = ({ children }) => <>{children}</>;

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const startReading = useCallback(async (port: SerialPort) => {
    let accumulatedText = ''
    while (port.readable) {
      const reader = port.readable.getReader()
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const text = new TextDecoder().decode(value)
          accumulatedText += text
          if (accumulatedText.includes('\n')) {
            const lines = accumulatedText.split('\n')
            lines.forEach((line, index) => {
              if (index < lines.length - 1) {
                addLog(`Received: ${line}`)
              } else {
                accumulatedText = line
              }
            })
          }
        }
      } catch (err) {
        addLog('Read error: ' + err)
        if ((err as Error).name === 'NetworkError') {
          setStatus('Disconnected')
          setConnected(false)
          attemptReconnect()
        }
      } finally {
        reader.releaseLock()
      }
    }
  }, [])

  const autoConnect = async () => {
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const testPort = ports[0];
        await testPort.open({ baudRate: 9600 });
  
        // Validation: Try a small write to check if the port is functional
        const writer = testPort.writable?.getWriter();
        if (writer) {
          const testMessage = new TextEncoder().encode('test\n');
          await writer.write(testMessage);
          writer.releaseLock();
        } else {
          throw new Error('Failed to verify the port');
        }
  
        setPort(testPort);
        setConnected(true);
        setStatus('Connected');
        addLog('Auto-connected to Arduino');
        startReading(testPort);
      } else {
        throw new Error('No ports available for auto-connect');
      }
    } catch (err) {
      setStatus('Connection failed');
      addLog('Auto-connect failed: ' + err);
    }
  };
  

  const attemptReconnect = async () => {
    setStatus('Reconnecting...');
    addLog('Attempting to reconnect...');
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const testPort = ports[0];
        await testPort.open({ baudRate: 9600 });
  
        // Validation: Try a small write to check if the port is functional
        const writer = testPort.writable?.getWriter();
        if (writer) {
          const testMessage = new TextEncoder().encode('test\n');
          await writer.write(testMessage);
          writer.releaseLock();
        } else {
          throw new Error('Failed to verify the port');
        }
  
        // If validation is successful, set the port and start reading
        setPort(testPort);
        setConnected(true);
        setStatus('Connected');
        addLog('Reconnected to Arduino');
        startReading(testPort);
      } else {
        throw new Error('No ports found during reconnection \n Reconnecting... in 5 seconds');
      }
    } catch (err) {
      setStatus('Reconnection failed');
      addLog('Reconnection error: ' + err);
      setTimeout(attemptReconnect, 5000); // Retry after a delay
    }
  };
  

  useEffect(() => {
    autoConnect()
    return () => {
      if (port) port.close()
    }
  }, [])

  const sendHello = async () => {
    if (!port) return
    try {
      if (port.writable) {
        const writer = port.writable.getWriter()
        const data = new TextEncoder().encode('hello\n')
        await writer.write(data)
        writer.releaseLock()
        addLog('Sent: hello')
      } else {
        addLog('Port is not writable')
      }
    } catch (err) {
      addLog('Send error: ' + err)
    }
  }
  const disconnect = async () => {
    if (port) {
      try {
        await port.close()
        setPort(null)
        setConnected(false)
        setStatus('Disconnected')
        addLog('Disconnected from Arduino')
      } catch (err) {
        if ((err as Error).name === 'NetworkError') {
          setPort(null)
          setConnected(false)
          setStatus('Device lost')
          addLog('NetworkError: The device has been lost')
          attemptReconnect()
        } else {
          addLog('Disconnect error: ' + err)
        }
      }
    }
  }

  const handleDataSelect = (data: SheetData) => {
    setSelectedRowData(data);
  };

  return (
  <div className="flex">   
  <Tabs>
      <TabContent label="ExcelFileReader">
        <ExcelFileReader onDataSelect={handleDataSelect} />
      </TabContent>
      <TabContent label="บันทึกการผลิตประจำวัน">
        <p>This is the production log tab.</p>
      </TabContent>
      <TabContent label="debug mode">
        <ManualRobot />
      </TabContent>
      <TabContent label='Arduino Status'>
        <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
          <div className="bg-gray-200 p-4 rounded-lg">
            <div className="text-lg font-semibold mb-4">Arduino Status</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="bg-gray-500 text-cyan-300 p-2 text-center">
                  Connection Status
                </div>
                <div className="bg-gray-500 p-2">{status}</div>
              </div>
              <div className="space-y-2">
                <div className="bg-gray-500 text-cyan-300 p-2 text-center">
                  Connection Logs
                </div>
                <div className="bg-gray-500 p-2">
                  <div className="h-40 overflow-y-auto">
                    {logs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabContent>
    </Tabs> 
    
    <ControlPanel productionData={selectedRowData} />
  </div>
  )
}