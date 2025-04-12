"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Save, Play, Square, FileCode, Search, Settings, RefreshCw, Check, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface EnhancedCodeEditorProps {
  files: { name: string; path: string; content: string }[]
  onFilesChange: (files: { name: string; path: string; content: string }[]) => void
  onSaveFile: (path: string, content: string) => void
  onCompile: () => void
  onRun: () => void
  onStop: () => void
  errors: string[]
  boardType: string
  darkMode: boolean
  isRunning: boolean
  isCompiling: boolean
  activeFile: string | null
  onActiveFileChange: (path: string | null) => void
}

export default function EnhancedCodeEditor({
  files,
  onFilesChange,
  onSaveFile,
  onCompile,
  onRun,
  onStop,
  errors,
  boardType,
  darkMode,
  isRunning,
  isCompiling,
  activeFile,
  onActiveFileChange,
}: EnhancedCodeEditorProps) {
  const [editorContent, setEditorContent] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    formatOnPaste: true,
    formatOnType: false,
    autoIndent: true,
  })
  const [showFindDialog, setShowFindDialog] = useState(false)
  const [findText, setFindText] = useState("")
  const [replaceText, setReplaceText] = useState("")
  const [isCaseSensitive, setIsCaseSensitive] = useState(false)
  const [isWholeWord, setIsWholeWord] = useState(false)
  const [isRegex, setIsRegex] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [lineNumbers, setLineNumbers] = useState<string[]>([])
  const [currentLanguage, setCurrentLanguage] = useState("c")

  // Set editor content based on active file
  useEffect(() => {
    if (activeFile) {
      const file = files.find((f) => f.path === activeFile)
      if (file) {
        setEditorContent(file.content)

        // Set language based on file extension
        const extension = file.path.split(".").pop()?.toLowerCase() || ""
        if (extension === "c" || extension === "h") {
          setCurrentLanguage("c")
        } else if (extension === "cpp" || extension === "hpp") {
          setCurrentLanguage("cpp")
        } else if (extension === "s" || extension === "asm") {
          setCurrentLanguage("asm")
        } else {
          setCurrentLanguage("plaintext")
        }
      }
    }
  }, [activeFile, files])

  // Update line numbers when content changes
  useEffect(() => {
    const lines = editorContent.split("\n")
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => (i + 1).toString()))
  }, [editorContent])

  // Handle editor content change
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setEditorContent(value)

    // Update file content in files array
    if (activeFile) {
      const updatedFiles = files.map((file) => {
        if (file.path === activeFile) {
          return { ...file, content: value }
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
      const newValue = editorContent.substring(0, start) + "  " + editorContent.substring(end)
      setEditorContent(newValue)

      // Update file content
      if (activeFile) {
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
      handleSaveFile()
    }

    // Handle Ctrl+F for find
    if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setShowFindDialog(true)
    }
  }

  // Handle save file
  const handleSaveFile = () => {
    if (activeFile) {
      onSaveFile(activeFile, editorContent)
      setStatusMessage(`File saved: ${activeFile}`)
      setStatusType("success")

      // Clear status message after 3 seconds
      setTimeout(() => {
        setStatusMessage(null)
        setStatusType(null)
      }, 3000)
    }
  }

  // Handle find in file
  const handleFind = () => {
    if (!textareaRef.current || !findText) return

    const textarea = textareaRef.current
    const text = textarea.value
    const searchText = isCaseSensitive ? findText : findText.toLowerCase()
    const fullText = isCaseSensitive ? text : text.toLowerCase()

    const startPos = textarea.selectionEnd || 0
    let foundPos = fullText.indexOf(searchText, startPos)

    if (foundPos === -1) {
      // Wrap around to beginning
      foundPos = fullText.indexOf(searchText, 0)
    }

    if (foundPos !== -1) {
      textarea.focus()
      textarea.setSelectionRange(foundPos, foundPos + searchText.length)

      // Scroll to the found text
      const lines = text.substring(0, foundPos).split("\n")
      const lineNumber = lines.length

      // Scroll to make the selection visible
      const lineHeight = Number.parseInt(getComputedStyle(textarea).lineHeight) || 20
      textarea.scrollTop = (lineNumber - 1) * lineHeight
    } else {
      setStatusMessage(`No matches found for "${findText}"`)
      setStatusType("info")

      setTimeout(() => {
        setStatusMessage(null)
        setStatusType(null)
      }, 3000)
    }
  }

  // Handle replace in file
  const handleReplace = () => {
    if (!textareaRef.current || !findText) return

    const textarea = textareaRef.current
    const selStart = textarea.selectionStart
    const selEnd = textarea.selectionEnd

    // Check if current selection matches find text
    const selectedText = editorContent.substring(selStart, selEnd)
    const matchesFind = isCaseSensitive
      ? selectedText === findText
      : selectedText.toLowerCase() === findText.toLowerCase()

    if (matchesFind) {
      // Replace the selected text
      const newContent = editorContent.substring(0, selStart) + replaceText + editorContent.substring(selEnd)
      setEditorContent(newContent)

      // Update file content
      if (activeFile) {
        const updatedFiles = files.map((file) => {
          if (file.path === activeFile) {
            return { ...file, content: newContent }
          }
          return file
        })
        onFilesChange(updatedFiles)
      }

      // Set cursor position after the replaced text
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selStart + replaceText.length
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 0)

      // Find next occurrence
      handleFind()
    } else {
      // If current selection doesn't match, find first
      handleFind()
    }
  }

  // Apply editor settings
  const applyEditorSettings = () => {
    if (textareaRef.current) {
      textareaRef.current.style.fontSize = `${editorSettings.fontSize}px`
    }

    setShowSettings(false)
    setStatusMessage("Editor settings updated")
    setStatusType("success")

    // Clear status message after 3 seconds
    setTimeout(() => {
      setStatusMessage(null)
      setStatusType(null)
    }, 3000)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between p-2 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSaveFile} className="flex items-center gap-1">
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowFindDialog(true)} className="flex items-center gap-1">
            <Search className="h-4 w-4" />
            <span>Find</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onCompile} disabled={isCompiling} size="sm" className="flex items-center gap-1">
            <FileCode className="h-4 w-4" />
            <span>{isCompiling ? "Compiling..." : "Compile"}</span>
          </Button>

          <Button
            onClick={isRunning ? onStop : onRun}
            disabled={isCompiling}
            variant={isRunning ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-1"
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div
          className={`px-4 py-2 text-sm flex items-center gap-2 ${
            statusType === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : statusType === "error"
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          }`}
        >
          {statusType === "success" && <Check className="h-4 w-4" />}
          {statusType === "error" && <AlertCircle className="h-4 w-4" />}
          {statusType === "info" && <RefreshCw className="h-4 w-4" />}
          {statusMessage}
        </div>
      )}

      {/* Simple Code Editor */}
      <div className="flex-grow flex overflow-hidden">
        {/* Line numbers */}
        {editorSettings.lineNumbers && (
          <div
            className={`p-2 text-right select-none ${darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-500"}`}
            style={{ minWidth: "3rem" }}
          >
            {lineNumbers.map((num, i) => (
              <div key={i} style={{ fontSize: `${editorSettings.fontSize}px`, lineHeight: "1.5" }}>
                {num}
              </div>
            ))}
          </div>
        )}

        {/* Editor textarea */}
        <textarea
          ref={textareaRef}
          value={editorContent}
          onChange={handleEditorChange}
          onKeyDown={handleKeyDown}
          className={`flex-grow p-2 font-mono resize-none outline-none ${
            darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
          }`}
          style={{
            fontSize: `${editorSettings.fontSize}px`,
            lineHeight: "1.5",
            tabSize: editorSettings.tabSize,
            whiteSpace: editorSettings.wordWrap ? "pre-wrap" : "pre",
          }}
          spellCheck={false}
        />
      </div>

      {/* Error display */}
      {errors.length > 0 && (
        <div className={`border-t ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"} p-2`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Problems</h3>
          </div>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index} className={`p-1 text-sm ${darkMode ? "text-red-400" : "text-red-600"}`}>
                  {error}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editor Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="fontSize">Font Size</Label>
              <Input
                id="fontSize"
                type="number"
                value={editorSettings.fontSize}
                onChange={(e) =>
                  setEditorSettings({
                    ...editorSettings,
                    fontSize: Number.parseInt(e.target.value) || 14,
                  })
                }
                min={8}
                max={32}
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="tabSize">Tab Size</Label>
              <Input
                id="tabSize"
                type="number"
                value={editorSettings.tabSize}
                onChange={(e) =>
                  setEditorSettings({
                    ...editorSettings,
                    tabSize: Number.parseInt(e.target.value) || 2,
                  })
                }
                min={1}
                max={8}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="wordWrap">Word Wrap</Label>
              <Switch
                id="wordWrap"
                checked={editorSettings.wordWrap}
                onCheckedChange={(checked) =>
                  setEditorSettings({
                    ...editorSettings,
                    wordWrap: checked,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="lineNumbers">Line Numbers</Label>
              <Switch
                id="lineNumbers"
                checked={editorSettings.lineNumbers}
                onCheckedChange={(checked) =>
                  setEditorSettings({
                    ...editorSettings,
                    lineNumbers: checked,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={applyEditorSettings}>Apply Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Find Dialog */}
      <Dialog open={showFindDialog} onOpenChange={setShowFindDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find & Replace</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="findText" className="text-right">
                Find
              </Label>
              <Input
                id="findText"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="replaceText" className="text-right">
                Replace
              </Label>
              <Input
                id="replaceText"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <Switch id="caseSensitive" checked={isCaseSensitive} onCheckedChange={setIsCaseSensitive} />
                <Label htmlFor="caseSensitive">Match Case</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="wholeWord" checked={isWholeWord} onCheckedChange={setIsWholeWord} />
                <Label htmlFor="wholeWord">Whole Word</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFindDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleReplace} disabled={!findText}>
              Replace
            </Button>
            <Button onClick={handleFind} disabled={!findText}>
              Find
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
