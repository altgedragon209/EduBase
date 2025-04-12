"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronRight,
  ChevronDown,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  Code2,
  FileText,
  MoreVertical,
  Trash,
  Edit,
  Copy,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Search,
  Filter,
  Clipboard,
  ArrowUpRight,
  Scissors,
  Eye,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FileExplorerProps {
  files: { name: string; path: string; content: string }[]
  onFileSelect: (path: string) => void
  onCreateFile: (path: string) => void
  onCreateFolder: (path: string) => void
  onDeleteFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
  activeFile: string | null
  darkMode: boolean
  onRefresh?: () => void
}

interface FileTreeItem {
  id: string
  name: string
  type: "file" | "folder"
  children?: FileTreeItem[]
  path: string
  isOpen?: boolean
  isEdited?: boolean
  isSelected?: boolean
  extension?: string
  size?: number
  lastModified?: Date
  isHidden?: boolean
}

export default function FileExplorer({
  files,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  activeFile,
  darkMode,
  onRefresh,
}: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([])
  const [showNewItemDialog, setShowNewItemDialog] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file")
  const [newItemParentPath, setNewItemParentPath] = useState("/")
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameItemPath, setRenameItemPath] = useState("")
  const [renameValue, setRenameValue] = useState("")
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuTarget, setContextMenuTarget] = useState<{ path: string; type: "file" | "folder" } | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["/src", "/inc", "/drivers"]))
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteItemPath, setDeleteItemPath] = useState("")
  const [deleteItemName, setDeleteItemName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<{ path: string; matches: number }[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [clipboardItems, setClipboardItems] = useState<{ paths: string[]; operation: "copy" | "cut" } | null>(null)
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree")
  const [sortBy, setSortBy] = useState<"name" | "type" | "size" | "modified">("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showHiddenFiles, setShowHiddenFiles] = useState(false)
  const [filterExtension, setFilterExtension] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFileIcons, setShowFileIcons] = useState(true)
  const [showFileExtensions, setShowFileExtensions] = useState(true)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<any[]>([])
  const [redoStack, setRedoStack] = useState<any[]>([])
  const [showFindInFilesDialog, setShowFindInFilesDialog] = useState(false)
  const [findInFilesQuery, setFindInFilesQuery] = useState("")
  const [findInFilesResults, setFindInFilesResults] = useState<{ file: string; line: number; text: string }[]>([])
  const [isFindInFilesLoading, setIsFindInFilesLoading] = useState(false)
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [filterOptions, setFilterOptions] = useState({
    extensions: [] as string[],
    modifiedAfter: null as Date | null,
    modifiedBefore: null as Date | null,
    sizeGreaterThan: null as number | null,
    sizeLessThan: null as number | null,
  })

  const fileExplorerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Build file tree from flat files array
  useEffect(() => {
    setIsLoading(true)

    // Create a tree structure from the flat files array
    const buildFileTree = () => {
      const tree: FileTreeItem[] = []
      const folderMap: Record<string, FileTreeItem> = {}
      const processedPaths = new Set<string>() // Track processed paths to avoid duplicates

      // Process all files to create the complete folder structure
      files.forEach((file) => {
        if (processedPaths.has(file.path)) return // Skip duplicates
        processedPaths.add(file.path)

        const pathParts = file.path.split("/").filter(Boolean)
        let currentPath = ""

        // Create folder structure for each file
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderName = pathParts[i]
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName
          const folderPath = `/${currentPath}`

          if (!folderMap[folderPath]) {
            const folderItem: FileTreeItem = {
              id: folderPath,
              name: folderName,
              type: "folder",
              children: [],
              path: folderPath,
              isOpen: expandedFolders.has(folderPath),
              lastModified: new Date(),
              size: 0,
              isHidden: folderName.startsWith("."),
            }
            folderMap[folderPath] = folderItem

            // Add to parent folder or root
            if (i === 0) {
              // Check if this root folder already exists in the tree
              const existingFolderIndex = tree.findIndex((item) => item.name === folderName && item.type === "folder")
              if (existingFolderIndex === -1) {
                tree.push(folderItem)
              }
            } else {
              const parentPath = `/${pathParts.slice(0, i).join("/")}`
              if (folderMap[parentPath]?.children) {
                // Ensure we don't add duplicates
                const existingChildIndex = folderMap[parentPath].children!.findIndex(
                  (child) => child.name === folderName && child.type === "folder",
                )
                if (existingChildIndex === -1) {
                  folderMap[parentPath].children!.push(folderItem)
                }
              }
            }
          }
        }

        // Add the file to its parent folder
        const fileName = pathParts[pathParts.length - 1]
        const parentPath = pathParts.length > 1 ? `/${pathParts.slice(0, pathParts.length - 1).join("/")}` : ""
        const extension = fileName.includes(".") ? fileName.split(".").pop() : ""

        const fileItem: FileTreeItem = {
          id: file.path,
          name: fileName,
          type: "file",
          path: file.path,
          isEdited: false,
          extension: extension || undefined,
          size: file.content.length,
          lastModified: new Date(),
          isSelected: selectedItems.has(file.path),
          isHidden: fileName.startsWith("."),
        }

        if (parentPath && folderMap[parentPath]) {
          // Check if the file already exists in the parent folder
          const existingFileIndex = folderMap[parentPath].children!.findIndex(
            (child) => child.path === file.path && child.type === "file",
          )
          if (existingFileIndex === -1) {
            folderMap[parentPath].children!.push(fileItem)
          }

          // Update folder size and last modified
          if (fileItem.size) {
            folderMap[parentPath].size = (folderMap[parentPath].size || 0) + fileItem.size
          }
          if (
            fileItem.lastModified &&
            (!folderMap[parentPath].lastModified || fileItem.lastModified > folderMap[parentPath].lastModified)
          ) {
            folderMap[parentPath].lastModified = fileItem.lastModified
          }
        } else if (pathParts.length === 1) {
          // If it's a root file, add to root if it doesn't already exist
          const existingFileIndex = tree.findIndex((item) => item.path === file.path)
          if (existingFileIndex === -1) {
            tree.push(fileItem)
          }
        }
      })

      // Sort the tree based on current sort settings
      const sortTree = (items: FileTreeItem[]): FileTreeItem[] => {
        const sortedItems = [...items].sort((a, b) => {
          // Folders first, then files
          if (a.type === "folder" && b.type === "file") return -1
          if (a.type === "file" && b.type === "folder") return 1

          // Then sort by the selected criteria
          switch (sortBy) {
            case "name":
              return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
            case "type":
              const aExt = a.extension || ""
              const bExt = b.extension || ""
              return sortDirection === "asc" ? aExt.localeCompare(bExt) : bExt.localeCompare(aExt)
            case "size":
              const aSize = a.size || 0
              const bSize = b.size || 0
              return sortDirection === "asc" ? aSize - bSize : bSize - aSize
            case "modified":
              const aDate = a.lastModified || new Date(0)
              const bDate = b.lastModified || new Date(0)
              return sortDirection === "asc" ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime()
            default:
              return 0
          }
        })

        // Recursively sort children
        return sortedItems.map((item) => {
          if (item.type === "folder" && item.children) {
            return { ...item, children: sortTree(item.children) }
          }
          return item
        })
      }

      return sortTree(tree)
    }

    const tree = buildFileTree()
    setFileTree(tree)
    setIsLoading(false)
  }, [files, expandedFolders, selectedItems, sortBy, sortDirection])

  // Handle search when query changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([])
      return
    }

    const results = files
      .filter(
        (file) =>
          file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((file) => {
        const contentMatches = (file.content.match(new RegExp(searchQuery, "gi")) || []).length
        return {
          path: file.path,
          matches: contentMatches + (file.path.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0),
        }
      })
      .sort((a, b) => b.matches - a.matches)

    setSearchResults(results)
  }, [searchQuery, files])

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  // Toggle folder open/closed
  const toggleFolder = (path: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    const newExpandedFolders = new Set(expandedFolders)

    if (newExpandedFolders.has(path)) {
      newExpandedFolders.delete(path)
    } else {
      newExpandedFolders.add(path)

      // Also expand all parent folders to ensure proper navigation
      const pathParts = path.split("/").filter(Boolean)
      let currentPath = ""
      for (let i = 0; i < pathParts.length; i++) {
        currentPath += `/${pathParts[i]}`
        newExpandedFolders.add(currentPath)
      }
    }

    setExpandedFolders(newExpandedFolders)
  }

  // Handle file click
  const handleFileClick = (path: string, event?: React.MouseEvent) => {
    if (event && (event.ctrlKey || event.metaKey)) {
      // Multi-select with Ctrl/Cmd key
      const newSelectedItems = new Set(selectedItems)
      if (newSelectedItems.has(path)) {
        newSelectedItems.delete(path)
      } else {
        newSelectedItems.add(path)
      }
      setSelectedItems(newSelectedItems)
      return // Don't open the file when doing multi-select
    } else if (event && event.shiftKey && selectedItems.size > 0) {
      // Range select with Shift key
      const allPaths = files.map((f) => f.path)
      const lastSelectedPath = Array.from(selectedItems).pop() || ""
      const startIdx = allPaths.indexOf(lastSelectedPath)
      const endIdx = allPaths.indexOf(path)

      if (startIdx >= 0 && endIdx >= 0) {
        const start = Math.min(startIdx, endIdx)
        const end = Math.max(startIdx, endIdx)
        const rangeSelection = allPaths.slice(start, end + 1)

        const newSelectedItems = new Set(selectedItems)
        rangeSelection.forEach((p) => newSelectedItems.add(p))
        setSelectedItems(newSelectedItems)
      }
      return // Don't open the file when doing range select
    } else {
      // Single file click behavior
      // Only handle clicks on files, not folders
      const clickedItem = findItemByPath(fileTree, path)
      if (clickedItem && clickedItem.type === "file") {
        // Clear selection and select only this file
        setSelectedItems(new Set([path]))

        // Find the file in the files array
        const file = files.find((f) => f.path === path)

        if (file) {
          // File exists, open it in the editor
          onFileSelect(path)
        } else {
          // File doesn't exist yet, create it with appropriate default content
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
            const guardName = path.split("/").pop()?.toUpperCase().replace(/\./g, "_") || ""
            defaultContent = `/**
* @file ${path.split("/").pop()}
* @brief 
*/

#ifndef ${guardName}
#define ${guardName}

// Add your declarations here

#endif /* ${guardName} */
`
          }

          // Create the file
          onCreateFile(path)

          // Select the newly created file
          onFileSelect(path)
        }
      } else if (clickedItem && clickedItem.type === "folder") {
        // Toggle folder expansion
        toggleFolder(path, event)
      }
    }
  }

  // Helper function to find an item by path in the file tree
  const findItemByPath = (items: FileTreeItem[], path: string): FileTreeItem | null => {
    for (const item of items) {
      if (item.path === path) {
        return item
      }
      if (item.type === "folder" && item.children) {
        const found = findItemByPath(item.children, path)
        if (found) return found
      }
    }
    return null
  }

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, item: { path: string; type: "file" | "folder" }) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuTarget(item)
    setShowContextMenu(true)

    // If the item is not already selected, select only this item
    if (!selectedItems.has(item.path)) {
      setSelectedItems(new Set([item.path]))
    }
  }

  // Handle new item creation
  const handleCreateNewItem = () => {
    if (!newItemName.trim()) return

    const path = newItemParentPath === "/" ? `/${newItemName}` : `${newItemParentPath}/${newItemName}`

    // Save current state for undo
    const currentState = {
      files: [...files],
      selectedItems: new Set(selectedItems),
      expandedFolders: new Set(expandedFolders),
    }
    setUndoStack([...undoStack, currentState])
    setRedoStack([])

    if (newItemType === "file") {
      onCreateFile(path)
    } else {
      onCreateFolder(path)
    }

    setShowNewItemDialog(false)
    setNewItemName("")
  }

  // Handle rename
  const handleRename = () => {
    if (!renameValue.trim() || !renameItemPath) return

    const pathParts = renameItemPath.split("/")
    const parentPath = pathParts.slice(0, pathParts.length - 1).join("/")
    const newPath = parentPath ? `${parentPath}/${renameValue}` : `/${renameValue}`

    // Save current state for undo
    const currentState = {
      files: [...files],
      selectedItems: new Set(selectedItems),
      expandedFolders: new Set(expandedFolders),
    }
    setUndoStack([...undoStack, currentState])
    setRedoStack([])

    onRenameFile(renameItemPath, newPath)
    setShowRenameDialog(false)
    setRenameItemPath("")
    setRenameValue("")
  }

  // Handle delete
  const handleDelete = () => {
    // Save current state for undo
    const currentState = {
      files: [...files],
      selectedItems: new Set(selectedItems),
      expandedFolders: new Set(expandedFolders),
    }
    setUndoStack([...undoStack, currentState])
    setRedoStack([])

    // If multiple items are selected, delete all of them
    if (selectedItems.size > 1 && selectedItems.has(deleteItemPath)) {
      Array.from(selectedItems).forEach((path) => {
        if (path !== "main.c") {
          // Don't delete main.c
          onDeleteFile(path)
        }
      })
      setSelectedItems(new Set())
    } else {
      onDeleteFile(deleteItemPath)
      setSelectedItems((prev) => {
        const newSelection = new Set(prev)
        newSelection.delete(deleteItemPath)
        return newSelection
      })
    }

    setShowDeleteDialog(false)
    setDeleteItemPath("")
    setDeleteItemName("")
  }

  // Handle copy/cut to clipboard
  const handleClipboardOperation = (operation: "copy" | "cut") => {
    if (selectedItems.size === 0) return

    setClipboardItems({
      paths: Array.from(selectedItems),
      operation,
    })

    if (operation === "cut") {
      // Visual indication for cut items
      // We'll handle the actual cut when pasting
    }
  }

  // Handle paste from clipboard
  const handlePaste = (targetPath: string) => {
    if (!clipboardItems || clipboardItems.paths.length === 0) return

    // Save current state for undo
    const currentState = {
      files: [...files],
      selectedItems: new Set(selectedItems),
      expandedFolders: new Set(expandedFolders),
    }
    setUndoStack([...undoStack, currentState])
    setRedoStack([])

    // Determine if target is a folder
    const isTargetFolder =
      files.some((file) => {
        const pathParts = file.path.split("/")
        return pathParts.length > 1 && `/${pathParts[0]}` === targetPath
      }) || targetPath === "/"

    // Process each item in clipboard
    clipboardItems.paths.forEach((sourcePath) => {
      const sourceFile = files.find((f) => f.path === sourcePath)
      if (!sourceFile) return

      const fileName = sourcePath.split("/").pop() || ""
      const destinationPath = isTargetFolder ? `${targetPath === "/" ? "" : targetPath}/${fileName}` : targetPath

      // Skip if source and destination are the same
      if (sourcePath === destinationPath) return

      // Create a copy at the destination
      onCreateFile(destinationPath)

      // If this was a cut operation, delete the original
      if (clipboardItems.operation === "cut") {
        onDeleteFile(sourcePath)
      }
    })

    // Clear clipboard after cut operation
    if (clipboardItems.operation === "cut") {
      setClipboardItems(null)
    }
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData("text/plain", path)
    setDraggedItem(path)

    // If the dragged item is not in the selection, clear selection and select only this item
    if (!selectedItems.has(path)) {
      setSelectedItems(new Set([path]))
    }

    // Set drag image
    const dragIcon = document.createElement("div")
    dragIcon.className = "bg-blue-500 text-white px-2 py-1 rounded text-sm"
    dragIcon.textContent = selectedItems.size > 1 ? `${selectedItems.size} items` : path.split("/").pop() || ""
    document.body.appendChild(dragIcon)
    e.dataTransfer.setDragImage(dragIcon, 0, 0)
    setTimeout(() => document.body.removeChild(dragIcon), 0)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Only set drop target if it's a folder and not the dragged item itself
    const isFolder =
      files.some((file) => {
        const pathParts = file.path.split("/")
        return pathParts.length > 1 && `/${pathParts[0]}` === path
      }) || path === "/"

    if (isFolder && path !== draggedItem) {
      setDropTarget(path)

      // Auto-expand folder after hovering for a moment
      if (!expandedFolders.has(path)) {
        const timer = setTimeout(() => {
          setExpandedFolders((prev) => new Set([...prev, path]))
        }, 1000)

        return () => clearTimeout(timer)
      }
    }
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDropTarget(null)
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault()
    e.stopPropagation()

    const sourcePath = e.dataTransfer.getData("text/plain")
    if (!sourcePath || sourcePath === targetPath) {
      setDraggedItem(null)
      setDropTarget(null)
      return
    }

    // Save current state for undo
    const currentState = {
      files: [...files],
      selectedItems: new Set(selectedItems),
      expandedFolders: new Set(expandedFolders),
    }
    setUndoStack([...undoStack, currentState])
    setRedoStack([])

    // If multiple items are selected, move all of them
    if (selectedItems.size > 1 && selectedItems.has(sourcePath)) {
      Array.from(selectedItems).forEach((path) => {
        moveItem(path, targetPath)
      })
    } else {
      moveItem(sourcePath, targetPath)
    }

    setDraggedItem(null)
    setDropTarget(null)
  }

  // Helper function to move an item
  const moveItem = (sourcePath: string, targetPath: string) => {
    const sourceFile = files.find((f) => f.path === sourcePath)
    if (!sourceFile) return

    const fileName = sourcePath.split("/").pop() || ""

    // Determine if target is a folder
    const isTargetFolder =
      files.some((file) => {
        const pathParts = file.path.split("/")
        return pathParts.length > 1 && `/${pathParts[0]}` === targetPath
      }) || targetPath === "/"

    const destinationPath = isTargetFolder ? `${targetPath === "/" ? "" : targetPath}/${fileName}` : targetPath

    // Skip if source and destination are the same
    if (sourcePath === destinationPath) return

    // Create a copy at the destination
    onCreateFile(destinationPath)

    // Delete the original
    onDeleteFile(sourcePath)
  }

  // Handle undo
  const handleUndo = () => {
    if (undoStack.length === 0) return

    const currentState = {
      files: [...files],
      selectedItems: new Set(selectedItems),
      expandedFolders: new Set(expandedFolders),
    }

    const prevState = undoStack[undoStack.length - 1]
    setRedoStack([...redoStack, currentState])
    setUndoStack(undoStack.slice(0, -1))

    // Restore previous state
    // This is a simplified version - in a real app, you'd need to
    // actually apply the changes to restore the previous state
    // For now, we'll just show a message
    alert("Undo operation would restore previous state")
  }

  // Handle redo
  const handleRedo = () => {
    if (redoStack.length === 0) return

    const currentState = {
      files: [...files],
      selectedItems: new Set(selectedItems),
      expandedFolders: new Set(expandedFolders),
    }

    const nextState = redoStack[redoStack.length - 1]
    setUndoStack([...undoStack, currentState])
    setRedoStack(redoStack.slice(0, -1))

    // Apply next state
    // This is a simplified version - in a real app, you'd need to
    // actually apply the changes to restore the next state
    // For now, we'll just show a message
    alert("Redo operation would apply next state")
  }

  // Handle find in files
  const handleFindInFiles = () => {
    if (!findInFilesQuery.trim()) return

    setIsFindInFilesLoading(true)

    // Search in all files
    const results: { file: string; line: number; text: string }[] = []

    files.forEach((file) => {
      const lines = file.content.split("\n")
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(findInFilesQuery.toLowerCase())) {
          results.push({
            file: file.path,
            line: index + 1,
            text: line.trim(),
          })
        }
      })
    })

    setFindInFilesResults(results)
    setIsFindInFilesLoading(false)
  }

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    if (!showFileIcons) {
      return <FileIcon className="h-4 w-4 text-gray-500" />
    }

    if (fileName.endsWith(".c")) {
      return <Code2 className="h-4 w-4 text-blue-500" />
    } else if (fileName.endsWith(".h")) {
      return <FileText className="h-4 w-4 text-green-500" />
    } else if (fileName.endsWith(".cpp") || fileName.endsWith(".cc")) {
      return <Code2 className="h-4 w-4 text-purple-500" />
    } else if (fileName.endsWith(".hpp")) {
      return <FileText className="h-4 w-4 text-yellow-500" />
    } else if (fileName.endsWith(".s") || fileName.endsWith(".asm")) {
      return <FileText className="h-4 w-4 text-orange-500" />
    } else if (fileName.endsWith(".md")) {
      return <FileText className="h-4 w-4 text-blue-400" />
    } else if (fileName.endsWith(".json")) {
      return <FileText className="h-4 w-4 text-yellow-400" />
    } else if (fileName.endsWith(".txt")) {
      return <FileText className="h-4 w-4 text-gray-400" />
    } else if (fileName === "Makefile" || fileName.endsWith(".mk")) {
      return <FileText className="h-4 w-4 text-red-500" />
    } else {
      return <FileIcon className="h-4 w-4 text-gray-500" />
    }
  }

  // Format file size for display
  const formatFileSize = (size: number | undefined): string => {
    if (size === undefined) return "-"

    if (size < 1024) {
      return `${size} B`
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`
    }
  }

  // Format date for display
  const formatDate = (date: Date | undefined): string => {
    if (!date) return "-"
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  // Render file tree recursively
  const renderFileTreeItem = (item: FileTreeItem, depth = 0) => {
    const isFolder = item.type === "folder"
    const isOpen = expandedFolders.has(item.path)
    const isActive = activeFile === item.path
    const isSelected = selectedItems.has(item.path)
    const isHidden = item.isHidden && !showHiddenFiles

    // Apply filters
    if (isHidden) return null

    if (filterExtension && item.type === "file" && item.extension !== filterExtension) {
      return null
    }

    // Apply search filter
    if (searchQuery && !item.path.toLowerCase().includes(searchQuery.toLowerCase())) {
      // For folders, check if any children match the search
      if (isFolder && item.children) {
        const hasMatchingChild = item.children.some((child) =>
          child.path.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        if (!hasMatchingChild) return null
      } else {
        return null
      }
    }

    return (
      <div key={item.path}>
        <div
          className={`flex items-center py-1 px-2 rounded cursor-pointer group ${
            isSelected
              ? "bg-blue-100 dark:bg-blue-900"
              : isActive
                ? "bg-gray-100 dark:bg-gray-800"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
          } ${dropTarget === item.path ? "border border-blue-500" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={(e) => (isFolder ? toggleFolder(item.path, e) : handleFileClick(item.path, e))}
          onContextMenu={(e) => handleContextMenu(e, { path: item.path, type: item.type })}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, item.path)}
          onDragOver={(e) => handleDragOver(e, item.path)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item.path)}
        >
          {isFolder ? (
            <span className="mr-1">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          ) : (
            <span className="w-4 mr-1" />
          )}

          {isFolder ? (
            isOpen ? (
              <FolderOpenIcon className="h-4 w-4 mr-2 text-yellow-500" />
            ) : (
              <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
            )
          ) : (
            <span className="mr-2">{getFileIcon(item.name)}</span>
          )}

          <span className="text-sm truncate">
            {showFileExtensions || item.type === "folder"
              ? item.name
              : item.name.includes(".")
                ? item.name.substring(0, item.name.lastIndexOf("."))
                : item.name}
          </span>

          {item.isEdited && <span className="ml-1 text-blue-500">*</span>}

          {viewMode === "list" && (
            <>
              <span className="ml-auto mr-4 text-xs text-gray-500">{formatFileSize(item.size)}</span>
              <span className="mr-4 text-xs text-gray-500">
                {item.extension || (item.type === "folder" ? "Folder" : "")}
              </span>
              <span className="text-xs text-gray-500">{item.lastModified ? formatDate(item.lastModified) : ""}</span>
            </>
          )}

          <div className="ml-auto opacity-0 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isFolder ? (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setNewItemParentPath(item.path)
                        setNewItemType("file")
                        setShowNewItemDialog(true)
                      }}
                    >
                      <FilePlus className="h-4 w-4 mr-2" />
                      New File
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setNewItemParentPath(item.path)
                        setNewItemType("folder")
                        setShowNewItemDialog(true)
                      }}
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      New Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePaste(item.path)
                      }}
                      disabled={!clipboardItems}
                    >
                      <Clipboard className="h-4 w-4 mr-2" />
                      Paste
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileClick(item.path)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Open
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClipboardOperation("copy")
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClipboardOperation("cut")
                  }}
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  Cut
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setRenameItemPath(item.path)
                    setRenameValue(item.name)
                    setShowRenameDialog(true)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteItemPath(item.path)
                    setDeleteItemName(item.name)
                    setShowDeleteDialog(true)
                  }}
                  className="text-red-500"
                  disabled={item.path === "main.c"}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isFolder && isOpen && item.children && (
          <div>{item.children.map((child) => renderFileTreeItem(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  // Render list view
  const renderListView = () => {
    // Flatten the file tree for list view
    const flattenTree = (items: FileTreeItem[]): FileTreeItem[] => {
      return items.reduce((acc: FileTreeItem[], item) => {
        acc.push(item)
        if (item.type === "folder" && item.children) {
          acc.push(...flattenTree(item.children))
        }
        return acc
      }, [])
    }

    const flatItems = flattenTree(fileTree)

    // Apply filters
    const filteredItems = flatItems.filter((item) => {
      if (item.isHidden && !showHiddenFiles) return false
      if (filterExtension && item.type === "file" && item.extension !== filterExtension) return false
      if (searchQuery && !item.path.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })

    return (
      <div className="w-full">
        <div className="flex items-center py-2 px-4 border-b font-medium text-sm">
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => {
              if (sortBy === "name") {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              } else {
                setSortBy("name")
                setSortDirection("asc")
              }
            }}
          >
            Name
            {sortBy === "name" &&
              (sortDirection === "asc" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          </div>
          <div
            className="ml-auto mr-4 cursor-pointer"
            onClick={() => {
              if (sortBy === "size") {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              } else {
                setSortBy("size")
                setSortDirection("asc")
              }
            }}
          >
            Size
            {sortBy === "size" &&
              (sortDirection === "asc" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          </div>
          <div
            className="mr-4 cursor-pointer"
            onClick={() => {
              if (sortBy === "type") {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              } else {
                setSortBy("type")
                setSortDirection("asc")
              }
            }}
          >
            Type
            {sortBy === "type" &&
              (sortDirection === "asc" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          </div>
          <div
            className="cursor-pointer"
            onClick={() => {
              if (sortBy === "modified") {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              } else {
                setSortBy("modified")
                setSortDirection("asc")
              }
            }}
          >
            Modified
            {sortBy === "modified" &&
              (sortDirection === "asc" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          </div>
        </div>

        {filteredItems.map((item) => {
          const isActive = activeFile === item.path
          const isSelected = selectedItems.has(item.path)

          return (
            <div
              key={item.path}
              className={`flex items-center py-1 px-4 cursor-pointer group ${
                isSelected
                  ? "bg-blue-100 dark:bg-blue-900"
                  : isActive
                    ? "bg-gray-100 dark:bg-gray-800"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={(e) => (item.type === "file" ? handleFileClick(item.path, e) : toggleFolder(item.path, e))}
              onContextMenu={(e) => handleContextMenu(e, { path: item.path, type: item.type })}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, item.path)}
              onDragOver={(e) => handleDragOver(e, item.path)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.path)}
            >
              <div className="flex items-center">
                {item.type === "folder" ? (
                  <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
                ) : (
                  getFileIcon(item.name)
                )}
                <span className="text-sm truncate">
                  {showFileExtensions || item.type === "folder"
                    ? item.name
                    : item.name.includes(".")
                      ? item.name.substring(0, item.name.lastIndexOf("."))
                      : item.name}
                </span>
                {item.isEdited && <span className="ml-1 text-blue-500">*</span>}
              </div>

              <span className="ml-auto mr-4 text-xs text-gray-500">{formatFileSize(item.size)}</span>
              <span className="mr-4 text-xs text-gray-500 w-16">
                {item.extension || (item.type === "folder" ? "Folder" : "")}
              </span>
              <span className="text-xs text-gray-500 w-32">
                {item.lastModified ? formatDate(item.lastModified) : ""}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={`h-full flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-gray-900" : ""}`}
      ref={fileExplorerRef}
    >
      <div className="p-2 flex justify-between items-center border-b">
        <div className="flex items-center gap-1">
          <h3 className="font-semibold">Explorer</h3>
          {isFullscreen ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => setIsFullscreen(false)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => setIsFullscreen(true)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setNewItemParentPath("/")
                    setNewItemType("file")
                    setShowNewItemDialog(true)
                  }}
                >
                  <FilePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New File</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setNewItemParentPath("/")
                    setNewItemType("folder")
                    setShowNewItemDialog(true)
                  }}
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSearch(!showSearch)}>
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowFilterDialog(true)}>
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Filter</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onRefresh && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewMode(viewMode === "tree" ? "list" : "tree")}>
                {viewMode === "tree" ? (
                  <>
                    <PanelLeft className="h-4 w-4 mr-2" />
                    Switch to List View
                  </>
                ) : (
                  <>
                    <PanelRight className="h-4 w-4 mr-2" />
                    Switch to Tree View
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={showHiddenFiles} onCheckedChange={setShowHiddenFiles}>
                Show Hidden Files
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showFileIcons} onCheckedChange={setShowFileIcons}>
                Show File Icons
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showFileExtensions} onCheckedChange={setShowFileExtensions}>
                Show File Extensions
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Sort By
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuCheckboxItem
                    checked={sortBy === "name"}
                    onCheckedChange={(checked) => {
                      if (checked) setSortBy("name")
                    }}
                  >
                    Name
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={sortBy === "type"}
                    onCheckedChange={(checked) => {
                      if (checked) setSortBy("type")
                    }}
                  >
                    Type
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={sortBy === "size"}
                    onCheckedChange={(checked) => {
                      if (checked) setSortBy("size")
                    }}
                  >
                    Size
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={sortBy === "modified"}
                    onCheckedChange={(checked) => {
                      if (checked) setSortBy("modified")
                    }}
                  >
                    Modified
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={sortDirection === "asc"}
                    onCheckedChange={(checked) => {
                      setSortDirection(checked ? "asc" : "desc")
                    }}
                  >
                    Ascending
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowFindInFilesDialog(true)}>
                <Search className="h-4 w-4 mr-2" />
                Find in Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showSearch && (
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-8 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {searchQuery && searchResults.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">Found {searchResults.length} results</div>
          )}
        </div>
      )}

      <ScrollArea className="flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading files...</span>
          </div>
        ) : viewMode === "tree" ? (
          <div className="p-2">{fileTree.map((item) => renderFileTreeItem(item))}</div>
        ) : (
          renderListView()
        )}
      </ScrollArea>

      {/* New Item Dialog */}
      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New {newItemType === "file" ? "File" : "Folder"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-item-name" className="text-right">
                Name
              </Label>
              <Input
                id="new-item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="col-span-3"
                placeholder={newItemType === "file" ? "e.g. example.c" : "e.g. utils"}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateNewItem()
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-item-location" className="text-right">
                Location
              </Label>
              <Input id="new-item-location" value={newItemParentPath} readOnly className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewItem}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
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
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteItemName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete "{deleteItemName}"? This action cannot be undone.</p>
            {selectedItems.size > 1 && selectedItems.has(deleteItemPath) && (
              <p className="mt-2 text-sm text-yellow-500">This will delete {selectedItems.size} selected items.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Find in Files Dialog */}
      <Dialog open={showFindInFilesDialog} onOpenChange={setShowFindInFilesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find in Files</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="find-query" className="text-right">
                Search
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="find-query"
                  value={findInFilesQuery}
                  onChange={(e) => setFindInFilesQuery(e.target.value)}
                  placeholder="Search term..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleFindInFiles()
                    }
                  }}
                />
                {isFindInFilesLoading && (
                  <RefreshCw className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {findInFilesResults.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium mb-2">Results ({findInFilesResults.length})</h4>
                <div className="max-h-60 overflow-auto border rounded-md">
                  {findInFilesResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        onFileSelect(result.file)
                        setShowFindInFilesDialog(false)
                        // In a real implementation, you would also scroll to the line
                      }}
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="text-sm font-medium">{result.file}</span>
                        <span className="ml-2 text-xs text-gray-500">Line {result.line}</span>
                      </div>
                      <div className="mt-1 text-xs font-mono pl-6 text-gray-600 dark:text-gray-400 truncate">
                        {result.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFindInFilesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFindInFiles} disabled={!findInFilesQuery.trim() || isFindInFilesLoading}>
              Find
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Files</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-extension" className="text-right">
                File Extension
              </Label>
              <Input
                id="filter-extension"
                value={filterOptions.extensions.join(", ")}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    extensions: e.target.value
                      .split(",")
                      .map((ext) => ext.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. c, h, cpp"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-modified-after" className="text-right">
                Modified After
              </Label>
              <Input
                id="filter-modified-after"
                type="date"
                value={filterOptions.modifiedAfter?.toISOString().split("T")[0] || ""}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    modifiedAfter: e.target.value ? new Date(e.target.value) : null,
                  })
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-modified-before" className="text-right">
                Modified Before
              </Label>
              <Input
                id="filter-modified-before"
                type="date"
                value={filterOptions.modifiedBefore?.toISOString().split("T")[0] || ""}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    modifiedBefore: e.target.value ? new Date(e.target.value) : null,
                  })
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-size-greater" className="text-right">
                Size Greater Than (KB)
              </Label>
              <Input
                id="filter-size-greater"
                type="number"
                value={filterOptions.sizeGreaterThan !== null ? filterOptions.sizeGreaterThan / 1024 : ""}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    sizeGreaterThan: e.target.value ? Number(e.target.value) * 1024 : null,
                  })
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-size-less" className="text-right">
                Size Less Than (KB)
              </Label>
              <Input
                id="filter-size-less"
                type="number"
                value={filterOptions.sizeLessThan !== null ? filterOptions.sizeLessThan / 1024 : ""}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    sizeLessThan: e.target.value ? Number(e.target.value) * 1024 : null,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFilterOptions({
                  extensions: [],
                  modifiedAfter: null,
                  modifiedBefore: null,
                  sizeGreaterThan: null,
                  sizeLessThan: null,
                })
              }}
            >
              Reset
            </Button>
            <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Apply filters
                if (filterOptions.extensions.length > 0) {
                  setFilterExtension(filterOptions.extensions[0])
                }
                setShowFilterDialog(false)
              }}
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
