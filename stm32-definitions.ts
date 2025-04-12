interface STM32Function {
  name: string
  description: string
  snippet?: string
}

interface STM32Macro {
  name: string
  description: string
}

interface STM32Type {
  name: string
  description: string
}

interface STM32Definitions {
  functions: STM32Function[]
  macros: STM32Macro[]
  types: STM32Type[]
}

export const stm32Definitions: Record<string, STM32Definitions> = {
  F446RE: {
    functions: [
      {
        name: "HAL_Init",
        description: "Initialize the HAL Library",
        snippet: "HAL_Init();",
      },
      {
        name: "HAL_GPIO_WritePin",
        description: "Set the state of a GPIO pin",
        snippet: "HAL_GPIO_WritePin(${1:GPIOx}, ${2:GPIO_Pin}, ${3:PinState});",
      },
      {
        name: "HAL_GPIO_TogglePin",
        description: "Toggle the state of a GPIO pin",
        snippet: "HAL_GPIO_TogglePin(${1:GPIOx}, ${2:GPIO_Pin});",
      },
      {
        name: "HAL_GPIO_ReadPin",
        description: "Read the state of a GPIO pin",
        snippet: "HAL_GPIO_ReadPin(${1:GPIOx}, ${2:GPIO_Pin});",
      },
      {
        name: "HAL_Delay",
        description: "Delay execution for a specified number of milliseconds",
        snippet: "HAL_Delay(${1:Delay});",
      },
      {
        name: "HAL_ADC_Start",
        description: "Start ADC conversion",
        snippet: "HAL_ADC_Start(${1:hadc});",
      },
      {
        name: "HAL_ADC_PollForConversion",
        description: "Poll for ADC conversion completion",
        snippet: "HAL_ADC_PollForConversion(${1:hadc}, ${2:Timeout});",
      },
      {
        name: "HAL_ADC_GetValue",
        description: "Get ADC conversion result",
        snippet: "HAL_ADC_GetValue(${1:hadc});",
      },
      {
        name: "HAL_UART_Transmit",
        description: "Transmit data over UART",
        snippet: "HAL_UART_Transmit(${1:huart}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "HAL_UART_Receive",
        description: "Receive data over UART",
        snippet: "HAL_UART_Receive(${1:huart}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "HAL_I2C_Master_Transmit",
        description: "Transmit data over I2C as master",
        snippet: "HAL_I2C_Master_Transmit(${1:hi2c}, ${2:DevAddress}, ${3:pData}, ${4:Size}, ${5:Timeout});",
      },
      {
        name: "HAL_I2C_Master_Receive",
        description: "Receive data over I2C as master",
        snippet: "HAL_I2C_Master_Receive(${1:hi2c}, ${2:DevAddress}, ${3:pData}, ${4:Size}, ${5:Timeout});",
      },
      {
        name: "HAL_SPI_Transmit",
        description: "Transmit data over SPI",
        snippet: "HAL_SPI_Transmit(${1:hspi}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "HAL_SPI_Receive",
        description: "Receive data over SPI",
        snippet: "HAL_SPI_Receive(${1:hspi}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "SystemClock_Config",
        description: "Configure the system clock",
        snippet: "void SystemClock_Config(void)\n{\n  ${0}\n}",
      },
      {
        name: "Error_Handler",
        description: "Handle errors",
        snippet: "void Error_Handler(void)\n{\n  ${0}\n}",
      },
    ],
    macros: [
      {
        name: "GPIO_PIN_0",
        description: "GPIO Pin 0",
      },
      {
        name: "GPIO_PIN_1",
        description: "GPIO Pin 1",
      },
      {
        name: "GPIO_PIN_2",
        description: "GPIO Pin 2",
      },
      {
        name: "GPIO_PIN_3",
        description: "GPIO Pin 3",
      },
      {
        name: "GPIO_PIN_4",
        description: "GPIO Pin 4",
      },
      {
        name: "GPIO_PIN_5",
        description: "GPIO Pin 5",
      },
      {
        name: "GPIO_PIN_6",
        description: "GPIO Pin 6",
      },
      {
        name: "GPIO_PIN_7",
        description: "GPIO Pin 7",
      },
      {
        name: "GPIO_PIN_8",
        description: "GPIO Pin 8",
      },
      {
        name: "GPIO_PIN_9",
        description: "GPIO Pin 9",
      },
      {
        name: "GPIO_PIN_10",
        description: "GPIO Pin 10",
      },
      {
        name: "GPIO_PIN_11",
        description: "GPIO Pin 11",
      },
      {
        name: "GPIO_PIN_12",
        description: "GPIO Pin 12",
      },
      {
        name: "GPIO_PIN_13",
        description: "GPIO Pin 13",
      },
      {
        name: "GPIO_PIN_14",
        description: "GPIO Pin 14",
      },
      {
        name: "GPIO_PIN_15",
        description: "GPIO Pin 15",
      },
      {
        name: "GPIO_PIN_SET",
        description: "GPIO Pin Set",
      },
      {
        name: "GPIO_PIN_RESET",
        description: "GPIO Pin Reset",
      },
      {
        name: "GPIO_MODE_INPUT",
        description: "GPIO Input Mode",
      },
      {
        name: "GPIO_MODE_OUTPUT_PP",
        description: "GPIO Output Push Pull Mode",
      },
      {
        name: "GPIO_MODE_OUTPUT_OD",
        description: "GPIO Output Open Drain Mode",
      },
      {
        name: "GPIO_MODE_AF_PP",
        description: "GPIO Alternate Function Push Pull Mode",
      },
      {
        name: "GPIO_MODE_AF_OD",
        description: "GPIO Alternate Function Open Drain Mode",
      },
      {
        name: "GPIO_MODE_ANALOG",
        description: "GPIO Analog Mode",
      },
      {
        name: "GPIO_NOPULL",
        description: "No Pull-up or Pull-down activation",
      },
      {
        name: "GPIO_PULLUP",
        description: "Pull-up activation",
      },
      {
        name: "GPIO_PULLDOWN",
        description: "Pull-down activation",
      },
    ],
    types: [
      {
        name: "GPIO_InitTypeDef",
        description: "GPIO Initialization Structure",
      },
      {
        name: "GPIO_TypeDef",
        description: "GPIO Type Definition",
      },
      {
        name: "ADC_HandleTypeDef",
        description: "ADC Handle Type Definition",
      },
      {
        name: "UART_HandleTypeDef",
        description: "UART Handle Type Definition",
      },
      {
        name: "I2C_HandleTypeDef",
        description: "I2C Handle Type Definition",
      },
      {
        name: "SPI_HandleTypeDef",
        description: "SPI Handle Type Definition",
      },
      {
        name: "TIM_HandleTypeDef",
        description: "Timer Handle Type Definition",
      },
      {
        name: "HAL_StatusTypeDef",
        description: "HAL Status Type Definition",
      },
      {
        name: "uint8_t",
        description: "8-bit unsigned integer",
      },
      {
        name: "uint16_t",
        description: "16-bit unsigned integer",
      },
      {
        name: "uint32_t",
        description: "32-bit unsigned integer",
      },
      {
        name: "int8_t",
        description: "8-bit signed integer",
      },
      {
        name: "int16_t",
        description: "16-bit signed integer",
      },
      {
        name: "int32_t",
        description: "32-bit signed integer",
      },
    ],
  },
  F031K6: {
    functions: [
      {
        name: "HAL_Init",
        description: "Initialize the HAL Library",
        snippet: "HAL_Init();",
      },
      {
        name: "HAL_GPIO_WritePin",
        description: "Set the state of a GPIO pin",
        snippet: "HAL_GPIO_WritePin(${1:GPIOx}, ${2:GPIO_Pin}, ${3:PinState});",
      },
      {
        name: "HAL_GPIO_TogglePin",
        description: "Toggle the state of a GPIO pin",
        snippet: "HAL_GPIO_TogglePin(${1:GPIOx}, ${2:GPIO_Pin});",
      },
      {
        name: "HAL_GPIO_ReadPin",
        description: "Read the state of a GPIO pin",
        snippet: "HAL_GPIO_ReadPin(${1:GPIOx}, ${2:GPIO_Pin});",
      },
      {
        name: "HAL_Delay",
        description: "Delay execution for a specified number of milliseconds",
        snippet: "HAL_Delay(${1:Delay});",
      },
      // Add more F031K6 specific functions
    ],
    macros: [
      // Similar to F446RE but with F031K6 specific macros
      {
        name: "GPIO_PIN_0",
        description: "GPIO Pin 0",
      },
      // Add more F031K6 specific macros
    ],
    types: [
      // Similar to F446RE but with F031K6 specific types
      {
        name: "GPIO_InitTypeDef",
        description: "GPIO Initialization Structure",
      },
      // Add more F031K6 specific types
    ],
  },
  L476RG: {
    functions: [
      {
        name: "HAL_Init",
        description: "Initialize the HAL Library",
        snippet: "HAL_Init();",
      },
      {
        name: "HAL_GPIO_WritePin",
        description: "Set the state of a GPIO pin",
        snippet: "HAL_GPIO_WritePin(${1:GPIOx}, ${2:GPIO_Pin}, ${3:PinState});",
      },
      {
        name: "HAL_GPIO_TogglePin",
        description: "Toggle the state of a GPIO pin",
        snippet: "HAL_GPIO_TogglePin(${1:GPIOx}, ${2:GPIO_Pin});",
      },
      {
        name: "HAL_GPIO_ReadPin",
        description: "Read the state of a GPIO pin",
        snippet: "HAL_GPIO_ReadPin(${1:GPIOx}, ${2:GPIO_Pin});",
      },
      {
        name: "HAL_Delay",
        description: "Delay execution for a specified number of milliseconds",
        snippet: "HAL_Delay(${1:Delay});",
      },
      {
        name: "HAL_ADC_Start",
        description: "Start ADC conversion",
        snippet: "HAL_ADC_Start(${1:hadc});",
      },
      {
        name: "HAL_ADC_PollForConversion",
        description: "Poll for ADC conversion completion",
        snippet: "HAL_ADC_PollForConversion(${1:hadc}, ${2:Timeout});",
      },
      {
        name: "HAL_ADC_GetValue",
        description: "Get ADC conversion result",
        snippet: "HAL_ADC_GetValue(${1:hadc});",
      },
      {
        name: "HAL_UART_Transmit",
        description: "Transmit data over UART",
        snippet: "HAL_UART_Transmit(${1:huart}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "HAL_UART_Receive",
        description: "Receive data over UART",
        snippet: "HAL_UART_Receive(${1:huart}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "HAL_I2C_Master_Transmit",
        description: "Transmit data over I2C as master",
        snippet: "HAL_I2C_Master_Transmit(${1:hi2c}, ${2:DevAddress}, ${3:pData}, ${4:Size}, ${5:Timeout});",
      },
      {
        name: "HAL_I2C_Master_Receive",
        description: "Receive data over I2C as master",
        snippet: "HAL_I2C_Master_Receive(${1:hi2c}, ${2:DevAddress}, ${3:pData}, ${4:Size}, ${5:Timeout});",
      },
      {
        name: "HAL_SPI_Transmit",
        description: "Transmit data over SPI",
        snippet: "HAL_SPI_Transmit(${1:hspi}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "HAL_SPI_Receive",
        description: "Receive data over SPI",
        snippet: "HAL_SPI_Receive(${1:hspi}, ${2:pData}, ${3:Size}, ${4:Timeout});",
      },
      {
        name: "HAL_LPTIM_Init",
        description: "Initialize the LPTIM peripheral",
        snippet: "HAL_LPTIM_Init(${1:hlptim});",
      },
      {
        name: "HAL_RNG_GenerateRandomNumber",
        description: "Generate a random number using the RNG peripheral",
        snippet: "HAL_RNG_GenerateRandomNumber(${1:hrng}, ${2:pRandomNumber});",
      },
      {
        name: "HAL_PWR_EnterSTOPMode",
        description: "Enter STOP mode",
        snippet: "HAL_PWR_EnterSTOPMode(${1:Regulator}, ${2:STOPEntry});",
      },
      {
        name: "HAL_RTC_Init",
        description: "Initialize the RTC peripheral",
        snippet: "HAL_RTC_Init(${1:hrtc});",
      },
      {
        name: "SystemClock_Config",
        description: "Configure the system clock",
        snippet: "void SystemClock_Config(void)\n{\n  ${0}\n}",
      },
      {
        name: "Error_Handler",
        description: "Handle errors",
        snippet: "void Error_Handler(void)\n{\n  ${0}\n}",
      },
    ],
    macros: [
      {
        name: "GPIO_PIN_0",
        description: "GPIO Pin 0",
      },
      {
        name: "GPIO_PIN_1",
        description: "GPIO Pin 1",
      },
      {
        name: "GPIO_PIN_2",
        description: "GPIO Pin 2",
      },
      {
        name: "GPIO_PIN_3",
        description: "GPIO Pin 3",
      },
      {
        name: "GPIO_PIN_4",
        description: "GPIO Pin 4",
      },
      {
        name: "GPIO_PIN_5",
        description: "GPIO Pin 5",
      },
      {
        name: "GPIO_PIN_6",
        description: "GPIO Pin 6",
      },
      {
        name: "GPIO_PIN_7",
        description: "GPIO Pin 7",
      },
      {
        name: "GPIO_PIN_8",
        description: "GPIO Pin 8",
      },
      {
        name: "GPIO_PIN_9",
        description: "GPIO Pin 9",
      },
      {
        name: "GPIO_PIN_10",
        description: "GPIO Pin 10",
      },
      {
        name: "GPIO_PIN_11",
        description: "GPIO Pin 11",
      },
      {
        name: "GPIO_PIN_12",
        description: "GPIO Pin 12",
      },
      {
        name: "GPIO_PIN_13",
        description: "GPIO Pin 13",
      },
      {
        name: "GPIO_PIN_14",
        description: "GPIO Pin 14",
      },
      {
        name: "GPIO_PIN_15",
        description: "GPIO Pin 15",
      },
      {
        name: "GPIO_PIN_SET",
        description: "GPIO Pin Set",
      },
      {
        name: "GPIO_PIN_RESET",
        description: "GPIO Pin Reset",
      },
      {
        name: "GPIO_MODE_INPUT",
        description: "GPIO Input Mode",
      },
      {
        name: "GPIO_MODE_OUTPUT_PP",
        description: "GPIO Output Push Pull Mode",
      },
      {
        name: "GPIO_MODE_OUTPUT_OD",
        description: "GPIO Output Open Drain Mode",
      },
      {
        name: "GPIO_MODE_AF_PP",
        description: "GPIO Alternate Function Push Pull Mode",
      },
      {
        name: "GPIO_MODE_AF_OD",
        description: "GPIO Alternate Function Open Drain Mode",
      },
      {
        name: "GPIO_MODE_ANALOG",
        description: "GPIO Analog Mode",
      },
      {
        name: "GPIO_NOPULL",
        description: "No Pull-up or Pull-down activation",
      },
      {
        name: "GPIO_PULLUP",
        description: "Pull-up activation",
      },
      {
        name: "GPIO_PULLDOWN",
        description: "Pull-down activation",
      },
      {
        name: "RCC_OSCILLATORTYPE_MSI",
        description: "MSI oscillator selection",
      },
      {
        name: "PWR_REGULATOR_VOLTAGE_SCALE1",
        description: "Voltage scaling range 1",
      },
      {
        name: "PWR_REGULATOR_VOLTAGE_SCALE2",
        description: "Voltage scaling range 2",
      },
    ],
    types: [
      {
        name: "GPIO_InitTypeDef",
        description: "GPIO Initialization Structure",
      },
      {
        name: "GPIO_TypeDef",
        description: "GPIO Type Definition",
      },
      {
        name: "ADC_HandleTypeDef",
        description: "ADC Handle Type Definition",
      },
      {
        name: "UART_HandleTypeDef",
        description: "UART Handle Type Definition",
      },
      {
        name: "I2C_HandleTypeDef",
        description: "I2C Handle Type Definition",
      },
      {
        name: "SPI_HandleTypeDef",
        description: "SPI Handle Type Definition",
      },
      {
        name: "TIM_HandleTypeDef",
        description: "Timer Handle Type Definition",
      },
      {
        name: "LPTIM_HandleTypeDef",
        description: "Low Power Timer Handle Type Definition",
      },
      {
        name: "RNG_HandleTypeDef",
        description: "Random Number Generator Handle Type Definition",
      },
      {
        name: "RTC_HandleTypeDef",
        description: "Real-Time Clock Handle Type Definition",
      },
      {
        name: "HAL_StatusTypeDef",
        description: "HAL Status Type Definition",
      },
      {
        name: "uint8_t",
        description: "8-bit unsigned integer",
      },
      {
        name: "uint16_t",
        description: "16-bit unsigned integer",
      },
      {
        name: "uint32_t",
        description: "32-bit unsigned integer",
      },
      {
        name: "int8_t",
        description: "8-bit signed integer",
      },
      {
        name: "int16_t",
        description: "16-bit signed integer",
      },
      {
        name: "int32_t",
        description: "32-bit signed integer",
      },
    ],
  },
  default: {
    functions: [
      {
        name: "HAL_Init",
        description: "Initialize the HAL Library",
        snippet: "HAL_Init();",
      },
      {
        name: "HAL_GPIO_WritePin",
        description: "Set the state of a GPIO pin",
        snippet: "HAL_GPIO_WritePin(${1:GPIOx}, ${2:GPIO_Pin}, ${3:PinState});",
      },
      {
        name: "HAL_GPIO_TogglePin",
        description: "Toggle the state of a GPIO pin",
        snippet: "HAL_GPIO_TogglePin(${1:GPIOx}, ${2:GPIO_Pin});",
      },
    ],
    macros: [
      {
        name: "GPIO_PIN_0",
        description: "GPIO Pin 0",
      },
      {
        name: "GPIO_PIN_1",
        description: "GPIO Pin 1",
      },
    ],
    types: [
      {
        name: "GPIO_InitTypeDef",
        description: "GPIO Initialization Structure",
      },
      {
        name: "GPIO_TypeDef",
        description: "GPIO Type Definition",
      },
    ],
  },
}
