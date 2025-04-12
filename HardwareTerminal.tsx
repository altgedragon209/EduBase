"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Send, RefreshCw, Play, Square } from "lucide-react"

interface HardwareTerminalProps {
  logs: string[]
  selectedPins: string[]
  pinConfigurations: Record<string, string>
  darkMode: boolean
  isConnected: boolean
}

export default function HardwareTerminal({
  logs,
  selectedPins,
  pinConfigurations,
  darkMode,
  isConnected,
}: HardwareTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [command, setCommand] = useState("")
  const [pinStates, setPinStates] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<"logs" | "pins" | "commands">("logs")
  const [isPolling, setIsPolling] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    // Initialize pin states based on configurations
    const states: Record<string, string> = {}
    selectedPins.forEach((pin) => {
      const config = pinConfigurations[pin]
      if (config?.includes("GPIO_Output")) {
        states[pin] = "LOW"
      } else if (config?.includes("GPIO_Input")) {
        states[pin] = "HIGH" // Simulate a default state
      } else if (config?.includes("ADC")) {
        states[pin] = "ADC: 0" // Simulate an ADC value
      } else {
        states[pin] = "-"
      }
    })
    setPinStates(states)
  }, [selectedPins, pinConfigurations])

  const handleSendCommand = () => {
    if (!command.trim() || !isConnected) return

    // Add command to history
    setCommandHistory((prev) => [command, ...prev.slice(0, 19)])
    setHistoryIndex(-1)

    // Process command
    processCommand(command)

    // Clear command input
    setCommand("")
  }

  const processCommand = async (cmd: string) => {
    try {
      const { sendCommand } = await import("@/lib/usb-communication")
      const response = await sendCommand(cmd)

      // Add command and response to logs
      const timestamp = new Date().toLocaleTimeString()
      const commandLog = `[${timestamp}] > ${cmd}`
      const responseLog = `[${timestamp}] ${response}`

      // This would be handled by the parent component in a real implementation
      console.log(commandLog)
      console.log(responseLog)
    } catch (error: any) {
      console.error("Command failed:", error)
    }
  }

  const togglePinState = async (pin: string) => {
    if (!pinConfigurations[pin]?.includes("GPIO") || !isConnected) return

    try {
      const { setPinState } = await import("@/lib/usb-communication")
      const newState = pinStates[pin] === "HIGH" ? "LOW" : "HIGH"
      await setPinState(pin, newState)

      setPinStates((prev) => ({
        ...prev,
        [pin]: newState,
      }))
    } catch (error) {
      console.error("Failed to toggle pin state:", error)
    }
  }

  const startPinPolling = () => {
    if (isPolling || !isConnected) return

    setIsPolling(true)

    // Poll pin states every 500ms
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { readPinStates } = await import("@/lib/usb-communication")
        const states = await readPinStates(selectedPins)
        setPinStates(states)
      } catch (error) {
        console.error("Failed to poll pin states:", error)
        stopPinPolling()
      }
    }, 500)
  }

  const stopPinPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPolling(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendCommand()
    } else if (e.key === "ArrowUp") {
      // Navigate up through command history
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[newIndex])
      }
    } else if (e.key === "ArrowDown") {
      // Navigate down through command history
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand("")
      }
    }
  }

  const getLogClass = (log: string) => {
    if (log.includes("error") || log.includes("failed")) {
      return "text-red-500"
    }
    if (log.includes("warning")) {
      return "text-yellow-500"
    }
    if (log.includes("connected") || log.includes("success")) {
      return "text-green-500"
    }
    if (log.includes(">")) {
      return darkMode ? "text-blue-400" : "text-blue-600"
    }
    return ""
  }

  const predefinedCommands = [
    { name: "Read GPIO", command: "gpio read PA5" },
    { name: "Toggle LED", command: "gpio toggle PA5" },
    { name: "Read ADC", command: "adc read 1" },
    { name: "Read Clock", command: "clock get" },
    { name: "Device Info", command: "info" },
    { name: "Help", command: "help" },
  ]

  return (
    <div className={`h-full flex flex-col ${darkMode ? "bg-gray-950 text-white" : "bg-white text-black"}`}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "logs" | "pins" | "commands")}>
        <TabsList className="mx-4">
          <TabsTrigger value="logs">Console Logs</TabsTrigger>
          <TabsTrigger value="pins">Pin Monitor</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="flex-grow flex flex-col p-0 m-0">
          <div
            ref={terminalRef}
            className={`flex-grow p-4 overflow-auto font-mono text-sm ${
              darkMode ? "bg-black text-white" : "bg-gray-900 text-green-400"
            }`}
          >
            {logs.length === 0 ? (
              <div className={darkMode ? "text-gray-500" : "text-gray-400"}>No hardware logs to display.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={getLogClass(log)}>
                  {log}
                </div>
              ))
            )}
          </div>

          <div className={`p-2 flex gap-2 ${darkMode ? "bg-gray-900" : "bg-gray-800"}`}>
            <Input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Enter command..." : "Connect a device to send commands"}
              className={`flex-grow p-2 font-mono ${
                darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-gray-700 text-white border-gray-600"
              }`}
              disabled={!isConnected}
            />
            <Button onClick={handleSendCommand} disabled={!isConnected}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="pins" className="flex-grow p-0 m-0">
          <div className={`p-2 flex justify-between items-center ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
            <span className="font-semibold">Pin States</span>
            <div className="flex gap-2">
              <Button
                variant={isPolling ? "destructive" : "outline"}
                size="sm"
                onClick={isPolling ? stopPinPolling : startPinPolling}
                disabled={!isConnected}
                className="flex items-center gap-1"
              >
                {isPolling ? (
                  <>
                    <Square className="h-3 w-3" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    <span>Start</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!isConnected) return
                  try {
                    const { readPinStates } = await import("@/lib/usb-communication")
                    const states = await readPinStates(selectedPins)
                    setPinStates(states)
                  } catch (error) {
                    console.error("Failed to read pin states:", error)
                  }
                }}
                disabled={!isConnected}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          <div className="h-full overflow-auto">
            <table className={`w-full border-collapse ${darkMode ? "text-gray-200" : ""}`}>
              <thead className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
                <tr>
                  <th className="p-2 text-left">Pin</th>
                  <th className="p-2 text-left">Configuration</th>
                  <th className="p-2 text-left">State</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedPins.map((pin) => (
                  <tr key={pin} className={`border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <td className="p-2">{pin}</td>
                    <td className="p-2">{pinConfigurations[pin] || "Not configured"}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          pinStates[pin] === "HIGH"
                            ? "bg-green-100 text-green-800"
                            : pinStates[pin] === "LOW"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {pinStates[pin]}
                      </span>
                    </td>
                    <td className="p-2">
                      {pinConfigurations[pin]?.includes("GPIO") && (
                        <Button variant="outline" size="sm" onClick={() => togglePinState(pin)} disabled={!isConnected}>
                          Toggle
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="commands" className="flex-grow p-0 m-0">
          <div className={`p-4 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
            <h3 className="text-lg font-semibold mb-4">Common Commands</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedCommands.map((cmd, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-md cursor-pointer ${
                    darkMode ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setCommand(cmd.command)
                    setActiveTab("logs")
                  }}
                >
                  <div className="font-medium">{cmd.name}</div>
                  <div className={`text-sm font-mono ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {cmd.command}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-semibold mt-6 mb-4">Command History</h3>
            {commandHistory.length === 0 ? (
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                No commands have been executed yet.
              </div>
            ) : (
              <div className="space-y-2">
                {commandHistory.map((cmd, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-md cursor-pointer font-mono text-sm ${
                      darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    onClick={() => {
                      setCommand(cmd)
                      setActiveTab("logs")
                    }}
                  >
                    {cmd}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
