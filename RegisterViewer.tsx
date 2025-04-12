"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Edit2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface RegisterViewerProps {
  registers: Record<string, number>
  boardType: string
  onRefresh: () => void
  isConnected: boolean
}

export default function RegisterViewer({ registers, boardType, onRefresh, isConnected }: RegisterViewerProps) {
  const [activeGroup, setActiveGroup] = useState("gpio")
  const [editRegister, setEditRegister] = useState<{ name: string; value: number } | null>(null)
  const [editValue, setEditValue] = useState("")

  const handleRefresh = () => {
    onRefresh()
  }

  const handleEditRegister = (name: string, value: number) => {
    setEditRegister({ name, value })
    setEditValue(value.toString(16).toUpperCase().padStart(8, "0"))
  }

  const handleSaveRegister = async () => {
    if (!editRegister) return

    try {
      const { writeRegister } = await import("@/lib/usb-communication")
      const value = Number.parseInt(editValue, 16)
      await writeRegister(editRegister.name, value)

      // Update the local state (this would be replaced by a fresh read in a real implementation)
      registers[editRegister.name] = value

      setEditRegister(null)
    } catch (error) {
      console.error("Failed to write register:", error)
    }
  }

  const renderRegisterGroup = (group: string, title: string, registerNames: string[]) => {
    return (
      <TabsContent value={group} className="p-0 m-0">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registerNames.map((name) => {
              const value = registers[name] || 0
              const hexValue = value.toString(16).toUpperCase().padStart(8, "0")
              const binaryValue = value.toString(2).padStart(32, "0")

              return (
                <div key={name} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRegister(name, value)}
                      disabled={!isConnected}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Hex:</span>
                      <code className="font-mono">0x{hexValue}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Decimal:</span>
                      <code className="font-mono">{value}</code>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">Binary:</span>
                      <div className="font-mono text-xs mt-1 overflow-x-auto">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="flex">
                            <span className="w-8 text-gray-500">{(i * 8).toString().padStart(2, "0")}:</span>
                            <span>{binaryValue.substring(i * 8, (i + 1) * 8).replace(/(.{4})/g, "$1 ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </TabsContent>
    )
  }

  // Define register groups based on board type
  const getRegisterGroups = () => {
    if (boardType === "F031K6") {
      return {
        gpio: {
          title: "GPIO Registers",
          registers: [
            "GPIOA_MODER",
            "GPIOA_OTYPER",
            "GPIOA_OSPEEDR",
            "GPIOA_PUPDR",
            "GPIOA_IDR",
            "GPIOA_ODR",
            "GPIOA_BSRR",
            "GPIOA_LCKR",
            "GPIOA_AFRL",
            "GPIOA_AFRH",
          ],
        },
        rcc: {
          title: "RCC Registers",
          registers: [
            "RCC_CR",
            "RCC_CFGR",
            "RCC_CIR",
            "RCC_APB2RSTR",
            "RCC_APB1RSTR",
            "RCC_AHBENR",
            "RCC_APB2ENR",
            "RCC_APB1ENR",
          ],
        },
        tim: {
          title: "Timer Registers",
          registers: [
            "TIM1_CR1",
            "TIM1_CR2",
            "TIM1_SMCR",
            "TIM1_DIER",
            "TIM1_SR",
            "TIM1_EGR",
            "TIM1_CCMR1",
            "TIM1_CCMR2",
            "TIM1_CCER",
            "TIM1_CNT",
            "TIM1_PSC",
            "TIM1_ARR",
          ],
        },
        adc: {
          title: "ADC Registers",
          registers: [
            "ADC_ISR",
            "ADC_IER",
            "ADC_CR",
            "ADC_CFGR1",
            "ADC_CFGR2",
            "ADC_SMPR",
            "ADC_TR",
            "ADC_CHSELR",
            "ADC_DR",
          ],
        },
      }
    }

    // Default to F446RE
    return {
      gpio: {
        title: "GPIO Registers",
        registers: [
          "GPIOA_MODER",
          "GPIOA_OTYPER",
          "GPIOA_OSPEEDR",
          "GPIOA_PUPDR",
          "GPIOA_IDR",
          "GPIOA_ODR",
          "GPIOA_BSRR",
          "GPIOA_LCKR",
          "GPIOA_AFRL",
          "GPIOA_AFRH",
        ],
      },
      rcc: {
        title: "RCC Registers",
        registers: [
          "RCC_CR",
          "RCC_PLLCFGR",
          "RCC_CFGR",
          "RCC_CIR",
          "RCC_AHB1RSTR",
          "RCC_AHB2RSTR",
          "RCC_AHB3RSTR",
          "RCC_APB1RSTR",
          "RCC_APB2RSTR",
        ],
      },
      tim: {
        title: "Timer Registers",
        registers: [
          "TIM1_CR1",
          "TIM1_CR2",
          "TIM1_SMCR",
          "TIM1_DIER",
          "TIM1_SR",
          "TIM1_EGR",
          "TIM1_CCMR1",
          "TIM1_CCMR2",
          "TIM1_CCER",
          "TIM1_CNT",
          "TIM1_PSC",
          "TIM1_ARR",
        ],
      },
      adc: {
        title: "ADC Registers",
        registers: [
          "ADC1_SR",
          "ADC1_CR1",
          "ADC1_CR2",
          "ADC1_SMPR1",
          "ADC1_SMPR2",
          "ADC1_JOFR1",
          "ADC1_JOFR2",
          "ADC1_JOFR3",
          "ADC1_JOFR4",
          "ADC1_HTR",
          "ADC1_LTR",
          "ADC1_SQR1",
        ],
      },
    }
  }

  const registerGroups = getRegisterGroups()

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">STM32 {boardType} Registers</h2>
        <Button variant="outline" onClick={handleRefresh} disabled={!isConnected} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-lg text-gray-600">Connect a device to view registers</p>
        </div>
      ) : (
        <Tabs value={activeGroup} onValueChange={setActiveGroup} className="flex-grow flex flex-col">
          <TabsList className="mx-4 justify-start">
            {Object.entries(registerGroups).map(([key, { title }]) => (
              <TabsTrigger key={key} value={key}>
                {title.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(registerGroups).map(([key, { title, registers }]) =>
            renderRegisterGroup(key, title, registers),
          )}
        </Tabs>
      )}

      {/* Edit Register Dialog */}
      <Dialog open={!!editRegister} onOpenChange={(open) => !open && setEditRegister(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Register {editRegister?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="register-value" className="text-right">
                Value (hex)
              </Label>
              <div className="col-span-3 flex">
                <span className="bg-gray-100 px-3 py-2 border border-r-0 rounded-l-md">0x</span>
                <Input
                  id="register-value"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value.replace(/[^0-9A-Fa-f]/g, ""))}
                  className="rounded-l-none font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRegister(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRegister}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
