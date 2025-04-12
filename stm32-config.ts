export interface STM32Pin {
  id: string
  position: "top" | "right" | "bottom" | "left"
  selected: boolean
  function?: string
  mode?: string
  speed?: string
  pull?: string
  alternate?: string
}

export const getBoardPins = (boardType: string): STM32Pin[] => {
  if (boardType === "F031K6") {
    return f031k6Pins
  } else if (boardType === "L476RG") {
    return l476rgPins
  }

  // Default to F446RE
  return f446rePins
}

export const f446rePins: STM32Pin[] = [
  // Top pins
  { id: "PC13", position: "top", selected: false },
  { id: "PC14", position: "top", selected: false },
  { id: "PC15", position: "top", selected: false },
  { id: "PH0", position: "top", selected: false },
  { id: "PH1", position: "top", selected: false },
  { id: "NRST", position: "top", selected: false },
  { id: "PC0", position: "top", selected: false },
  { id: "PC1", position: "top", selected: false },
  { id: "PC2", position: "top", selected: false },
  { id: "PC3", position: "top", selected: false },
  { id: "VSSA", position: "top", selected: false },
  { id: "VDDA", position: "top", selected: false },

  // Right pins
  { id: "PA0", position: "right", selected: false },
  { id: "PA1", position: "right", selected: false },
  { id: "PA2", position: "right", selected: false },
  { id: "PA3", position: "right", selected: false },
  { id: "PA4", position: "right", selected: false },
  { id: "PA5", position: "right", selected: false, function: "GPIO_Output" },
  { id: "PA6", position: "right", selected: false },
  { id: "PA7", position: "right", selected: false },
  { id: "PC4", position: "right", selected: false },
  { id: "PC5", position: "right", selected: false },
  { id: "PB0", position: "right", selected: false },
  { id: "PB1", position: "right", selected: false },
  { id: "PB2", position: "right", selected: false },

  // Bottom pins
  { id: "PB10", position: "bottom", selected: false },
  { id: "PB11", position: "bottom", selected: false },
  { id: "VCAP", position: "bottom", selected: false },
  { id: "VDD", position: "bottom", selected: false },
  { id: "PB12", position: "bottom", selected: false },
  { id: "PB13", position: "bottom", selected: false },
  { id: "PB14", position: "bottom", selected: false },
  { id: "PB15", position: "bottom", selected: false },
  { id: "PC6", position: "bottom", selected: false },
  { id: "PC7", position: "bottom", selected: false },
  { id: "PC8", position: "bottom", selected: false },
  { id: "PC9", position: "bottom", selected: false },

  // Left pins
  { id: "PA8", position: "left", selected: false },
  { id: "PA9", position: "left", selected: false },
  { id: "PA10", position: "left", selected: false },
  { id: "PA11", position: "left", selected: false },
  { id: "PA12", position: "left", selected: false },
  { id: "PA13", position: "left", selected: false },
  { id: "VSS", position: "left", selected: false },
  { id: "VDD", position: "left", selected: false },
  { id: "PA14", position: "left", selected: false },
  { id: "PA15", position: "left", selected: false },
  { id: "PC10", position: "left", selected: false },
  { id: "PC11", position: "left", selected: false },
  { id: "PC12", position: "left", selected: false },
]

export const f031k6Pins: STM32Pin[] = [
  // Top pins
  { id: "VDD", position: "top", selected: false },
  { id: "BOOT0", position: "top", selected: false },
  { id: "PF0", position: "top", selected: false },
  { id: "PF1", position: "top", selected: false },
  { id: "NRST", position: "top", selected: false },
  { id: "VDDA", position: "top", selected: false },
  { id: "PA0", position: "top", selected: false },
  { id: "PA1", position: "top", selected: false },

  // Right pins
  { id: "PA2", position: "right", selected: false },
  { id: "PA3", position: "right", selected: false },
  { id: "PA4", position: "right", selected: false },
  { id: "PA5", position: "right", selected: false, function: "GPIO_Output" },
  { id: "PA6", position: "right", selected: false },
  { id: "PA7", position: "right", selected: false },
  { id: "PB0", position: "right", selected: false },
  { id: "PB1", position: "right", selected: false },

  // Bottom pins
  { id: "VSS", position: "bottom", selected: false },
  { id: "VDD", position: "bottom", selected: false },
  { id: "PB2", position: "bottom", selected: false },
  { id: "PB10", position: "bottom", selected: false },
  { id: "PB11", position: "bottom", selected: false },
  { id: "PB12", position: "bottom", selected: false },
  { id: "PB13", position: "bottom", selected: false },
  { id: "PB14", position: "bottom", selected: false },

  // Left pins
  { id: "PB15", position: "left", selected: false },
  { id: "PA8", position: "left", selected: false },
  { id: "PA9", position: "left", selected: false },
  { id: "PA10", position: "left", selected: false },
  { id: "PA11", position: "left", selected: false },
  { id: "PA12", position: "left", selected: false },
  { id: "PA13", position: "left", selected: false },
  { id: "PA14", position: "left", selected: false },
  { id: "PA15", position: "left", selected: false },
]

export const l476rgPins: STM32Pin[] = [
  // Top pins
  { id: "PC10", position: "top", selected: false },
  { id: "PC11", position: "top", selected: false },
  { id: "PC12", position: "top", selected: false },
  { id: "PD2", position: "top", selected: false },
  { id: "VDD", position: "top", selected: false },
  { id: "E5V", position: "top", selected: false },
  { id: "BOOT0", position: "top", selected: false },
  { id: "GND", position: "top", selected: false },
  { id: "NC", position: "top", selected: false },
  { id: "NC", position: "top", selected: false },

  // Right pins
  { id: "PA0", position: "right", selected: false },
  { id: "PA1", position: "right", selected: false },
  { id: "PA2", position: "right", selected: false },
  { id: "PA3", position: "right", selected: false },
  { id: "PA4", position: "right", selected: false },
  { id: "PA5", position: "right", selected: false, function: "GPIO_Output" },
  { id: "PA6", position: "right", selected: false },
  { id: "PA7", position: "right", selected: false },
  { id: "PA8", position: "right", selected: false },
  { id: "PA9", position: "right", selected: false },
  { id: "PA10", position: "right", selected: false },
  { id: "PA11", position: "right", selected: false },
  { id: "PA12", position: "right", selected: false },
  { id: "PA13", position: "right", selected: false },
  { id: "PA14", position: "right", selected: false },
  { id: "PA15", position: "right", selected: false },

  // Bottom pins
  { id: "PB0", position: "bottom", selected: false },
  { id: "PB1", position: "bottom", selected: false },
  { id: "PB2", position: "bottom", selected: false },
  { id: "PB3", position: "bottom", selected: false },
  { id: "PB4", position: "bottom", selected: false },
  { id: "PB5", position: "bottom", selected: false },
  { id: "PB6", position: "bottom", selected: false },
  { id: "PB7", position: "bottom", selected: false },
  { id: "PB8", position: "bottom", selected: false },
  { id: "PB9", position: "bottom", selected: false },
  { id: "PB10", position: "bottom", selected: false },
  { id: "PB11", position: "bottom", selected: false },
  { id: "PB12", position: "bottom", selected: false },
  { id: "PB13", position: "bottom", selected: false },
  { id: "PB14", position: "bottom", selected: false },
  { id: "PB15", position: "bottom", selected: false },

  // Left pins
  { id: "PC0", position: "left", selected: false },
  { id: "PC1", position: "left", selected: false },
  { id: "PC2", position: "left", selected: false },
  { id: "PC3", position: "left", selected: false },
  { id: "PC4", position: "left", selected: false },
  { id: "PC5", position: "left", selected: false },
  { id: "PC6", position: "left", selected: false },
  { id: "PC7", position: "left", selected: false },
  { id: "PC8", position: "left", selected: false },
  { id: "PC9", position: "left", selected: false },
  { id: "PC13", position: "left", selected: false },
  { id: "PC14", position: "left", selected: false },
  { id: "PC15", position: "left", selected: false },
  { id: "PH0", position: "left", selected: false },
  { id: "PH1", position: "left", selected: false },
  { id: "VBAT", position: "left", selected: false },
]
