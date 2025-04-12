// Types for memory viewer and inspector

export interface MemoryAccessLog {
  timestamp: Date
  address: number
  value: number
  type: "read" | "write"
  source: string
}

export interface MemoryBreakpoint {
  id: string
  name: string
  address: number
  size: number
  type: "read" | "write" | "both"
  condition?: string
  enabled: boolean
  hitCount: number
}

export interface MemoryRegion {
  name: string
  startAddress: number
  size: number
  type: "flash" | "ram" | "peripheral" | "other"
  description?: string
}
