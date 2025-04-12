"use client"

import { useState, useEffect, useRef } from "react"
import * as monaco from "monaco-editor"
import { stm32Definitions } from "@/lib/stm32-definitions"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FileCode,
  Copy,
  Edit,
  Trash,
  Search,
  Save,
  Plus,
  Settings,
  Pause,
  Play,
  X,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { JSX } from "react"

interface FileTreeItem {
  id: string
  name: string
  type: "file" | "folder"
  children?: FileTreeItem[]
  content?: string
  language?: string
  path: string
  isOpen?: boolean
  isEdited?: boolean
}

interface AdvancedCodeEditorProps {
  initialCode?: string
  onChange?: (code: string) => void
  errors?: string[]
  boardType: string
  darkMode: boolean
  className?: string
  onCompile?: (code: string) => void
  onRun?: () => void
  onStop?: () => void
  isRunning?: boolean
  isCompiling?: boolean
}

// Dummy content for files
const getGpioC = () => `// gpio.c content`
const getUartC = () => `// uart.c content`
const getGpioH = () => `// gpio.h content`
const getUartH = () => `// uart.h content`
const getStm32HalH = () => `// stm32f4xx_hal.h content`
const getStm32HalGpioH = () => `// stm32f4xx_hal_gpio.h content`
const getStm32HalUartH = () => `// stm32f4xx_hal_uart.h content`
const getBlinkyExample = () => `// blinky.c content`
const getUartExample = () => `// uart_example.c content`
const getAdcExample = () => `// adc_example.c content`
const getMakefile = () => `// Makefile content`
const getLinkerScript = () => `// linker_script.ld content`

// Define language extensions
const LANGUAGE_MAP: Record<string, string> = {
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".s": "asm",
  ".asm": "asm",
  ".txt": "plaintext",
  ".md": "markdown",
  ".json": "json",
  ".ld": "plaintext",
}

// Define file icons
const FILE_ICONS: Record<string, JSX.Element> = {
  ".c": <FileCode className="h-4 w-4 text-blue-500" />,
  ".h": <FileCode className="h-4 w-4 text-purple-500" />,
  ".cpp": <FileCode className="h-4 w-4 text-green-500" />,
  ".hpp": <FileCode className="h-4 w-4 text-yellow-500" />,
  ".s": <FileCode className="h-4 w-4 text-orange-500" />,
  ".asm": <FileCode className="h-4 w-4 text-orange-500" />,
  ".txt": <File className="h-4 w-4" />,
  ".md": <File className="h-4 w-4" />,
  ".json": <File className="h-4 w-4" />,
  ".ld": <File className="h-4 w-4" />,
  makefile: <FileCode className="h-4 w-4 text-red-500" />,
}

// Dummy content for default files
const getDefaultMainC = () => `// main.c content`
const getDefaultHalMspC = () => `// stm32f4xx_hal_msp.c content`
const getDefaultMainH = () => `// main.h content`
const getDefaultHalConfH = () => `// stm32f4xx_hal_conf.h content`

export default function AdvancedCodeEditor({
  initialCode = "",
  onChange,
  errors = [],
  boardType,
  darkMode,
  className,
  onCompile,
  onRun,
  onStop,
  isRunning = false,
  isCompiling = false,
}: AdvancedCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [markers, setMarkers] = useState<monaco.editor.IMarkerData[]>([])
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([])
  const [activeFile, setActiveFile] = useState<FileTreeItem | null>(null)
  const [openFiles, setOpenFiles] = useState<FileTreeItem[]>([])
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFileType, setNewFileType] = useState<"file" | "folder">("file")
  const [newFileParentPath, setNewFileParentPath] = useState("/")
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameItemId, setRenameItemId] = useState("")
  const [renameValue, setRenameValue] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState("")
  const [deleteItemName, setDeleteItemName] = useState("")
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ file: FileTreeItem; line: number; content: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [editorTheme, setEditorTheme] = useState(darkMode ? "stm32-dark" : "stm32-light")
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: "on" as "on" | "off",
    minimap: true,
    lineNumbers: true,
    formatOnPaste: true,
    formatOnType: true,
    autoIndent: "full" as "none" | "keep" | "brackets" | "full" | "advanced",
    renderWhitespace: "selection" as "none" | "boundary" | "selection" | "trailing" | "all",
    cursorBlinking: "blink" as "blink" | "smooth" | "phase" | "expand" | "solid",
    cursorStyle: "line" as "line" | "block" | "underline" | "line-thin" | "block-outline" | "underline-thin",
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    mouseWheelZoom: true,
    contextmenu: true,
    quickSuggestions: true,
    acceptSuggestionOnEnter: "on",
    suggestOnTriggerCharacters: true,
    folding: true,
    foldingStrategy: "auto" as "auto" | "indentation",
  })
  const [diagnostics, setDiagnostics] = useState<monaco.editor.IMarkerData[]>([])
  const [showProblemsPanel, setShowProblemsPanel] = useState(false)
  const [problemsPanelHeight, setProblemsPanelHeight] = useState(200)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [contextMenuTarget, setContextMenuTarget] = useState<FileTreeItem | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showFindWidget, setShowFindWidget] = useState(false)
  const [findText, setFindText] = useState("")
  const [replaceText, setReplaceText] = useState("")
  const [findResults, setFindResults] = useState<monaco.editor.FindMatch[]>([])
  const [currentFindIndex, setCurrentFindIndex] = useState(-1)
  const [isCaseSensitive, setIsCaseSensitive] = useState(false)
  const [isWholeWord, setIsWholeWord] = useState(false)
  const [isRegex, setIsRegex] = useState(false)

  // Initialize file tree with default files and additional example files
  useEffect(() => {
    const defaultFiles: FileTreeItem[] = [
      {
        id: "src",
        name: "src",
        type: "folder",
        path: "/src",
        isOpen: true,
        children: [
          {
            id: "main.c",
            name: "main.c",
            type: "file",
            path: "/src/main.c",
            language: "c",
            content: initialCode || getDefaultMainC(),
          },
          {
            id: "stm32f4xx_hal_msp.c",
            name: "stm32f4xx_hal_msp.c",
            type: "file",
            path: "/src/stm32f4xx_hal_msp.c",
            language: "c",
            content: getDefaultHalMspC(),
          },
          {
            id: "gpio.c",
            name: "gpio.c",
            type: "file",
            path: "/src/gpio.c",
            language: "c",
            content: getGpioC(),
          },
          {
            id: "uart.c",
            name: "uart.c",
            type: "file",
            path: "/src/uart.c",
            language: "c",
            content: getUartC(),
          },
        ],
      },
      {
        id: "inc",
        name: "inc",
        type: "folder",
        path: "/inc",
        isOpen: true,
        children: [
          {
            id: "main.h",
            name: "main.h",
            type: "file",
            path: "/inc/main.h",
            language: "c",
            content: getDefaultMainH(),
          },
          {
            id: "stm32f4xx_hal_conf.h",
            name: "stm32f4xx_hal_conf.h",
            type: "file",
            path: "/inc/stm32f4xx_hal_conf.h",
            language: "c",
            content: getDefaultHalConfH(),
          },
          {
            id: "gpio.h",
            name: "gpio.h",
            type: "file",
            path: "/inc/gpio.h",
            language: "c",
            content: getGpioH(),
          },
          {
            id: "uart.h",
            name: "uart.h",
            type: "file",
            path: "/inc/uart.h",
            language: "c",
            content: getUartH(),
          },
        ],
      },
      {
        id: "drivers",
        name: "drivers",
        type: "folder",
        path: "/drivers",
        isOpen: false,
        children: [
          {
            id: "stm32f4xx_hal.h",
            name: "stm32f4xx_hal.h",
            type: "file",
            path: "/drivers/stm32f4xx_hal.h",
            language: "c",
            content: getStm32HalH(),
          },
          {
            id: "stm32f4xx_hal_gpio.h",
            name: "stm32f4xx_hal_gpio.h",
            type: "file",
            path: "/drivers/stm32f4xx_hal_gpio.h",
            language: "c",
            content: getStm32HalGpioH(),
          },
          {
            id: "stm32f4xx_hal_uart.h",
            name: "stm32f4xx_hal_uart.h",
            type: "file",
            path: "/drivers/stm32f4xx_hal_uart.h",
            language: "c",
            content: getStm32HalUartH(),
          },
        ],
      },
      {
        id: "examples",
        name: "examples",
        type: "folder",
        path: "/examples",
        isOpen: false,
        children: [
          {
            id: "blinky.c",
            name: "blinky.c",
            type: "file",
            path: "/examples/blinky.c",
            language: "c",
            content: getBlinkyExample(),
          },
          {
            id: "uart_example.c",
            name: "uart_example.c",
            type: "file",
            path: "/examples/uart_example.c",
            language: "c",
            content: getUartExample(),
          },
          {
            id: "adc_example.c",
            name: "adc_example.c",
            type: "file",
            path: "/examples/adc_example.c",
            language: "c",
            content: getAdcExample(),
          },
        ],
      },
      {
        id: "build",
        name: "build",
        type: "folder",
        path: "/build",
        isOpen: false,
        children: [
          {
            id: "makefile",
            name: "Makefile",
            type: "file",
            path: "/build/Makefile",
            language: "makefile",
            content: getMakefile(),
          },
          {
            id: "linker_script.ld",
            name: "linker_script.ld",
            type: "file",
            path: "/build/linker_script.ld",
            language: "plaintext",
            content: getLinkerScript(),
          },
        ],
      },
    ]

    setFileTree(defaultFiles)

    // Initialize expanded folders
    const expanded = new Set<string>()
    const addExpandedFolders = (items: FileTreeItem[]) => {
      items.forEach((item) => {
        if (item.type === "folder" && item.isOpen) {
          expanded.add(item.id)
          if (item.children) {
            addExpandedFolders(item.children)
          }
        }
      })
    }
    addExpandedFolders(defaultFiles)
    setExpandedFolders(expanded)

    // Set main.c as the active file
    const mainFile = findFileById(defaultFiles, "main.c")
    if (mainFile) {
      setActiveFile(mainFile)
      setOpenFiles([mainFile])
    }
  }, [initialCode])

  // Update editor theme when dark mode changes
  useEffect(() => {
    setEditorTheme(darkMode ? "stm32-dark" : "stm32-light")
    if (monacoRef.current) {
      monaco.editor.setTheme(darkMode ? "stm32-dark" : "stm32-light")
    }
  }, [darkMode])

  // Update diagnostics when errors change
  useEffect(() => {
    if (!monacoRef.current) return

    const errorMarkers: monaco.editor.IMarkerData[] = []

    errors.forEach((error) => {
      // Try to parse error messages for line numbers with improved regex
      const lineMatch = error.match(/(?:line|at line|in line) (\d+)/i)
      const lineNumber = lineMatch ? Number.parseInt(lineMatch[1], 10) : 1

      // Try to extract column information if available
      const colMatch = error.match(/(?:column|col|position) (\d+)/i)
      const colNumber = colMatch ? Number.parseInt(colMatch[1], 10) : 1

      // Try to extract error message without line/column info
      let message = error
      if (lineMatch) {
        message = message.replace(lineMatch[0], "").trim()
      }
      if (colMatch) {
        message = message.replace(colMatch[0], "").trim()
      }
      if (message.startsWith(":")) {
        message = message.substring(1).trim()
      }

      // Try to extract file name if available
      const fileMatch = error.match(/(?:file|in file|at file) ['"]?([^'":\s]+)['"]?/i)
      const fileName = fileMatch ? fileMatch[1] : activeFile?.name || "main.c"

      errorMarkers.push({
        severity: monaco.MarkerSeverity.Error,
        message: message || error,
        startLineNumber: lineNumber,
        startColumn: colNumber,
        endLineNumber: lineNumber,
        endColumn: colNumber + 1,
        source: fileName,
      })
    })

    setDiagnostics(errorMarkers)

    if (activeFile) {
      const fileMarkers = errorMarkers.filter((marker) => marker.source === activeFile.name)
      monaco.editor.setModelMarkers(monacoRef.current.getModel()!, "owner", fileMarkers)
      setMarkers(fileMarkers)
    }
  }, [errors, activeFile])

  // Initialize Monaco editor
  useEffect(() => {
    if (!editorRef.current || !activeFile) return

    // Configure Monaco editor
    if (!monacoRef.current) {
      // Register C language
      monaco.languages.register({ id: "c" })
      monaco.languages.register({ id: "makefile" })

      // Configure syntax highlighting for C
      monaco.languages.setMonarchTokensProvider("c", {
        defaultToken: "",
        tokenPostfix: ".c",
        brackets: [
          { open: "{", close: "}", token: "delimiter.curly" },
          { open: "[", close: "]", token: "delimiter.square" },
          { open: "(", close: ")", token: "delimiter.parenthesis" },
          { open: "<", close: ">", token: "delimiter.angle" },
        ],
        keywords: [
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
          "inline",
          "restrict",
          "_Bool",
          "_Complex",
          "_Imaginary",
          "bool",
          "true",
          "false",
          "#include",
          "#define",
          "#ifdef",
          "#ifndef",
          "#endif",
          "#if",
          "#else",
          "#elif",
          "#pragma",
          "#error",
          "#warning",
        ],
        typeKeywords: [
          "uint8_t",
          "uint16_t",
          "uint32_t",
          "int8_t",
          "int16_t",
          "int32_t",
          "GPIO_TypeDef",
          "GPIO_InitTypeDef",
          "HAL_StatusTypeDef",
          "UART_HandleTypeDef",
          "ADC_HandleTypeDef",
          "TIM_HandleTypeDef",
          "SPI_HandleTypeDef",
          "I2C_HandleTypeDef",
        ],
        operators: [
          "=",
          ">",
          "<",
          "!",
          "~",
          "?",
          ":",
          "==",
          "<=",
          ">=",
          "!=",
          "&&",
          "||",
          "++",
          "--",
          "+",
          "-",
          "*",
          "/",
          "&",
          "|",
          "^",
          "%",
          "<<",
          ">>",
          ">>>",
          "+=",
          "-=",
          "*=",
          "/=",
          "&=",
          "|=",
          "^=",
          "%=",
          "<<=",
          ">>=",
        ],
        symbols: /[=><!~?:&|+\-*/^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        tokenizer: {
          root: [
            [/^#include/, { token: "keyword", next: "@include" }],
            [/^#\s*\w+/, "keyword"],
            [
              /[a-zA-Z_]\w*/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@typeKeywords": "type",
                  "@default": "identifier",
                },
              },
            ],
            { include: "@whitespace" },
            [/[{}()[\]]/, "@brackets"],
            [/[<>](?!@symbols)/, "@brackets"],
            [
              /@symbols/,
              {
                cases: {
                  "@operators": "operator",
                  "@default": "",
                },
              },
            ],
            [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F]+/, "number.hex"],
            [/\d+/, "number"],
            [/[;,.]/, "delimiter"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
            [/'[^\\']'/, "string"],
            [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
            [/'/, "string.invalid"],
          ],
          include: [
            [/(\s*)(<)([^<>]*)(>)/, ["", "delimiter.angle", "string", "delimiter.angle"]],
            [/(\s*)(")(.*)(")/, ["", "delimiter.quote", "string", "delimiter.quote"]],
          ],
          comment: [
            [/[^/*]+/, "comment"],
            [/\/\*/, "comment", "@push"],
            ["\\*/", "comment", "@pop"],
            [/[/*]/, "comment"],
          ],
          string: [
            [/[^\\"]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
          ],
          whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/\/\*/, "comment", "@comment"],
            [/\/\/.*$/, "comment"],
          ],
        },
      })

      // Configure syntax highlighting for Makefile
      monaco.languages.setMonarchTokensProvider("makefile", {
        defaultToken: "",
        tokenPostfix: ".makefile",
        brackets: [
          { open: "{", close: "}", token: "delimiter.curly" },
          { open: "[", close: "]", token: "delimiter.square" },
          { open: "(", close: ")", token: "delimiter.parenthesis" },
        ],
        keywords: ["ifeq", "ifneq", "ifdef", "ifndef", "else", "endif", "include"],
        targets: /^([A-Za-z0-9_\-/.]+):/,
        variables: /\$([^)]*)$/,
        // Define symbols explicitly
        symbols: /[=><!~?:&|+\-*/^%]+/,
        tokenizer: {
          root: [
            [/@targets/, "target"],
            [/@variables/, ["variable", "variable.name", "variable"]],
            [/^[\t ]*@?[A-Za-z0-9_-]+/, "keyword"],
            { include: "@whitespace" },
            [/[{}()[\]]/, "@brackets"],
            [/[<>]/, "delimiter"],
            [/[;,.]/, "delimiter"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
            [/'[^\\']'/, "string"],
            [/'/, "string.invalid"],
          ],
          comment: [
            [/[^#]+/, "comment"],
            [/#.*$/, "comment"],
          ],
          string: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
          ],
          whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/#.*$/, "comment"],
          ],
        },
      })

      // Configure autocompletion
      monaco.languages.registerCompletionItemProvider("c", {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          // Get STM32 definitions based on board type
          const definitions = stm32Definitions[boardType] || stm32Definitions.default

          // Create completion items
          const suggestions = [
            ...definitions.functions.map((func) => ({
              label: func.name,
              kind: monaco.languages.CompletionItemKind.Function,
              documentation: func.description,
              insertText: func.snippet || func.name,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            })),
            ...definitions.macros.map((macro) => ({
              label: macro.name,
              kind: monaco.languages.CompletionItemKind.Constant,
              documentation: macro.description,
              insertText: macro.name,
              range,
            })),
            ...definitions.types.map((type) => ({
              label: type.name,
              kind: monaco.languages.CompletionItemKind.Class,
              documentation: type.description,
              insertText: type.name,
              range,
            })),
            // Common C snippets
            {
              label: "for",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "For loop",
              insertText: "for (${1:int i = 0}; ${2:i < length}; ${3:i++}) {\n\t${4}\n}",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "if",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "If statement",
              insertText: "if (${1:condition}) {\n\t${2}\n}",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "while",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "While loop",
              insertText: "while (${1:condition}) {\n\t${2}\n}",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "switch",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "Switch statement",
              insertText:
                "switch (${1:expression}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\t${4}\n\t\tbreak;\n}",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "function",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "Function definition",
              insertText: "${1:void} ${2:functionName}(${3:parameters}) {\n\t${4}\n}",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "struct",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "Structure definition",
              insertText: "typedef struct {\n\t${1:int member};\n} ${2:StructName};",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "include",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "Include directive",
              insertText: '#include "${1:header.h}"',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "define",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "Define directive",
              insertText: "#define ${1:MACRO} ${2:value}",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
          ]

          return { suggestions }
        },
      })

      // Set editor theme based on dark mode
      monaco.editor.defineTheme("stm32-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6A9955" },
          { token: "keyword", foreground: "569CD6" },
          { token: "type", foreground: "4EC9B0" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "identifier", foreground: "9CDCFE" },
          { token: "variable", foreground: "74B0DF" },
          { token: "variable.name", foreground: "74B0DF" },
          { token: "target", foreground: "D7BA7D" },
        ],
        colors: {
          "editor.background": "#1E1E1E",
          "editor.foreground": "#D4D4D4",
          "editor.lineHighlightBackground": "#2D2D2D",
          "editorLineNumber.foreground": "#858585",
          "editor.selectionBackground": "#264F78",
          "editor.inactiveSelectionBackground": "#3A3D41",
          "editorCursor.foreground": "#AEAFAD",
          "editorWhitespace.foreground": "#3B3B3B",
          "editorIndentGuide.background": "#404040",
          "editorIndentGuide.activeBackground": "#707070",
        },
      })

      monaco.editor.defineTheme("stm32-light", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "comment", foreground: "008000" },
          { token: "keyword", foreground: "0000FF" },
          { token: "type", foreground: "267F99" },
          { token: "string", foreground: "A31515" },
          { token: "number", foreground: "098658" },
          { token: "identifier", foreground: "001080" },
          { token: "variable", foreground: "0070C1" },
          { token: "variable.name", foreground: "0070C1" },
          { token: "target", foreground: "AF00DB" },
        ],
        colors: {
          "editor.background": "#FFFFFF",
          "editor.foreground": "#000000",
          "editor.lineHighlightBackground": "#F5F5F5",
          "editorLineNumber.foreground": "#237893",
          "editor.selectionBackground": "#ADD6FF",
          "editor.inactiveSelectionBackground": "#E5EBF1",
          "editorCursor.foreground": "#000000",
          "editorWhitespace.foreground": "#BFBFBF",
          "editorIndentGuide.background": "#D3D3D3",
          "editorIndentGuide.activeBackground": "#939393",
        },
      })

      // Create editor with enhanced options
      monacoRef.current = monaco.editor.create(editorRef.current, {
        value: activeFile.content || "",
        language: activeFile.language || "c",
        theme: editorTheme,
        automaticLayout: true,
        scrollBeyondLastLine: editorSettings.scrollBeyondLastLine,
        fontSize: editorSettings.fontSize,
        lineNumbers: editorSettings.lineNumbers ? "on" : "off",
        renderLineHighlight: "all",
        formatOnPaste: editorSettings.formatOnPaste,
        formatOnType: editorSettings.formatOnType,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap,
        fixedOverflowWidgets: true,
        scrollbar: {
          useShadows: true,
          verticalHasArrows: true,
          horizontalHasArrows: true,
          vertical: "visible",
          horizontal: "visible",
          verticalScrollbarSize: 16,
          horizontalScrollbarSize: 16,
          arrowSize: 11,
        },
        overviewRulerBorder: true,
        overviewRulerLanes: 3,
        cursorBlinking: editorSettings.cursorBlinking,
        cursorStyle: editorSettings.cursorStyle,
        smoothScrolling: editorSettings.smoothScrolling,
        mouseWheelZoom: editorSettings.mouseWheelZoom,
        contextmenu: true,
        quickSuggestions: true,
        quickSuggestionsDelay: 10,
        acceptSuggestionOnEnter: "on",
        suggestOnTriggerCharacters: true,
        folding: true,
        foldingStrategy: "indentation",
        autoIndent: editorSettings.autoIndent,
        formatOnType: editorSettings.formatOnType,
        renderWhitespace: editorSettings.renderWhitespace,
        renderControlCharacters: true,
        renderIndentGuides: true,
        rulers: [],
        wordBasedSuggestions: true,
        snippetSuggestions: "inline",
        multiCursorModifier: "alt",
        accessibilitySupport: "auto",
        colorDecorators: true,
        renderValidationDecorations: "on",
        codeLens: true,
        links: true,
        lightbulb: { enabled: true },
        bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
        guides: {
          bracketPairs: true,
          indentation: true,
          highlightActiveIndentation: true,
        },
        padding: {
          top: 5,
          bottom: 5,
        },
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          showSnippets: true,
          showUsers: true,
          showIssues: true,
        },
      })

      // Setup editor actions
      setupEditorActions()
    } else {
      // Update editor model with active file content
      const model = monaco.editor.createModel(activeFile.content || "", activeFile.language || "c")
      monacoRef.current.setModel(model)

      // Apply editor settings
      monacoRef.current.updateOptions({
        fontSize: editorSettings.fontSize,
        lineNumbers: editorSettings.lineNumbers ? "on" : "off",
        minimap: { enabled: editorSettings.minimap },
        formatOnPaste: editorSettings.formatOnPaste,
        formatOnType: editorSettings.formatOnType,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap,
        cursorBlinking: editorSettings.cursorBlinking,
        cursorStyle: editorSettings.cursorStyle,
        scrollBeyondLastLine: editorSettings.scrollBeyondLastLine,
        smoothScrolling: editorSettings.smoothScrolling,
        mouseWheelZoom: editorSettings.mouseWheelZoom,
        renderWhitespace: editorSettings.renderWhitespace,
        autoIndent: editorSettings.autoIndent,
        bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
      })
    }

    // Handle window resize to ensure editor layout is updated
    const handleResize = () => {
      if (monacoRef.current) {
        monacoRef.current.layout()
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [activeFile, editorTheme, boardType, editorSettings])

  // Setup editor actions
  const setupEditorActions = () => {
    if (!monacoRef.current) return

    // Add common keyboard shortcuts
    monacoRef.current.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        // Save the current file
        if (activeFile) {
          const updatedFiles = updateFileTree(fileTree, (item) => {
            if (item.id === activeFile.id) {
              return { ...item, isEdited: false }
            }
            return item
          })
          setFileTree(updatedFiles)

          // Update open files
          setOpenFiles(openFiles.map((file) => (file.id === activeFile.id ? { ...file, isEdited: false } : file)))

          // Update active file
          setActiveFile({ ...activeFile, isEdited: false })

          setStatusMessage("File saved")
          setStatusType("success")
        }
        return null
      },
    })

    monacoRef.current.addAction({
      id: "format-document",
      label: "Format Document",
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: (editor) => {
        editor.getAction("editor.action.formatDocument")?.run()
        return null
      },
    })

    monacoRef.current.addAction({
      id: "toggle-comment",
      label: "Toggle Comment",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
      run: (editor) => {
        editor.getAction("editor.action.commentLine")?.run()
        return null
      },
    })

    monacoRef.current.addAction({
      id: "indent",
      label: "Indent",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight],
      run: (editor) => {
        editor.getAction("editor.action.indentLines")?.run()
        return null
      },
    })

    monacoRef.current.addAction({
      id: "outdent",
      label: "Outdent",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft],
      run: (editor) => {
        editor.getAction("editor.action.outdentLines")?.run()
        return null
      },
    })

    monacoRef.current.addAction({
      id: "find",
      label: "Find",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: (editor) => {
        setShowFindWidget(true)
        return null
      },
    })

    monacoRef.current.addAction({
      id: "find-next",
      label: "Find Next",
      keybindings: [monaco.KeyCode.F3],
      run: (editor) => {
        findNext()
        return null
      },
    })

    monacoRef.current.addAction({
      id: "find-previous",
      label: "Find Previous",
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F3],
      run: (editor) => {
        findPrevious()
        return null
      },
    })

    monacoRef.current.addAction({
      id: "toggle-word-wrap",
      label: "Toggle Word Wrap",
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
      run: (editor) => {
        const newWordWrap = editorSettings.wordWrap === "on" ? "off" : "on"
        setEditorSettings({ ...editorSettings, wordWrap: newWordWrap })
        editor.updateOptions({ wordWrap: newWordWrap })
        return null
      },
    })

    monacoRef.current.addAction({
      id: "go-to-line",
      label: "Go to Line",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
      run: (editor) => {
        editor.getAction("editor.action.gotoLine")?.run()
        return null
      },
    })

    monacoRef.current.addAction({
      id: "toggle-problems-panel",
      label: "Toggle Problems Panel",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM],
      run: (editor) => {
        setShowProblemsPanel(!showProblemsPanel)
        return null
      },
    })
  }

  // Helper function to find a file by ID in the file tree
  const findFileById = (tree: FileTreeItem[], id: string): FileTreeItem | null => {
    for (const item of tree) {
      if (item.id === id) {
        return item
      }
      if (item.type === "folder" && item.children) {
        const found = findFileById(item.children, id)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  // Helper function to find a file by path in the file tree
  const findFileByPath = (tree: FileTreeItem[], path: string): FileTreeItem | null => {
    for (const item of tree) {
      if (item.path === path) {
        return item
      }
      if (item.type === "folder" && item.children) {
        const found = findFileByPath(item.children, path)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  // Helper function to update file tree with a transformation function
  const updateFileTree = (tree: FileTreeItem[], transform: (item: FileTreeItem) => FileTreeItem): FileTreeItem[] => {
    return tree.map((item) => {
      const updatedItem = transform(item)
      if (updatedItem.type === "folder" && updatedItem.children) {
        return {
          ...updatedItem,
          children: updateFileTree(updatedItem.children, transform),
        }
      }
      return updatedItem
    })
  }

  // Helper function to update file content in the file tree
  const updateFileContent = (id: string, content: string) => {
    const updateTree = (tree: FileTreeItem[]): FileTreeItem[] => {
      return tree.map((item) => {
        if (item.id === id) {
          return { ...item, content, isEdited: true }
        }
        if (item.type === "folder" && item.children) {
          return { ...item, children: updateTree(item.children) }
        }
        return item
      })
    }

    setFileTree(updateTree(fileTree))

    // Also update open files
    setOpenFiles((prev) => prev.map((file) => (file.id === id ? { ...file, content, isEdited: true } : file)))

    // Update active file if it's the one being edited
    if (activeFile?.id === id) {
      setActiveFile({ ...activeFile, content, isEdited: true })
    }
  }

  // Handle file click in the file tree
  const handleFileClick = (file: FileTreeItem) => {
    if (file.type === "folder") {
      // Toggle folder open/closed state
      const newExpandedFolders = new Set(expandedFolders)
      if (newExpandedFolders.has(file.id)) {
        newExpandedFolders.delete(file.id)
      } else {
        newExpandedFolders.add(file.id)
      }
      setExpandedFolders(newExpandedFolders)

      // Update file tree
      const updateTree = (tree: FileTreeItem[]): FileTreeItem[] => {
        return tree.map((item) => {
          if (item.id === file.id) {
            return { ...item, isOpen: !item.isOpen }
          }
          if (item.type === "folder" && item.children) {
            return { ...item, children: updateTree(item.children) }
          }
          return item
        })
      }
      setFileTree(updateTree(fileTree))
    } else {
      // Open file in editor
      setActiveFile(file)

      // Add to open files if not already open
      if (!openFiles.some((f) => f.id === file.id)) {
        setOpenFiles([...openFiles, file])
      }
    }
  }

  // Handle file tab click
  const handleTabClick = (file: FileTreeItem) => {
    setActiveFile(file)
  }

  // Handle file tab close
  const handleTabClose = (fileId: string) => {
    const newOpenFiles = openFiles.filter((f) => f.id !== fileId)
    setOpenFiles(newOpenFiles)

    // If closing the active file, set the first remaining open file as active
    if (activeFile?.id === fileId && newOpenFiles.length > 0) {
      setActiveFile(newOpenFiles[0])
    } else if (newOpenFiles.length === 0) {
      setActiveFile(null)
    }
  }

  // Handle new file/folder creation
  const handleCreateNewItem = () => {
    if (!newFileName.trim()) {
      return
    }

    const newId = Date.now().toString()
    const newItem: FileTreeItem = {
      id: newId,
      name: newFileName,
      type: newFileType,
      path: `${newFileParentPath === "/" ? "" : newFileParentPath}/${newFileName}`,
      content: newFileType === "file" ? "" : undefined,
      language: newFileType === "file" ? getLanguageFromFileName(newFileName) : undefined,
      children: newFileType === "folder" ? [] : undefined,
      isOpen: newFileType === "folder" ? true : undefined,
    }

    // Add the new item to the file tree
    const updateTree = (tree: FileTreeItem[]): FileTreeItem[] => {
      // Capture the parent path for the current level of recursion
      const parentPath = "/" // Initialize parentPath to root
      return tree.map((item) => {
        if (item.type === "folder" && item.path === newFileParentPath) {
          return {
            ...item,
            children: [...(item.children || []), newItem],
            isOpen: true,
          }
        }
        if (item.type === "folder" && item.children) {
          return {
            ...item,
            children: updateTree(item.children),
          }
        }
        return item
      })
    }

    setFileTree(updateTree(fileTree))
    setShowNewFileDialog(false)
    setNewFileName("")

    // If it's a folder, add to expanded folders
    if (newFileType === "folder") {
      setExpandedFolders(new Set([...expandedFolders, newId]))
    }

    // If it's a file, open it in the editor
    if (newFileType === "file") {
      setActiveFile(newItem)
      setOpenFiles([...openFiles, newItem])
    }

    setStatusMessage(`New ${newFileType} created: ${newFileName}`)
    setStatusType("success")
  }

  // Handle file/folder rename
  const handleRename = () => {
    if (!renameValue.trim()) {
      return
    }

    const updateTree = (tree: FileTreeItem[]): FileTreeItem[] => {
      return tree.map((item) => {
        if (item.id === renameItemId) {
          const newPath = item.path.substring(0, item.path.lastIndexOf("/") + 1) + renameValue
          return {
            ...item,
            name: renameValue,
            path: newPath,
          }
        }
        if (item.type === "folder" && item.children) {
          return {
            ...item,
            children: updateTree(item.children),
          }
        }
        return item
      })
    }

    const updatedTree = updateTree(fileTree)
    setFileTree(updatedTree)

    // Update open files and active file if renamed
    const renamedItem = findFileById(updatedTree, renameItemId)
    if (renamedItem) {
      setOpenFiles((prev) => prev.map((file) => (file.id === renameItemId ? renamedItem : file)))

      if (activeFile?.id === renameItemId) {
        setActiveFile(renamedItem)
      }
    }

    setShowRenameDialog(false)
    setRenameItemId("")
    setRenameValue("")

    setStatusMessage(`Renamed to: ${renameValue}`)
    setStatusType("success")
  }

  // Handle file/folder deletion
  const handleDelete = () => {
    const deleteFromTree = (tree: FileTreeItem[]): FileTreeItem[] => {
      return tree.filter((item) => {
        if (item.id === deleteItemId) {
          return false
        }
        if (item.type === "folder" && item.children) {
          return {
            ...item,
            children: deleteFromTree(item.children),
          }
        }
        return true
      })
    }

    const updatedTree = deleteFromTree(fileTree)
    setFileTree(updatedTree)

    // Remove from open files if open
    setOpenFiles((prev) => prev.filter((file) => file.id !== deleteItemId))

    // If deleting the active file, set the first remaining open file as active
    if (activeFile?.id === deleteItemId) {
      const newOpenFiles = openFiles.filter((f) => f.id !== deleteItemId)
      if (newOpenFiles.length > 0) {
        setActiveFile(newOpenFiles[0])
      } else {
        setActiveFile(null)
      }
    }

    // Remove from expanded folders if it's a folder
    if (expandedFolders.has(deleteItemId)) {
      const newExpandedFolders = new Set(expandedFolders)
      newExpandedFolders.delete(deleteItemId)
      setExpandedFolders(newExpandedFolders)
    }

    setShowDeleteDialog(false)
    setDeleteItemId("")
    setDeleteItemName("")

    setStatusMessage(`Deleted: ${deleteItemName}`)
    setStatusType("success")
  }

  // Handle search in files
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      return
    }

    setIsSearching(true)
    const results: { file: FileTreeItem; line: number; content: string }[] = []

    const searchInTree = (tree: FileTreeItem[]) => {
      tree.forEach((item) => {
        if (item.type === "file" && item.content) {
          const lines = item.content.split("\n")
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push({
                file: item,
                line: index + 1,
                content: line.trim(),
              })
            }
          })
        }
        if (item.type === "folder" && item.children) {
          searchInTree(item.children)
        }
      })
    }

    searchInTree(fileTree)
    setSearchResults(results)
    setIsSearching(false)
  }

  // Handle search result click
  const handleSearchResultClick = (result: { file: FileTreeItem; line: number }) => {
    setActiveFile(result.file)

    // Add to open files if not already open
    if (!openFiles.some((f) => f.id === result.file.id)) {
      setOpenFiles([...openFiles, result.file])
    }

    // Jump to the line in the editor
    setTimeout(() => {
      if (monacoRef.current) {
        monacoRef.current.revealLineInCenter(result.line)
        monacoRef.current.setPosition({ lineNumber: result.line, column: 1 })
        monacoRef.current.focus()
      }
    }, 100)

    setShowSearchDialog(false)
  }

  // Handle editor settings change
  const handleSettingsChange = (setting: string, value: any) => {
    setEditorSettings((prev) => ({ ...prev, [setting]: value }))

    // Apply setting to editor immediately if it's open
    if (monacoRef.current) {
      const options: any = {}
      options[setting] = value
      monacoRef.current.updateOptions(options)
    }
  }

  // Get language from file name
  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    return LANGUAGE_MAP[`.${extension}`] || "plaintext"
  }

  // Get icon for file based on extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    return FILE_ICONS[`.${extension}`] || <File className="h-4 w-4" />
  }

  const renderFileTreeItem = (item: FileTreeItem) => {
    const isFolderOpen = expandedFolders.has(item.id)

    return (
      <div key={item.id}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                item.type === "file" && activeFile?.id === item.id ? "bg-blue-100 dark:bg-blue-900" : ""
              }`}
              onClick={() => handleFileClick(item)}
              onContextMenu={(e) => {
                e.preventDefault()
                setShowContextMenu(true)
                setContextMenuPosition({ x: e.clientX, y: e.clientY })
                setContextMenuTarget(item)
              }}
            >
              {item.type === "folder" ? (
                isFolderOpen ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )
              ) : (
                getFileIcon(item.name)
              )}
              <span className="text-sm">{item.name}</span>
              {item.isEdited && <span className="ml-1 text-blue-500">*</span>}
              {item.type === "folder" && (
                <div className="ml-auto">
                  {isFolderOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => {
                setShowRenameDialog(true)
                setRenameItemId(item.id)
                setRenameValue(item.name)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setShowDeleteDialog(true)
                setDeleteItemId(item.id)
                setDeleteItemName(item.name)
              }}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => {
                navigator.clipboard.writeText(item.content || "")
                setStatusMessage("Content copied to clipboard")
                setStatusType("success")
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Content
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {item.type === "folder" && isFolderOpen && item.children && (
          <div className="ml-4">{item.children.map((child) => renderFileTreeItem(child))}</div>
        )}
      </div>
    )
  }

  const findNext = () => {
    if (!monacoRef.current || !findText) return

    const model = monacoRef.current.getModel()
    if (!model) return

    const searchResult = model.findNextMatch(
      findText,
      monacoRef.current.getPosition(),
      isCaseSensitive,
      isWholeWord,
      isRegex,
      false,
    )

    if (searchResult) {
      monacoRef.current.revealRangeInCenter(searchResult.range)
      monacoRef.current.setSelection(searchResult.range)
      monacoRef.current.focus()
    } else {
      setStatusMessage("No more results found")
      setStatusType("error")
    }
  }

  const findPrevious = () => {
    if (!monacoRef.current || !findText) return

    const model = monacoRef.current.getModel()
    if (!model) return

    const searchResult = model.findPreviousMatch(
      findText,
      monacoRef.current.getPosition(),
      isCaseSensitive,
      isWholeWord,
      isRegex,
      false,
    )

    if (searchResult) {
      monacoRef.current.revealRangeInCenter(searchResult.range)
      monacoRef.current.setSelection(searchResult.range)
      monacoRef.current.focus()
    } else {
      setStatusMessage("No more results found")
      setStatusType("error")
    }
  }

  return (
    <div className={`h-full flex flex-col ${className || ""}`}>
      <div
        className={`flex items-center justify-between p-2 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewFileDialog(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>New</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Save all files
              setFileTree((prev) => {
                const updateTree = (tree: FileTreeItem[]): FileTreeItem[] => {
                  return tree.map((item) => {
                    if (item.type === "file") {
                      return { ...item, isEdited: false }
                    }
                    if (item.type === "folder" && item.children) {
                      return { ...item, children: updateTree(item.children) }
                    }
                    return item
                  })
                }
                return updateTree(prev)
              })

              setOpenFiles((prev) => prev.map((file) => ({ ...file, isEdited: false })))

              if (activeFile) {
                setActiveFile({ ...activeFile, isEdited: false })
              }

              setStatusMessage("All files saved")
              setStatusType("success")
            }}
            className="flex items-center gap-1"
          >
            <Save className="h-4 w-4" />
            <span>Save All</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearchDialog(true)}
            className="flex items-center gap-1"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettingsDialog(true)}
            className="flex items-center gap-1"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>

          {onCompile && (
            <Button
              onClick={() => {
                if (activeFile) {
                  onCompile(activeFile.content || "")
                }
              }}
              disabled={isCompiling || !activeFile}
              size="sm"
              className="flex items-center gap-1"
            >
              <FileCode className="h-4 w-4" />
              <span>{isCompiling ? "Compiling..." : "Compile"}</span>
            </Button>
          )}

          {onRun && onStop && (
            <Button
              onClick={isRunning ? onStop : onRun}
              disabled={isCompiling || !activeFile}
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              className="flex items-center gap-1"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Run</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-grow flex">
        <div className="w-64 flex-shrink-0 border-r">
          <div className="p-2 font-semibold border-b">Explorer</div>
          <ScrollArea className="h-full">
            {fileTree.map((item) => (
              <div key={item.id}>{renderFileTreeItem(item)}</div>
            ))}
          </ScrollArea>
        </div>

        <div className="flex-grow flex flex-col">
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {openFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center px-3 py-2 border-r cursor-pointer group ${
                    activeFile?.id === file.id
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleTabClick(file)}
                >
                  {getFileIcon(file.name)}
                  <span className="ml-2 text-sm">{file.name}</span>
                  {file.isEdited && <span className="ml-1 text-blue-500">*</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-2 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTabClose(file.id)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-grow relative">
            <div ref={editorRef} className="absolute inset-0 w-full h-full" style={{ overflow: "hidden" }} />
          </div>
        </div>
      </div>

      {/* New Item Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={() => setShowNewFileDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New {newFileType === "file" ? "File" : "Folder"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-item-name" className="text-right">
                Name
              </Label>
              <Input
                id="new-item-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="col-span-3"
                placeholder={newFileType === "file" ? "e.g. example.c" : "e.g. utils"}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateNewItem()
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-item-type" className="text-right">
                Type
              </Label>
              <select
                id="new-item-type"
                value={newFileType}
                onChange={(e) => setNewFileType(e.target.value as "file" | "folder")}
                className="col-span-3 p-2 border rounded"
              >
                <option value="file">File</option>
                <option value="folder">Folder</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewItem}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={() => setShowRenameDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rename-value" className="text-right">
                New Name
              </Label>
              <Input
                id="rename-value"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="col-span-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={() => setShowDeleteDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <div className="py-4">
            <p>Are you sure you want to delete "{deleteItemName}"?</p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} className="text-red-500">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
