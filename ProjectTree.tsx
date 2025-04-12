"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, FileIcon, FolderIcon, FolderOpenIcon, Code2, FileText } from "lucide-react"

interface ProjectTreeProps {
  selectedBoard: string
  onItemSelect: (item: string) => void
  files?: { name: string; path: string; content: string }[]
}

export default function ProjectTree({ selectedBoard, onItemSelect, files = [] }: ProjectTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    inc: true,
    drivers: true,
  })
  const [activeItem, setActiveItem] = useState<string>("main.c")

  // Automatically expand folders when files are added
  useEffect(() => {
    if (files.length > 0) {
      const folders = new Set<string>()

      // Extract folder paths from file paths
      files.forEach((file) => {
        const parts = file.path.split("/")
        if (parts.length > 1) {
          // Add each folder level
          let folderPath = ""
          for (let i = 0; i < parts.length - 1; i++) {
            folderPath += (folderPath ? "/" : "") + parts[i]
            folders.add(folderPath)
          }
        }
      })

      // Expand all folders
      const newExpandedFolders = { ...expandedFolders }
      folders.forEach((folder) => {
        newExpandedFolders[folder] = true
      })

      setExpandedFolders(newExpandedFolders)
    }
  }, [files])

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folder]: !prev[folder],
    }))
  }

  const handleItemClick = (item: string) => {
    setActiveItem(item)
    onItemSelect(item)
  }

  // Group files by folder
  // const filesByFolder: Record<string, { name: string; path: string }[]> = {}

  // Add all files to their respective folders
  // files.forEach((file) => {
  //   const parts = file.path.split("/")
  //   const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : ""
  //   const fileName = parts[parts.length - 1]

  //   if (!filesByFolder[folder]) {
  //     filesByFolder[folder] = []
  //   }

  //   filesByFolder[folder].push({
  //     name: fileName,
  //     path: file.path,
  //   })
  // })

  // If no files are provided, use default structure
  // const hasFiles = Object.keys(filesByFolder).length > 0 || files.length > 0
  const hasFiles = files.length > 0

  // Recursively render folders and files
  const renderFolderContents = (folderPath: string, indent = 0) => {
    // Get files directly in this folder
    const folderFiles =
      files.filter((file) => {
        const fileDirPath = file.path.substring(0, file.path.lastIndexOf("/"))
        return fileDirPath === folderPath
      }) || []

    // Get subfolders that are direct children of this folder
    const subfolders = new Set<string>()

    files.forEach((file) => {
      if (file.path.startsWith(folderPath + "/")) {
        const remainingPath = file.path.substring(folderPath.length + 1)
        const nextLevelDir = remainingPath.split("/")[0]
        if (nextLevelDir) {
          subfolders.add(nextLevelDir)
        }
      }
    })

    return (
      <>
        {/* Render files in this folder */}
        {folderFiles.map((file) => (
          <div
            key={file.path}
            className={`flex items-center py-1 px-2 rounded cursor-pointer ml-${indent + 4} ${
              activeItem === file.path ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => handleItemClick(file.path)}
          >
            {file.name.endsWith(".c") ? (
              <Code2 className="h-4 w-4 mr-2 text-blue-500" />
            ) : file.name.endsWith(".h") ? (
              <FileText className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <FileIcon className="h-4 w-4 mr-2 text-gray-500" />
            )}
            <span>{file.name}</span>
          </div>
        ))}

        {/* Render subfolders */}
        {Array.from(subfolders)
          .sort()
          .map((subfolder) => {
            const fullSubfolderPath = `${folderPath}/${subfolder}`
            const isExpanded = expandedFolders[fullSubfolderPath]

            return (
              <div key={fullSubfolderPath}>
                <div
                  className={`flex items-center py-1 px-2 rounded cursor-pointer ml-${indent + 4} hover:bg-gray-100 dark:hover:bg-gray-800`}
                  onClick={() => toggleFolder(fullSubfolderPath)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                  {isExpanded ? (
                    <FolderOpenIcon className="h-4 w-4 mr-2 text-yellow-500" />
                  ) : (
                    <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
                  )}
                  <span>{subfolder}</span>
                </div>

                {isExpanded && renderFolderContents(fullSubfolderPath, indent + 4)}
              </div>
            )
          })}
      </>
    )
  }

  return (
    <div className="h-full overflow-auto p-2">
      <div className="font-semibold mb-2">Project Explorer</div>

      <div className="text-sm">
        <div className="mb-2">
          <div
            className={`flex items-center py-1 px-2 rounded cursor-pointer ${
              activeItem === "project" ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => handleItemClick("project")}
          >
            <FolderOpenIcon className="h-4 w-4 mr-2 text-yellow-500" />
            <span>{selectedBoard} Project</span>
          </div>
        </div>

        {hasFiles ? (
          <>
            {/* Root files (not in any folder) */}
            {/* {filesByFolder[""] &&
              filesByFolder[""].map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center py-1 px-2 rounded cursor-pointer ml-4 ${
                    activeItem === file.path
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleItemClick(file.path)}
                >
                  {file.name.endsWith(".c") ? (
                    <Code2 className="h-4 w-4 mr-2 text-blue-500" />
                  ) : file.name.endsWith(".h") ? (
                    <FileText className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <FileIcon className="h-4 w-4 mr-2 text-gray-500" />
                  )}
                  <span>{file.name}</span>
                </div>
              ))} */}

            {/* Render all folders and their contents */}
            {renderFolderContents("")}
          </>
        ) : (
          <>
            {/* Default structure when no files are provided */}
            <div className="ml-4">
              <div
                className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  expandedFolders["src"] ? "" : ""
                }`}
                onClick={() => toggleFolder("src")}
              >
                {expandedFolders["src"] ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                {expandedFolders["src"] ? (
                  <FolderOpenIcon className="h-4 w-4 mr-2 text-yellow-500" />
                ) : (
                  <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
                )}
                <span>src</span>
              </div>

              {expandedFolders["src"] && (
                <div className="ml-6">
                  <div
                    className={`flex items-center py-1 px-2 rounded cursor-pointer ${
                      activeItem === "main.c"
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => handleItemClick("main.c")}
                  >
                    <Code2 className="h-4 w-4 mr-2 text-blue-500" />
                    <span>main.c</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ml-4">
              <div
                className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  expandedFolders["inc"] ? "" : ""
                }`}
                onClick={() => toggleFolder("inc")}
              >
                {expandedFolders["inc"] ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                {expandedFolders["inc"] ? (
                  <FolderOpenIcon className="h-4 w-4 mr-2 text-yellow-500" />
                ) : (
                  <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
                )}
                <span>inc</span>
              </div>

              {expandedFolders["inc"] && (
                <div className="ml-6">
                  <div
                    className={`flex items-center py-1 px-2 rounded cursor-pointer ${
                      activeItem === "main.h"
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => handleItemClick("main.h")}
                  >
                    <FileText className="h-4 w-4 mr-2 text-green-500" />
                    <span>main.h</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ml-4">
              <div
                className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  expandedFolders["drivers"] ? "" : ""
                }`}
                onClick={() => toggleFolder("drivers")}
              >
                {expandedFolders["drivers"] ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                {expandedFolders["drivers"] ? (
                  <FolderOpenIcon className="h-4 w-4 mr-2 text-yellow-500" />
                ) : (
                  <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
                )}
                <span>drivers</span>
              </div>

              {expandedFolders["drivers"] && (
                <div className="ml-6">
                  <div
                    className={`flex items-center py-1 px-2 rounded cursor-pointer ${
                      activeItem === "stm32f4xx_hal.h"
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => handleItemClick("stm32f4xx_hal.h")}
                  >
                    <FileText className="h-4 w-4 mr-2 text-green-500" />
                    <span>stm32f4xx_hal.h</span>
                  </div>
                  <div
                    className={`flex items-center py-1 px-2 rounded cursor-pointer ${
                      activeItem === "stm32f4xx_hal_gpio.h"
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => handleItemClick("stm32f4xx_hal_gpio.h")}
                  >
                    <FileText className="h-4 w-4 mr-2 text-green-500" />
                    <span>stm32f4xx_hal_gpio.h</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
