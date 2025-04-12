"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Usb, CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface USBConnectionProps {
  onConnectionChange: (connected: boolean, deviceInfo?: any) => void
  boardType: string
}

export default function USBConnection({ onConnectionChange, boardType }: USBConnectionProps) {
  const [device, setDevice] = useState<USBDevice | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState<USBDevice[]>([])
  const [error, setError] = useState<string | null>(null)

  // Scan for connected devices using WebUSB API
  const scanForDevices = async () => {
    setIsScanning(true)
    setError(null)

    try {
      // Check if WebUSB is supported
      if (!navigator.usb) {
        throw new Error("WebUSB is not supported in this browser")
      }

      // Get all devices the user has previously authorized
      const authorizedDevices = await navigator.usb.getDevices()
      setDevices(authorizedDevices)
    } catch (error: any) {
      setError(error.message || "Failed to scan for devices")
      console.error("Error scanning for devices:", error)
    } finally {
      setIsScanning(false)
    }
  }

  // Request a new device
  const requestDevice = async () => {
    setIsScanning(true)
    setError(null)

    try {
      // Check if WebUSB is supported
      if (!navigator.usb) {
        throw new Error("WebUSB is not supported in this browser")
      }

      // Request the user to select a device
      const selectedDevice = await navigator.usb.requestDevice({
        // Optional filters to narrow down device selection
        filters: [], // Empty array means any device can be selected
      })

      // Add the newly selected device to the list if it's not already there
      setDevices((prev) => {
        if (!prev.some((d) => d.serialNumber === selectedDevice.serialNumber)) {
          return [...prev, selectedDevice]
        }
        return prev
      })
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.name === "NotFoundError") {
        setError("No device was selected")
      } else {
        setError(error.message || "Failed to request device")
        console.error("Error requesting device:", error)
      }
    } finally {
      setIsScanning(false)
    }
  }

  // Handle device selection
  const handleDeviceSelected = async (selectedDevice: USBDevice) => {
    setIsConnecting(true)
    setError(null)

    try {
      // Open the device
      await selectedDevice.open()

      // Get device info
      const deviceInfo = {
        name: selectedDevice.productName || "Unknown Device",
        model: guessModelFromDevice(selectedDevice),
        serialNumber: selectedDevice.serialNumber || "Unknown",
        manufacturer: selectedDevice.manufacturerName || "Unknown",
        vendorId: selectedDevice.vendorId,
        productId: selectedDevice.productId,
        clockSpeed: "Unknown",
        flashSize: "Unknown",
        ramSize: "Unknown",
      }

      setDevice(selectedDevice)
      onConnectionChange(true, deviceInfo)
    } catch (error: any) {
      setError(error.message || "Failed to connect to device")
      console.error("Failed to connect to device:", error)
      onConnectionChange(false)
    } finally {
      setIsConnecting(false)
    }
  }

  // Guess STM32 model from device information
  const guessModelFromDevice = (device: USBDevice): string => {
    const productName = (device.productName || "").toLowerCase()

    if (productName.includes("l476")) return "L476RG"
    if (productName.includes("f446")) return "F446RE"
    if (productName.includes("f031")) return "F031K6"

    // STM32 vendor ID is 0x0483
    if (device.vendorId === 0x0483) return "STM32"

    return "Unknown"
  }

  const disconnectUSB = async () => {
    if (device) {
      try {
        await device.close()
      } catch (error) {
        console.error("Error closing device:", error)
      }
      setDevice(null)
      onConnectionChange(false)
    }
  }

  // Scan for devices when dropdown opens
  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      scanForDevices()
    }
  }

  // Format device name for display
  const formatDeviceName = (device: USBDevice): string => {
    let name = device.productName || `USB Device ${device.productId.toString(16)}`
    if (device.manufacturerName) {
      name += ` (${device.manufacturerName})`
    }
    return name
  }

  return (
    <>
      {device ? (
        <Button variant="outline" size="sm" onClick={disconnectUSB} className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Connected: {device.productName || "USB Device"}</span>
        </Button>
      ) : (
        <DropdownMenu onOpenChange={handleDropdownOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isConnecting} className="flex gap-2">
              <Usb className="h-4 w-4" />
              <span>{isConnecting ? "Connecting..." : "Connect Device"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            {error && (
              <div className="m-2 p-2 bg-red-100 text-red-800 rounded-md flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {isScanning ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Scanning for devices...</span>
              </div>
            ) : (
              <>
                <div className="p-2 text-xs text-gray-500 border-b">Connected USB Devices:</div>
                <div className="max-h-[200px] overflow-y-auto">
                  {devices.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">No USB devices found</div>
                  ) : (
                    devices.map((device, index) => (
                      <DropdownMenuItem
                        key={index}
                        onSelect={() => handleDeviceSelected(device)}
                        className="flex flex-col items-start py-2 cursor-pointer"
                      >
                        <div className="font-medium">{formatDeviceName(device)}</div>
                        <div className="text-xs text-gray-500">
                          VID: {device.vendorId.toString(16).padStart(4, "0")}, PID:{" "}
                          {device.productId.toString(16).padStart(4, "0")}
                          {device.serialNumber ? `, S/N: ${device.serialNumber}` : ""}
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                <div className="p-2 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scanForDevices}
                    className="flex items-center gap-2 flex-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={requestDevice}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Usb className="h-4 w-4" />
                    <span>Select Device</span>
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}
