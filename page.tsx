"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Terminal,
  Code,
  Cpu,
  Zap,
  Upload,
  Save,
  Download,
  Settings,
  Play,
  Square,
  MemoryStickIcon as Memory,
  FileCode,
  Layers,
  FileIcon,
  FolderOpen,
  Bug,
  StepForward,
} from "lucide-react"

// Update the dynamic import for AdvancedCodeEditor to include a better loading state
const VSCodeEditor = dynamic(() => import("@/components/VSCodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading code editor...</p>
      </div>
    </div>
  ),
})

const PinoutDiagram = dynamic(() => import("@/components/PinoutDiagram"), { ssr: false })
const FileExplorer = dynamic(() => import("@/components/FileExplorer"), { ssr: false })
const NucleoBoard = dynamic(() => import("@/components/NucleoBoard"), { ssr: false })
const USBConnection = dynamic(() => import("@/components/USBConnection"), { ssr: false })
const CodeTerminal = dynamic(() => import("@/components/CodeTerminal"), { ssr: false })
const EnhancedTerminal = dynamic(() => import("@/components/EnhancedTerminal"), { ssr: false })
const HardwareTerminal = dynamic(() => import("@/components/HardwareTerminal"), { ssr: false })
const MemoryViewer = dynamic(() => import("@/components/MemoryViewer"), { ssr: false })
const RegisterViewer = dynamic(() => import("@/components/RegisterViewer"), { ssr: false })
const StatusBar = dynamic(() => import("@/components/StatusBar"), { ssr: false })

import { getDefaultCode } from "@/lib/code-templates"

export default function Home() {
  const [code, setCode] = useState("")
  const [selectedPins, setSelectedPins] = useState<string[]>([])
  const [pinConfigurations, setPinConfigurations] = useState<Record<string, string>>({})
  const [compiledCode, setCompiledCode] = useState<ArrayBuffer | null>(null)
  const [simulationResult, setSimulationResult] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState("code")
  const [codeErrors, setCodeErrors] = useState<string[]>([])
  const [hardwareLogs, setHardwareLogs] = useState<string[]>([])
  const [selectedBoard, setSelectedBoard] = useState("F446RE")
  const [isCompiling, setIsCompiling] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isDebugging, setIsDebugging] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [autoDetectBoard, setAutoDetectBoard] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [memoryData, setMemoryData] = useState<Uint8Array | null>(null)
  const [registerValues, setRegisterValues] = useState<Record<string, number>>({})
  const [projectName, setProjectName] = useState("Untitled Project")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFileName, setSaveFileName] = useState("my_project")
  const [statusMessage, setStatusMessage] = useState("Connect a device to begin")
  const [statusType, setStatusType] = useState<"info" | "error" | "success" | "warning">("info")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [projectFiles, setProjectFiles] = useState<{ name: string; path: string; content: string }[]>([
    {
      name: "main.c",
      path: "main.c",
      content: `
#include "stm32f4xx.h"

int main(void) {
  // Initialize the HAL Library
  HAL_Init();

  // Infinite loop
  while (1) {
    // Toggle the LED on PA5
    HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);

    // Delay for 500 milliseconds
    HAL_Delay(500);
  }
}
`,
    },
  ])
  const [showOpenFolderDialog, setShowOpenFolderDialog] = useState(false)
  const [folderPath, setFolderPath] = useState("")
  const [breakpoints, setBreakpoints] = useState<number[]>([])
  const [activeFile, setActiveFile] = useState<string | null>("main.c")

  useEffect(() => {
    // Load default code template
    import("@/lib/code-templates").then(({ getDefaultCode }) => {
      const defaultCode = getDefaultCode(selectedBoard)
      setCode(defaultCode)
    })

    // Set up theme
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [selectedBoard, darkMode])

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
  }

  const handleFilesChange = (files: { name: string; path: string; content: string }[]) => {
    setProjectFiles(files)
  }

  const handleSaveFile = (path: string, content: string) => {
    // Update the file in projectFiles
    const updatedFiles = projectFiles.map((file) => (file.path === path ? { ...file, content } : file))
    setProjectFiles(updatedFiles)

    setStatusMessage(`File saved: ${path}`)
    setStatusType("success")
  }

  // Enhance the file handling in the main app component to ensure files are properly loaded and displayed

  // Update the handleFileSelect function to properly open files in the editor
  const handleFileSelect = (path: string) => {
    setActiveFile(path)

    // Find the file in the files array
    const file = projectFiles.find((f) => f.path === path)

    if (file) {
      // If the file exists, set its content as the active code
      setCode(file.content)
    } else {
      // If the file doesn't exist, create it with appropriate default content
      let defaultContent = ""

      if (path.endsWith(".c")) {
        defaultContent = `/**
* @file ${path.split("/").pop()}
* @brief 
*/

#include "stm32f4xx.h"

// Add your code here

`
      } else if (path.endsWith(".h")) {
        const fileName = path.split("/").pop() || ""
        const guardName = fileName.toUpperCase().replace(/\./g, "_")
        defaultContent = `/**
* @file ${fileName}
* @brief 
*/

#ifndef ${guardName}
#define ${guardName}

// Add your declarations here

#endif /* ${guardName} */
`
      }

      // Create the new file
      const newFile = {
        name: path.split("/").pop() || "",
        path: path,
        content: defaultContent,
      }

      // Add the file to projectFiles
      setProjectFiles([...projectFiles, newFile])
      setCode(defaultContent)
    }

    // Switch to code editor tab
    setActiveTab("code")
  }

  // Enhance the handleCreateFile function to properly create files with default content
  const handleCreateFile = (path: string, content = "") => {
    // Normalize the path to ensure consistent handling
    const normalizedPath = path.startsWith("/") ? path : `/${path}`

    // Create parent directories if they don't exist
    const pathParts = normalizedPath.split("/").filter(Boolean)
    if (pathParts.length > 1) {
      let currentPath = ""
      // Create each directory in the path
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += `/${pathParts[i]}`

        // Check if this directory exists
        const dirExists = projectFiles.some(
          (file) => file.path.startsWith(`${currentPath}/`) && file.path !== currentPath,
        )

        // If directory doesn't exist, create a placeholder file
        if (!dirExists) {
          const placeholderPath = `${currentPath}/.directory`
          if (!projectFiles.some((file) => file.path === placeholderPath)) {
            const placeholderFile = {
              name: ".directory",
              path: placeholderPath,
              content: "",
            }
            setProjectFiles((prev) => [...prev, placeholderFile])
          }
        }
      }
    }

    // Check if file already exists
    const fileExists = projectFiles.some((file) => file.path === normalizedPath)

    if (!fileExists) {
      // Generate appropriate default content if none provided
      let fileContent = content
      if (!fileContent) {
        const fileName = pathParts[pathParts.length - 1]
        if (normalizedPath.endsWith(".c")) {
          fileContent = `/**
* @file ${fileName}
* @brief 
*/

#include "stm32f4xx.h"

// Add your code here

`
        } else if (normalizedPath.endsWith(".h")) {
          const guardName = fileName.toUpperCase().replace(/\./g, "_")
          fileContent = `/**
* @file ${fileName}
* @brief 
*/

#ifndef ${guardName}
#define ${guardName}

// Add your declarations here

#endif /* ${guardName} */
`
        }
      }

      const newFile = {
        name: pathParts[pathParts.length - 1],
        path: normalizedPath,
        content: fileContent,
      }

      setProjectFiles((prev) => [...prev, newFile])

      // If this is a new source file, switch to it in the editor
      if (
        normalizedPath.endsWith(".c") ||
        normalizedPath.endsWith(".h") ||
        normalizedPath.endsWith(".cpp") ||
        normalizedPath.endsWith(".hpp")
      ) {
        setActiveFile(normalizedPath)
        setCode(fileContent)
        setActiveTab("code")
      }

      setStatusMessage(`Created new file: ${normalizedPath}`)
      setStatusType("success")
      return normalizedPath
    }

    return null
  }

  // Enhance the handleCompile function to compile all project files
  const handleCompile = async () => {
    setIsCompiling(true)
    setStatusMessage("Compiling...")
    setStatusType("info")

    try {
      const { compileProject } = await import("@/lib/emscripten-compiler")

      // Get all source files from the project
      const sourceFiles = projectFiles.filter(
        (file) =>
          file.path.endsWith(".c") ||
          file.path.endsWith(".cpp") ||
          file.path.endsWith(".h") ||
          file.path.endsWith(".hpp"),
      )

      // Make sure we have at least a main.c file
      if (!sourceFiles.some((file) => file.path.includes("main.c"))) {
        setCodeErrors(["Error: main.c not found in project"])
        setStatusMessage("Compilation failed: No main.c file")
        setStatusType("error")
        setIsCompiling(false)
        return
      }

      // Compile all project files instead of just the active file
      const result = await compileProject(sourceFiles, selectedBoard)

      if (result.success) {
        setCompiledCode(result.binary)
        setCodeErrors([])
        setStatusMessage("Compilation successful")
        setSimulationResult(result.output)
        setStatusType("success")
      } else {
        setCodeErrors(result.errors)
        setStatusMessage("Compilation failed")
        setStatusType("error")
      }
    } catch (error: any) {
      setCodeErrors([error.toString()])
      setStatusMessage("Compilation error")
      setStatusType("error")
    } finally {
      setIsCompiling(false)
    }
  }

  const handleDeleteFile = (path: string) => {
    // Don't allow deleting main.c
    if (path === "main.c") {
      setStatusMessage("Cannot delete main.c")
      setStatusType("error")
      return
    }

    // Remove the file from projectFiles
    const updatedFiles = projectFiles.filter((file) => file.path !== path)
    setProjectFiles(updatedFiles)

    setStatusMessage(`Deleted file: ${path}`)
    setStatusType("success")
  }

  const handleRenameFile = (oldPath: string, newPath: string) => {
    // Don't allow renaming main.c
    if (oldPath === "main.c") {
      setStatusMessage("Cannot rename main.c")
      setStatusType("error")
      return
    }

    // Find the file
    const fileToRename = projectFiles.find((file) => file.path === oldPath)
    if (!fileToRename) return

    // Create a new file with the new path
    const newFile = {
      name: newPath.split("/").pop() || newPath,
      path: newPath,
      content: fileToRename.content,
    }

    // Remove the old file and add the new one
    const updatedFiles = projectFiles.filter((file) => file.path !== oldPath)
    updatedFiles.push(newFile)
    setProjectFiles(updatedFiles)

    setStatusMessage(`Renamed file: ${oldPath} to ${newPath}`)
    setStatusType("success")
  }

  const handlePinSelection = (pins: string[], configs: Record<string, string>) => {
    setSelectedPins(pins)
    setPinConfigurations(configs)
    setStatusMessage("Pin configuration updated")
    setStatusType("success")
  }

  const handleUpload = async () => {
    if (!isConnected || !compiledCode) {
      setStatusMessage("Cannot upload: Device not connected or code not compiled")
      setStatusType("warning")
      return
    }

    setIsUploading(true)
    setStatusMessage("Uploading to device...")
    setStatusType("info")

    try {
      const { uploadToDevice } = await import("@/lib/usb-communication")
      await uploadToDevice(compiledCode, selectedBoard, deviceInfo?.rawDevice)
      setStatusMessage("Upload completed successfully")
      setStatusType("success")

      // After successful upload, read memory and registers
      await readMemoryAndRegisters()
    } catch (error: any) {
      setStatusMessage("Upload failed")
      setStatusType("error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleUSBConnection = async (connected: boolean, info?: any) => {
    setIsConnected(connected)

    if (connected && info) {
      setDeviceInfo(info)
      setStatusMessage(`Connected to ${info.name}`)
      setStatusType("success")

      // Auto-detect board type if enabled
      if (autoDetectBoard && info.name) {
        if (info.name.includes("F446")) {
          setSelectedBoard("F446RE")
        } else if (info.name.includes("F031")) {
          setSelectedBoard("F031K6")
        } else if (info.name.includes("L476")) {
          setSelectedBoard("L476RG")
        }
      }

      // Read memory and registers after connection
      try {
        await readMemoryAndRegisters()
      } catch (error) {
        console.warn("Failed to read memory/registers:", error)
        // Don't show error to user, just continue
      }
    } else {
      setDeviceInfo(null)
      if (connected === false) {
        setStatusMessage("Connect a device to begin")
        setStatusType("info")
      }
    }
  }

  const readMemoryAndRegisters = async () => {
    if (!isConnected) return

    try {
      const { readMemory, readRegisters } = await import("@/lib/usb-communication")

      // Read memory
      const memoryResult = await readMemory(0x20000000, 1024, deviceInfo?.rawDevice) // Read 1KB from SRAM start address
      setMemoryData(memoryResult)

      // Read registers
      const registerResult = await readRegisters(selectedBoard, deviceInfo?.rawDevice)
      setRegisterValues(registerResult)
    } catch (error: any) {
      console.error(`Failed to read memory/registers: ${error.toString()}`)
    }
  }

  const handleRunStop = () => {
    if (isRunning) {
      // Stop execution
      setIsRunning(false)
      setStatusMessage("Program stopped")
      setStatusType("info")
    } else {
      // Start execution
      setIsRunning(true)
      setStatusMessage("Program running")
      setStatusType("success")
    }
  }

  const handleDebug = async () => {
    if (!isConnected || !compiledCode) {
      setStatusMessage("Cannot debug: Device not connected or code not compiled")
      setStatusType("warning")
      return
    }

    if (isDebugging) {
      // Stop debugging
      setIsDebugging(false)
      setStatusMessage("Debug session ended")
      setStatusType("info")
    } else {
      // Start debugging
      setIsDebugging(true)
      setStatusMessage("Starting debug session...")
      setStatusType("info")

      try {
        const { debugProgram } = await import("@/lib/usb-communication")
        await debugProgram(deviceInfo?.rawDevice)
        setStatusMessage("Debug session started")
        setStatusType("success")
      } catch (error: any) {
        setStatusMessage("Failed to start debug session")
        setStatusType("error")
        setIsDebugging(false)
      }
    }
  }

  const handleStepProgram = async () => {
    if (!isConnected || !isDebugging) {
      console.warn("Cannot step: Device not connected or not in debug mode")
      return
    }

    try {
      const { stepProgram } = await import("@/lib/usb-communication")
      await stepProgram(deviceInfo?.rawDevice)

      // Read registers after stepping
      await readMemoryAndRegisters()
    } catch (error: any) {
      console.error(`Failed to step program: ${error.toString()}`)
    }
  }

  const handleSetBreakpoint = async (address: number) => {
    if (!isConnected || !isDebugging) {
      console.warn("Cannot set breakpoint: Device not connected or not in debug mode")
      return
    }

    try {
      const { setBreakpoint } = await import("@/lib/usb-communication")
      await setBreakpoint(address, deviceInfo?.rawDevice)

      // Add breakpoint to list
      setBreakpoints((prev) => [...prev, address])
    } catch (error: any) {
      console.error(`Failed to set breakpoint: ${error.toString()}`)
    }
  }

  const addCodeLog = (message: string) => {
    setCodeErrors((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const addHardwareLog = (message: string) => {
    setHardwareLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const handleBoardChange = (value: string) => {
    setSelectedBoard(value)
    setStatusMessage(`Board changed to Nucleo ${value}`)
    setStatusType("info")
  }

  const handleSaveProject = () => {
    setShowSaveDialog(true)
  }

  const confirmSaveProject = () => {
    const project = {
      name: projectName,
      code,
      selectedPins,
      pinConfigurations,
      selectedBoard,
      files: projectFiles,
    }

    const blob = new Blob([JSON.stringify(project)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${saveFileName}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setShowSaveDialog(false)
    addCodeLog("Project saved")
    setStatusMessage("Project saved")
    setStatusType("success")
  }

  const handleLoadProject = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string)
        setProjectName(project.name || "Untitled Project")
        setCode(project.code || "")
        setSelectedPins(project.selectedPins || [])
        setPinConfigurations(project.pinConfigurations || {})
        setSelectedBoard(project.selectedBoard || "F446RE")
        setProjectFiles(project.files || [])

        addCodeLog("Project loaded successfully")
        setStatusMessage("Project loaded successfully")
        setStatusType("success")
      } catch (error) {
        addCodeLog("Failed to load project: Invalid file format")
        setStatusMessage("Failed to load project")
        setStatusType("error")
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (event.target) {
      event.target.value = ""
    }
  }

  const handleOpenFolder = () => {
    setShowOpenFolderDialog(true)
  }

  const confirmOpenFolder = () => {
    // In a real implementation, this would use the File System Access API
    // to open a folder and read its contents

    // For now, we'll simulate opening a folder with some example files
    const exampleFiles = [
      {
        name: "main.c",
        path: "main.c",
        content: code,
      },
      {
        name: "gpio.c",
        path: "gpio.c",
        content: `/**
 * @file gpio.c
 * @brief GPIO driver implementation
 */
#include "gpio.h"

void GPIO_Init(GPIO_TypeDef* GPIOx, GPIO_InitTypeDef* GPIO_Init) {
  uint32_t position =   0x00;
  uint32_t iocurrent = 0x00;
  uint32_t temp = 0x00;
  
  /* Configure the port pins */
  for (position = 0; position < 16; position++) {
    /* Get the IO position */
    iocurrent = (GPIO_Init->Pin) & (1 << position);
    
    if (iocurrent) {
      /* Configure IO Direction mode (Input, Output, Alternate or Analog) */
      temp = GPIOx->MODER;
      temp &= ~(GPIO_MODER_MODER0 << (position * 2));
      temp |= ((GPIO_Init->Mode & GPIO_MODE_OUTPUT_PP) << (position * 2));
      GPIOx->MODER = temp;
      
      /* Configure the IO Speed */
      temp = GPIOx->OSPEEDR;
      temp &= ~(GPIO_OSPEEDER_OSPEEDR0 << (position * 2));
      temp |= (GPIO_Init->Speed << (position * 2));
      GPIOx->OSPEEDR = temp;
      
      /* Configure the IO Output Type */
      temp = GPIOx->OTYPER;
      temp &= ~(GPIO_OTYPER_OT_0 << position);
      temp |= (((GPIO_Init->Mode & GPIO_OUTPUT_TYPE) >> 4) << position);
      GPIOx->OTYPER = temp;
      
      /* Activate the Pull-up or Pull down resistor for the current IO */
      temp = GPIOx->PUPDR;
      temp &= ~(GPIO_PUPDR_PUPDR0 << (position * 2));
      temp |= ((GPIO_Init->Pull) << (position * 2));
      GPIOx->PUPDR = temp;
    }
  }
}

void GPIO_WritePin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin, GPIO_PinState PinState) {
  if (PinState != GPIO_PIN_RESET) {
    GPIOx->BSRR = GPIO_Pin;
  } else {
    GPIOx->BSRR = (uint32_t)GPIO_Pin << 16;
  }
}

GPIO_PinState GPIO_ReadPin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin) {
  GPIO_PinState bitstatus;
  
  if ((GPIOx->IDR & GPIO_Pin) != (uint32_t)GPIO_PIN_RESET) {
    bitstatus = GPIO_PIN_SET;
  } else {
    bitstatus = GPIO_PIN_RESET;
  }
  
  return bitstatus;
}

void GPIO_TogglePin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin) {
  GPIOx->ODR ^= GPIO_Pin;
}
`,
      },
      {
        name: "gpio.h",
        path: "gpio.h",
        content: `/**
 * @file gpio.h
 * @brief GPIO driver header
 */
#ifndef __GPIO_H
#define __GPIO_H

#include "stm32f4xx.h"

/**
 * @brief GPIO Configuration Mode enumeration
 */
typedef enum {
  GPIO_MODE_INPUT = 0x00000000U,   /*!< Input Floating Mode */
  GPIO_MODE_OUTPUT_PP = 0x00000001U,   /*!< Output Push Pull Mode */
  GPIO_MODE_OUTPUT_OD = 0x00000011U,   /*!< Output Open Drain Mode */
  GPIO_MODE_AF_PP = 0x00000002U,   /*!< Alternate Function Push Pull Mode */
  GPIO_MODE_AF_OD = 0x00000012U,   /*!< Alternate Function Open Drain Mode */
  GPIO_MODE_ANALOG = 0x00000003U,   /*!< Analog Mode */
} GPIO_ModeTypeDef;

/**
 * @brief GPIO Output Type enumeration
 */
typedef enum {
  GPIO_OUTPUT_PUSHPULL = 0x00000000U,  /*!< Push Pull Mode */
  GPIO_OUTPUT_OPENDRAIN = 0x00000001U  /*!< Open Drain Mode */
} GPIO_OutputTypeTypeDef;

/**
 * @brief GPIO Pull-Up Pull-Down enumeration
 */
typedef enum {
  GPIO_NOPULL = 0x00000000U,   /*!< No Pull-up or Pull-down activation */
  GPIO_PULLUP = 0x00000001U,   /*!< Pull-up activation */
  GPIO_PULLDOWN = 0x00000002U  /*!< Pull-down activation */
} GPIO_PullTypeDef;

/**
 * @brief GPIO Speed enumeration
 */
typedef enum {
  GPIO_SPEED_FREQ_LOW = 0x00000000U,    /*!< Low speed */
  GPIO_SPEED_FREQ_MEDIUM = 0x00000001U, /*!< Medium speed */
  GPIO_SPEED_FREQ_HIGH = 0x00000002U,   /*!< High speed */
  GPIO_SPEED_FREQ_VERY_HIGH = 0x00000003U  /*!< Very high speed */
} GPIO_SpeedTypeDef;

/**
 * @brief GPIO Bit SET and Bit RESET enumeration
 */
typedef enum {
  GPIO_PIN_RESET = 0U,
  GPIO_PIN_SET
} GPIO_PinState;

/**
 * @brief  GPIO Init structure definition
 */
typedef struct {
  uint32_t Pin;        /*!< Specifies the GPIO pins to be configured */
  GPIO_ModeTypeDef Mode;      /*!< Specifies the operating mode for the selected pins */
  GPIO_SpeedTypeDef Speed;     /*!< Specifies the speed for the selected pins */
  GPIO_PullTypeDef Pull;      /*!< Specifies the Pull-up or Pull-Down activation for the selected pins */
} GPIO_InitTypeDef;

/* GPIO pins definitions */
#define GPIO_PIN_0                 ((uint16_t)0x0001)  /* Pin 0 selected */
#define GPIO_PIN_1                 ((uint16_t)0x0002)  /* Pin 1 selected */
#define GPIO_PIN_2                 ((uint16_t)0x0004)  /* Pin 2 selected */
#define GPIO_PIN_3                 ((uint16_t)0x0008)  /* Pin 3 selected */
#define GPIO_PIN_4                 ((uint16_t)0x0010)  /* Pin 4 selected */
#define GPIO_PIN_5                 ((uint16_t)0x0020)  /* Pin 5 selected */
#define GPIO_PIN_6                 ((uint16_t)0x0040)  /* Pin 6 selected */
#define GPIO_PIN_7                 ((uint16_t)0x0080)  /* Pin 7 selected */
#define GPIO_PIN_8                 ((uint16_t)0x0100)  /* Pin 8 selected */
#define GPIO_PIN_9                 ((uint16_t)0x0200)  /* Pin 9 selected */
#define GPIO_PIN_10                ((uint16_t)0x0400)  /* Pin 10 selected */
#define GPIO_PIN_11                ((uint16_t)0x0800)  /* Pin 11 selected */
#define GPIO_PIN_12                ((uint16_t)0x1000)  /* Pin 12 selected */
#define GPIO_PIN_13                ((uint16_t)0x2000)  /* Pin 13 selected */
#define GPIO_PIN_14                ((uint16_t)0x4000)  /* Pin 14 selected */
#define GPIO_PIN_15                ((uint16_t)0x8000)  /* Pin 15 selected */
#define GPIO_PIN_All               ((uint16_t)0xFFFF)  /* All pins selected */

/* GPIO mode register definitions */
#define GPIO_MODER_MODER0          0x00000003U
#define GPIO_OSPEEDER_OSPEEDR0     0x00000003U
#define GPIO_OTYPER_OT_0           0x00000001U
#define GPIO_PUPDR_PUPDR0          0x00000003U
#define GPIO_OUTPUT_TYPE           0x00000010U

/* Function prototypes */
void GPIO_Init(GPIO_TypeDef* GPIOx, GPIO_InitTypeDef* GPIO_Init);
void GPIO_WritePin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin, GPIO_PinState PinState);
GPIO_PinState GPIO_ReadPin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);
void GPIO_TogglePin(GPIO_TypeDef* GPIOx, uint16_t GPIO_Pin);

#endif /* __GPIO_H */
`,
      },
      {
        name: "stm32f4xx.h",
        path: "stm32f4xx.h",
        content: `/**
 * @file stm32f4xx.h
 * @brief CMSIS STM32F4xx Device Peripheral Access Layer Header File
 */
#ifndef __STM32F4xx_H
#define __STM32F4xx_H

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

/**
 * @brief Configuration of the Cortex-M4 Processor and Core Peripherals
 */
#define __CM4_REV                 0x0001U  /*!< Core revision r0p1 */
#define __MPU_PRESENT             1U       /*!< STM32F4XX provides an MPU */
#define __NVIC_PRIO_BITS          4U       /*!< STM32F4XX uses 4 Bits for the Priority Levels */
#define __Vendor_SysTickConfig    0U       /*!< Set to 1 if different SysTick Config is used */
#define __FPU_PRESENT             1U       /*!< FPU present */

/**
 * @brief STM32F4XX Interrupt Number Definition, according to the selected device
 */
typedef enum
{
/******  Cortex-M4 Processor Exceptions Numbers ****************************************************************/
  NonMaskableInt_IRQn         = -14,    /*!< 2 Non Maskable Interrupt */
  MemoryManagement_IRQn       = -12,    /*!< 4 Cortex-M4 Memory Management Interrupt */
  BusFault_IRQn               = -11,    /*!< 5 Cortex-M4 Bus Fault Interrupt */
  UsageFault_IRQn             = -10,    /*!< 6 Cortex-M4 Usage Fault Interrupt */
  SVCall_IRQn                 = -5,     /*!< 11 Cortex-M4 SV Call Interrupt */
  DebugMonitor_IRQn           = -4,     /*!< 12 Cortex-M4 Debug Monitor Interrupt */
  PendSV_IRQn                 = -2,     /*!< 14 Cortex-M4 Pend SV Interrupt */
  SysTick_IRQn                = -1,     /*!< 15 Cortex-M4 System Tick Interrupt */
/******  STM32 specific Interrupt Numbers **********************************************************************/
  WWDG_IRQn                   = 0,      /*!< Window WatchDog Interrupt */
  PVD_IRQn                    = 1,      /*!< PVD through EXTI Line detection Interrupt */
  TAMP_STAMP_IRQn             = 2,      /*!< Tamper and TimeStamps through the EXTI line Interrupt */
  RTC_WKUP_IRQn               = 3,      /*!< RTC Wakeup through the EXTI line Interrupt */
  FLASH_IRQn                  = 4,      /*!< FLASH global Interrupt */
  RCC_IRQn                    = 5,      /*!< RCC global Interrupt */
  EXTI0_IRQn                  = 6,      /*!< EXTI Line0 Interrupt */
  EXTI1_IRQn                  = 7,      /*!< EXTI Line1 Interrupt */
  EXTI2_IRQn                  = 8,      /*!< EXTI Line2 Interrupt */
  EXTI3_IRQn                  = 9,      /*!< EXTI Line3 Interrupt */
  EXTI4_IRQn                  = 10,     /*!< EXTI Line4 Interrupt */
  DMA1_Stream0_IRQn           = 11,     /*!< DMA1 Stream 0 global Interrupt */
  DMA1_Stream1_IRQn           = 12,     /*!< DMA1 Stream 1 global Interrupt */
  DMA1_Stream2_IRQn           = 13,     /*!< DMA1 Stream 2 global Interrupt */
  DMA1_Stream3_IRQn           = 14,     /*!< DMA1 Stream 3 global Interrupt */
  DMA1_Stream4_IRQn           = 15,     /*!< DMA1 Stream 4 global Interrupt */
  DMA1_Stream5_IRQn           = 16,     /*!< DMA1 Stream 6 global Interrupt */
  DMA1_Stream6_IRQn           = 17,     /*!< DMA1 Stream 6 global Interrupt */
  ADC_IRQn                    = 18      /*!< ADC1, ADC2 and ADC3 global Interrupts */
} IRQn_Type;

/* Memory mapping of Core Hardware */
#define SCS_BASE            (0xE000E000UL)                            /*!< System Control Space Base Address */
#define ITM_BASE            (0xE0000000UL)                            /*!< ITM Base Address */
#define DWT_BASE            (0xE0001000UL)                            /*!< DWT Base Address */
#define TPI_BASE            (0xE0040000UL)                            /*!< TPI Base Address */
#define CoreDebug_BASE      (0xE000EDF0UL)                            /*!< Core Debug Base Address */
#define SysTick_BASE        (SCS_BASE +  0x0010UL)                    /*!< SysTick Base Address */
#define NVIC_BASE           (SCS_BASE +  0x0100UL)                    /*!< NVIC Base Address */
#define SCB_BASE            (SCS_BASE +  0x0D00UL)                    /*!< System Control Block Base Address */

/* Memory mapping of Peripherals */
#define PERIPH_BASE         (0x40000000UL)                            /*!< Peripheral base address */
#define APB1PERIPH_BASE     (PERIPH_BASE)
#define APB2PERIPH_BASE     (PERIPH_BASE + 0x00010000UL)
#define AHB1PERIPH_BASE     (PERIPH_BASE + 0x00020000UL)
#define AHB2PERIPH_BASE     (PERIPH_BASE + 0x10000000UL)

/* GPIO peripheral base addresses */
#define GPIOA_BASE          (AHB1PERIPH_BASE + 0x0000UL)
#define GPIOB_BASE          (AHB1PERIPH_BASE + 0x0400UL)
#define GPIOC_BASE          (AHB1PERIPH_BASE + 0x0800UL)
#define GPIOD_BASE          (AHB1PERIPH_BASE + 0x0C00UL)
#define GPIOE_BASE          (AHB1PERIPH_BASE + 0x1000UL)
#define GPIOF_BASE          (AHB1PERIPH_BASE + 0x1400UL)
#define GPIOG_BASE          (AHB1PERIPH_BASE + 0x1800UL)
#define GPIOH_BASE          (AHB1PERIPH_BASE + 0x1C00UL)
#define GPIOI_BASE          (AHB1PERIPH_BASE + 0x2000UL)

/* RCC peripheral base address */
#define RCC_BASE            (AHB1PERIPH_BASE + 0x3800UL)

/* Flash peripheral base address */
#define FLASH_R_BASE        (AHB1PERIPH_BASE + 0x3C00UL)

/* GPIO register structure */
typedef struct
{
  volatile uint32_t MODER;    /*!< GPIO port mode register,               Address offset: 0x00      */
  volatile uint32_t OTYPER;   /*!< GPIO port output type register,        Address offset: 0x04      */
  volatile uint32_t OSPEEDR;  /*!< GPIO port output speed register,       Address offset: 0x08      */
  volatile uint32_t PUPDR;    /*!< GPIO port pull-up/pull-down register,  Address offset: 0x0C      */
  volatile uint32_t IDR;      /*!< GPIO port input data register,         Address offset: 0x10      */
  volatile uint32_t ODR;      /*!< GPIO port output data register,        Address offset: 0x14      */
  volatile uint32_t BSRR;     /*!< GPIO port bit set/reset register,      Address offset: 0x18      */
  volatile uint32_t LCKR;     /*!< GPIO port configuration lock register, Address offset: 0x1C      */
  volatile uint32_t AFR[2];   /*!< GPIO alternate function registers,     Address offset: 0x20-0x24 */
} GPIO_TypeDef;

/* GPIO peripheral instances */
#define GPIOA               ((GPIO_TypeDef *) GPIOA_BASE)
#define GPIOB               ((GPIO_TypeDef *) GPIOB_BASE)
#define GPIOC               ((GPIO_TypeDef *) GPIOC_BASE)
#define GPIOD               ((GPIO_TypeDef *) GPIOD_BASE)
#define GPIOE               ((GPIO_TypeDef *) GPIOE_BASE)
#define GPIOF               ((GPIO_TypeDef *) GPIOF_BASE)
#define GPIOG               ((GPIO_TypeDef *) GPIOG_BASE)
#define GPIOH               ((GPIO_TypeDef *) GPIOH_BASE)
#define GPIOI               ((GPIO_TypeDef *) GPIOI_BASE)

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* __STM32F4xx_H */
`,
      },
    ]

    setProjectFiles(exampleFiles)

    // Update main.c content
    const mainFile = exampleFiles.find((f) => f.path === "main.c")
    if (mainFile) {
      setCode(mainFile.content)
    }

    setFolderPath("")
    setShowOpenFolderDialog(false)

    addCodeLog("Folder opened successfully")
    setStatusMessage("Folder opened successfully")
    setStatusType("success")
  }

  const clearCodeErrors = () => {
    setCodeErrors([])
  }

  // Enhance the handleCreateFolder function to properly create folder structure
  const handleCreateFolder = (path: string) => {
    // Create a new folder
    const folderName = path.split("/").pop() || path
    const pathParts = path.split("/").filter(Boolean)

    // Ensure parent directories exist
    let currentPath = ""
    for (let i = 0; i < pathParts.length; i++) {
      currentPath += "/" + pathParts[i]

      // Check if this directory exists
      const dirExists = projectFiles.some((file) => {
        return file.path.startsWith(currentPath + "/") && file.path !== currentPath
      })

      // If not, create a placeholder file to represent it
      if (!dirExists) {
        const placeholderFile = {
          name: pathParts[i],
          path: currentPath + "/.directory",
          content: "",
        }

        if (!projectFiles.some((file) => file.path === placeholderFile.path)) {
          setProjectFiles((prev) => [...prev, placeholderFile])
        }
      }
    }

    setStatusMessage(`Created new folder: ${path}`)
    setStatusType("success")
  }

  // Add a function to load a complete project structure with all necessary files
  const loadCompleteProjectStructure = () => {
    // Define a proper STM32 project structure
    const completeProjectFiles = [
      // Core files
      { name: "main.c", path: "/Core/Src/main.c", content: getDefaultCode(selectedBoard) },
      { name: "stm32f4xx_hal_msp.c", path: "/Core/Src/stm32f4xx_hal_msp.c", content: "// HAL MSP Implementation" },
      { name: "stm32f4xx_it.c", path: "/Core/Src/stm32f4xx_it.c", content: "// Interrupt Handlers" },
      { name: "main.h", path: "/Core/Inc/main.h", content: "// Main Header" },
      { name: "stm32f4xx_hal_conf.h", path: "/Core/Inc/stm32f4xx_hal_conf.h", content: "// HAL Configuration" },
      { name: "stm32f4xx_it.h", path: "/Core/Inc/stm32f4xx_it.h", content: "// Interrupt Handlers Header" },

      // Drivers
      {
        name: "stm32f4xx_hal.c",
        path: "/Drivers/STM32F4xx_HAL_Driver/Src/stm32f4xx_hal.c",
        content: "// HAL Implementation",
      },
      {
        name: "stm32f4xx_hal_gpio.c",
        path: "/Drivers/STM32F4xx_HAL_Driver/Src/stm32f4xx_hal_gpio.c",
        content: "// GPIO Implementation",
      },
      {
        name: "stm32f4xx_hal_uart.c",
        path: "/Drivers/STM32F4xx_HAL_Driver/Src/stm32f4xx_hal_uart.c",
        content: "// UART Implementation",
      },
      { name: "stm32f4xx_hal.h", path: "/Drivers/STM32F4xx_HAL_Driver/Inc/stm32f4xx_hal.h", content: "// HAL Header" },
      {
        name: "stm32f4xx_hal_gpio.h",
        path: "/Drivers/STM32F4xx_HAL_Driver/Inc/stm32f4xx_hal_gpio.h",
        content: "// GPIO Header",
      },
      {
        name: "stm32f4xx_hal_uart.h",
        path: "/Drivers/STM32F4xx_HAL_Driver/Inc/stm32f4xx_hal_uart.h",
        content: "// UART Header",
      },

      // CMSIS
      {
        name: "stm32f4xx.h",
        path: "/Drivers/CMSIS/Device/ST/STM32F4xx/Include/stm32f4xx.h",
        content: "// CMSIS Device Header",
      },
      {
        name: "system_stm32f4xx.c",
        path: "/Drivers/CMSIS/Device/ST/STM32F4xx/Source/system_stm32f4xx.c",
        content: "// System Initialization",
      },

      // Startup
      { name: "startup_stm32f446xx.s", path: "/Startup/startup_stm32f446xx.s", content: "// Startup Assembly" },

      // Build files
      { name: "Makefile", path: "/Makefile", content: "# Build configuration" },
      { name: "STM32F446RETx_FLASH.ld", path: "/STM32F446RETx_FLASH.ld", content: "/* Linker Script */" },

      // Application files
      { name: "gpio.c", path: "/Core/Src/gpio.c", content: "// GPIO Configuration" },
      { name: "uart.c", path: "/Core/Src/uart.c", content: "// UART Configuration" },
      { name: "gpio.h", path: "/Core/Inc/gpio.h", content: "// GPIO Header" },
      { name: "uart.h", path: "/Core/Inc/uart.h", content: "// UART Header" },

      // Example files
      { name: "blinky.c", path: "/Examples/blinky.c", content: "// LED Blink Example" },
      { name: "uart_example.c", path: "/Examples/uart_example.c", content: "// UART Example" },
      { name: "adc_example.c", path: "/Examples/adc_example.c", content: "// ADC Example" },
    ]

    // Update with the new files
    setProjectFiles(completeProjectFiles)

    // Set main.c as the active file
    const mainFile = completeProjectFiles.find((file) => file.path === "/Core/Src/main.c")
    if (mainFile) {
      setActiveFile(mainFile.path)
      setCode(mainFile.content)
    }

    setStatusMessage("Loaded complete project structure")
    setStatusType("success")
  }

  // Initialize the project structure only once on mount
  useEffect(() => {
    loadCompleteProjectStructure()
  }, []) // Empty dependency array ensures this runs once

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${darkMode ? "dark" : ""}`}>
      <div className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700 p-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold dark:text-white">STM32 Nucleo EduBase</h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">{projectName}</span>
          </div>

          <div className="flex items-center gap-4">
            <Select value={selectedBoard} onValueChange={handleBoardChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="F446RE">Nucleo F446RE</SelectItem>
                <SelectItem value="F031K6">Nucleo F031K6</SelectItem>
                <SelectItem value="L476RG">Nucleo L476RG</SelectItem>
              </SelectContent>
            </Select>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setShowSettingsDialog(true)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Add scrollable containers to main layout */}
      <div className="flex-grow flex flex-col overflow-hidden p-2 gap-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Create a new project with default template
                import("@/lib/code-templates").then(({ getDefaultCode }) => {
                  setCode(getDefaultCode(selectedBoard))
                  setProjectName("New Project")
                  setProjectFiles([])
                  setStatusMessage("New project created")
                  setStatusType("success")
                })
              }}
              className="flex items-center gap-1"
            >
              <FileIcon className="h-4 w-4" />
              <span>New</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenFolder} className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4" />
              <span>Open Folder</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveProject} className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              <span>Save</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLoadProject} className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span>Load</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <USBConnection onConnectionChange={handleUSBConnection} boardType={selectedBoard} />

            <Button onClick={handleCompile} disabled={isCompiling} size="sm" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              <span>{isCompiling ? "Compiling..." : "Compile"}</span>
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!isConnected || !compiledCode || isUploading}
              size="sm"
              className="flex items-center gap-1"
            >
              <Upload className="h-4 w-4" />
              <span>{isUploading ? "Uploading..." : "Upload"}</span>
            </Button>
            <Button
              onClick={handleRunStop}
              disabled={!isConnected}
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
            <Button
              onClick={handleDebug}
              disabled={!isConnected || !compiledCode}
              variant={isDebugging ? "destructive" : "outline"}
              size="sm"
              className="flex items-center gap-1"
            >
              <Bug className="h-4 w-4" />
              <span>{isDebugging ? "Stop Debug" : "Debug"}</span>
            </Button>
            {isDebugging && (
              <Button
                onClick={handleStepProgram}
                disabled={!isConnected || !isDebugging}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <StepForward className="h-4 w-4" />
                <span>Step</span>
              </Button>
            )}
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-grow border rounded-lg overflow-hidden">
          <ResizablePanel defaultSize={20} minSize={15}>
            <Tabs defaultValue="explorer" className="h-full flex flex-col">
              <TabsList className="mx-4 justify-start">
                <TabsTrigger value="explorer" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Explorer</span>
                </TabsTrigger>
                <TabsTrigger value="memory" className="flex items-center gap-2">
                  <Memory className="h-4 w-4" />
                  <span>Memory</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="explorer" className="flex-grow p-0 m-0 overflow-auto">
                <FileExplorer
                  files={projectFiles}
                  onFileSelect={handleFileSelect}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                  activeFile={activeFile}
                  darkMode={darkMode}
                />
              </TabsContent>

              <TabsContent value="memory" className="flex-grow p-0 m-0 overflow-auto">
                <RegisterViewer
                  registers={registerValues}
                  boardType={selectedBoard}
                  onRefresh={readMemoryAndRegisters}
                  isConnected={isConnected}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizablePanel defaultSize={80}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="mx-4 justify-start overflow-x-auto">
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  <span>Code Editor</span>
                </TabsTrigger>
                <TabsTrigger value="pinout" className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>Pinout</span>
                </TabsTrigger>
                <TabsTrigger value="board" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Board Simulation</span>
                </TabsTrigger>
                <TabsTrigger value="memory" className="flex items-center gap-2">
                  <Memory className="h-4 w-4" />
                  <span>Memory</span>
                </TabsTrigger>
                <TabsTrigger value="terminal" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span>Terminals</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab content with proper overflow handling */}
              <TabsContent value="code" className="flex-grow p-0 m-0 overflow-hidden">
                <VSCodeEditor
                  initialCode={code}
                  onChange={handleCodeChange}
                  errors={codeErrors}
                  boardType={selectedBoard}
                  darkMode={darkMode}
                  onCompile={handleCompile}
                  onRun={handleRunStop}
                  onStop={handleRunStop}
                  files={projectFiles}
                  onFilesChange={handleFilesChange}
                  activeFile={activeFile}
                  onActiveFileChange={setActiveFile}
                />
              </TabsContent>

              <TabsContent value="pinout" className="flex-grow p-0 m-0 overflow-auto">
                <PinoutDiagram
                  selectedPins={selectedPins}
                  pinConfigurations={pinConfigurations}
                  onPinSelection={handlePinSelection}
                  boardType={selectedBoard}
                  darkMode={darkMode}
                  isConnected={isConnected}
                  onRefreshPins={readMemoryAndRegisters}
                />
              </TabsContent>

              <TabsContent value="board" className="flex-grow p-0 m-0 overflow-auto">
                <NucleoBoard
                  simulationResult={simulationResult}
                  selectedPins={selectedPins}
                  pinConfigurations={pinConfigurations}
                  boardType={selectedBoard}
                  isConnected={isConnected}
                  isRunning={isRunning}
                  darkMode={darkMode}
                />
              </TabsContent>

              <TabsContent value="memory" className="flex-grow p-0 m-0 overflow-auto">
                <MemoryViewer
                  memoryData={memoryData}
                  isConnected={isConnected}
                  onRefresh={readMemoryAndRegisters}
                  darkMode={darkMode}
                  setStatusMessage={setStatusMessage}
                  setStatusType={setStatusType}
                />
              </TabsContent>

              <TabsContent value="terminal" className="flex-grow p-0 m-0 overflow-auto">
                <ResizablePanelGroup direction="vertical" className="h-full overflow-hidden">
                  <ResizablePanel defaultSize={100}>
                    <EnhancedTerminal
                      files={projectFiles}
                      onFilesChange={handleFilesChange}
                      onCompile={handleCompile}
                      onRun={handleRunStop}
                      onStop={handleRunStop}
                      onCreateFile={handleCreateFile}
                      onDeleteFile={handleDeleteFile}
                      onRenameFile={handleRenameFile}
                      boardType={selectedBoard}
                      darkMode={darkMode}
                      isRunning={isRunning}
                      isCompiling={isCompiling}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <StatusBar
        message={statusMessage}
        type={statusType}
        darkMode={darkMode}
        isConnected={isConnected}
        deviceInfo={deviceInfo}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-detect">Auto-detect board type</Label>
              <Switch id="auto-detect" checked={autoDetectBoard} onCheckedChange={setAutoDetectBoard} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark mode</Label>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Project Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-name" className="text-right">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file-name" className="text-right">
                File Name
              </Label>
              <Input
                id="file-name"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveProject}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Folder Dialog */}
      <Dialog open={showOpenFolderDialog} onOpenChange={setShowOpenFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open Folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-path" className="text-right">
                Folder Path
              </Label>
              <Input
                id="folder-path"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="C:\Projects\STM32"
                className="col-span-3"
              />
            </div>
            <p className="text-sm text-gray-500">
              Note: In this demo, we'll load example files instead of accessing your file system.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmOpenFolder}>Open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
    </div>
  )
}
