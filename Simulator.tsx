"use client"

import { useState } from "react"
import { compileAndRun } from "@/lib/emscripten-compiler"
import { Button } from "@/components/ui/button"
import { Play, Square, RefreshCw } from "lucide-react"

interface SimulatorProps {
  code: string
  selectedPins: string[]
  onSimulationResult: (result: string) => void
}

export default function Simulator({ code, selectedPins, onSimulationResult }: SimulatorProps) {
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSimulation = async () => {
    setIsRunning(true)
    setError(null)
    setOutput("Compiling...\n")

    try {
      const result = await compileAndRun(code, selectedPins)
      setOutput((prev) => prev + result)
      onSimulationResult(result)
    } catch (error: any) {
      setError(error.toString())
      setOutput((prev) => prev + `\nError: ${error}\n`)
    } finally {
      setIsRunning(false)
    }
  }

  const stopSimulation = () => {
    setOutput((prev) => prev + "\nSimulation stopped by user\n")
    setIsRunning(false)
  }

  const clearOutput = () => {
    setOutput("")
    setError(null)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 text-white p-2 flex items-center justify-between">
        <span>Simulation Console</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={runSimulation} disabled={isRunning}>
            <Play className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={stopSimulation} disabled={!isRunning}>
            <Square className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={clearOutput}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        className={`bg-black text-white p-4 flex-grow overflow-auto font-mono text-sm ${error ? "border-l-4 border-red-500" : ""}`}
      >
        <pre>{output}</pre>
      </div>
    </div>
  )
}
