"use client"

import { useState, useEffect, useRef } from "react"
import { getBoardPins } from "@/lib/stm32-config"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, AlertCircle } from "lucide-react"

interface PinoutDiagramProps {
  selectedPins: string[]
  pinConfigurations: Record<string, string>
  onPinSelection: (pins: string[], configs: Record<string, string>) => void
  boardType: string
  darkMode: boolean
  isConnected: boolean
  onRefreshPins: () => void
}

export default function PinoutDiagram({
  selectedPins,
  pinConfigurations,
  onPinSelection,
  boardType,
  darkMode,
  isConnected,
  onRefreshPins,
}: PinoutDiagramProps) {
  const [pins, setPins] = useState(getBoardPins(boardType))
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const [pinFunction, setPinFunction] = useState<string>("GPIO_Input")
  const [pinMode, setPinMode] = useState<string>("Input")
  const [pinSpeed, setPinSpeed] = useState<string>("Low")
  const [pinPull, setPinPull] = useState<string>("None")
  const [viewMode, setViewMode] = useState<"pinout" | "schematic" | "list" | "configuration">("pinout")
  const [pinStates, setPinStates] = useState<Record<string, string>>({})
  const [showPinDetails, setShowPinDetails] = useState<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPolling, setIsPolling] = useState<boolean>(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [pinAlternate, setPinAlternate] = useState<string>("AF0")
  const [pinDetails, setPinDetails] = useState<any>(null)

  useEffect(() => {
    const updatedPins = getBoardPins(boardType).map((pin) => ({
      ...pin,
      selected: selectedPins.includes(pin.id),
      function: pinConfigurations[pin.id] || pin.function,
    }))
    setPins(updatedPins)
  }, [selectedPins, pinConfigurations, boardType])

  useEffect(() => {
    if (viewMode === "schematic" && canvasRef.current) {
      drawSchematic()
    }
  }, [viewMode, pins, pinStates, darkMode])

  useEffect(() => {
    // Clean up polling interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const handlePinClick = (pinId: string) => {
    const pin = pins.find((p) => p.id === pinId)
    if (pin) {
      if (isConnected) {
        // If connected to a device, show pin details
        fetchPinDetails(pinId)
      } else {
        // Otherwise, show configuration dialog
        setSelectedPin(pinId)
        setPinFunction(pin.function || "GPIO_Input")
        setPinMode(pin.mode || "Input")
        setPinSpeed(pin.speed || "Low")
        setPinPull(pin.pull || "None")
        setPinAlternate("AF0")
        setShowConfigModal(true)
      }
    }
  }

  const fetchPinDetails = async (pinId: string) => {
    try {
      const { readPinDetails } = await import("@/lib/usb-communication")
      const details = await readPinDetails(pinId)
      setPinDetails(details)
      setShowPinDetails(true)
    } catch (error) {
      console.error("Failed to read pin details:", error)
    }
  }

  const handleConfigSave = () => {
    if (selectedPin) {
      const updatedPins = pins.map((pin) =>
        pin.id === selectedPin
          ? {
              ...pin,
              selected: true,
              function: pinFunction,
              mode: pinMode,
              speed: pinSpeed,
              pull: pinPull,
            }
          : pin,
      )

      setPins(updatedPins)

      const selectedPinIds = updatedPins.filter((pin) => pin.selected).map((pin) => pin.id)

      const newConfigurations = { ...pinConfigurations }
      newConfigurations[selectedPin] = pinFunction

      onPinSelection(selectedPinIds, newConfigurations)
      setShowConfigModal(false)
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

  const handleRefreshPins = () => {
    onRefreshPins()
  }

  const drawSchematic = () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set background color
    ctx.fillStyle = darkMode ? "#111827" : "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set dimensions
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const chipWidth = width * 0.4
    const chipHeight = height * 0.4

    // Draw MCU chip
    ctx.fillStyle = darkMode ? "#1f2937" : "#333333"
    ctx.fillRect(centerX - chipWidth / 2, centerY - chipHeight / 2, chipWidth, chipHeight)

    // Draw ST logo
    ctx.fillStyle = darkMode ? "#ffffff" : "#ffffff"
    ctx.font = "20px Arial"
    ctx.textAlign = "center"
    ctx.fillText("STM32", centerX, centerY)
    ctx.font = "14px Arial"
    ctx.fillText(boardType, centerX, centerY + 20)

    // Draw pins
    const pinSize = 10
    const pinSpacing = 20
    const topPins = pins.filter((p) => p.position === "top")
    const rightPins = pins.filter((p) => p.position === "right")
    const bottomPins = pins.filter((p) => p.position === "bottom")
    const leftPins = pins.filter((p) => p.position === "left")

    // Draw top pins
    const topPinStartX = centerX - ((topPins.length - 1) * pinSpacing) / 2
    topPins.forEach((pin, i) => {
      const x = topPinStartX + i * pinSpacing
      const y = centerY - chipHeight / 2 - pinSize

      ctx.fillStyle = getPinColor(pin, pinStates[pin.id])
      ctx.fillRect(x - pinSize / 2, y, pinSize, pinSize)

      ctx.fillStyle = darkMode ? "#ffffff" : "#000000"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(pin.id, x, y - 2)
    })

    // Draw right pins
    const rightPinStartY = centerY - ((rightPins.length - 1) * pinSpacing) / 2
    rightPins.forEach((pin, i) => {
      const x = centerX + chipWidth / 2
      const y = rightPinStartY + i * pinSpacing

      ctx.fillStyle = getPinColor(pin, pinStates[pin.id])
      ctx.fillRect(x, y - pinSize / 2, pinSize, pinSize)

      ctx.fillStyle = darkMode ? "#ffffff" : "#000000"
      ctx.font = "10px Arial"
      ctx.textAlign = "left"
      ctx.fillText(pin.id, x + pinSize + 2, y + 4)
    })

    // Draw bottom pins
    const bottomPinStartX = centerX - ((bottomPins.length - 1) * pinSpacing) / 2
    bottomPins.forEach((pin, i) => {
      const x = bottomPinStartX + i * pinSpacing
      const y = centerY + chipHeight / 2

      ctx.fillStyle = getPinColor(pin, pinStates[pin.id])
      ctx.fillRect(x - pinSize / 2, y, pinSize, pinSize)

      ctx.fillStyle = darkMode ? "#ffffff" : "#000000"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(pin.id, x, y + pinSize + 10)
    })

    // Draw left pins
    const leftPinStartY = centerY - ((leftPins.length - 1) * pinSpacing) / 2
    leftPins.forEach((pin, i) => {
      const x = centerX - chipWidth / 2 - pinSize
      const y = leftPinStartY + i * pinSpacing

      ctx.fillStyle = getPinColor(pin, pinStates[pin.id])
      ctx.fillRect(x, y - pinSize / 2, pinSize, pinSize)

      ctx.fillStyle = darkMode ? "#ffffff" : "#000000"
      ctx.font = "10px Arial"
      ctx.textAlign = "right"
      ctx.fillText(pin.id, x - 2, y + 4)
    })
  }

  const getPinColor = (pin: any, state?: string) => {
    if (!pin.selected) return darkMode ? "#4b5563" : "#cccccc"

    // If we have a real-time state from the device
    if (state) {
      if (state === "HIGH") return "#22c55e" // Green
      if (state === "LOW") return "#ef4444" // Red
      if (state.startsWith("ADC:")) return "#f59e0b" // Amber
      if (state.startsWith("PWM:")) return "#8b5cf6" // Purple
    }

    // Otherwise use the configured function
    if (pin.function?.includes("GPIO_Input")) return "#4ade80" // Light green
    if (pin.function?.includes("GPIO_Output")) return "#60a5fa" // Light blue
    if (pin.function?.includes("ADC")) return "#fcd34d" // Light yellow
    if (pin.function?.includes("DAC")) return "#fb923c" // Light orange
    if (pin.function?.includes("I2C")) return "#c084fc" // Light purple
    if (pin.function?.includes("SPI")) return "#f472b6" // Light pink
    if (pin.function?.includes("USART")) return "#818cf8" // Light indigo
    if (pin.function?.includes("TIM")) return "#f87171" // Light red

    return "#a3e635" // Light lime (default for other functions)
  }

  const renderMemoryTable = () => {
    // Existing code...

    return (
      <div className="overflow-auto max-h-[calc(100vh-200px)]">
        <table className={`w-full border-collapse ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          <thead className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
            <tr>
              <th className="p-2 text-left">Pin</th>
              <th className="p-2 text-left">Configuration</th>
              <th className="p-2 text-left">Mode</th>
              <th className="p-2 text-left">Current State</th>
            </tr>
          </thead>
          <tbody>
            {selectedPins.map((pinId) => {
              const pin = pins.find((p) => p.id === pinId)
              const state = pinStates[pinId]

              return (
                <tr
                  key={pinId}
                  className={`border-t ${darkMode ? "border-gray-700 hover:bg-gray-800" : "hover:bg-gray-50"}`}
                  onClick={() => handlePinClick(pinId)}
                >
                  <td className="p-2 font-medium">{pinId}</td>
                  <td className="p-2">{pin?.function || "Not configured"}</td>
                  <td className="p-2">{pin?.mode || "-"}</td>
                  <td className="p-2">
                    {state ? (
                      <Badge
                        variant="outline"
                        className={
                          state === "HIGH"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : state === "LOW"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {state}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">Unknown</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${darkMode ? "bg-gray-950 text-white" : "bg-white text-black"}`}>
      <div className={`p-2 flex justify-between items-center ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
        <span className="font-semibold">STM32 {boardType} Pinout Configuration</span>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "pinout" | "schematic" | "list" | "configuration")}
        >
          <TabsList>
            <TabsTrigger value="pinout">Pin List</TabsTrigger>
            <TabsTrigger value="schematic">Schematic</TabsTrigger>
            <TabsTrigger value="list">Status</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          {isConnected && (
            <Button
              variant={isPolling ? "destructive" : "outline"}
              size="sm"
              onClick={isPolling ? stopPinPolling : startPinPolling}
              className="flex items-center gap-1"
            >
              {isPolling ? "Stop Polling" : "Start Polling"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshPins}
            disabled={!isConnected}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className={`flex-grow relative overflow-auto ${darkMode ? "bg-gray-900" : "bg-white"}`}>
        {viewMode === "pinout" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 overflow-auto max-h-[calc(100vh-200px)]">
            {pins.map((pin) => {
              const state = pinStates[pin.id]
              return (
                <div
                  key={pin.id}
                  className={`p-2 border rounded-md cursor-pointer ${
                    darkMode ? "border-gray-700 hover:bg-gray-800" : "hover:bg-gray-100"
                  }`}
                  style={{ backgroundColor: pin.selected ? getPinColor(pin, state) + (darkMode ? "40" : "20") : "" }}
                  onClick={() => handlePinClick(pin.id)}
                >
                  <div className="font-bold">{pin.id}</div>
                  <div className="text-xs">{pin.function || "Not configured"}</div>
                  {state && (
                    <Badge
                      variant="outline"
                      className={`mt-1 ${
                        state === "HIGH"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : state === "LOW"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                      }`}
                    >
                      {state}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        ) : viewMode === "schematic" ? (
          <div className="h-full w-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border"
              onClick={(e) => {
                // Handle canvas click for pin selection
                const rect = canvasRef.current?.getBoundingClientRect()
                if (rect) {
                  const x = e.clientX - rect.left
                  const y = e.clientY - rect.top
                  // Logic to determine which pin was clicked
                  // This would require calculating pin positions
                }
              }}
            />
          </div>
        ) : viewMode === "list" ? (
          <div className="p-4">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pin Status</h3>
              {!isConnected && (
                <div className="flex items-center text-yellow-500 gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Connect a device to monitor pin states</span>
                </div>
              )}
            </div>

            {renderMemoryTable()}
          </div>
        ) : (
          <TabsContent value="configuration" className="flex-grow p-0 m-0 overflow-auto">
            <div className={`p-4 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
              <h3 className="text-lg font-semibold mb-4">Pin Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pins.map((pin) => (
                  <div
                    key={pin.id}
                    className={`p-4 border rounded-md ${
                      pin.selected
                        ? `${darkMode ? "border-blue-500 bg-blue-900/20" : "border-blue-500 bg-blue-50"}`
                        : `${darkMode ? "border-gray-700" : "border-gray-200"}`
                    } hover:shadow-md transition-shadow`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-lg">{pin.id}</h4>
                      <Badge
                        variant={pin.selected ? "default" : "outline"}
                        className={pin.selected ? "" : `${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {pin.selected ? "Configured" : "Not Used"}
                      </Badge>
                    </div>

                    {pin.selected ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Function:</span>
                          <span className="font-medium">{pin.function || "Not set"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Mode:</span>
                          <span className="font-medium">{pin.mode || "Not set"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Speed:</span>
                          <span className="font-medium">{pin.speed || "Not set"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Pull:</span>
                          <span className="font-medium">{pin.pull || "Not set"}</span>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => handlePinClick(pin.id)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mb-4`}>
                          This pin is not configured. Click to configure.
                        </p>
                        <Button size="sm" variant="outline" className="w-full" onClick={() => handlePinClick(pin.id)}>
                          Configure
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </div>

      {/* Pin Configuration Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">Configure Pin {selectedPin}</span>
              {isConnected && (
                <Badge variant="outline" className="ml-2">
                  {pinStates[selectedPin!] || "Unknown"}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right font-medium">Function</label>
              <Select value={pinFunction} onValueChange={setPinFunction} className="col-span-3">
                <SelectTrigger>
                  <SelectValue placeholder="Select function" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GPIO_Input">GPIO Input</SelectItem>
                  <SelectItem value="GPIO_Output">GPIO Output</SelectItem>
                  <SelectItem value="GPIO_Analog">GPIO Analog</SelectItem>
                  <SelectItem value="ADC_IN">ADC Input</SelectItem>
                  <SelectItem value="DAC_OUT">DAC Output</SelectItem>
                  <SelectItem value="USART_TX">USART TX</SelectItem>
                  <SelectItem value="USART_RX">USART RX</SelectItem>
                  <SelectItem value="I2C_SCL">I2C SCL</SelectItem>
                  <SelectItem value="I2C_SDA">I2C SDA</SelectItem>
                  <SelectItem value="SPI_MOSI">SPI MOSI</SelectItem>
                  <SelectItem value="SPI_MISO">SPI MISO</SelectItem>
                  <SelectItem value="SPI_SCK">SPI SCK</SelectItem>
                  <SelectItem value="TIM_CH">Timer Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show additional configuration options based on selected function */}
            {pinFunction.includes("GPIO") && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right font-medium">Mode</label>
                  <Select value={pinMode} onValueChange={setPinMode} className="col-span-3">
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Input">Input</SelectItem>
                      <SelectItem value="Output">Output</SelectItem>
                      <SelectItem value="Alternate">Alternate Function</SelectItem>
                      <SelectItem value="Analog">Analog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right font-medium">Speed</label>
                  <Select value={pinSpeed} onValueChange={setPinSpeed} className="col-span-3">
                    <SelectTrigger>
                      <SelectValue placeholder="Select speed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="VeryHigh">Very High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right font-medium">Pull</label>
                  <Select value={pinPull} onValueChange={setPinPull} className="col-span-3">
                    <SelectTrigger>
                      <SelectValue placeholder="Select pull" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Up">Pull Up</SelectItem>
                      <SelectItem value="Down">Pull Down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Show alternate function selector if mode is Alternate */}
            {pinMode === "Alternate" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right font-medium">Alternate Function</label>
                <Select value={pinAlternate || "AF0"} onValueChange={setPinAlternate} className="col-span-3">
                  <SelectTrigger>
                    <SelectValue placeholder="Select alternate function" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AF0">AF0</SelectItem>
                    <SelectItem value="AF1">AF1</SelectItem>
                    <SelectItem value="AF2">AF2</SelectItem>
                    <SelectItem value="AF3">AF3</SelectItem>
                    <SelectItem value="AF4">AF4</SelectItem>
                    <SelectItem value="AF5">AF5</SelectItem>
                    <SelectItem value="AF6">AF6</SelectItem>
                    <SelectItem value="AF7">AF7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                // Remove pin configuration if it was previously configured
                if (selectedPin && pins.find((p) => p.id === selectedPin)?.selected) {
                  const updatedPins = pins.map((pin) => (pin.id === selectedPin ? { ...pin, selected: false } : pin))

                  setPins(updatedPins)

                  const selectedPinIds = updatedPins.filter((pin) => pin.selected).map((pin) => pin.id)

                  const newConfigurations = { ...pinConfigurations }
                  delete newConfigurations[selectedPin]

                  onPinSelection(selectedPinIds, newConfigurations)
                }
                setShowConfigModal(false)
              }}
            >
              {pins.find((p) => p.id === selectedPin)?.selected ? "Remove" : "Cancel"}
            </Button>
            <Button onClick={handleConfigSave}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pin Details Modal */}
      <Dialog open={!!showPinDetails} onOpenChange={() => setShowPinDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pin {pinDetails?.id} Details</DialogTitle>
          </DialogHeader>

          {pinDetails && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Configuration:</span>
                    <div className="font-medium">{pinDetails.function || "Not configured"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Mode:</span>
                    <div className="font-medium">{pinDetails.mode || "-"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Speed:</span>
                    <div className="font-medium">{pinDetails.speed || "-"}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Current State:</span>
                    <div className="font-medium">{pinDetails.state || "Unknown"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Pull:</span>
                    <div className="font-medium">{pinDetails.pull || "-"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Alternate Function:</span>
                    <div className="font-medium">{pinDetails.alternate || "-"}</div>
                  </div>
                </div>
              </div>

              {pinDetails.function?.includes("GPIO_Output") && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Control Output</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          const { setPinState } = await import("@/lib/usb-communication")
                          await setPinState(pinDetails.id, "HIGH")
                          setPinDetails({ ...pinDetails, state: "HIGH" })
                        } catch (error) {
                          console.error("Failed to set pin state:", error)
                        }
                      }}
                      variant={pinDetails.state === "HIGH" ? "default" : "outline"}
                    >
                      Set HIGH
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          const { setPinState } = await import("@/lib/usb-communication")
                          await setPinState(pinDetails.id, "LOW")
                          setPinDetails({ ...pinDetails, state: "LOW" })
                        } catch (error) {
                          console.error("Failed to set pin state:", error)
                        }
                      }}
                      variant={pinDetails.state === "LOW" ? "default" : "outline"}
                    >
                      Set LOW
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          const { setPinState } = await import("@/lib/usb-communication")
                          await setPinState(pinDetails.id, "TOGGLE")
                          setPinDetails({
                            ...pinDetails,
                            state: pinDetails.state === "HIGH" ? "LOW" : "HIGH",
                          })
                        } catch (error) {
                          console.error("Failed to set pin state:", error)
                        }
                      }}
                      variant="outline"
                    >
                      Toggle
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPinDetails(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
