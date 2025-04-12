"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RefreshCw, Search, Plus, Trash, Play, StepForward, AlertCircle, Save, Bookmark, BookmarkX } from "lucide-react"
import type { MemoryAccessLog, MemoryBreakpoint, MemoryRegion } from "@/lib/memory-types"

interface MemoryInspectorProps {
  memoryData: Uint8Array | null
  isConnected: boolean
  onRefresh: () => void
  darkMode: boolean
  setStatusMessage: (message: string) => void
  setStatusType: (type: "success" | "error" | "info") => void
  onMemoryWrite?: (address: number, value: number) => void
  registerDefinitions?: Record<string, { address: number; description: string }>
  isRunning: boolean
  onPause: () => void
  onResume: () => void
  onStep: () => void
}

export default function MemoryInspector({
  memoryData,
  isConnected,
  onRefresh,
  darkMode,
  setStatusMessage,
  setStatusType,
  onMemoryWrite,
  registerDefinitions,
  isRunning,
  onPause,
  onResume,
  onStep,
}: MemoryInspectorProps) {
  const [startAddress, setStartAddress] = useState("0x20000000")
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editAddress, setEditAddress] = useState(0)
  const [editValue, setEditValue] = useState("")
  const [bytesPerPage, setBytesPerPage] = useState(256)
  const [bytesPerRow, setBytesPerRow] = useState(16)
  const [activeTab, setActiveTab] = useState<"memory" | "breakpoints" | "logs" | "regions">("memory")
  const [memoryAccessLogs, setMemoryAccessLogs] = useState<MemoryAccessLog[]>([])
  const [breakpoints, setBreakpoints] = useState<MemoryBreakpoint[]>([])
  const [showAddBreakpointDialog, setShowAddBreakpointDialog] = useState(false)
  const [newBreakpointAddress, setNewBreakpointAddress] = useState("")
  const [newBreakpointSize, setNewBreakpointSize] = useState("1")
  const [newBreakpointType, setNewBreakpointType] = useState<"read" | "write" | "both">("both")
  const [newBreakpointCondition, setNewBreakpointCondition] = useState("")
  const [newBreakpointName, setNewBreakpointName] = useState("")
  const [memoryRegions, setMemoryRegions] = useState<MemoryRegion[]>([
    { name: "FLASH", startAddress: 0x08000000, size: 0x80000, type: "flash", description: "Program memory" },
    { name: "SRAM1", startAddress: 0x20000000, size: 0x20000, type: "ram", description: "Main RAM" },
    { name: "SRAM2", startAddress: 0x10000000, size: 0x8000, type: "ram", description: "Additional RAM" },
    {
      name: "PERIPH",
      startAddress: 0x40000000,
      size: 0x10000,
      type: "peripheral",
      description: "Peripheral registers",
    },
  ])
  const [showAddRegionDialog, setShowAddRegionDialog] = useState(false)
  const [newRegionName, setNewRegionName] = useState("")
  const [newRegionStart, setNewRegionStart] = useState("")
  const [newRegionSize, setNewRegionSize] = useState("")
  const [newRegionType, setNewRegionType] = useState<"flash" | "ram" | "peripheral" | "other">("ram")
  const [newRegionDescription, setNewRegionDescription] = useState("")
  const [filterType, setFilterType] = useState<"all" | "read" | "write">("all")
  const [isBreakpointHit, setIsBreakpointHit] = useState(false)
  const [hitBreakpoint, setHitBreakpoint] = useState<MemoryBreakpoint | null>(null)
  const [showBreakpointHitDialog, setShowBreakpointHitDialog] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [memoryAccessLogs])

  // Set up auto-refresh interval
  useEffect(() => {
    if (autoRefresh && isConnected) {
      autoRefreshIntervalRef.current = setInterval(() => {
        onRefresh()
      }, 1000)
    } else if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current)
      autoRefreshIntervalRef.current = null
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [autoRefresh, isConnected, onRefresh])

  // Reset search results when memory data changes
  useEffect(() => {
    setSearchResults([])
  }, [memoryData])

  // Simulate memory access logging
  useEffect(() => {
    // This would be replaced with actual memory access tracking in a real implementation
    const simulateMemoryAccess = () => {
      if (!isConnected || !isRunning) return

      // Simulate random memory accesses
      const randomAddress = Math.floor(Math.random() * 0x1000) + 0x20000000
      const randomValue = Math.floor(Math.random() * 256)
      const accessType = Math.random() > 0.5 ? "read" : "write"

      const newLog: MemoryAccessLog = {
        timestamp: new Date(),
        address: randomAddress,
        value: randomValue,
        type: accessType,
        source: "CPU",
      }

      setMemoryAccessLogs((prev) => [...prev.slice(-999), newLog])

      // Check if this access triggers any breakpoints
      const triggeredBreakpoint = breakpoints.find((bp) => {
        if (!bp.enabled) return false

        const addressMatch = randomAddress >= bp.address && randomAddress < bp.address + bp.size
        const typeMatch = bp.type === "both" || bp.type === accessType

        // Check condition if present
        let conditionMatch = true
        if (bp.condition) {
          try {
            // Simple condition evaluation - in a real implementation this would be more robust
            const condition = bp.condition.replace("value", randomValue.toString())
            conditionMatch = eval(condition)
          } catch (e) {
            console.error("Error evaluating breakpoint condition:", e)
            conditionMatch = false
          }
        }

        return addressMatch && typeMatch && conditionMatch
      })

      if (triggeredBreakpoint) {
        setIsBreakpointHit(true)
        setHitBreakpoint(triggeredBreakpoint)
        setShowBreakpointHitDialog(true)
        onPause()
      }
    }

    const interval = setInterval(simulateMemoryAccess, 200)
    return () => clearInterval(interval)
  }, [isConnected, isRunning, breakpoints, onPause])

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartAddress(e.target.value)
  }

  const handleSearch = () => {
    if (!memoryData) return

    const searchBytes = searchValue
      .split(" ")
      .filter(Boolean)
      .map((val) => {
        // Handle both hex (0xFF) and decimal (255) formats
        return val.startsWith("0x") ? Number.parseInt(val, 16) : Number.parseInt(val, 10)
      })

    if (searchBytes.length === 0 || searchBytes.some(isNaN)) {
      setStatusMessage("Invalid search pattern")
      setStatusType("error")
      return
    }

    const results: number[] = []
    for (let i = 0; i < memoryData.length - searchBytes.length + 1; i++) {
      let match = true
      for (let j = 0; j < searchBytes.length; j++) {
        if (memoryData[i + j] !== searchBytes[j]) {
          match = false
          break
        }
      }
      if (match) {
        results.push(i)
      }
    }

    if (results.length > 0) {
      setSearchResults(results)
      setStatusMessage(`Found ${results.length} matches`)
      setStatusType("success")

      // Navigate to the first result
      const firstResultPage = Math.floor(results[0] / bytesPerPage)
      setCurrentPage(firstResultPage)
    } else {
      setSearchResults([])
      setStatusMessage("No matches found")
      setStatusType("info")
    }
  }

  const handleRefresh = () => {
    onRefresh()
    setStatusMessage("Memory refreshed")
    setStatusType("success")
  }

  const formatAddress = (baseAddress: string, offset: number): string => {
    const base = Number.parseInt(baseAddress, 16)
    return `0x${(base + offset).toString(16).toUpperCase().padStart(8, "0")}`
  }

  const handleEditCell = (address: number, currentValue: number) => {
    setEditAddress(address)
    setEditValue(currentValue.toString(16).toUpperCase().padStart(2, "0"))
    setShowEditDialog(true)
  }

  const handleSaveEdit = () => {
    try {
      const value = Number.parseInt(editValue, 16)
      if (isNaN(value) || value < 0 || value > 255) {
        throw new Error("Value must be between 0x00 and 0xFF")
      }

      // Log the memory write
      const newLog: MemoryAccessLog = {
        timestamp: new Date(),
        address: editAddress,
        value,
        type: "write",
        source: "User",
      }
      setMemoryAccessLogs((prev) => [...prev, newLog])

      // Update memory
      if (onMemoryWrite) {
        onMemoryWrite(editAddress, value)
      }

      setShowEditDialog(false)
      setStatusMessage(
        `Memory at ${formatAddress("0", editAddress)} updated to 0x${value.toString(16).toUpperCase().padStart(2, "0")}`,
      )
      setStatusType("success")
    } catch (error: any) {
      setStatusMessage(error.message)
      setStatusType("error")
    }
  }

  const handleAddBreakpoint = () => {
    try {
      const address = Number.parseInt(newBreakpointAddress, 16)
      const size = Number.parseInt(newBreakpointSize, 10)

      if (isNaN(address)) {
        throw new Error("Invalid address format")
      }

      if (isNaN(size) || size < 1) {
        throw new Error("Size must be at least 1 byte")
      }

      // Validate condition if provided
      if (newBreakpointCondition) {
        try {
          // Simple validation - replace 'value' with a dummy value
          const testCondition = newBreakpointCondition.replace(/value/g, "123")
          eval(testCondition)
        } catch (e) {
          throw new Error("Invalid condition expression")
        }
      }

      const newBreakpoint: MemoryBreakpoint = {
        id: Date.now().toString(),
        name: newBreakpointName || `Breakpoint at ${formatAddress("0", address)}`,
        address,
        size,
        type: newBreakpointType,
        condition: newBreakpointCondition,
        enabled: true,
        hitCount: 0,
      }

      setBreakpoints((prev) => [...prev, newBreakpoint])
      setShowAddBreakpointDialog(false)
      setNewBreakpointAddress("")
      setNewBreakpointSize("1")
      setNewBreakpointType("both")
      setNewBreakpointCondition("")
      setNewBreakpointName("")

      setStatusMessage("Breakpoint added successfully")
      setStatusType("success")
    } catch (error: any) {
      setStatusMessage(error.message)
      setStatusType("error")
    }
  }

  const handleToggleBreakpoint = (id: string) => {
    setBreakpoints((prev) => prev.map((bp) => (bp.id === id ? { ...bp, enabled: !bp.enabled } : bp)))
  }

  const handleDeleteBreakpoint = (id: string) => {
    setBreakpoints((prev) => prev.filter((bp) => bp.id !== id))
    setStatusMessage("Breakpoint removed")
    setStatusType("info")
  }

  const handleAddRegion = () => {
    try {
      const startAddr = Number.parseInt(newRegionStart, 16)
      const size = Number.parseInt(newRegionSize, 16)

      if (isNaN(startAddr)) {
        throw new Error("Invalid start address format")
      }

      if (isNaN(size) || size < 1) {
        throw new Error("Size must be at least 1 byte")
      }

      const newRegion: MemoryRegion = {
        name: newRegionName,
        startAddress: startAddr,
        size,
        type: newRegionType,
        description: newRegionDescription,
      }

      setMemoryRegions((prev) => [...prev, newRegion])
      setShowAddRegionDialog(false)
      setNewRegionName("")
      setNewRegionStart("")
      setNewRegionSize("")
      setNewRegionType("ram")
      setNewRegionDescription("")

      setStatusMessage("Memory region added successfully")
      setStatusType("success")
    } catch (error: any) {
      setStatusMessage(error.message)
      setStatusType("error")
    }
  }

  const handleDeleteRegion = (name: string) => {
    setMemoryRegions((prev) => prev.filter((region) => region.name !== name))
    setStatusMessage("Memory region removed")
    setStatusType("info")
  }

  const handleContinueFromBreakpoint = () => {
    setShowBreakpointHitDialog(false)
    setIsBreakpointHit(false)
    setHitBreakpoint(null)
    onResume()
  }

  const getRegionForAddress = (address: number): MemoryRegion | undefined => {
    return memoryRegions.find((region) => address >= region.startAddress && address < region.startAddress + region.size)
  }

  const getRegisterForAddress = (address: number): { name: string; description: string } | undefined => {
    if (!registerDefinitions) return undefined

    const registerEntry = Object.entries(registerDefinitions).find(([_, def]) => def.address === address)

    if (registerEntry) {
      return { name: registerEntry[0], description: registerEntry[1].description }
    }

    return undefined
  }

  const renderMemoryTable = () => {
    if (!memoryData) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {isConnected ? "Click Refresh to load memory data" : "Connect a device to view memory"}
          </p>
        </div>
      )
    }

    const startOffset = currentPage * bytesPerPage
    const endOffset = Math.min(startOffset + bytesPerPage, memoryData.length)
    const pageData = memoryData.slice(startOffset, endOffset)
    const rows = Math.ceil(pageData.length / bytesPerRow)

    return (
      <div className="overflow-auto">
        <table className={`w-full border-collapse ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          <thead>
            <tr className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
              <th className="p-2 text-left sticky left-0 z-10 bg-inherit">Address</th>
              {Array.from({ length: bytesPerRow }).map((_, i) => (
                <th key={i} className="p-2 text-center">
                  {i.toString(16).toUpperCase().padStart(2, "0")}
                </th>
              ))}
              <th className="p-2 text-left">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => {
              const rowOffset = startOffset + rowIndex * bytesPerRow
              const rowAddress = formatAddress(startAddress, rowOffset)
              const isHighlighted = searchResults.some(
                (result) => result >= rowOffset && result < rowOffset + bytesPerRow,
              )

              // Check if this row contains a breakpoint
              const hasBreakpoint = breakpoints.some((bp) => {
                const bpAddress = bp.address
                return bpAddress >= rowOffset && bpAddress < rowOffset + bytesPerRow
              })

              // Get memory region for this row
              const baseAddress = Number.parseInt(startAddress, 16)
              const region = getRegionForAddress(baseAddress + rowOffset)

              return (
                <tr
                  key={rowIndex}
                  className={`${
                    isHighlighted
                      ? darkMode
                        ? "bg-blue-900"
                        : "bg-blue-100"
                      : hasBreakpoint
                        ? darkMode
                          ? "bg-red-900/30"
                          : "bg-red-100"
                        : region?.type === "peripheral"
                          ? darkMode
                            ? "bg-purple-900/30"
                            : "bg-purple-100"
                          : region?.type === "flash"
                            ? darkMode
                              ? "bg-amber-900/30"
                              : "bg-amber-100"
                            : rowIndex % 2 === 0
                              ? darkMode
                                ? "bg-gray-900"
                                : "bg-white"
                              : darkMode
                                ? "bg-gray-800"
                                : "bg-gray-50"
                  } hover:${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
                >
                  <td className="p-2 font-mono sticky left-0 z-10 bg-inherit">
                    <div className="flex items-center gap-2">
                      <span>{rowAddress}</span>
                      {region && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="cursor-help">
                                {region.name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{region.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                  {Array.from({ length: bytesPerRow }).map((_, colIndex) => {
                    const byteIndex = rowIndex * bytesPerRow + colIndex
                    const byte = byteIndex < pageData.length ? pageData[byteIndex] : null
                    const byteOffset = rowOffset + colIndex
                    const absoluteAddress = Number.parseInt(startAddress, 16) + byteOffset

                    // Check if this byte is part of a search result
                    const isHighlightedByte = searchResults.includes(byteOffset)

                    // Check if this byte has a breakpoint
                    const breakpoint = breakpoints.find((bp) => bp.address === absoluteAddress)

                    // Check if this byte is a register
                    const register = getRegisterForAddress(absoluteAddress)

                    return (
                      <td
                        key={colIndex}
                        className={`p-2 font-mono text-center cursor-pointer ${
                          isHighlightedByte
                            ? darkMode
                              ? "bg-blue-700 text-white"
                              : "bg-blue-300"
                            : breakpoint
                              ? (darkMode ? "bg-red-700 text-white" : "bg-red-300")
                              : register
                                ? darkMode
                                  ? "bg-green-700 text-white"
                                  : "bg-green-300"
                                : ""
                        }`}
                        onClick={() => byte !== null && handleEditCell(absoluteAddress, byte)}
                        title={
                          breakpoint
                            ? `Breakpoint: ${breakpoint.name}`
                            : register
                              ? `Register: ${register.name} - ${register.description}`
                              : `Click to edit value at ${formatAddress("0", absoluteAddress)}`
                        }
                      >
                        {byte !== null ? byte.toString(16).toUpperCase().padStart(2, "0") : ""}
                      </td>
                    )
                  })}
                  <td className="p-2 font-mono">
                    {Array.from({ length: bytesPerRow }).map((_, colIndex) => {
                      const byteIndex = rowIndex * bytesPerRow + colIndex
                      const byte = byteIndex < pageData.length ? pageData[byteIndex] : null
                      return byte !== null && byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "."
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderBreakpointsTable = () => {
    return (
      <div className="overflow-auto">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Memory Breakpoints</h3>
          <Button onClick={() => setShowAddBreakpointDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Breakpoint</span>
          </Button>
        </div>

        {breakpoints.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No breakpoints set</p>
            <p className="text-sm text-gray-500 mt-2">Click "Add Breakpoint" to create a new memory breakpoint</p>
          </div>
        ) : (
          <table className={`w-full border-collapse ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
            <thead>
              <tr className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Address</th>
                <th className="p-2 text-left">Size</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Condition</th>
                <th className="p-2 text-left">Hit Count</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {breakpoints.map((bp) => (
                <tr
                  key={bp.id}
                  className={`border-t ${darkMode ? "border-gray-700" : "border-gray-200"} ${
                    bp.enabled ? "" : darkMode ? "opacity-50" : "opacity-60"
                  }`}
                >
                  <td className="p-2 font-medium">{bp.name}</td>
                  <td className="p-2 font-mono">{formatAddress("0", bp.address)}</td>
                  <td className="p-2">
                    {bp.size} byte{bp.size > 1 ? "s" : ""}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline">
                      {bp.type === "read" ? "Read" : bp.type === "write" ? "Write" : "Read/Write"}
                    </Badge>
                  </td>
                  <td className="p-2 font-mono">{bp.condition || "-"}</td>
                  <td className="p-2">{bp.hitCount}</td>
                  <td className="p-2">
                    <Badge variant={bp.enabled ? "default" : "outline"}>{bp.enabled ? "Enabled" : "Disabled"}</Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleBreakpoint(bp.id)}
                        title={bp.enabled ? "Disable breakpoint" : "Enable breakpoint"}
                      >
                        {bp.enabled ? (
                          <BookmarkX className="h-4 w-4 text-red-500" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBreakpoint(bp.id)}
                        title="Delete breakpoint"
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const renderMemoryRegionsTable = () => {
    return (
      <div className="overflow-auto">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Memory Regions</h3>
          <Button onClick={() => setShowAddRegionDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Region</span>
          </Button>
        </div>

        <table className={`w-full border-collapse ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          <thead>
            <tr className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Start Address</th>
              <th className="p-2 text-left">End Address</th>
              <th className="p-2 text-left">Size</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memoryRegions.map((region) => (
              <tr
                key={region.name}
                className={`border-t ${darkMode ? "border-gray-700" : "border-gray-200"} ${
                  region.type === "flash"
                    ? darkMode
                      ? "bg-amber-900/30"
                      : "bg-amber-100"
                    : region.type === "peripheral"
                      ? darkMode
                        ? "bg-purple-900/30"
                        : "bg-purple-100"
                      : region.type === "ram"
                        ? darkMode
                          ? "bg-blue-900/30"
                          : "bg-blue-100"
                        : ""
                }`}
              >
                <td className="p-2 font-medium">{region.name}</td>
                <td className="p-2 font-mono">{formatAddress("0", region.startAddress)}</td>
                <td className="p-2 font-mono">{formatAddress("0", region.startAddress + region.size - 1)}</td>
                <td className="p-2 font-mono">
                  0x{region.size.toString(16).toUpperCase()} ({region.size} bytes)
                </td>
                <td className="p-2">
                  <Badge
                    variant="outline"
                    className={
                      region.type === "flash"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : region.type === "peripheral"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : region.type === "ram"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : ""
                    }
                  >
                    {region.type.charAt(0).toUpperCase() + region.type.slice(1)}
                  </Badge>
                </td>
                <td className="p-2">{region.description}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setStartAddress(`0x${region.startAddress.toString(16).toUpperCase()}`)
                        setActiveTab("memory")
                      }}
                      title="Go to region"
                    >
                      <Play className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRegion(region.name)}
                      title="Delete region"
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderMemoryAccessLogs = () => {
    const filteredLogs = memoryAccessLogs.filter((log) => filterType === "all" || log.type === filterType)

    return (
      <div className="overflow-auto h-full flex flex-col">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Memory Access Logs</h3>
          <div className="flex items-center gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              All
            </Button>
            <Button
              variant={filterType === "read" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("read")}
            >
              Reads
            </Button>
            <Button
              variant={filterType === "write" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("write")}
            >
              Writes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMemoryAccessLogs([])}
              className="flex items-center gap-1"
            >
              <Trash className="h-4 w-4" />
              <span>Clear</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Export logs as JSON
                const blob = new Blob([JSON.stringify(memoryAccessLogs, null, 2)], {
                  type: "application/json",
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "memory_access_logs.json"
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        <div className="flex-grow overflow-auto border rounded-md">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No memory access logs</p>
              <p className="text-sm text-gray-500 mt-2">
                Memory access logs will appear here when memory is read or written
              </p>
            </div>
          ) : (
            <div className="p-2 font-mono text-sm">
              {filteredLogs.map((log, index) => {
                const region = getRegionForAddress(log.address)
                const register = getRegisterForAddress(log.address)

                return (
                  <div
                    key={index}
                    className={`mb-1 p-1 rounded ${
                      log.type === "write"
                        ? darkMode
                          ? "bg-blue-900/30"
                          : "bg-blue-50"
                        : darkMode
                          ? "bg-green-900/30"
                          : "bg-green-50"
                    }`}
                  >
                    <span className="text-gray-500">
                      [{log.timestamp.toLocaleTimeString()}.
                      {log.timestamp.getMilliseconds().toString().padStart(3, "0")}]
                    </span>{" "}
                    <span
                      className={
                        log.type === "write" ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"
                      }
                    >
                      {log.type.toUpperCase()}
                    </span>{" "}
                    <span className="font-bold">{formatAddress("0", log.address)}</span>{" "}
                    <span className="text-purple-600 dark:text-purple-400">
                      0x{log.value.toString(16).toUpperCase().padStart(2, "0")}
                    </span>{" "}
                    <span className="text-gray-500">({log.source})</span>
                    {region && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs">
                        {region.name}
                      </span>
                    )}
                    {register && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-green-200 dark:bg-green-800 text-xs">
                        {register.name}
                      </span>
                    )}
                  </div>
                )
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const startOffset = currentPage * bytesPerPage
  const endOffset = Math.min(startOffset + bytesPerPage, memoryData?.length || 0)

  return (
    <div className={`h-full flex flex-col ${darkMode ? "bg-gray-950 text-white" : "bg-white text-black"}`}>
      <div className={`p-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor="memory-address" className="block mb-1">
              Start Address
            </Label>
            <Input
              id="memory-address"
              value={startAddress}
              onChange={handleAddressChange}
              className={`w-40 font-mono ${darkMode ? "bg-gray-800 text-white border-gray-700" : ""}`}
            />
          </div>

          <div>
            <Label htmlFor="search-value" className="block mb-1">
              Search (hex/decimal)
            </Label>
            <div className="flex">
              <Input
                id="search-value"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="e.g. FF 00 A5 or 255 0 165"
                className={`w-60 font-mono ${darkMode ? "bg-gray-800 text-white border-gray-700" : ""}`}
              />
              <Button variant="outline" onClick={handleSearch} className="ml-2">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                disabled={!isConnected}
              />
              <Label htmlFor="auto-refresh">Auto-refresh</Label>
            </div>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-grow flex flex-col">
        <TabsList className="mx-4 justify-start">
          <TabsTrigger value="memory">Memory View</TabsTrigger>
          <TabsTrigger value="breakpoints">Breakpoints</TabsTrigger>
          <TabsTrigger value="logs">Access Logs</TabsTrigger>
          <TabsTrigger value="regions">Memory Regions</TabsTrigger>
        </TabsList>

        <TabsContent value="memory" className="flex-grow p-0 m-0 overflow-auto">
          {renderMemoryTable()}
        </TabsContent>

        <TabsContent value="breakpoints" className="flex-grow p-4 m-0 overflow-auto">
          {renderBreakpointsTable()}
        </TabsContent>

        <TabsContent value="logs" className="flex-grow p-4 m-0 overflow-auto">
          {renderMemoryAccessLogs()}
        </TabsContent>

        <TabsContent value="regions" className="flex-grow p-4 m-0 overflow-auto">
          {renderMemoryRegionsTable()}
        </TabsContent>
      </Tabs>

      <div
        className={`p-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"} flex justify-between items-center`}
      >
        <div>
          {memoryData && (
            <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
              Showing {startOffset} - {endOffset} of {memoryData.length} bytes
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0 || !memoryData}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => (memoryData && (prev + 1) * bytesPerPage < memoryData.length ? prev + 1 : prev))
            }
            disabled={!memoryData || (currentPage + 1) * bytesPerPage >= (memoryData?.length || 0)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Edit Memory Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Memory Value</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-address" className="text-right">
                Address
              </Label>
              <div className="col-span-3">
                <Input id="edit-address" value={formatAddress("0", editAddress)} readOnly className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-value" className="text-right">
                Value (hex)
              </Label>
              <div className="col-span-3 flex">
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border border-r-0 rounded-l-md">0x</span>
                <Input
                  id="edit-value"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value.replace(/[^0-9A-Fa-f]/g, ""))}
                  className="rounded-l-none font-mono"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Breakpoint Dialog */}
      <Dialog open={showAddBreakpointDialog} onOpenChange={setShowAddBreakpointDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Memory Breakpoint</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakpoint-name" className="text-right">
                Name
              </Label>
              <Input
                id="breakpoint-name"
                value={newBreakpointName}
                onChange={(e) => setNewBreakpointName(e.target.value)}
                placeholder="Optional name for this breakpoint"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakpoint-address" className="text-right">
                Address
              </Label>
              <div className="col-span-3 flex">
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border border-r-0 rounded-l-md">0x</span>
                <Input
                  id="breakpoint-address"
                  value={newBreakpointAddress.replace(/^0x/i, "")}
                  onChange={(e) => setNewBreakpointAddress(e.target.value.replace(/[^0-9A-Fa-f]/g, ""))}
                  className="rounded-l-none font-mono"
                  placeholder="Memory address (hex)"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakpoint-size" className="text-right">
                Size (bytes)
              </Label>
              <Input
                id="breakpoint-size"
                type="number"
                min="1"
                value={newBreakpointSize}
                onChange={(e) => setNewBreakpointSize(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakpoint-type" className="text-right">
                Trigger on
              </Label>
              <div className="col-span-3">
                <Tabs
                  value={newBreakpointType}
                  onValueChange={(v) => setNewBreakpointType(v as "read" | "write" | "both")}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="read">Read</TabsTrigger>
                    <TabsTrigger value="write">Write</TabsTrigger>
                    <TabsTrigger value="both">Both</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakpoint-condition" className="text-right">
                Condition
              </Label>
              <div className="col-span-3">
                <Input
                  id="breakpoint-condition"
                  value={newBreakpointCondition}
                  onChange={(e) => setNewBreakpointCondition(e.target.value)}
                  placeholder="e.g. value > 128 && value < 255"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use 'value' to refer to the memory value. Leave empty for unconditional breakpoint.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBreakpointDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBreakpoint}>Add Breakpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Memory Region Dialog */}
      <Dialog open={showAddRegionDialog} onOpenChange={setShowAddRegionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Memory Region</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region-name" className="text-right">
                Name
              </Label>
              <Input
                id="region-name"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                placeholder="e.g. SRAM3, BACKUP_RAM"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region-start" className="text-right">
                Start Address
              </Label>
              <div className="col-span-3 flex">
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border border-r-0 rounded-l-md">0x</span>
                <Input
                  id="region-start"
                  value={newRegionStart.replace(/^0x/i, "")}
                  onChange={(e) => setNewRegionStart(e.target.value.replace(/[^0-9A-Fa-f]/g, ""))}
                  className="rounded-l-none font-mono"
                  placeholder="Start address (hex)"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region-size" className="text-right">
                Size
              </Label>
              <div className="col-span-3 flex">
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border border-r-0 rounded-l-md">0x</span>
                <Input
                  id="region-size"
                  value={newRegionSize.replace(/^0x/i, "")}
                  onChange={(e) => setNewRegionSize(e.target.value.replace(/[^0-9A-Fa-f]/g, ""))}
                  className="rounded-l-none font-mono"
                  placeholder="Size in bytes (hex)"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region-type" className="text-right">
                Type
              </Label>
              <div className="col-span-3">
                <Tabs
                  value={newRegionType}
                  onValueChange={(v) => setNewRegionType(v as "flash" | "ram" | "peripheral" | "other")}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="flash">Flash</TabsTrigger>
                    <TabsTrigger value="ram">RAM</TabsTrigger>
                    <TabsTrigger value="peripheral">Peripheral</TabsTrigger>
                    <TabsTrigger value="other">Other</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region-description" className="text-right">
                Description
              </Label>
              <Input
                id="region-description"
                value={newRegionDescription}
                onChange={(e) => setNewRegionDescription(e.target.value)}
                placeholder="Optional description"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRegionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRegion}>Add Region</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Breakpoint Hit Dialog */}
      <Dialog open={showBreakpointHitDialog} onOpenChange={setShowBreakpointHitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Breakpoint Hit
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {hitBreakpoint && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <h3 className="font-semibold">{hitBreakpoint.name}</h3>
                  <p className="text-sm mt-1">
                    Breakpoint triggered at address{" "}
                    <span className="font-mono">{formatAddress("0", hitBreakpoint.address)}</span>
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>{" "}
                      <span className="font-medium">
                        {hitBreakpoint.type === "read"
                          ? "Read"
                          : hitBreakpoint.type === "write"
                            ? "Write"
                            : "Read/Write"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>{" "}
                      <span className="font-medium">{hitBreakpoint.size} byte(s)</span>
                    </div>
                    {hitBreakpoint.condition && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Condition:</span>{" "}
                        <span className="font-mono">{hitBreakpoint.condition}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">
                      Program execution has been paused. What would you like to do?
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onStep} className="flex items-center gap-2">
                      <StepForward className="h-4 w-4" />
                      <span>Step</span>
                    </Button>
                    <Button onClick={handleContinueFromBreakpoint} className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      <span>Continue</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
