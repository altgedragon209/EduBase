"use client"

import { useState, useEffect, useRef } from "react"
import type * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface Pin {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  type: "digital" | "analog" | "power" | "ground" | "other"
  function?: string
  state?: "HIGH" | "LOW" | string
  value?: number
  description?: string
}

interface Component {
  id: string
  name: string
  type: "led" | "button" | "switch" | "lcd" | "segment" | "potentiometer" | "buzzer" | "sensor" | "other"
  position: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  scale?: { x: number; y: number; z: number }
  color?: string
  state?: boolean | number | string
  pins: Pin[]
  description?: string
  model?: string
}

interface InteractiveBoardSimulationProps {
  boardType: string
  darkMode: boolean
  isConnected: boolean
  isRunning: boolean
  onPinChange?: (pin: string, value: any) => void
  onComponentInteraction?: (component: string, action: string, value: any) => void
  simulationData?: {
    pins?: Record<string, any>
    components?: Record<string, any>
  }
}

export default function InteractiveBoardSimulation({
  boardType,
  darkMode,
  isConnected,
  isRunning,
  onPinChange,
  onComponentInteraction,
  simulationData,
}: InteractiveBoardSimulationProps) {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d")
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [showPinLabels, setShowPinLabels] = useState(true)
  const [showComponentLabels, setShowComponentLabels] = useState(true)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [showComponentDetails, setShowComponentDetails] = useState(false)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [showPinDetails, setShowPinDetails] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [boardComponents, setBoardComponents] = useState<Component[]>([])
  const [boardPins, setBoardPins] = useState<Pin[]>([])
  const [lcdText, setLcdText] = useState<string[]>(["STM32 Nucleo", "EduBase V2"])
  const [segmentValue, setSegmentValue] = useState("1234")
  const [ledStates, setLedStates] = useState<Record<string, boolean>>({})
  const [buttonStates, setButtonStates] = useState<Record<string, boolean>>({})
  const [potValues, setPotValues] = useState<Record<string, number>>({})
  const [showPinout, setShowPinout] = useState(false)
  const [pinoutZoom, setPinoutZoom] = useState(1)
  const [pinConnections, setPinConnections] = useState<Record<string, string[]>>({})
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [connectionTarget, setConnectionTarget] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info")
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const threeCanvasRef = useRef<HTMLDivElement>(null)
  const pinoutCanvasRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>(null)
  const pinoutP5InstanceRef = useRef<any>(null)
  const threeSceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    raycaster: THREE.Raycaster
    mouse: THREE.Vector2
    components: Record<string, THREE.Object3D>
    pins: Record<string, THREE.Object3D>
    lights: THREE.Light[]
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize board components and pins based on board type
  useEffect(() => {
    // Define components for each board type
    const components: Record<string, Component[]> = {
      F446RE: [
        {
          id: "led1",
          name: "User LED (LD2)",
          type: "led",
          position: { x: 0.5, y: 0.1, z: 0.5 },
          color: "#00ff00",
          state: false,
          pins: [
            { id: "PA5", name: "PA5", position: { x: 0.5, y: 0, z: 0.5 }, type: "digital", function: "GPIO_Output" }
          ],
          description: "User LED connected to PA5 (Arduino D13)"
        },
        {
          id: "button1",
          name: "User Button (B1)",
          type: "button",
          position: { x: -0.5, y: 0.1, z: 0.5 },
          state: false,
          pins: [
            { id: "PC13", name: "PC13", position: { x: -0.5, y: 0, z: 0.5 }, type: "digital", function: "GPIO_Input" }
          ],
          description: "User button connected to PC13"
        },
        {
          id: "lcd1",
          name: "LCD Display",
          type: "lcd",
          position: { x: 0, y: 0.1, z: -0.5 },
          scale: { x: 0.8, y: 0.3, z: 0.1 },
          state: ["STM32 Nucleo", "EduBase V2"],
          pins: [
            { id: "PB8", name: "PB8", position: { x: -0.2, y: 0, z: -0.5 }, type: "digital", function: "I2C_SCL" },
            { id: "PB9", name: "PB9", position: { x: -0.1, y: 0, z: -0.5 }, type: "digital", function: "I2C_SDA" }
          ],
          description: "16x2 LCD display connected via I2C"
        },
        {
          id: "segment1",
          name: "7-Segment Display",
          type: "segment",
          position: { x: 0, y: 0.1, z: -0.2 },
          scale: { x: 0.6, y: 0.2, z: 0.1 },
          state: "1234",
          pins: [
            { id: "PA0", name: "PA0", position: { x: 0.1, y: 0, z: -0.2 }, type: "digital", function: "GPIO_Output" },
            { id: "PA1", name: "PA1", position: { x: 0.2, y: 0, z: -0.2 }, type: "digital", function: "GPIO_Output" },
            { id: "PA2", name: "PA2", position: { x: 0.3, y: 0, z: -0.2 }, type: "digital", function: "GPIO_Output" },
            { id: "PA3", name: "PA3", position: { x: 0.4, y: 0, z: -0.2 }, type: "digital", function: "GPIO_Output" }
          ],
          description: "4-digit 7-segment display"
        },
        {
          id: "pot1",
          name: "Potentiometer",
          type: "potentiometer",
          position: { x: -0.5, y: 0.1, z: -0.2 },
          state: 50,
          pins: [
            { id: "PA4", name: "PA4", position: { x: -0.5, y: 0, z: -0.2 }, type: "analog", function: "ADC_IN4" }
          ],
          description: "Analog potentiometer connected to PA4 (ADC1_IN4)"
        },
        {
          id: "keypad1",
          name: "Keypad",
          type: "other",
          position: { x: 0.5, y: 0.1, z: -0.8 },
          scale: { x: 0.6, y: 0.6, z: 0.1 },
          state: {},
          pins: [
            { id: "PB0", name: "PB0", position: { x: 0.3, y: 0, z: -0.7 }, type: "digital", function: "GPIO_Output" },
            { id: "PB1", name: "PB1", position: { x: 0.4, y: 0, z: -0.7 }, type: "digital", function: "GPIO_Output" },
            { id: "PB2", name: "PB2", position: { x: 0.5, y: 0, z: -0.7 }, type: "digital", function: "GPIO_Output" },
            { id: "PB3", name: "PB3", position: { x: 0.6, y: 0, z: -0.7 }, type: "digital", function: "GPIO_Output" },
            { id: "PB4", name: "PB4", position: { x: 0.3, y: 0, z: -0.8 }, type: "digital", function: "GPIO_Input" },
            { id: "PB5", name: "PB5", position: { x: 0.4, y: 0, z: -0.8 }, type: "digital", function: "GPIO_Input" },
            { id: "PB6", name: "PB6", position: { x: 0.5, y: 0, z: -0.8 }, type: "digital", function: "GPIO_Input" },
            { id: "PB7", name: "PB7", position: { x: 0.6, y: 0, z: -0.8 }, type: "digital", function: "GPIO_Input" }
          ],
          description: "4x4 Matrix keypad"
        },
        {
          id: "buzzer1",
          name: "Buzzer",
          type: "buzzer",
          position: { x: -0.5, y: 0.1, z: -0.8 },
          state: false,
          pins: [
            { id: "PA6", name: "PA6", position: { x: -0.5, y: 0, z: -0.8 }, type: "digital", function: "GPIO_Output" }
          ],
          description: "Piezo buzzer connected to PA6"
        }
      ],
      F031K6: [
        {
          id: "led1",\
          name: "User LED (LD2
