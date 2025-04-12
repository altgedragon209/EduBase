"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface VSCodeEditorProps {
  initialCode: string
  onChange: (newCode: string) => void
  language?: string
  theme?: string
  files?: { name: string; path: string; content: string }[]
  onFilesChange?: (files: { name: string; path: string; content: string }[]) => void
  activeFile?: string | null
  onActiveFileChange?: (path: string | null) => void
  errors?: string[]
  boardType: string
  darkMode: boolean
  onCompile?: () => void
  onRun?: () => void
  onStop?: () => void
  isRunning?: boolean
  isCompiling?: boolean
}

export default function VSCodeEditor({
  initialCode,
  onChange,
  language = "cpp",
  theme = "vs-dark",
  files = [],
  onFilesChange,
  activeFile,
  onActiveFileChange,
  errors = [],
  boardType,
  darkMode,
  onCompile,
  onRun,
  onStop,
  isRunning = false,
  isCompiling = false,
}: VSCodeEditorProps) {
  const [code, setCode] = useState(initialCode)
  const [showErrors, setShowErrors] = useState(errors.length > 0)
  const [lineNumbers, setLineNumbers] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [fontSize, setFontSize] = useState(14)

  // Update code when initialCode or activeFile changes
  useEffect(() => {
    if (activeFile) {
      const file = files.find((f) => f.path === activeFile)
      if (file) {
        setCode(file.content)
      } else {
        setCode("")
      }
    } else {
      setCode(initialCode)
    }
  }, [initialCode, activeFile, files])

  // Update line numbers when content changes
  useEffect(() => {
    const lines = code.split("\n")
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => (i + 1).toString()))
  }, [code])

  // Update errors display
  useEffect(() => {
    setShowErrors(errors.length > 0)
  }, [errors])

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    onChange(newCode)

    // Update file content in files array
    if (activeFile && onFilesChange) {
      const updatedFiles = files.map((file) => {
        if (file.path === activeFile) {
          return { ...file, content: newCode }
        }
        return file
      })
      onFilesChange(updatedFiles)
    }
  }

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const start = textareaRef.current?.selectionStart || 0
      const end = textareaRef.current?.selectionEnd || 0

      // Insert tab at cursor position
      const newValue = code.substring(0, start) + "  " + code.substring(end)
      setCode(newValue)
      onChange(newValue)

      // Update file content
      if (activeFile && onFilesChange) {
        const updatedFiles = files.map((file) => {
          if (file.path === activeFile) {
            return { ...file, content: newValue }
          }
          return file
        })
        onFilesChange(updatedFiles)
      }

      // Set cursor position after the inserted tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2
          textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }

    // Handle Ctrl+S for save
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      // Save the current file
      if (activeFile && onFilesChange) {
        const updatedFiles = files.map((file) => {
          if (file.path === activeFile) {
            return { ...file, content: code }
          }
          return file
        })
        onFilesChange(updatedFiles)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow flex overflow-hidden">
        {/* Line numbers */}
        <div
          className={`p-2 text-right select-none ${darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-500"}`}
          style={{ minWidth: "3rem" }}
        >
          {lineNumbers.map((num, i) => (
            <div key={i} style={{ fontSize: `${fontSize}px`, lineHeight: "1.5" }}>
              {num}
            </div>
          ))}
        </div>

        {/* Editor textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          className={`flex-grow p-2 font-mono resize-none outline-none ${
            darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
          }`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: "1.5",
            tabSize: 2,
            whiteSpace: "pre-wrap",
          }}
          spellCheck={false}
        />
      </div>

      {showErrors && errors.length > 0 && (
        <div className={`border-t ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"} p-2`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Problems</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowErrors(false)} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className={`p-1 text-sm ${darkMode ? "text-red-400" : "text-red-600"}`}
                  onClick={() => {
                    // Try to extract line number and jump to it
                    const lineMatch = error.match(/line (\d+)/i)
                    if (lineMatch && textareaRef.current) {
                      const line = Number.parseInt(lineMatch[1], 10)

                      // Find position of the line in the text
                      const lines = code.split("\n")
                      let position = 0
                      for (let i = 0; i < line - 1 && i < lines.length; i++) {
                        position += lines[i].length + 1 // +1 for the newline character
                      }

                      // Set cursor to the beginning of the line
                      textareaRef.current.focus()
                      textareaRef.current.setSelectionRange(position, position)

                      // Scroll to the line
                      const lineHeight = Number.parseInt(getComputedStyle(textareaRef.current).lineHeight) || 20
                      textareaRef.current.scrollTop = (line - 1) * lineHeight
                    }
                  }}
                >
                  {error}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
