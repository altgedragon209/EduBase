"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Trash, Download, Copy } from "lucide-react"

interface CodeTerminalProps {
  logs: string[]
  darkMode: boolean
  onClear?: () => void
}

export default function CodeTerminal({ logs, darkMode, onClear }: CodeTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  // Function to clear logs
  const handleClearLogs = () => {
    if (onClear) {
      onClear()
    }
  }

  // Function to save logs to a file
  const handleSaveLogs = () => {
    if (logs.length === 0) return

    const text = logs.join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `compilation_log_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Function to copy logs to clipboard
  const handleCopyLogs = () => {
    if (logs.length === 0) return

    const text = logs.join("\n")
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Show a temporary success message
        const message = document.createElement("div")
        message.textContent = "Copied to clipboard!"
        message.className = "absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-md text-sm"
        if (terminalRef.current) {
          terminalRef.current.appendChild(message)
          setTimeout(() => {
            if (terminalRef.current?.contains(message)) {
              terminalRef.current.removeChild(message)
            }
          }, 2000)
        }
      })
      .catch((err) => console.error("Failed to copy: ", err))
  }

  // Function to determine log type for styling
  const getLogClass = (log: string) => {
    if (log.toLowerCase().includes("error")) {
      return "text-red-500"
    }
    if (log.toLowerCase().includes("warning")) {
      return "text-yellow-500"
    }
    if (log.toLowerCase().includes("success") || log.toLowerCase().includes("compilation successful")) {
      return "text-green-500"
    }
    if (log.includes(">")) {
      return darkMode ? "text-blue-400" : "text-blue-600"
    }
    return ""
  }

  return (
    <div className="h-full flex flex-col relative">
      <div
        className={`p-2 flex justify-between items-center ${darkMode ? "bg-gray-800 text-white" : "bg-gray-800 text-white"}`}
      >
        <span>Compilation Output</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSaveLogs} disabled={logs.length === 0} title="Save to file">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearLogs} title="Clear logs">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={terminalRef}
        className={`flex-grow p-4 overflow-auto font-mono text-sm relative ${
          darkMode ? "bg-black text-white" : "bg-gray-900 text-green-400"
        }`}
      >
        {logs.length === 0 ? (
          <div className={darkMode ? "text-gray-500" : "text-gray-400"}>
            No compilation logs to display. Click "Compile" to build your code.
          </div>
        ) : (
          logs.map((log, index) => {
            return (
              <div key={index} className={`${getLogClass(log)} mb-1`}>
                {log}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
