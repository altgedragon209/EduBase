"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, X, Copy, Maximize2, Minimize2, Settings, RefreshCw, TerminalIcon, Code, Bug, Save } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TerminalSession {
  id: string
  name: string
  type: "bash" | "powershell" | "cmd" | "stm32" | "build" | "debug"
  lines: TerminalLine[]
  cwd: string
  history: string[]
  historyIndex: number
  env: Record<string, string>
}

interface TerminalLine {
  id: string
  content: string
  isCommand?: boolean
  isError?: boolean
  isSystem?: boolean
  timestamp: Date
  ansiFormatted?: boolean
}

interface EnhancedTerminalProps {
  files: { name: string; path: string; content: string }[]
  onFilesChange: (files: { name: string; path: string; content: string }[]) => void
  onCompile: (code: string) => void
  onRun: () => void
  onStop: () => void
  onCreateFile: (path: string, content: string) => void
  onDeleteFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
  boardType: string
  darkMode: boolean
  isRunning: boolean
  isCompiling: boolean
}

export default function EnhancedTerminal({
  files,
  onFilesChange,
  onCompile,
  onRun,
  onStop,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  boardType,
  darkMode,
  isRunning,
  isCompiling,
}: EnhancedTerminalProps) {
  // Terminal state
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>("")
  const [input, setInput] = useState("")
  const [cursorPosition, setCursorPosition] = useState(0)
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [terminalFont, setTerminalFont] = useState("Menlo, Monaco, 'Courier New', monospace")
  const [fontSize, setFontSize] = useState(14)
  const [lineHeight, setLineHeight] = useState(1.5)
  const [terminalTheme, setTerminalTheme] = useState(darkMode ? "dark" : "light")
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [tabCompletion, setTabCompletion] = useState<string[]>([])
  const [showTabCompletion, setShowTabCompletion] = useState(false)
  const [tabCompletionIndex, setTabCompletionIndex] = useState(0)
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)

  // Refs
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Initialize terminal with default session
  useEffect(() => {
    const defaultSession: TerminalSession = {
      id: "terminal-1",
      name: "Terminal",
      type: "stm32",
      lines: [
        {
          id: "welcome-1",
          content: `STM32 Nucleo ${boardType} Terminal [Version 1.0.0]`,
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: "welcome-2",
          content: "Copyright (c) 2025 STMicroelectronics. All rights reserved.",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: "welcome-3",
          content: "",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: "welcome-4",
          content: "Type 'help' to see available commands.",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: "welcome-5",
          content: "",
          isSystem: true,
          timestamp: new Date(),
        },
      ],
      cwd: "/",
      history: [],
      historyIndex: -1,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: "/home/user",
        TERM: "xterm-256color",
        BOARD: boardType,
        USER: "developer",
      },
    }

    const buildSession: TerminalSession = {
      id: "build-terminal",
      name: "Build",
      type: "build",
      lines: [
        {
          id: "build-welcome-1",
          content: "Build Terminal - Displays compilation output",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: "build-welcome-2",
          content: "",
          isSystem: true,
          timestamp: new Date(),
        },
      ],
      cwd: "/",
      history: [],
      historyIndex: -1,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: "/home/user",
        TERM: "xterm-256color",
        BOARD: boardType,
        USER: "developer",
      },
    }

    const debugSession: TerminalSession = {
      id: "debug-terminal",
      name: "Debug",
      type: "debug",
      lines: [
        {
          id: "debug-welcome-1",
          content: "Debug Terminal - Displays debugging output",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: "debug-welcome-2",
          content: "",
          isSystem: true,
          timestamp: new Date(),
        },
      ],
      cwd: "/",
      history: [],
      historyIndex: -1,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: "/home/user",
        TERM: "xterm-256color",
        BOARD: boardType,
        USER: "developer",
      },
    }

    setSessions([defaultSession, buildSession, debugSession])
    setActiveSessionId(defaultSession.id)
  }, [boardType])

  // Update theme when dark mode changes
  useEffect(() => {
    setTerminalTheme(darkMode ? "dark" : "light")
  }, [darkMode])

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [sessions, activeSessionId])

  // Focus input when terminal is clicked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        terminalRef.current &&
        terminalRef.current.contains(e.target as Node) &&
        inputRef.current &&
        e.target !== inputRef.current
      ) {
        inputRef.current.focus()
      }
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  // Get active session
  const activeSession = sessions.find((session) => session.id === activeSessionId) || sessions[0]

  // Terminal command handlers
  const executeCommand = (command: string) => {
    if (!activeSession) return

    // Add command to history
    const updatedSession = {
      ...activeSession,
      lines: [
        ...activeSession.lines,
        {
          id: `cmd-${Date.now()}`,
          content: `${getPrompt()} ${command}`,
          isCommand: true,
          timestamp: new Date(),
        },
      ],
      history: [command, ...activeSession.history].slice(0, 50), // Limit history to 50 items
      historyIndex: -1,
    }

    setSessions(sessions.map((s) => (s.id === activeSessionId ? updatedSession : s)))
    setIsProcessingCommand(true)

    // Process command
    setTimeout(() => {
      processCommand(command)
      setIsProcessingCommand(false)
    }, 10)

    // Clear input and reset cursor
    setInput("")
    setCursorPosition(0)
    setSelection(null)
    setShowTabCompletion(false)
  }

  const processCommand = (command: string) => {
    if (!command.trim()) {
      addNewLine("", false)
      return
    }

    const [cmd, ...args] = command.trim().split(/\s+/)

    switch (cmd.toLowerCase()) {
      case "help":
        showHelp(args[0])
        break
      case "clear":
      case "cls":
        clearTerminal()
        break
      case "ls":
      case "dir":
        listFiles(args[0] || activeSession.cwd)
        break
      case "cd":
        changeDirectory(args[0] || "/")
        break
      case "pwd":
        printWorkingDirectory()
        break
      case "mkdir":
        if (args[0]) makeDirectory(args[0])
        else addNewLine("mkdir: missing operand", true)
        break
      case "touch":
      case "new-item":
        if (args[0]) createFile(args[0], "")
        else addNewLine("touch: missing operand", true)
        break
      case "rm":
      case "del":
      case "remove-item":
        if (args[0]) removeFile(args)
        else addNewLine("rm: missing operand", true)
        break
      case "cat":
      case "type":
      case "get-content":
        if (args[0]) viewFile(args[0])
        else addNewLine("cat: missing operand", true)
        break
      case "edit":
      case "code":
        if (args[0]) editFile(args[0])
        else addNewLine("edit: missing operand", true)
        break
      case "mv":
      case "move":
      case "move-item":
        if (args.length >= 2) moveFile(args[0], args[1])
        else addNewLine("mv: missing destination file operand", true)
        break
      case "cp":
      case "copy":
      case "copy-item":
        if (args.length >= 2) copyFile(args[0], args[1])
        else addNewLine("cp: missing destination file operand", true)
        break
      case "echo":
      case "write-output":
        echoText(args.join(" "))
        break
      case "grep":
      case "select-string":
        if (args.length >= 2) grepSearch(args[0], args.slice(1).join(" "))
        else addNewLine("grep: missing pattern or file operand", true)
        break
      case "find":
        if (args[0]) findFiles(args[0])
        else addNewLine("find: missing pattern", true)
        break
      case "make":
      case "build":
        buildProject()
        break
      case "run":
        runProject()
        break
      case "debug":
        debugProject()
        break
      case "break":
        if (args.length >= 2) setBreakpoint(args[0], Number.parseInt(args[1]))
        else addNewLine("break: usage: break <file> <line>", true)
        break
      case "step":
        stepDebugger()
        break
      case "continue":
        continueDebugger()
        break
      case "env":
      case "get-childitem env:":
        showEnvironmentVariables()
        break
      case "export":
      case "set":
      case "set-item env:":
        if (args.length >= 1 && args[0].includes("=")) {
          const [key, value] = args[0].split("=")
          setEnvironmentVariable(key, value)
        } else {
          addNewLine("export: usage: export KEY=VALUE", true)
        }
        break
      case "history":
        showCommandHistory()
        break
      case "exit":
        closeTerminal()
        break
      default:
        addNewLine(`Command not found: ${cmd}. Type 'help' for available commands.`, true)
    }
  }

  // Command implementations
  const showHelp = (command?: string) => {
    if (!command) {
      addNewLine(
        `
Available commands:
 File Operations:
   ls, dir [path]           - List directory contents
   cd [path]                - Change directory
   pwd                      - Print working directory
   mkdir <dir>              - Create directory
   touch, new-item <file>   - Create empty file
   rm, del [-r] <path>      - Remove file or directory
   mv, move <src> <dest>    - Move/rename file or directory
   cp, copy <src> <dest>    - Copy file
   
 File Content:
   cat, type <file>         - Display file contents
   edit, code <file>        - Edit file contents
   echo <text>              - Display text
   grep <pattern> <file>    - Search for pattern in file
   find <pattern>           - Find files matching pattern
   
 Build & Debug:
   build, make              - Compile project
   run                      - Run compiled code
   debug                    - Start debugger
   break <file> <line>      - Set breakpoint
   step                     - Step through code
   continue                 - Continue execution
   
 Environment:
   env                      - Show environment variables
   export KEY=VALUE         - Set environment variable
   history                  - Show command history
   
 Terminal:
   clear, cls               - Clear terminal
   help [command]           - Show help
   exit                     - Close terminal session
`,
        false,
      )
    } else {
      // Show help for specific command
      const helpTexts: Record<string, string> = {
        ls: "ls, dir [path] - List directory contents\n\nLists files and directories in the specified path or current directory.",
        cd: "cd [path] - Change directory\n\nChanges the current working directory to the specified path.",
        pwd: "pwd - Print working directory\n\nDisplays the current working directory path.",
        mkdir: "mkdir <dir> - Create directory\n\nCreates a new directory at the specified path.",
        touch: "touch, new-item <file> - Create empty file\n\nCreates a new empty file at the specified path.",
        rm: "rm, del [-r] <path> - Remove file or directory\n\nRemoves the specified file or directory. Use -r flag to remove directories recursively.",
        mv: "mv, move <src> <dest> - Move/rename file or directory\n\nMoves or renames a file or directory from source to destination.",
        cp: "cp, copy <src> <dest> - Copy file\n\nCopies a file from source to destination.",
        cat: "cat, type <file> - Display file contents\n\nDisplays the contents of the specified file.",
        edit: "edit, code <file> - Edit file contents\n\nOpens the specified file for editing in the editor.",
        echo: "echo <text> - Display text\n\nDisplays the specified text in the terminal.",
        grep: "grep, select-string <pattern> <file> - Search for pattern in file\n\nSearches for the specified pattern in the file and displays matching lines.",
        find: "find <pattern> - Find files matching pattern\n\nFinds files with names matching the specified pattern.",
        build: "build, make - Compile project\n\nCompiles the project using the main.c file.",
        run: "run - Run compiled code\n\nRuns the compiled code on the simulated board.",
        debug: "debug - Start debugger\n\nStarts the debugger for the compiled code.",
        break: "break <file> <line> - Set breakpoint\n\nSets a breakpoint at the specified line in the file.",
        step: "step - Step through code\n\nSteps through the code one line at a time in debug mode.",
        continue: "continue - Continue execution\n\nContinues execution until the next breakpoint in debug mode.",
        env: "env - Show environment variables\n\nDisplays all environment variables and their values.",
        export: "export KEY=VALUE - Set environment variable\n\nSets the value of an environment variable.",
        history: "history - Show command history\n\nDisplays the command history for the current session.",
        clear: "clear, cls - Clear terminal\n\nClears the terminal screen.",
        exit: "exit - Close terminal session\n\nCloses the current terminal session.",
      }

      if (helpTexts[command]) {
        addNewLine(`\n${helpTexts[command]}`, false)
      } else {
        addNewLine(`\nNo help available for '${command}'`, true)
      }
    }
  }

  const clearTerminal = () => {
    if (!activeSession) return

    const updatedSession = {
      ...activeSession,
      lines: [],
    }

    setSessions(sessions.map((s) => (s.id === activeSessionId ? updatedSession : s)))
  }

  const listFiles = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${activeSession.cwd}/${path}`)

    // Get all files and directories in the target path
    const items = new Set<string>()

    files.forEach((file) => {
      const filePath = file.path

      // If the file is directly in the target directory
      if (filePath.startsWith(targetPath) && filePath !== targetPath) {
        const remainingPath = filePath.substring(targetPath.length + (targetPath.endsWith("/") ? 0 : 1))
        const firstSegment = remainingPath.split("/")[0]

        if (firstSegment) {
          items.add(firstSegment + (remainingPath.includes("/") ? "/" : ""))
        }
      }
    })

    if (items.size === 0) {
      addNewLine(`No files found in ${targetPath}`, false)
    } else {
      const sortedItems = Array.from(items).sort((a, b) => {
        // Directories first, then files
        const aIsDir = a.endsWith("/")
        const bIsDir = b.endsWith("/")
        if (aIsDir && !bIsDir) return -1
        if (!aIsDir && bIsDir) return 1
        return a.localeCompare(b)
      })

      // Format output to look like VS Code terminal
      const formattedOutput = formatDirectoryListing(sortedItems, targetPath)
      addNewLine(formattedOutput, false)
    }
  }

  const formatDirectoryListing = (items: string[], path: string) => {
    // Group items by type (directory or file)
    const directories = items.filter((item) => item.endsWith("/"))
    const files = items.filter((item) => !item.endsWith("/"))

    // Format with colors (using ANSI escape codes)
    let output = `\nDirectory: ${path}\n\n`

    if (directories.length > 0) {
      output += directories.map((dir) => `\x1b[34m${dir.substring(0, dir.length - 1)}\x1b[0m/`).join("  ") + "\n"
    }

    if (files.length > 0) {
      output += files
        .map((file) => {
          // Color based on file extension
          if (file.endsWith(".c") || file.endsWith(".h")) {
            return `\x1b[32m${file}\x1b[0m`
          } else if (file.endsWith(".o") || file.endsWith(".elf") || file.endsWith(".bin")) {
            return `\x1b[33m${file}\x1b[0m`
          } else {
            return file
          }
        })
        .join("  ")
    }

    return output
  }

  const changeDirectory = (path: string) => {
    if (!activeSession) return

    const targetPath = normalizePath(path.startsWith("/") ? path : `${activeSession.cwd}/${path}`)

    // Check if the directory exists
    const dirExists =
      files.some((file) => {
        const filePath = file.path
        return filePath.startsWith(targetPath) && filePath !== targetPath
      }) || targetPath === "/"

    if (dirExists) {
      const updatedSession = {
        ...activeSession,
        cwd: targetPath,
      }

      setSessions(sessions.map((s) => (s.id === activeSessionId ? updatedSession : s)))
    } else {
      addNewLine(`cd: ${path}: No such directory`, true)
    }
  }

  const printWorkingDirectory = () => {
    addNewLine(activeSession.cwd, false)
  }

  const makeDirectory = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${activeSession.cwd}/${path}`)

    // Check if the directory already exists
    const dirExists = files.some((file) => {
      const filePath = file.path
      return filePath.startsWith(targetPath) && filePath !== targetPath
    })

    if (dirExists) {
      addNewLine(`mkdir: ${path}: Directory already exists`, true)
      return
    }

    // Create a placeholder file to represent the directory
    const placeholderFile = {
      name: ".directory",
      path: `${targetPath}/.directory`,
      content: "",
    }

    onCreateFile(placeholderFile.path, placeholderFile.content)
    addNewLine(`Directory created: ${targetPath}`, false)
  }

  const createFile = (path: string, content: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${activeSession.cwd}/${path}`)

    // Check if the file already exists
    const fileExists = files.some((file) => file.path === targetPath)

    if (fileExists) {
      addNewLine(`touch: ${path}: File already exists`, true)
      return
    }

    const fileName = targetPath.split("/").pop() || ""

    onCreateFile(targetPath, content)
    addNewLine(`File created: ${targetPath}`, false)
  }

  const removeFile = (args: string[]) => {
    let recursive = false
    let pathArg = ""

    // Parse arguments
    if (args[0] === "-r" || args[0] === "-rf") {
      recursive = true
      pathArg = args[1] || ""
    } else {
      pathArg = args[0]
    }

    if (!pathArg) {
      addNewLine("rm: missing operand", true)
      return
    }

    const targetPath = normalizePath(pathArg.startsWith("/") ? pathArg : `${activeSession.cwd}/${pathArg}`)

    // Check if the path exists
    const targetFile = files.find((file) => file.path === targetPath)
    const isDirectory = !targetFile && files.some((file) => file.path.startsWith(targetPath + "/"))

    if (!targetFile && !isDirectory) {
      addNewLine(`rm: ${pathArg}: No such file or directory`, true)
      return
    }

    if (isDirectory && !recursive) {
      addNewLine(`rm: ${pathArg}: Is a directory, use -r to remove directories`, true)
      return
    }

    if (isDirectory) {
      // Remove all files in the directory
      const filesToRemove = files.filter((file) => file.path.startsWith(targetPath + "/"))
      filesToRemove.forEach((file) => onDeleteFile(file.path))
      addNewLine(`Removed directory: ${targetPath}`, false)
    } else if (targetFile) {
      onDeleteFile(targetPath)
      addNewLine(`Removed file: ${targetPath}`, false)
    }
  }

  const viewFile = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${activeSession.cwd}/${path}`)

    // Find the file
    const targetFile = files.find((file) => file.path === targetPath)

    if (!targetFile) {
      addNewLine(`cat: ${path}: No such file`, true)
      return
    }

    // Format output with syntax highlighting based on file extension
    const extension = targetFile.path.split(".").pop()?.toLowerCase() || ""
    let formattedContent = targetFile.content

    // Add basic syntax highlighting for C/C++ files
    if (["c", "h", "cpp", "hpp"].includes(extension)) {
      formattedContent = highlightSyntax(targetFile.content, extension)
    }

    addNewLine(`\n${formattedContent}`, false, true)
  }

  const highlightSyntax = (content: string, extension: string) => {
    // This is a simplified syntax highlighter for demonstration
    // In a real implementation, you'd use a proper syntax highlighting library

    // Keywords for C/C++
    const keywords = [
      "auto",
      "break",
      "case",
      "char",
      "const",
      "continue",
      "default",
      "do",
      "double",
      "else",
      "enum",
      "extern",
      "float",
      "for",
      "goto",
      "if",
      "int",
      "long",
      "register",
      "return",
      "short",
      "signed",
      "sizeof",
      "static",
      "struct",
      "switch",
      "typedef",
      "union",
      "unsigned",
      "void",
      "volatile",
      "while",
      "include",
      "define",
      "ifdef",
      "ifndef",
      "endif",
      "pragma",
    ]

    // Replace keywords with colored versions
    let highlighted = content

    // Highlight preprocessor directives
    highlighted = highlighted.replace(/(#\w+)/g, "\x1b[35m$1\x1b[0m")

    // Highlight keywords
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g")
      highlighted = highlighted.replace(regex, `\x1b[34m${keyword}\x1b[0m`)
    })

    // Highlight strings
    highlighted = highlighted.replace(/"([^"\\]|\\.)*"/g, "\x1b[32m$&\x1b[0m")

    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, "\x1b[33m$1\x1b[0m")

    // Highlight comments
    highlighted = highlighted.replace(/\/\/.*$/gm, "\x1b[90m$&\x1b[0m")

    return highlighted
  }

  const editFile = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${activeSession.cwd}/${path}`)

    // Find the file or create it if it doesn't exist
    let targetFile = files.find((file) => file.path === targetPath)

    if (!targetFile) {
      // Check if parent directory exists
      const parentDir = targetPath.substring(0, targetPath.lastIndexOf("/"))
      const parentExists =
        parentDir === "" ||
        files.some((file) => {
          const filePath = file.path
          return filePath.startsWith(parentDir) && filePath !== parentDir
        })

      if (!parentExists) {
        addNewLine(`edit: ${path}: No such directory`, true)
        return
      }

      // Create the file
      const fileName = targetPath.split("/").pop() || ""
      targetFile = { name: fileName, path: targetPath, content: "" }
      onCreateFile(targetPath, "")
    }

    // Notify user that file will be opened in editor
    addNewLine(`Opening ${targetPath} in editor...`, false)

    // In a real implementation, this would open the file in the code editor
    // For now, we'll just simulate it
    setTimeout(() => {
      addNewLine(`File ${targetPath} is now being edited in the code editor.`, false)
    }, 500)
  }

  const moveFile = (source: string, destination: string) => {
    const sourcePath = normalizePath(source.startsWith("/") ? source : `${activeSession.cwd}/${source}`)
    const destPath = normalizePath(destination.startsWith("/") ? destination : `${activeSession.cwd}/${destination}`)

    // Find the source file
    const sourceFile = files.find((file) => file.path === sourcePath)

    if (!sourceFile) {
      addNewLine(`mv: ${source}: No such file or directory`, true)
      return
    }

    // Check if destination is a directory
    const isDestDir = files.some((file) => file.path.startsWith(destPath + "/"))

    let finalDestPath = destPath
    if (isDestDir) {
      finalDestPath = `${destPath}/${sourceFile.name}`
    }

    // Check if destination file already exists
    const destExists = files.some((file) => file.path === finalDestPath)

    if (destExists) {
      // Overwrite the destination file
      const updatedFiles = files.map((file) => {
        if (file.path === finalDestPath) {
          return { ...file, content: sourceFile.content }
        }
        return file
      })
      onFilesChange(updatedFiles)
      onDeleteFile(sourcePath)
    } else {
      // Create the destination file
      onCreateFile(finalDestPath, sourceFile.content)
      onDeleteFile(sourcePath)
    }

    addNewLine(`Moved ${sourcePath} to ${finalDestPath}`, false)
  }

  const copyFile = (source: string, destination: string) => {
    const sourcePath = normalizePath(source.startsWith("/") ? source : `${activeSession.cwd}/${source}`)
    const destPath = normalizePath(destination.startsWith("/") ? destination : `${activeSession.cwd}/${destination}`)

    // Find the source file
    const sourceFile = files.find((file) => file.path === sourcePath)

    if (!sourceFile) {
      addNewLine(`cp: ${source}: No such file or directory`, true)
      return
    }

    // Check if destination is a directory
    const isDestDir = files.some((file) => file.path.startsWith(destPath + "/"))

    let finalDestPath = destPath
    if (isDestDir) {
      finalDestPath = `${destPath}/${sourceFile.name}`
    }

    // Create or overwrite the destination file
    onCreateFile(finalDestPath, sourceFile.content)

    addNewLine(`Copied ${sourcePath} to ${finalDestPath}`, false)
  }

  const echoText = (text: string) => {
    // Handle quoted text
    let processedText = text
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      processedText = text.substring(1, text.length - 1)
    }

    addNewLine(processedText, false)
  }

  const grepSearch = (pattern: string, filePath: string) => {
    const targetPath = normalizePath(filePath.startsWith("/") ? filePath : `${activeSession.cwd}/${filePath}`)

    // Find the file
    const targetFile = files.find((file) => file.path === targetPath)

    if (!targetFile) {
      addNewLine(`grep: ${filePath}: No such file`, true)
      return
    }

    // Search for the pattern
    const lines = targetFile.content.split("\n")
    const matches = lines.filter((line) => line.includes(pattern))

    if (matches.length === 0) {
      addNewLine(`No matches found for '${pattern}' in ${targetPath}`, false)
    } else {
      // Format output with line numbers and highlighted matches
      const formattedMatches = matches.map((line) => {
        const lineNumber = lines.indexOf(line) + 1
        const highlightedLine = line.replace(new RegExp(pattern, "g"), `\x1b[31m${pattern}\x1b[0m`)
        return `${lineNumber}:${highlightedLine}`
      })

      addNewLine(`\n${formattedMatches.join("\n")}`, false, true)
    }
  }

  const findFiles = (pattern: string) => {
    // Find files matching the pattern
    const matches = files.filter((file) => {
      const fileName = file.path.split("/").pop() || ""
      return fileName.includes(pattern)
    })

    if (matches.length === 0) {
      addNewLine(`No files found matching '${pattern}'`, false)
    } else {
      // Format output to look like VS Code's find results
      const formattedOutput = matches
        .map((file) => {
          return `\x1b[32m${file.path}\x1b[0m`
        })
        .join("\n")

      addNewLine(`\nFound ${matches.length} files:\n${formattedOutput}`, false, true)
    }
  }

  const buildProject = () => {
    // Switch to build terminal
    const buildSessionId = sessions.find((s) => s.type === "build")?.id
    if (buildSessionId) {
      setActiveSessionId(buildSessionId)
    }

    // Find main.c
    const mainFile = files.find((file) => file.path.endsWith("main.c"))

    if (!mainFile) {
      addNewLine("Error: main.c not found", true, false, "build")
      return
    }

    // Simulate compilation with VS Code-like output
    addNewLine("\n> Executing task: Build STM32 Project <\n", false, false, "build")

    setTimeout(() => {
      addNewLine(
        "arm-none-eabi-gcc -c -mcpu=cortex-m4 -mthumb -std=gnu11 -DSTM32F446xx -I./Inc -O0 -g3 -Wall -ffunction-sections -fdata-sections src/main.c -o build/main.o",
        false,
        false,
        "build",
      )

      // Check for basic errors
      let hasErrors = false
      if (!mainFile.content.includes("int main")) {
        addNewLine("src/main.c:1:1: \x1b[31merror:\x1b[0m no main function found", true, false, "build")
        hasErrors = true
      }

      if (mainFile.content.includes("while (1)") && !mainFile.content.includes("HAL_Delay")) {
        addNewLine(
          "src/main.c:15:3: \x1b[33mwarning:\x1b[0m infinite loop without delay detected",
          false,
          false,
          "build",
        )
      }

      // Simulate successful compilation
      if (!hasErrors) {
        addNewLine(
          "arm-none-eabi-gcc build/main.o -mcpu=cortex-m4 -mthumb -DSTM32F446xx -T./STM32F446RETx_FLASH.ld -Wl,-Map=build/firmware.map -Wl,--gc-sections -static -Wl,--start-group -lc -lm -Wl,--end-group -o build/firmware.elf",
          false,
          false,
          "build",
        )
        addNewLine("arm-none-eabi-objcopy -O binary build/firmware.elf build/firmware.bin", false, false, "build")
        addNewLine("arm-none-eabi-size build/firmware.elf", false, false, "build")
        addNewLine(
          `\n  text    data     bss     dec     hex filename\n 12288     256    1024   13568    3500 build/firmware.elf\n`,
          false,
          false,
          "build",
        )
        addNewLine("\x1b[32mBuild completed successfully for STM32 " + boardType + "\x1b[0m", false, false, "build")

        // Trigger actual compilation
        onCompile(mainFile.content)
      } else {
        addNewLine("\x1b[31mBuild failed with errors\x1b[0m", true, false, "build")
      }

      addNewLine("\n> Task Build STM32 Project execution finished <", false, false, "build")
    }, 1000)
  }

  const runProject = () => {
    if (isRunning) {
      onStop()
      addNewLine("Program execution stopped", false)
    } else {
      onRun()
      addNewLine("\x1b[32m> Running program on STM32 " + boardType + "...\x1b[0m", false)
    }
  }

  const debugProject = () => {
    // Switch to debug terminal
    const debugSessionId = sessions.find((s) => s.type === "debug")?.id
    if (debugSessionId) {
      setActiveSessionId(debugSessionId)
    }

    // Find main.c
    const mainFile = files.find((file) => file.path.endsWith("main.c"))

    if (!mainFile) {
      addNewLine("Error: main.c not found", true, false, "debug")
      return
    }

    // Simulate debugger startup with VS Code-like output
    addNewLine("\n> Starting debug session...\n", false, false, "debug")

    setTimeout(() => {
      addNewLine("Launching GDB...", false, false, "debug")
      addNewLine("Reading symbols from build/firmware.elf...", false, false, "debug")
      addNewLine("Connected to target.", false, false, "debug")
      addNewLine("0x08000000 in Reset_Handler ()", false, false, "debug")
      addNewLine("Temporary breakpoint 1 at 0x8000130: file src/main.c, line 42.", false, false, "debug")
      addNewLine("Starting program: build/firmware.elf", false, false, "debug")
      addNewLine("\nTemporary breakpoint 1, main () at src/main.c:42", false, false, "debug")
      addNewLine("42\t  HAL_Init();", false, false, "debug")
      addNewLine("\n(gdb) ", false, false, "debug")
    }, 1000)
  }

  const setBreakpoint = (file: string, line: number) => {
    // Simulate setting a breakpoint
    addNewLine(`Breakpoint set at ${file}:${line}`, false, false, "debug")
    addNewLine(`Breakpoint 2 at 0x8000150: file ${file}, line ${line}.`, false, false, "debug")
    addNewLine("\n(gdb) ", false, false, "debug")
  }

  const stepDebugger = () => {
    // Simulate stepping through code
    addNewLine("step", false, false, "debug")
    addNewLine("43\t  SystemClock_Config();", false, false, "debug")
    addNewLine("\n(gdb) ", false, false, "debug")
  }

  const continueDebugger = () => {
    // Simulate continuing execution
    addNewLine("continue", false, false, "debug")
    addNewLine("Continuing.", false, false, "debug")
    addNewLine("\n(gdb) ", false, false, "debug")
  }

  const showEnvironmentVariables = () => {
    if (!activeSession) return

    const envVars = Object.entries(activeSession.env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")

    addNewLine(`\n${envVars}`, false)
  }

  const setEnvironmentVariable = (key: string, value: string) => {
    if (!activeSession) return

    const updatedSession = {
      ...activeSession,
      env: {
        ...activeSession.env,
        [key]: value,
      },
    }

    setSessions(sessions.map((s) => (s.id === activeSessionId ? updatedSession : s)))
    addNewLine(`${key}=${value}`, false)
  }

  const showCommandHistory = () => {
    if (!activeSession) return

    const history = activeSession.history.map((cmd, index) => `${index + 1}  ${cmd}`).join("\n")
    addNewLine(`\n${history}`, false)
  }

  const closeTerminal = () => {
    // In a real implementation, this would close the terminal session
    addNewLine("Terminal session closed", false)
  }

  // Helper functions
  const normalizePath = (path: string) => {
    const parts = path.split("/").filter(Boolean)
    const normalizedParts: string[] = []

    for (const part of parts) {
      if (part === ".") {
        continue
      } else if (part === "..") {
        normalizedParts.pop()
      } else {
        normalizedParts.push(part)
      }
    }

    return "/" + normalizedParts.join("/")
  }

  const getPrompt = () => {
    const username = activeSession?.env?.USER || "developer"
    const hostname = "stm32-nucleo"
    const path = activeSession?.cwd || "/"
    const shortPath = path === "/" ? "/" : path.split("/").pop() || path

    // Format prompt to look like VS Code's terminal
    return `\x1b[32m${username}@${hostname}\x1b[0m:\x1b[34m${shortPath}\x1b[0m$`
  }

  const addNewLine = (
    content: string,
    isError = false,
    ansiFormatted = false,
    sessionType: "stm32" | "build" | "debug" = activeSession?.type || "stm32",
  ) => {
    const targetSessionId = sessions.find((s) => s.type === sessionType)?.id || activeSessionId
    if (!targetSessionId) return

    const newLine: TerminalLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      isError,
      timestamp: new Date(),
      ansiFormatted,
    }

    setSessions(
      sessions.map((s) =>
        s.id === targetSessionId
          ? {
              ...s,
              lines: [...s.lines, newLine],
            }
          : s,
      ),
    )
  }

  // Input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    setCursorPosition(e.target.selectionStart)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle special keys
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isProcessingCommand) {
        executeCommand(input)
      }
    } else if (e.key === "ArrowUp" && !showTabCompletion) {
      e.preventDefault()
      navigateHistory("up")
    } else if (e.key === "ArrowDown" && !showTabCompletion) {
      e.preventDefault()
      navigateHistory("down")
    } else if (e.key === "Tab") {
      e.preventDefault()
      handleTabCompletion()
    } else if (e.key === "c" && e.ctrlKey) {
      if (isRunning) {
        e.preventDefault()
        onStop()
        addNewLine("^C", false)
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault()
      clearTerminal()
    } else if (e.key === "ArrowUp" && showTabCompletion) {
      e.preventDefault()
      navigateTabCompletion("up")
    } else if (e.key === "ArrowDown" && showTabCompletion) {
      e.preventDefault()
      navigateTabCompletion("down")
    } else if (e.key === "Escape") {
      if (showTabCompletion) {
        e.preventDefault()
        setShowTabCompletion(false)
      }
    }

    // Update cursor position
    setTimeout(() => {
      if (inputRef.current) {
        setCursorPosition(inputRef.current.selectionStart)
      }
    }, 0)
  }

  const handleInputSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setSelection({
      start: target.selectionStart,
      end: target.selectionEnd,
    })
  }

  const handleInputClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Allow default paste behavior
    setTimeout(() => {
      if (inputRef.current) {
        setCursorPosition(inputRef.current.selectionStart)
      }
    }, 0)
  }

  const navigateHistory = (direction: "up" | "down") => {
    if (!activeSession || activeSession.history.length === 0) return

    const { history, historyIndex } = activeSession

    let newIndex: number
    if (direction === "up") {
      newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex
    } else {
      newIndex = historyIndex > 0 ? historyIndex - 1 : -1
    }

    const updatedSession = {
      ...activeSession,
      historyIndex: newIndex,
    }

    setSessions(sessions.map((s) => (s.id === activeSessionId ? updatedSession : s)))

    if (newIndex >= 0 && newIndex < history.length) {
      setInput(history[newIndex])
      // Move cursor to end of input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = input.length
          inputRef.current.selectionEnd = input.length
          setCursorPosition(input.length)
        }
      }, 0)
    } else if (newIndex === -1) {
      setInput("")
    }
  }

  const handleTabCompletion = () => {
    if (!activeSession || !input) return

    // Get the last word of the input for completion
    const words = input.split(" ")
    const lastWord = words[words.length - 1]
    const isFirstWord = words.length === 1

    // Complete commands if it's the first word
    if (isFirstWord) {
      const commands = [
        "ls",
        "dir",
        "cd",
        "pwd",
        "mkdir",
        "touch",
        "new-item",
        "rm",
        "del",
        "remove-item",
        "mv",
        "move",
        "move-item",
        "cp",
        "copy",
        "copy-item",
        "cat",
        "type",
        "get-content",
        "edit",
        "code",
        "echo",
        "write-output",
        "grep",
        "select-string",
        "find",
        "make",
        "build",
        "run",
        "debug",
        "break",
        "step",
        "continue",
        "env",
        "get-childitem",
        "export",
        "set",
        "set-item",
        "history",
        "clear",
        "cls",
        "help",
        "exit",
      ]

      const matches = commands.filter((cmd) => cmd.startsWith(lastWord))

      if (matches.length === 1) {
        // Single match - complete immediately
        setInput(matches[0] + " ")
        setCursorPosition((matches[0] + " ").length)
      } else if (matches.length > 1) {
        // Multiple matches - show completion menu
        setTabCompletion(matches)
        setShowTabCompletion(true)
        setTabCompletionIndex(0)
      }
    } else {
      // Complete file/directory paths
      const basePath = lastWord.includes("/") ? lastWord.substring(0, lastWord.lastIndexOf("/") + 1) : ""

      const searchTerm = lastWord.includes("/") ? lastWord.substring(lastWord.lastIndexOf("/") + 1) : lastWord

      const fullPath = normalizePath(basePath.startsWith("/") ? basePath : `${activeSession.cwd}/${basePath}`)

      // Find matching files and directories
      const matches = files
        .filter((file) => {
          const dirName = file.path.substring(0, file.path.lastIndexOf("/") + 1)
          const fileName = file.path.substring(file.path.lastIndexOf("/") + 1)
          return dirName === fullPath && fileName.startsWith(searchTerm)
        })
        .map((file) => file.path.substring(file.path.lastIndexOf("/") + 1))

      // Add directories with trailing slash
      const uniqueMatches = Array.from(new Set(matches))

      if (uniqueMatches.length === 1) {
        // Single match - complete immediately
        const completion = uniqueMatches[0]
        const newInput =
          input.substring(0, input.length - lastWord.length) + (basePath ? basePath + completion : completion)

        setInput(newInput)
        setCursorPosition(newInput.length)
      } else if (uniqueMatches.length > 1) {
        // Multiple matches - show completion menu
        setTabCompletion(uniqueMatches)
        setShowTabCompletion(true)
        setTabCompletionIndex(0)
      }
    }
  }

  const navigateTabCompletion = (direction: "up" | "down") => {
    if (!showTabCompletion || tabCompletion.length === 0) return

    let newIndex: number
    if (direction === "up") {
      newIndex = tabCompletionIndex > 0 ? tabCompletionIndex - 1 : tabCompletion.length - 1
    } else {
      newIndex = tabCompletionIndex < tabCompletion.length - 1 ? tabCompletionIndex + 1 : 0
    }

    setTabCompletionIndex(newIndex)
  }

  const selectTabCompletion = (index: number) => {
    if (!showTabCompletion || tabCompletion.length === 0) return

    const selectedCompletion = tabCompletion[index]

    // Get the last word of the input for replacement
    const words = input.split(" ")
    const lastWord = words[words.length - 1]

    // Replace the last word with the selected completion
    const newInput =
      input.substring(0, input.length - lastWord.length) + selectedCompletion + (words.length === 1 ? " " : "")

    setInput(newInput)
    setCursorPosition(newInput.length)
    setShowTabCompletion(false)
  }

  // Create a new terminal session
  const createNewSession = () => {
    const newSessionId = `terminal-${Date.now()}`
    const newSession: TerminalSession = {
      id: newSessionId,
      name: `Terminal ${sessions.filter((s) => s.type === "stm32").length + 1}`,
      type: "stm32",
      lines: [
        {
          id: `welcome-${newSessionId}-1`,
          content: `STM32 Nucleo ${boardType} Terminal [Version 1.0.0]`,
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: `welcome-${newSessionId}-2`,
          content: "Copyright (c) 2025 STMicroelectronics. All rights reserved.",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: `welcome-${newSessionId}-3`,
          content: "",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: `welcome-${newSessionId}-4`,
          content: "Type 'help' to see available commands.",
          isSystem: true,
          timestamp: new Date(),
        },
        {
          id: `welcome-${newSessionId}-5`,
          content: "",
          isSystem: true,
          timestamp: new Date(),
        },
      ],
      cwd: "/",
      history: [],
      historyIndex: -1,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: "/home/user",
        TERM: "xterm-256color",
        BOARD: boardType,
        USER: "developer",
      },
    }

    setSessions([...sessions, newSession])
    setActiveSessionId(newSessionId)
  }

  // Close a terminal session
  const closeSession = (sessionId: string) => {
    // Don't close if it's the last terminal session
    const terminalSessions = sessions.filter((s) => s.type === "stm32")
    if (terminalSessions.length <= 1 && sessions.find((s) => s.id === sessionId)?.type === "stm32") {
      return
    }

    const updatedSessions = sessions.filter((s) => s.id !== sessionId)
    setSessions(updatedSessions)

    // If closing the active session, activate another one
    if (sessionId === activeSessionId) {
      setActiveSessionId(updatedSessions[0]?.id || "")
    }
  }

  // Render ANSI-formatted text
  const renderAnsiText = (text: string) => {
    // This is a simplified ANSI renderer
    // In a real implementation, you'd use a library like ansi-to-html

    // Replace ANSI color codes with spans
    const colorMap: Record<string, string> = {
      "30": "text-black",
      "31": "text-red-500",
      "32": "text-green-500",
      "33": "text-yellow-500",
      "34": "text-blue-500",
      "35": "text-purple-500",
      "36": "text-cyan-500",
      "37": "text-gray-300",
      "90": "text-gray-500",
      "91": "text-red-400",
      "92": "text-green-400",
      "93": "text-yellow-400",
      "94": "text-blue-400",
      "95": "text-purple-400",
      "96": "text-cyan-400",
      "97": "text-white",
    }

    // Split by ANSI escape sequences
    const parts = text.split(/(\x1b\[\d+m)/g)

    return parts.map((part, index) => {
      // Check if this is an ANSI escape sequence
      const match = part.match(/\x1b\[(\d+)m/)
      if (match) {
        // This is an escape sequence, don't render it
        return null
      }

      // Find the color from the previous escape sequence
      let colorClass = ""
      if (index > 0) {
        const prevPart = parts[index - 1]
        const colorMatch = prevPart.match(/\x1b\[(\d+)m/)
        if (colorMatch && colorMap[colorMatch[1]]) {
          colorClass = colorMap[colorMatch[1]]
        }
      }

      // Render the text with the appropriate color
      return part ? (
        <span key={index} className={colorClass}>
          {part}
        </span>
      ) : null
    })
  }

  return (
    <div
      className={`flex flex-col h-full border rounded-md overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      } ${darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}
      ref={terminalRef}
    >
      {/* Terminal header with tabs */}
      <div
        className={`flex items-center justify-between px-2 py-1 border-b ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
        }`}
      >
        <Tabs value={activeSessionId} onValueChange={setActiveSessionId} className="flex-1">
          <TabsList className="bg-transparent h-8">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center">
                <TabsTrigger
                  value={session.id}
                  className={`px-3 h-8 data-[state=active]:border-b-2 ${
                    darkMode
                      ? "data-[state=active]:border-blue-500 data-[state=active]:bg-gray-900"
                      : "data-[state=active]:border-blue-600 data-[state=active]:bg-white"
                  }`}
                >
                  {session.type === "stm32" && <TerminalIcon className="h-3.5 w-3.5 mr-1.5" />}
                  {session.type === "build" && <Code className="h-3.5 w-3.5 mr-1.5" />}
                  {session.type === "debug" && <Bug className="h-3.5 w-3.5 mr-1.5" />}
                  {session.name}
                </TabsTrigger>
                {session.type === "stm32" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      closeSession(session.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createNewSession}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Terminal</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    // Copy terminal content to clipboard
                    const content = activeSession?.lines.map((line) => line.content).join("\n")

                    navigator.clipboard.writeText(content || "")
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => clearTerminal()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFontSize(fontSize - 1)}>Decrease Font Size</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFontSize(fontSize + 1)}>Increase Font Size</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLineNumbers(!showLineNumbers)}>
                  {showLineNumbers ? "Hide Line Numbers" : "Show Line Numbers"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // Save terminal output to file
                    const content = activeSession?.lines.map((line) => line.content).join("\n")
                    const blob = new Blob([content || ""], { type: "text/plain" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `terminal-output-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Output
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </div>

      {/* Terminal content */}
      <TabsContent value={activeSessionId} className="flex-1 p-0 m-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div
            className="p-2 font-mono whitespace-pre-wrap"
            style={{
              fontFamily: terminalFont,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          >
            {activeSession?.lines.map((line, index) => (
              <div
                key={line.id}
                className={`${line.isError ? "text-red-500" : ""} ${
                  line.isCommand ? "font-bold" : ""
                } ${line.isSystem ? "text-gray-500" : ""}`}
              >
                {showLineNumbers && <span className="inline-block w-8 text-right mr-2 text-gray-500">{index + 1}</span>}
                {line.ansiFormatted ? renderAnsiText(line.content) : line.content}
              </div>
            ))}

            {/* Input line with prompt */}
            {!isProcessingCommand && (
              <div className="flex items-start mt-1">
                {showLineNumbers && (
                  <span className="inline-block w-8 text-right mr-2 text-gray-500">
                    {(activeSession?.lines.length || 0) + 1}
                  </span>
                )}
                <span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: getPrompt() }} />
                <span className="ml-1 flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onSelect={handleInputSelect}
                    onClick={handleInputClick}
                    onPaste={handlePaste}
                    className={`w-full bg-transparent outline-none resize-none overflow-hidden ${
                      darkMode ? "text-gray-100" : "text-gray-900"
                    }`}
                    style={{
                      fontFamily: terminalFont,
                      fontSize: `${fontSize}px`,
                      lineHeight: lineHeight,
                      height: "1.5em",
                    }}
                    rows={1}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                  />
                </span>
              </div>
            )}

            {/* Tab completion dropdown */}
            {showTabCompletion && tabCompletion.length > 0 && (
              <div
                className={`absolute mt-1 ml-8 border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto ${
                  darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
                style={{
                  minWidth: "200px",
                  maxWidth: "400px",
                }}
              >
                {tabCompletion.map((item, index) => (
                  <div
                    key={item}
                    className={`px-3 py-1.5 cursor-pointer ${
                      index === tabCompletionIndex
                        ? darkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-800"
                        : ""
                    }`}
                    onClick={() => selectTabCompletion(index)}
                    onMouseEnter={() => setTabCompletionIndex(index)}
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </div>
  )
}
