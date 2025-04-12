"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, Search, Edit, Download, Upload } from "lucide-react"

interface MemoryViewerProps {
  memoryData: Uint8Array | null
  isConnected: boolean
  onRefresh: () => void
  darkMode: boolean
  setStatusMessage: (message: string) => void
  setStatusType: (type: "success" | "error" | "info") => void
}

export default function MemoryViewer({
  memoryData,
  isConnected,
  onRefresh,
  darkMode,
  setStatusMessage,
  setStatusType,
}: MemoryViewerProps) {
  const [startAddress, setStartAddress] = useState("0x20000000")
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const bytesPerPage = 256
  const bytesPerRow = 16

  useEffect(() => {
    // Reset search results when memory data changes
    setSearchResults([])
  }, [memoryData])

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartAddress(e.target.value)
  }

  const handleSearch = () => {
    if (!memoryData) return

    const searchBytes = searchValue
      .split(" ")
      .filter(Boolean)
      .map((val) => Number.parseInt(val, 16))

    if (searchBytes.length === 0) {
      setSearchResults([])
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

    setSearchResults(results)
  }

  const handleRefresh = () => {
    onRefresh()
  }

  const formatAddress = (baseAddress: string, offset: number): string => {
    const base = Number.parseInt(baseAddress, 16)
    return `0x${(base + offset).toString(16).toUpperCase().padStart(8, "0")}`
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
              <th className="p-2 text-left">Address</th>
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

              return (
                <tr
                  key={rowIndex}
                  className={`${
                    isHighlighted
                      ? darkMode
                        ? "bg-blue-900"
                        : "bg-blue-100"
                      : rowIndex % 2 === 0
                        ? darkMode
                          ? "bg-gray-900"
                          : "bg-white"
                        : darkMode
                          ? "bg-gray-800"
                          : "bg-gray-50"
                  } hover:${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
                >
                  <td className="p-2 font-mono">{rowAddress}</td>
                  {Array.from({ length: bytesPerRow }).map((_, colIndex) => {
                    const byteIndex = rowIndex * bytesPerRow + colIndex
                    const byte = byteIndex < pageData.length ? pageData[byteIndex] : null
                    const byteOffset = rowOffset + colIndex
                    const isHighlightedByte = searchResults.includes(byteOffset)

                    return (
                      <td
                        key={colIndex}
                        className={`p-2 font-mono text-center ${
                          isHighlightedByte ? (darkMode ? "bg-blue-700 text-white" : "bg-blue-300") : ""
                        }`}
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

  // Add a function to write to memory
  const handleWriteMemory = async () => {
    if (!isConnected) return

    try {
      const address = Number.parseInt(startAddress, 16)
      if (isNaN(address)) {
        alert("Invalid address format")
        return
      }

      // Prompt user for value to write
      const value = prompt("Enter hex value to write (e.g., FF 00 A5):")
      if (!value) return

      // Parse hex values
      const bytes = value
        .split(" ")
        .filter(Boolean)
        .map((val) => Number.parseInt(val, 16))

      if (bytes.some(isNaN)) {
        alert("Invalid hex format")
        return
      }

      const data = new Uint8Array(bytes)

      // Write to memory
      const { writeMemory } = await import("@/lib/usb-communication")
      await writeMemory(address, data)

      // Refresh memory view
      onRefresh()

      setStatusMessage(`Wrote ${bytes.length} bytes to ${startAddress}`)
      setStatusType("success")
    } catch (error) {
      console.error("Failed to write memory:", error)
      setStatusMessage("Failed to write memory")
      setStatusType("error")
    }
  }

  // Add a function to export memory to a file
  const handleExportMemory = () => {
    if (!memoryData) return

    // Create a binary blob
    const blob = new Blob([memoryData], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)

    // Create a download link
    const a = document.createElement("a")
    a.href = url
    a.download = `memory_dump_${startAddress}_${memoryData.length}bytes.bin`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setStatusMessage("Memory exported to file")
    setStatusType("success")
  }

  // Add a function to import memory from a file
  const handleImportMemory = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".bin,.hex"

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const buffer = await file.arrayBuffer()
        const data = new Uint8Array(buffer)

        // Ask user for address to write to
        const address = prompt(`Enter address to write ${data.length} bytes to:`, startAddress)
        if (!address) return

        const addressValue = Number.parseInt(address, 16)
        if (isNaN(addressValue)) {
          alert("Invalid address format")
          return
        }

        // Write to memory
        const { writeMemory } = await import("@/lib/usb-communication")
        await writeMemory(addressValue, data)

        // Refresh memory view
        onRefresh()

        setStatusMessage(`Imported ${data.length} bytes to ${address}`)
        setStatusType("success")
      } catch (error) {
        console.error("Failed to import memory:", error)
        setStatusMessage("Failed to import memory")
        setStatusType("error")
      }
    }

    input.click()
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
              Search (hex bytes)
            </Label>
            <div className="flex">
              <Input
                id="search-value"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="e.g. FF 00 A5"
                className={`w-40 font-mono ${darkMode ? "bg-gray-800 text-white border-gray-700" : ""}`}
              />
              <Button variant="outline" onClick={handleSearch} className="ml-2">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={handleWriteMemory}
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              <span>Write</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleExportMemory}
              disabled={!memoryData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleImportMemory}
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </Button>

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

      <div className="flex-grow overflow-auto p-4">{renderMemoryTable()}</div>

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
    </div>
  )
}
