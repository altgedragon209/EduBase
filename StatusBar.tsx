"use client"

import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Cpu,
  Clock,
  Database,
  MemoryStickIcon as Memory,
  Usb,
} from "lucide-react"

interface StatusBarProps {
  message: string
  type: "info" | "error" | "success" | "warning"
  darkMode: boolean
  isConnected: boolean
  deviceInfo: any
}

export default function StatusBar({ message, type, darkMode, isConnected, deviceInfo }: StatusBarProps) {
  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div
      className={`p-2 border-t ${darkMode ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"}`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span>{message}</span>
        </div>

        <div className="flex items-center gap-4">
          {isConnected && deviceInfo && (
            <>
              <div className="flex items-center gap-1">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{deviceInfo.name || "Unknown Device"}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm">{deviceInfo.clockSpeed || "Unknown"} MHz</span>
              </div>

              <div className="flex items-center gap-1">
                <Memory className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Flash: {deviceInfo.flashSize || "Unknown"} KB</span>
              </div>

              <div className="flex items-center gap-1">
                <Database className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">RAM: {deviceInfo.ramSize || "Unknown"} KB</span>
              </div>
            </>
          )}

          {!isConnected && (
            <div className="flex items-center gap-1 text-gray-500">
              <Usb className="h-4 w-4" />
              <span className="text-sm">Click "Connect Device" to begin</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
