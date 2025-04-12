"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"

interface TerminalEmulatorProps {
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

type CommandResult = {
  output: string
  error?: boolean
  code?: number
}

export default function TerminalEmulator({
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
}: TerminalEmulatorProps) {
  const [input, setInput] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [outputLines, setOutputLines] = useState<{ text: string; error?: boolean }[]>([
    { text: `STM32 Nucleo ${boardType} Terminal [Version 1.0.0]` },
    { text: "Copyright (c) 2025 STMicroelectronics. All rights reserved." },
    { text: "" },
    { text: "Type 'help' to see available commands." },
    { text: "" },
  ])
  const [currentDirectory, setCurrentDirectory] = useState("/")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<"terminal" | "build" | "debug">("terminal")
  const [buildLogs, setBuildLogs] = useState<{ text: string; error?: boolean }[]>([])
  const [debugLogs, setDebugLogs] = useState<{ text: string; error?: boolean }[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [breakpoints, setBreakpoints] = useState<{ file: string; line: number }[]>([])

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [outputLines, buildLogs, debugLogs, activeTab])

  // Focus input when terminal is clicked
  useEffect(() => {
    const handleClick = () => {
      if (inputRef.current && !isEditing) {
        inputRef.current.focus()
      }
    }

    const terminal = terminalRef.current
    if (terminal) {
      terminal.addEventListener("click", handleClick)
    }

    return () => {
      if (terminal) {
        terminal.removeEventListener("click", handleClick)
      }
    }
  }, [isEditing])

  // Process command input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        executeCommand(input)
        setCommandHistory((prev) => [...prev, input])
        setHistoryIndex(-1)
        setInput("")
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      navigateHistory("up")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      navigateHistory("down")
    } else if (e.key === "Tab") {
      e.preventDefault()
      handleTabCompletion()
    } else if (e.key === "c" && e.ctrlKey) {
      if (isEditing) {
        exitEditor()
      } else if (isRunning) {
        onStop()
        addOutput("^C", "terminal")
      }
    }
  }

  const navigateHistory = (direction: "up" | "down") => {
    if (commandHistory.length === 0) return

    if (direction === "up") {
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
      setHistoryIndex(newIndex)
      setInput(commandHistory[commandHistory.length - 1 - newIndex] || "")
    } else {
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1
      setHistoryIndex(newIndex)
      setInput(newIndex >= 0 ? commandHistory[commandHistory.length - 1 - newIndex] : "")
    }
  }

  const handleTabCompletion = () => {
    if (!input) return

    // Get the last word of the input for completion
    const words = input.split(" ")
    const lastWord = words[words.length - 1]

    // If it looks like a path or file
    if (lastWord.includes("/") || !input.includes(" ")) {
      // Complete commands if it's the first word
      if (!input.includes(" ")) {
        const commands = [
          "ls",
          "cd",
          "pwd",
          "mkdir",
          "touch",
          "rm",
          "mv",
          "cp",
          "cat",
          "edit",
          "make",
          "build",
          "run",
          "debug",
          "help",
          "clear",
          "echo",
          "grep",
          "find",
          "break",
          "step",
          "continue",
        ]

        const matches = commands.filter((cmd) => cmd.startsWith(lastWord))
        if (matches.length === 1) {
          setInput(matches[0] + " ")
        } else if (matches.length > 1) {
          addOutput(`\nPossible completions: ${matches.join("  ")}`, "terminal")
          setInput(input)
        }
      } else {
        // Complete file/directory paths
        const basePath = lastWord.includes("/")
          ? lastWord.substring(0, lastWord.lastIndexOf("/") + 1)
          : currentDirectory

        const searchTerm = lastWord.includes("/") ? lastWord.substring(lastWord.lastIndexOf("/") + 1) : lastWord

        const fullPath = normalizePath(basePath.startsWith("/") ? basePath : `${currentDirectory}/${basePath}`)

        // Find matching files and directories
        const matches = files
          .filter((file) => {
            const dirName = file.path.substring(0, file.path.lastIndexOf("/") + 1)
            return dirName === fullPath && file.name.startsWith(searchTerm)
          })
          .map((file) => file.name)

        if (matches.length === 1) {
          const newInput =
            input.substring(0, input.length - lastWord.length) +
            (lastWord.includes("/") ? lastWord.substring(0, lastWord.lastIndexOf("/") + 1) + matches[0] : matches[0])
          setInput(newInput)
        } else if (matches.length > 1) {
          addOutput(`\nPossible completions: ${matches.join("  ")}`, "terminal")
          setInput(input)
        }
      }
    }
  }

  // Command execution
  const executeCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    addOutput(`${currentDirectory}$ ${trimmedCmd}`, "terminal")

    if (trimmedCmd === "") return

    const [command, ...args] = trimmedCmd.split(" ")

    switch (command.toLowerCase()) {
      case "help":
        showHelp(args[0])
        break
      case "clear":
        clearTerminal()
        break
      case "ls":
        listFiles(args[0] || currentDirectory)
        break
      case "cd":
        changeDirectory(args[0] || "/")
        break
      case "pwd":
        printWorkingDirectory()
        break
      case "mkdir":
        if (args[0]) makeDirectory(args[0])
        else addOutput("mkdir: missing operand", "terminal", true)
        break
      case "touch":
        if (args[0]) createFile(args[0], "")
        else addOutput("touch: missing operand", "terminal", true)
        break
      case "rm":
        if (args[0]) removeFile(args)
        else addOutput("rm: missing operand", "terminal", true)
        break
      case "cat":
        if (args[0]) viewFile(args[0])
        else addOutput("cat: missing operand", "terminal", true)
        break
      case "edit":
        if (args[0]) editFile(args[0])
        else addOutput("edit: missing operand", "terminal", true)
        break
      case "mv":
        if (args.length >= 2) moveFile(args[0], args[1])
        else addOutput("mv: missing destination file operand", "terminal", true)
        break
      case "cp":
        if (args.length >= 2) copyFile(args[0], args[1])
        else addOutput("cp: missing destination file operand", "terminal", true)
        break
      case "echo":
        echoText(args.join(" "))
        break
      case "grep":
        if (args.length >= 2) grepSearch(args[0], args.slice(1).join(" "))
        else addOutput("grep: missing pattern or file operand", "terminal", true)
        break
      case "find":
        if (args[0]) findFiles(args[0])
        else addOutput("find: missing pattern", "terminal", true)
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
        else addOutput("break: usage: break <file> <line>", "terminal", true)
        break
      case "step":
        stepDebugger()
        break
      case "continue":
        continueDebugger()
        break
      default:
        addOutput(`Command not found: ${command}. Type 'help' for available commands.`, "terminal", true)
    }
  }

  // Command implementations
  const showHelp = (command?: string) => {
    if (!command) {
      addOutput(
        `
Available commands:
  File Operations:
    ls [path]           - List directory contents
    cd [path]           - Change directory
    pwd                 - Print working directory
    mkdir <dir>         - Create directory
    touch <file>        - Create empty file
    rm [-r] <path>      - Remove file or directory
    mv <src> <dest>     - Move/rename file or directory
    cp <src> <dest>     - Copy file
    
  File Content:
    cat <file>          - Display file contents
    edit <file>         - Edit file contents
    echo <text>         - Display text
    grep <pattern> <file> - Search for pattern in file
    find <pattern>      - Find files matching pattern
    
  Build & Debug:
    build, make         - Compile project
    run                 - Run compiled code
    debug               - Start debugger
    break <file> <line> - Set breakpoint
    step                - Step through code
    continue            - Continue execution
    
  Terminal:
    clear               - Clear terminal
    help [command]      - Show help
`,
        "terminal",
      )
    } else {
      // Show help for specific command
      const helpTexts: Record<string, string> = {
        ls: "ls [path] - List directory contents\n\nLists files and directories in the specified path or current directory.",
        cd: "cd [path] - Change directory\n\nChanges the current working directory to the specified path.",
        pwd: "pwd - Print working directory\n\nDisplays the current working directory path.",
        mkdir: "mkdir <dir> - Create directory\n\nCreates a new directory at the specified path.",
        touch: "touch <file> - Create empty file\n\nCreates a new empty file at the specified path.",
        rm: "rm [-r] <path> - Remove file or directory\n\nRemoves the specified file or directory. Use -r flag to remove directories recursively.",
        mv: "mv <src> <dest> - Move/rename file or directory\n\nMoves or renames a file or directory from source to destination.",
        cp: "cp <src> <dest> - Copy file\n\nCopies a file from source to destination.",
        cat: "cat <file> - Display file contents\n\nDisplays the contents of the specified file.",
        edit: "edit <file> - Edit file contents\n\nOpens the specified file for editing in the terminal.",
        echo: "echo <text> - Display text\n\nDisplays the specified text in the terminal.",
        grep: "grep <pattern> <file> - Search for pattern in file\n\nSearches for the specified pattern in the file and displays matching lines.",
        find: "find <pattern> - Find files matching pattern\n\nFinds files with names matching the specified pattern.",
        build: "build, make - Compile project\n\nCompiles the project using the main.c file.",
        run: "run - Run compiled code\n\nRuns the compiled code on the simulated board.",
        debug: "debug - Start debugger\n\nStarts the debugger for the compiled code.",
        break: "break <file> <line> - Set breakpoint\n\nSets a breakpoint at the specified line in the file.",
        step: "step - Step through code\n\nSteps through the code one line at a time in debug mode.",
        continue: "continue - Continue execution\n\nContinues execution until the next breakpoint in debug mode.",
        clear: "clear - Clear terminal\n\nClears the terminal screen.",
        help: "help [command] - Show help\n\nDisplays help for all commands or the specified command.",
      }

      if (helpTexts[command]) {
        addOutput(`\n${helpTexts[command]}`, "terminal")
      } else {
        addOutput(`\nNo help available for '${command}'`, "terminal", true)
      }
    }
  }

  const clearTerminal = () => {
    if (activeTab === "terminal") {
      setOutputLines([])
    } else if (activeTab === "build") {
      setBuildLogs([])
    } else if (activeTab === "debug") {
      setDebugLogs([])
    }
  }

  const listFiles = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${currentDirectory}/${path}`)

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
      addOutput(`No files found in ${targetPath}`, "terminal")
    } else {
      const sortedItems = Array.from(items).sort((a, b) => {
        // Directories first, then files
        const aIsDir = a.endsWith("/")
        const bIsDir = b.endsWith("/")
        if (aIsDir && !bIsDir) return -1
        if (!aIsDir && bIsDir) return 1
        return a.localeCompare(b)
      })

      addOutput("\n" + sortedItems.join("  "), "terminal")
    }
  }

  const changeDirectory = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${currentDirectory}/${path}`)

    // Check if the directory exists
    const dirExists =
      files.some((file) => {
        const filePath = file.path
        return filePath.startsWith(targetPath) && filePath !== targetPath
      }) || targetPath === "/"

    if (dirExists) {
      setCurrentDirectory(targetPath)
    } else {
      addOutput(`cd: ${path}: No such directory`, "terminal", true)
    }
  }

  const printWorkingDirectory = () => {
    addOutput(currentDirectory, "terminal")
  }

  const makeDirectory = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${currentDirectory}/${path}`)

    // Check if the directory already exists
    const dirExists = files.some((file) => {
      const filePath = file.path
      return filePath.startsWith(targetPath) && filePath !== targetPath
    })

    if (dirExists) {
      addOutput(`mkdir: ${path}: Directory already exists`, "terminal", true)
      return
    }

    // Create a placeholder file to represent the directory
    const placeholderFile = {
      name: ".directory",
      path: `${targetPath}/.directory`,
      content: "",
    }

    onCreateFile(placeholderFile.path, placeholderFile.content)
    addOutput(`Directory created: ${targetPath}`, "terminal")
  }

  const createFile = (path: string, content: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${currentDirectory}/${path}`)

    // Check if the file already exists
    const fileExists = files.some((file) => file.path === targetPath)

    if (fileExists) {
      addOutput(`touch: ${path}: File already exists`, "terminal", true)
      return
    }

    const fileName = targetPath.split("/").pop() || ""

    onCreateFile(targetPath, content)
    addOutput(`File created: ${targetPath}`, "terminal")
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
      addOutput("rm: missing operand", "terminal", true)
      return
    }

    const targetPath = normalizePath(pathArg.startsWith("/") ? pathArg : `${currentDirectory}/${pathArg}`)

    // Check if the path exists
    const targetFile = files.find((file) => file.path === targetPath)
    const isDirectory = !targetFile && files.some((file) => file.path.startsWith(targetPath + "/"))

    if (!targetFile && !isDirectory) {
      addOutput(`rm: ${pathArg}: No such file or directory`, "terminal", true)
      return
    }

    if (isDirectory && !recursive) {
      addOutput(`rm: ${pathArg}: Is a directory, use -r to remove directories`, "terminal", true)
      return
    }

    if (isDirectory) {
      // Remove all files in the directory
      const filesToRemove = files.filter((file) => file.path.startsWith(targetPath + "/"))
      filesToRemove.forEach((file) => onDeleteFile(file.path))
      addOutput(`Removed directory: ${targetPath}`, "terminal")
    } else if (targetFile) {
      onDeleteFile(targetPath)
      addOutput(`Removed file: ${targetPath}`, "terminal")
    }
  }

  const viewFile = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${currentDirectory}/${path}`)

    // Find the file
    const targetFile = files.find((file) => file.path === targetPath)

    if (!targetFile) {
      addOutput(`cat: ${path}: No such file`, "terminal", true)
      return
    }

    addOutput(`\n${targetFile.content}`, "terminal")
  }

  const editFile = (path: string) => {
    const targetPath = normalizePath(path.startsWith("/") ? path : `${currentDirectory}/${path}`)

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
        addOutput(`edit: ${path}: No such directory`, "terminal", true)
        return
      }

      // Create the file
      const fileName = targetPath.split("/").pop() || ""
      targetFile = { name: fileName, path: targetPath, content: "" }
      onCreateFile(targetPath, "")
    }

    // Enter editing mode
    setIsEditing(true)
    setEditingFile(targetPath)
    setEditingContent(targetFile.content)

    addOutput(`\nEditing ${targetPath}. Press Ctrl+S to save, Ctrl+C to cancel.\n`, "terminal")
  }

  const saveEditedFile = () => {
    if (!editingFile) return

    // Find the file
    const fileIndex = files.findIndex((file) => file.path === editingFile)

    if (fileIndex >= 0) {
      // Update the file
      const updatedFiles = [...files]
      updatedFiles[fileIndex] = {
        ...updatedFiles[fileIndex],
        content: editingContent,
      }
      onFilesChange(updatedFiles)
      addOutput(`\nFile saved: ${editingFile}`, "terminal")
    } else {
      // Create the file
      const fileName = editingFile.split("/").pop() || ""
      onCreateFile(editingFile, editingContent)
      addOutput(`\nFile created: ${editingFile}`, "terminal")
    }

    exitEditor()
  }

  const exitEditor = () => {
    setIsEditing(false)
    setEditingFile(null)
    setEditingContent("")
    addOutput("\nExited editor", "terminal")
  }

  const moveFile = (source: string, destination: string) => {
    const sourcePath = normalizePath(source.startsWith("/") ? source : `${currentDirectory}/${source}`)
    const destPath = normalizePath(destination.startsWith("/") ? destination : `${currentDirectory}/${destination}`)

    // Find the source file
    const sourceFile = files.find((file) => file.path === sourcePath)

    if (!sourceFile) {
      addOutput(`mv: ${source}: No such file or directory`, "terminal", true)
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

    addOutput(`Moved ${sourcePath} to ${finalDestPath}`, "terminal")
  }

  const copyFile = (source: string, destination: string) => {
    const sourcePath = normalizePath(source.startsWith("/") ? source : `${currentDirectory}/${source}`)
    const destPath = normalizePath(destination.startsWith("/") ? destination : `${currentDirectory}/${destination}`)

    // Find the source file
    const sourceFile = files.find((file) => file.path === sourcePath)

    if (!sourceFile) {
      addOutput(`cp: ${source}: No such file or directory`, "terminal", true)
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

    addOutput(`Copied ${sourcePath} to ${finalDestPath}`, "terminal")
  }

  const echoText = (text: string) => {
    // Handle quoted text
    let processedText = text
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      processedText = text.substring(1, text.length - 1)
    }

    addOutput(processedText, "terminal")
  }

  const grepSearch = (pattern: string, filePath: string) => {
    const targetPath = normalizePath(filePath.startsWith("/") ? filePath : `${currentDirectory}/${filePath}`)

    // Find the file
    const targetFile = files.find((file) => file.path === targetPath)

    if (!targetFile) {
      addOutput(`grep: ${filePath}: No such file`, "terminal", true)
      return
    }

    // Search for the pattern
    const lines = targetFile.content.split("\n")
    const matches = lines.filter((line) => line.includes(pattern))

    if (matches.length === 0) {
      addOutput(`No matches found for '${pattern}' in ${targetPath}`, "terminal")
    } else {
      addOutput("\n" + matches.join("\n"), "terminal")
    }
  }

  const findFiles = (pattern: string) => {
    // Find files matching the pattern
    const matches = files.filter((file) => {
      const fileName = file.path.split("/").pop() || ""
      return fileName.includes(pattern)
    })

    if (matches.length === 0) {
      addOutput(`No files found matching '${pattern}'`, "terminal")
    } else {
      addOutput("\n" + matches.map((file) => file.path).join("\n"), "terminal")
    }
  }

  const buildProject = () => {
    setActiveTab("build")
    addOutput("\nBuilding project...", "build")

    // Find main.c
    const mainFile = files.find((file) => file.path.endsWith("main.c"))

    if (!mainFile) {
      addOutput("Error: main.c not found", "build", true)
      return
    }

    // Simulate compilation
    setTimeout(() => {
      addOutput("Compiling...", "build")

      // Check for basic errors
      let hasErrors = false
      if (!mainFile.content.includes("int main")) {
        addOutput("Error: No main function found", "build", true)
        hasErrors = true
      }

      if (mainFile.content.includes("while (1)") && !mainFile.content.includes("HAL_Delay")) {
        addOutput("Warning: Infinite loop without delay detected", "build")
      }

      // Simulate successful compilation
      if (!hasErrors) {
        addOutput("Linking...", "build")
        addOutput(`Build completed successfully for STM32 ${boardType}`, "build")

        // Trigger actual compilation
        onCompile(mainFile.content)
      }
    }, 1000)
  }

  const runProject = () => {
    if (isRunning) {
      onStop()
      addOutput("Program execution stopped", "terminal")
    } else {
      onRun()
      addOutput("Program execution started", "terminal")
    }
  }

  const debugProject = () => {
    setActiveTab("debug")
    addOutput("\nStarting debugger...", "debug")

    // Find main.c
    const mainFile = files.find((file) => file.path.endsWith("main.c"))

    if (!mainFile) {
      addOutput("Error: main.c not found", "debug", true)
      return
    }

    // Simulate debugger startup
    setTimeout(() => {
      addOutput("Debugger initialized", "debug")
      addOutput(`Loaded symbols for STM32 ${boardType}`, "debug")
    }, 1000)
  }

  const addOutput = (text: string, tab: "terminal" | "build" | "debug", error = false) => {
    const newLine = { text, error }
    if (tab === "terminal") {
      setOutputLines((prev) => [...prev, newLine])
    } else if (tab === "build") {
      setBuildLogs((prev) => [...prev, newLine])
    } else if (tab === "debug") {
      setDebugLogs((prev) => [...prev, newLine])
    }
  }

  const normalizePath = (path: string) => {
    const parts = path.split("/")
    const normalizedParts: string[] = []

    for (const part of parts) {
      if (part === "." || part === "") {
        continue
      } else if (part === "..") {
        normalizedParts.pop()
      } else {
        normalizedParts.push(part)
      }
    }

    return "/" + normalizedParts.join("/")
  }

  const setBreakpoint = (file: string, line: number) => {
    setBreakpoints((prev) => [...prev, { file, line }])
    addOutput(`Breakpoint set at ${file}:${line}`, "debug")
  }

  const stepDebugger = () => {
    addOutput("Stepping to next line...", "debug")
  }

  const continueDebugger = () => {
    addOutput("Continuing execution...", "debug")
  }
}
