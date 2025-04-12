"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import p5 from "p5"

interface NucleoBoardProps {
  simulationResult: string
  selectedPins: string[]
  pinConfigurations: Record<string, string>
  boardType: string
  isConnected: boolean
  isRunning: boolean
  darkMode: boolean
}

export default function NucleoBoard({
  simulationResult,
  selectedPins,
  pinConfigurations,
  boardType,
  isConnected,
  isRunning,
  darkMode,
}: NucleoBoardProps) {
  const [lcdText, setLcdText] = useState("STM32 Nucleo\nEduBase V2")
  const [segmentDisplay, setSegmentDisplay] = useState("1234")
  const [leds, setLeds] = useState([false, false, false, false])
  const [potValue, setPotValue] = useState(50)
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d")
  const [pinStates, setPinStates] = useState<Record<string, string>>({})
  const [buttonStates, setButtonStates] = useState<Record<string, boolean>>({})
  const canvasRef = useRef<HTMLDivElement>(null)
  const threeCanvasRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>(null)
  const threeSceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    ledMeshes: THREE.Mesh[]
    screenTextMesh: THREE.Mesh
  } | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (simulationResult) {
      // Parse simulation result to update board state
      if (simulationResult.includes("LCD:")) {
        const match = simulationResult.match(/LCD: (.*?)(?:\n|$)/)
        if (match && match[1]) {
          setLcdText(match[1].replace("\\n", "\n"))
        }
      }

      if (simulationResult.includes("7SEG:")) {
        const match = simulationResult.match(/7SEG: (\d{1,4})/)
        if (match && match[1]) {
          setSegmentDisplay(match[1].padStart(4, "0"))
        }
      }

      if (simulationResult.includes("LED:")) {
        const match = simulationResult.match(/LED: (\d{1,4})/)
        if (match && match[1]) {
          const ledState = match[1].padStart(4, "0")
          setLeds(ledState.split("").map((l) => l === "1"))
        }
      }
    }
  }, [simulationResult])

  const startPinPolling = async () => {
    if (pollingIntervalRef.current) return

    // Poll pin states every 500ms
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { readPinStates } = await import("@/lib/usb-communication")
        const states = await readPinStates(selectedPins)
        setPinStates(states)

        // Update LEDs based on pin states
        const newLeds = [...leds]
        if (states["PA5"] === "HIGH") newLeds[0] = true
        if (states["PA5"] === "LOW") newLeds[0] = false

        // Update other LEDs based on other pins if configured
        selectedPins.forEach((pin, index) => {
          if (index < 4 && pinConfigurations[pin]?.includes("GPIO_Output")) {
            if (states[pin] === "HIGH") newLeds[index] = true
            if (states[pin] === "LOW") newLeds[index] = false
          }
        })

        setLeds(newLeds)

        // Update 7-segment display if ADC pin is configured
        const adcPin = selectedPins.find((pin) => pinConfigurations[pin]?.includes("ADC"))
        if (adcPin && states[adcPin]?.startsWith("ADC:")) {
          const adcValue = states[adcPin].split(":")[1].trim()
          setSegmentDisplay(adcValue.padStart(4, "0").substring(0, 4))
        }
      } catch (error) {
        console.error("Failed to poll pin states:", error)
        stopPinPolling()
      }
    }, 500)
  }

  const stopPinPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Start/stop pin state polling when connected/disconnected or running/stopped
  useEffect(() => {
    if (isConnected && isRunning) {
      startPinPolling()
    } else {
      stopPinPolling()
    }

    return () => {
      stopPinPolling()
    }
  }, [isConnected, isRunning, selectedPins, pinConfigurations, leds])

  // Enhance the board simulation to better match physical hardware
  useEffect(() => {
    if (viewMode === "2d" && canvasRef.current && !p5InstanceRef.current) {
      const sketch = (p: any) => {
        // Initialize button states for the 4x4 keypad
        const keypadButtons = Array(16).fill(false)

        p.setup = () => {
          const canvas = p.createCanvas(800, 600)
          canvas.parent(canvasRef.current!)
        }

        p.draw = () => {
          p.background(darkMode ? 30 : 240)

          // Draw board outline based on board type with more accurate dimensions
          p.fill(darkMode ? 50 : 255, darkMode ? 50 : 255, darkMode ? 50 : 255, 20)
          p.stroke(darkMode ? 200 : 0)

          // Draw the main board - black PCB
          p.fill(30, 30, 30)
          p.rect(50, 50, 700, 500, 10)

          // Draw the Nucleo board - white PCB
          p.fill(240, 240, 240)
          p.rect(70, 70, 300, 300, 5)

          // Draw ST-LINK section
          p.fill(80, 80, 100)
          p.rect(80, 80, 100, 80)
          p.fill(darkMode ? 200 : 0)
          p.textSize(12)
          p.text("ST-LINK", 110, 100)

          // Draw mini-USB connector
          p.fill(40, 40, 40)
          p.rect(90, 120, 30, 20)

          // Draw STM32 MCU
          p.fill(50, 50, 50)
          p.rect(200, 150, 60, 60)
          p.fill(255)
          p.textSize(10)
          p.text("STM32", 215, 180)

          // Draw user button (B1)
          p.fill(0, 0, 200)
          p.ellipse(150, 200, 20, 20)
          p.fill(darkMode ? 200 : 0)
          p.textSize(10)
          p.text("B1", 150, 220)

          // Draw user LED (LD2)
          p.fill(leds[0] ? p.color(0, 255, 0) : p.color(0, 50, 0))

          p.ellipse(250, 200, 15, 15)
          p.fill(darkMode ? 200 : 0)
          p.textSize(10)
          p.text("LD2", 250, 220)

          // Draw pin headers
          p.fill(30, 30, 30)
          p.rect(80, 250, 280, 20) // Left header
          p.rect(80, 280, 280, 20) // Right header

          // Draw LCD with correct position (based on the image)
          p.fill(0, 0, darkMode ? 100 : 150)
          p.rect(400, 100, 300, 100)
          p.fill(darkMode ? 150 : 200, darkMode ? 200 : 220, darkMode ? 255 : 255)
          p.rect(410, 110, 280, 80)
          p.fill(0, 0, darkMode ? 150 : 150)
          p.textSize(20)
          p.textAlign(p.CENTER)
          const lines = lcdText.split("\n")
          lines.forEach((line, i) => {
            p.text(line, 550, 145 + i * 30)
          })

          // Draw 7-segment display (yellow/amber color)
          p.fill(30, 30, 30)
          p.rect(400, 220, 300, 60)
          p.textSize(40)
          p.fill(255, 200, 0)
          p.text(segmentDisplay, 550, 260)

          // Draw LEDs (4 LEDs as shown in the image)
          p.textSize(12)
          p.fill(darkMode ? 200 : 0)
          p.text("LEDs", 550, 300)
          for (let i = 0; i < 4; i++) {
            p.fill(leds[i] ? p.color(255, 0, 0) : p.color(50, 0, 0))
            p.ellipse(450 + i * 50, 320, 20, 20)
            p.fill(darkMode ? 200 : 0)
            p.textSize(10)
            p.text(`LED${i}`, 450 + i * 50, 340)
          }

          // Draw 4x4 keypad matrix (16 buttons) as shown in the image
          p.textSize(12)
          p.fill(darkMode ? 200 : 0)
          p.text("Keypad", 550, 380)

          const keypadLabels = ["1", "2", "3", "A", "4", "5", "6", "B", "7", "8", "9", "C", "*", "0", "#", "D"]
          for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
              const index = row * 4 + col
              const x = 450 + col * 50
              const y = 400 + row * 50

              // Draw button
              p.fill(keypadButtons[index] ? p.color(150) : p.color(200))
              p.rect(x - 15, y - 15, 30, 30, 5)

              // Draw label
              p.fill(0)
              p.textAlign(p.CENTER, p.CENTER)
              p.text(keypadLabels[index], x, y)

              // Handle mouse interaction
              if (
                p.mouseIsPressed &&
                p.mouseX > x - 15 &&
                p.mouseX < x + 15 &&
                p.mouseY > y - 15 &&
                p.mouseY < y + 15
              ) {
                keypadButtons[index] = true
              } else {
                keypadButtons[index] = false
              }
            }
          }

          // Draw potentiometer
          p.fill(darkMode ? 200 : 0)
          p.textSize(12)
          p.text("Potentiometer", 400, 580)
          p.fill(200)
          p.ellipse(450, 580, 40, 40)
          p.fill(50)
          p.ellipse(450, 580, 15, 15)

          // Draw potentiometer indicator
          const angle = p.map(potValue, 0, 100, 0, p.TWO_PI * 0.75)
          const px = 450 + p.cos(angle) * 15
          const py = 580 + p.sin(angle) * 15
          p.stroke(255, 0, 0)
          p.strokeWeight(2)
          p.line(450, 580, px, py)
          p.strokeWeight(1)
          p.stroke(darkMode ? 200 : 0)

          // Draw breadboard area
          p.fill(255)
          p.rect(100, 350, 250, 200)
          p.stroke(200)
          p.strokeWeight(0.5)

          // Draw breadboard holes
          for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 30; col++) {
              p.point(110 + col * 8, 360 + row * 20)
            }
          }
          p.strokeWeight(1)
          p.stroke(darkMode ? 200 : 0)

          // Draw connection status
          p.fill(isConnected ? p.color(0, 255, 0) : p.color(255, 0, 0))
          p.ellipse(750, 30, 15, 15)
          p.fill(darkMode ? 200 : 0)
          p.textAlign(p.LEFT)
          p.text(isConnected ? "Connected" : "Disconnected", 700, 35)

          // Draw pin states for configured pins
          p.textSize(10)
          p.textAlign(p.LEFT)

          const yPos = 400
          selectedPins.slice(0, 10).forEach((pin, i) => {
            const config = pinConfigurations[pin] || "GPIO"
            const state = pinStates[pin]

            let pinColor
            if (state === "HIGH") pinColor = p.color(0, 255, 0)
            else if (state === "LOW") pinColor = p.color(255, 0, 0)
            else if (config.includes("GPIO_Input")) pinColor = p.color(0, 255, 0)
            else if (config.includes("GPIO_Output")) pinColor = p.color(0, 0, 255)
            else if (config.includes("ADC")) pinColor = p.color(255, 255, 0)
            else if (config.includes("DAC")) pinColor = p.color(255, 165, 0)
            else pinColor = p.color(100, 100, 100)

            p.fill(pinColor)
            p.rect(600, yPos + i * 20, 10, 10)
            p.fill(darkMode ? 200 : 0)
            p.text(`${pin}: ${state || config}`, 620, yPos + i * 20 + 8)
          })
        }

        // Mouse pressed event for interactive elements
        p.mousePressed = () => {
          // Check if mouse is over the potentiometer
          const d = p.dist(p.mouseX, p.mouseY, 450, 580)
          if (d < 20) {
            // Start dragging the potentiometer
            p.loop()
            return false
          }

          // Check if mouse is over any button
          const keypadLabels = ["1", "2", "3", "A", "4", "5", "6", "B", "7", "8", "9", "C", "*", "0", "#", "D"]
          for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
              const index = row * 4 + col
              const x = 450 + col * 50
              const y = 400 + row * 50

              if (p.dist(p.mouseX, p.mouseY, x, y) < 15) {
                // Button pressed
                setButtonStates((prev) => ({ ...prev, [keypadLabels[index]]: true }))
                return false
              }
            }
          }

          return true
        }

        // Mouse dragged event for potentiometer
        p.mouseDragged = () => {
          // Check if dragging the potentiometer
          const d = p.dist(p.mouseX, p.mouseY, 450, 580)
          if (d < 40) {
            // Calculate angle and convert to potentiometer value
            const angle = p.atan2(p.mouseY - 580, p.mouseX - 450)
            let value = p.map(angle, -p.PI, p.PI, 0, 100)

            // Constrain to valid range
            value = p.constrain(value, 0, 100)
            setPotValue(value)

            // Update ADC value if an ADC pin is configured
            const adcPin = selectedPins.find((pin) => pinConfigurations[pin]?.includes("ADC"))
            if (adcPin) {
              // Map potentiometer value (0-100) to ADC range (0-4095)
              const adcValue = Math.floor((value / 100) * 4095)
              setSegmentDisplay(adcValue.toString().padStart(4, "0").substring(0, 4))

              // Update pin states
              setPinStates((prev) => ({
                ...prev,
                [adcPin]: `ADC: ${adcValue}`,
              }))
            }

            return false
          }

          return true
        }

        // Mouse released event
        p.mouseReleased = () => {
          // Reset all button states
          setButtonStates({})
          return true
        }
      }

      p5InstanceRef.current = new p5(sketch)
    }

    // Cleanup function
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
        p5InstanceRef.current = null
      }
    }
  }, [
    viewMode,
    lcdText,
    segmentDisplay,
    leds,
    potValue,
    selectedPins,
    pinConfigurations,
    boardType,
    darkMode,
    isConnected,
    pinStates,
    buttonStates,
  ])

  // Initialize Three.js for 3D visualization
  useEffect(() => {
    if (viewMode === "3d" && threeCanvasRef.current && !threeSceneRef.current) {
      // Set up scene with better lighting and materials
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(darkMode ? 0x111827 : 0xf0f0f0)

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
      scene.add(ambientLight)

      // Add directional lights for better shadows
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight1.position.set(10, 10, 10)
      scene.add(directionalLight1)

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
      directionalLight2.position.set(-10, 5, -10)
      scene.add(directionalLight2)

      // Set up camera with better positioning
      const camera = new THREE.PerspectiveCamera(
        60,
        threeCanvasRef.current.clientWidth / threeCanvasRef.current.clientHeight,
        0.1,
        1000,
      )
      camera.position.set(0, 15, 25)
      camera.lookAt(0, 0, 0)

      // Set up renderer with better quality
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      })
      renderer.setSize(threeCanvasRef.current.clientWidth, threeCanvasRef.current.clientHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.shadowMap.enabled = true
      threeCanvasRef.current.appendChild(renderer.domElement)

      // Add controls with better defaults
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.rotateSpeed = 0.7
      controls.minDistance = 10
      controls.maxDistance = 50

      // Create main board (black PCB)
      const mainBoardGeometry = new THREE.BoxGeometry(22, 0.2, 16)
      const mainBoardMaterial = new THREE.MeshStandardMaterial({
        color: 0x202020,
        roughness: 0.8,
        metalness: 0.2,
      })
      const mainBoard = new THREE.Mesh(mainBoardGeometry, mainBoardMaterial)
      mainBoard.receiveShadow = true
      scene.add(mainBoard)

      // Create Nucleo board (white PCB)
      const nucleoBoardGeometry = new THREE.BoxGeometry(10, 0.3, 8)
      const nucleoBoardMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        roughness: 0.7,
        metalness: 0.1,
      })
      const nucleoBoard = new THREE.Mesh(nucleoBoardGeometry, nucleoBoardMaterial)
      nucleoBoard.position.set(-5, 0.2, -3)
      nucleoBoard.receiveShadow = true
      scene.add(nucleoBoard)

      // Create MCU with better detail
      const mcuGeometry = new THREE.BoxGeometry(2, 0.4, 2)
      const mcuMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.7,
        metalness: 0.3,
      })
      const mcu = new THREE.Mesh(mcuGeometry, mcuMaterial)
      mcu.position.set(-5, 0.5, -3)
      mcu.castShadow = true
      mcu.receiveShadow = true
      scene.add(mcu)

      // Add MCU text
      const textGeometry = new THREE.PlaneGeometry(1.8, 0.9)
      const textTexture = createTextTexture("STM32\n" + boardType)
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide,
      })
      const textMesh = new THREE.Mesh(textGeometry, textMaterial)
      textMesh.position.set(-5, 0.7, -3)
      textMesh.rotation.x = -Math.PI / 2
      scene.add(textMesh)

      // Create LCD display
      const lcdGeometry = new THREE.BoxGeometry(8, 0.5, 3)
      const lcdFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x006600,
        roughness: 0.5,
        metalness: 0.2,
      })
      const lcd = new THREE.Mesh(lcdGeometry, lcdFrameMaterial)
      lcd.position.set(5, 0.5, -5)
      lcd.castShadow = true
      lcd.receiveShadow = true
      scene.add(lcd)

      // LCD screen
      const lcdScreenGeometry = new THREE.PlaneGeometry(7.5, 2.5)
      const lcdScreenTexture = createLCDTexture(lcdText)
      const lcdScreenMaterial = new THREE.MeshBasicMaterial({
        map: lcdScreenTexture,
        transparent: false,
        side: THREE.FrontSide,
        color: 0x88aaff,
      })
      const lcdScreen = new THREE.Mesh(lcdScreenGeometry, lcdScreenMaterial)
      lcdScreen.position.set(5, 0.76, -5)
      lcdScreen.rotation.x = -Math.PI / 2
      scene.add(lcdScreen)

      // Create 7-segment display
      const segmentGeometry = new THREE.BoxGeometry(6, 0.3, 1.5)
      const segmentMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.1,
      })
      const segmentDisplay = new THREE.Mesh(segmentGeometry, segmentMaterial)
      segmentDisplay.position.set(5, 0.5, -1.5)
      segmentDisplay.castShadow = true
      segmentDisplay.receiveShadow = true
      scene.add(segmentDisplay)

      // 7-segment digits
      const segmentScreenGeometry = new THREE.PlaneGeometry(5.5, 1.2)
      const segmentScreenTexture = createSegmentTexture(segmentDisplay)
      const segmentScreenMaterial = new THREE.MeshBasicMaterial({
        map: segmentScreenTexture,
        transparent: false,
        side: THREE.FrontSide,
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.5,
      })
      const segmentScreen = new THREE.Mesh(segmentScreenGeometry, segmentScreenMaterial)
      segmentScreen.position.set(5, 0.66, -1.5)
      segmentScreen.rotation.x = -Math.PI / 2
      scene.add(segmentScreen)

      // Create LEDs with better materials and effects
      const ledGeometry = new THREE.SphereGeometry(0.3, 16, 16)
      const ledMeshes: THREE.Mesh[] = []

      for (let i = 0; i < 4; i++) {
        const ledMaterial = new THREE.MeshStandardMaterial({
          color: leds[i] ? 0xff0000 : 0x330000,
          emissive: leds[i] ? 0xff0000 : 0x000000,
          emissiveIntensity: leds[i] ? 0.8 : 0,
          roughness: 0.3,
          metalness: 0.5,
        })

        const led = new THREE.Mesh(ledGeometry, ledMaterial)
        led.position.set(3 + i * 1.2, 0.5, 1)
        led.castShadow = true
        scene.add(led)
        ledMeshes.push(led)
      }

      // Create 4x4 keypad
      const keypadGeometry = new THREE.BoxGeometry(6, 0.4, 6)
      const keypadMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.1,
      })
      const keypad = new THREE.Mesh(keypadGeometry, keypadMaterial)
      keypad.position.set(5, 0.5, 5)
      keypad.castShadow = true
      keypad.receiveShadow = true
      scene.add(keypad)

      // Create keypad buttons
      const buttonGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32)
      const buttonMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.5,
        metalness: 0.2,
      })

      const buttonLabels = ["1", "2", "3", "A", "4", "5", "6", "B", "7", "8", "9", "C", "*", "0", "#", "D"]
      const buttonMeshes: THREE.Mesh[] = []

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const button = new THREE.Mesh(buttonGeometry, buttonMaterial.clone())
          button.position.set(3 + col * 1.2, 0.6, 3 + row * 1.2)
          button.castShadow = true
          scene.add(button)
          buttonMeshes.push(button)

          // Add button label
          const labelGeometry = new THREE.PlaneGeometry(0.5, 0.5)
          const labelCanvas = document.createElement("canvas")
          labelCanvas.width = 64
          labelCanvas.height = 64
          const labelCtx = labelCanvas.getContext("2d")!
          labelCtx.fillStyle = "white"
          labelCtx.fillRect(0, 0, 64, 64)
          labelCtx.fillStyle = "black"
          labelCtx.font = "bold 40px Arial"
          labelCtx.textAlign = "center"
          labelCtx.textBaseline = "middle"
          labelCtx.fillText(buttonLabels[row * 4 + col], 32, 32)

          const labelTexture = new THREE.CanvasTexture(labelCanvas)
          const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide,
          })

          const label = new THREE.Mesh(labelGeometry, labelMaterial)
          label.position.set(3 + col * 1.2, 0.71, 3 + row * 1.2)
          label.rotation.x = -Math.PI / 2
          scene.add(label)
        }
      }

      // Create breadboard
      const breadboardGeometry = new THREE.BoxGeometry(8, 0.5, 6)
      const breadboardMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0,
      })
      const breadboard = new THREE.Mesh(breadboardGeometry, breadboardMaterial)
      breadboard.position.set(-5, 0.5, 5)
      breadboard.castShadow = true
      breadboard.receiveShadow = true
      scene.add(breadboard)

      // Create potentiometer
      const potGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 32)
      const potMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.7,
        metalness: 0.3,
      })
      const pot = new THREE.Mesh(potGeometry, potMaterial)
      pot.position.set(-8, 0.5, 0)
      pot.castShadow = true
      scene.add(pot)

      // Create potentiometer knob
      const knobGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32)
      const knobMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.4,
      })
      const knob = new THREE.Mesh(knobGeometry, knobMaterial)
      knob.position.set(-8, 0.7, 0)
      knob.castShadow = true
      scene.add(knob)

      // Create potentiometer indicator
      const indicatorGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3)
      const indicatorMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.5,
        metalness: 0.2,
      })
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial)
      indicator.position.set(-8, 0.8, 0.2)
      indicator.castShadow = true
      scene.add(indicator)

      // Helper function to create board texture
      function createBoardTexture(boardType: string) {
        const canvas = document.createElement("canvas")
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext("2d")!

        // Fill background with board color
        ctx.fillStyle = boardType === "L476RG" ? "#34495e" : boardType === "F446RE" ? "#2c3e50" : "#3c5c7c"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Add circuit traces
        ctx.strokeStyle = "#95a5a6"
        ctx.lineWidth = 2

        // Horizontal traces
        for (let i = 0; i < 10; i++) {
          ctx.beginPath()
          ctx.moveTo(0, 50 + i * 40)
          ctx.lineTo(canvas.width, 50 + i * 40)
          ctx.stroke()
        }

        // Vertical traces
        for (let i = 0; i < 10; i++) {
          ctx.beginPath()
          ctx.moveTo(50 + i * 40, 0)
          ctx.lineTo(50 + i * 40, canvas.height)
          ctx.stroke()
        }

        // Add board text and logos
        ctx.fillStyle = "#ecf0f1"
        ctx.font = "bold 24px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`STM32 Nucleo ${boardType}`, canvas.width / 2, 30)

        ctx.font = "16px Arial"
        ctx.fillText("ST Microelectronics", canvas.width / 2, canvas.height - 20)

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
      }

      // Helper function to create text texture
      function createTextTexture(text: string) {
        const canvas = document.createElement("canvas")
        canvas.width = 256
        canvas.height = 128
        const ctx = canvas.getContext("2d")!

        ctx.fillStyle = darkMode ? "#111827" : "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.font = "bold 24px Arial"
        ctx.fillStyle = "#ffffff"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const lines = text.split("\n")
        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - 0.5) * 30)
        })

        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
      }

      // Helper function to create LCD texture
      function createLCDTexture(text: string) {
        const canvas = document.createElement("canvas")
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext("2d")!

        // LCD background
        ctx.fillStyle = "#88aaff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // LCD text
        ctx.font = "bold 40px 'Courier New', monospace"
        ctx.fillStyle = "#000066"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const lines = text.split("\n")
        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - 0.5) * 50)
        })

        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
      }

      // Helper function to create 7-segment display texture
      function createSegmentTexture(text: string) {
        const canvas = document.createElement("canvas")
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext("2d")!

        // Display background
        ctx.fillStyle = "#000000"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 7-segment digits
        ctx.font = "bold 80px 'Digital-7', monospace"
        ctx.fillStyle = "#ffaa00"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)

        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
      }

      // Animation loop with better performance
      const animate = () => {
        requestAnimationFrame(animate)
        controls.update()

        // Update LED materials based on state
        ledMeshes.forEach((led, i) => {
          const material = led.material as THREE.MeshStandardMaterial
          material.emissive.set(leds[i] ? 0xff0000 : 0x000000)
          material.emissiveIntensity = leds[i] ? 0.8 : 0
          material.color.set(leds[i] ? 0xff0000 : 0x330000)
        })

        // Update potentiometer rotation based on value
        const angle = (potValue / 100) * Math.PI * 1.5
        indicator.position.x = -8 + Math.cos(angle) * 0.3
        indicator.position.z = Math.sin(angle) * 0.3
        indicator.rotation.y = angle

        renderer.render(scene, camera)
      }

      animate()

      threeSceneRef.current = {
        scene,
        camera,
        renderer,
        controls,
        ledMeshes,
        screenTextMesh: lcdScreen,
      }

      // Handle window resize
      const handleResize = () => {
        if (!threeCanvasRef.current) return

        camera.aspect = threeCanvasRef.current.clientWidth / threeCanvasRef.current.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(threeCanvasRef.current.clientWidth / threeCanvasRef.current.clientHeight)
      }

      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        if (threeCanvasRef.current) {
          threeCanvasRef.current.removeChild(renderer.domElement)
        }
        threeSceneRef.current = null
      }
    }
  }, [viewMode, leds, darkMode, boardType, potValue])

  // Update 3D LCD display when text changes
  useEffect(() => {
    if (viewMode === "3d" && threeSceneRef.current && threeSceneRef.current.screenTextMesh) {
      const screenMesh = threeSceneRef.current.screenTextMesh
      const material = screenMesh.material as THREE.MeshBasicMaterial

      if (material.map) {
        // Create new texture with updated text
        const canvas = document.createElement("canvas")
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext("2d")!

        ctx.fillStyle = "#88aaff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.font = "bold 40px 'Courier New', monospace"
        ctx.fillStyle = "#000066"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const lines = lcdText.split("\n")
        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - 0.5) * 50)
        })

        // Update texture
        material.map.dispose()
        material.map = new THREE.CanvasTexture(canvas)
        material.needsUpdate = true
      }
    }
  }, [viewMode, lcdText])

  const handlePotChange = (value: number[]) => {
    setPotValue(value[0])

    // If ADC pin is configured, update the 7-segment display
    const adcPin = selectedPins.find((pin) => pinConfigurations[pin]?.includes("ADC"))
    if (adcPin) {
      // Map potentiometer value (0-100) to ADC range (0-4095)
      const adcValue = Math.floor((value[0] / 100) * 4095)
      setSegmentDisplay(adcValue.toString().padStart(4, "0").substring(0, 4))

      // Update pin states
      setPinStates((prev) => ({
        ...prev,
        [adcPin]: `ADC: ${adcValue}`,
      }))
    }
  }

  return (
    <div className={`h-full flex flex-col ${darkMode ? "bg-gray-950 text-white" : "bg-white text-black"}`}>
      <div className={`p-2 flex justify-between items-center ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
        <span className="font-semibold">STM32 {boardType} Board Simulation</span>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "2d" | "3d")}>
          <TabsList>
            <TabsTrigger value="2d">2D View</TabsTrigger>
            <TabsTrigger value="3d">3D View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-grow relative">
        {viewMode === "2d" ? (
          <div ref={canvasRef} className="w-full h-full"></div>
        ) : (
          <div ref={threeCanvasRef} className="w-full h-full"></div>
        )}
      </div>

      <div className={`p-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-t"}`}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold mb-2">Potentiometer Value</h3>
            <div className="flex items-center gap-4">
              <Slider value={[potValue]} onValueChange={handlePotChange} max={100} step={1} className="w-64" />
              <span>{potValue}%</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Manual Controls</h3>
            <div className="flex gap-2">
              {leds.map((on, i) => (
                <Button
                  key={i}
                  variant={on ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newLeds = [...leds]
                    newLeds[i] = !newLeds[i]
                    setLeds(newLeds)

                    // If connected to a real device, toggle the corresponding pin
                    if (isConnected) {
                      const pin = selectedPins.find((p) => pinConfigurations[p]?.includes("GPIO_Output"))
                      if (pin) {
                        import("@/lib/usb-communication").then(({ setPinState }) => {
                          setPinState(pin, newLeds[i] ? "HIGH" : "LOW")
                        })
                      }
                    }
                  }}
                >
                  LED {i}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
