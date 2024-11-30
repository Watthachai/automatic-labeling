// page.tsx
'use client'
import { useState, useEffect } from 'react'

export default function ArduinoConnect() {
  const [port, setPort] = useState<SerialPort | null>(null)
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState('Disconnected')

  // Auto-connect on component mount
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const ports = await navigator.serial.getPorts()
        if (ports.length > 0) {
          const port = ports[0]
          await port.open({ baudRate: 9600 })
          setPort(port)
          setConnected(true)
          setStatus('Connected')
          addLog('Auto-connected to Arduino')
          startReading(port)
        }
      } catch (err) {
        setStatus('Connection failed')
        addLog('Auto-connect failed: ' + err)
      }
    }
    autoConnect()
    return () => {
      if (port) port.close()
    }
  }, [])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const startReading = async (port: SerialPort) => {
    while (port.readable) {
      const reader = port.readable.getReader()
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const text = new TextDecoder().decode(value)
          addLog(`Received: ${text}`)
        }
      } catch (err) {
        addLog('Read error: ' + err)
      } finally {
        reader.releaseLock()
      }
    }
  }

  const connect = async () => {
    try {
      const selectedPort = await navigator.serial.requestPort()
      await selectedPort.open({ baudRate: 9600 })
      setPort(selectedPort)
      setConnected(true)
      setStatus('Connected')
      addLog('Manually connected to Arduino')
      startReading(selectedPort)
    } catch (err) {
      setStatus('Connection failed')
      addLog('Connection failed: ' + err)
    }
  }

  const sendHello = async () => {
    if (!port) return
    try {
      const writer = port.writable.getWriter()
      const data = new TextEncoder().encode('hello\n')
      await writer.write(data)
      writer.releaseLock()
      addLog('Sent: hello')
    } catch (err) {
      addLog('Send error: ' + err)
    }
  }

  const disconnect = async () => {
    if (port) {
      await port.close()
      setPort(null)
      setConnected(false)
      setStatus('Disconnected')
      addLog('Disconnected from Arduino')
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Arduino Web Serial Connection</h1>
      
      <div className="mb-4">
        <span className="font-bold">Status: </span>
        <span className={`${status === 'Connected' ? 'text-green-500' : 'text-red-500'}`}>
          {status}
        </span>
      </div>

      <button
        onClick={connected ? disconnect : connect}
        className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
      >
        {connected ? 'Disconnect' : 'Connect to Arduino'}
      </button>

      {connected && (
        <button
          onClick={sendHello}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Send Hello
        </button>
      )}

      <div className="mt-4">
        <h2 className="text-xl mb-2">Logs</h2>
        <div className="bg-gray-100 p-4 rounded h-48 overflow-y-auto text-black">
          {logs.map((log, index) => (
            <div key={index} className="text-sm">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}