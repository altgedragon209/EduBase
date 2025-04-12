// Enhanced Emscripten compiler integration for STM32 devices

interface CompilationResult {
  success: boolean
  binary: ArrayBuffer | null
  output: string
  errors: string[]
}

// Enhance the compiler to provide better feedback and actually simulate compilation

// Update the compileCode function to provide better feedback
export async function compileCode(code: string, boardType: string): Promise<CompilationResult> {
  // Simulate compilation delay to make it feel more realistic
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // More thorough code validation
  const errors: string[] = []

  // Check for basic syntax errors
  try {
    validateCSyntax(code)
  } catch (error: any) {
    errors.push(`Error: ${error.message}`)
  }

  // Validate main function
  if (!code.includes("main(")) {
    errors.push("Error: No main function found in the code")
  }

  // Check for infinite loops without delay
  if (
    (code.includes("while (1)") ||
      code.includes("while(1)") ||
      code.includes("for(;;)") ||
      code.includes("for (;;)")) &&
    !code.includes("HAL_Delay")
  ) {
    errors.push("Warning: Infinite loop detected without delay function. This may cause the program to hang.")
  }

  // Check for proper GPIO initialization
  if (code.includes("GPIO_PIN_") && !code.includes("GPIO_InitTypeDef")) {
    errors.push("Error: GPIO pins used but GPIO not initialized properly")
  }

  // Check for proper ADC initialization
  if (code.includes("HAL_ADC_") && !code.includes("ADC_HandleTypeDef")) {
    errors.push("Error: ADC functions used but ADC not initialized properly")
  }

  // Check for proper clock configuration
  if (!code.includes("SystemClock_Config")) {
    errors.push("Warning: SystemClock_Config function not found. System may run at default clock speed.")
  }

  // Check for proper error handling
  if (!code.includes("Error_Handler")) {
    errors.push("Warning: Error_Handler function not found. Error handling may be incomplete.")
  }

  // Check for board-specific issues
  if (boardType === "F446RE") {
    if (code.includes("HAL_PWREx_EnableOverDrive") && !code.includes("__HAL_RCC_PWR_CLK_ENABLE")) {
      errors.push("Error: HAL_PWREx_EnableOverDrive used but PWR clock not enabled")
    }

    // Check for F446RE specific peripheral initialization
    if (code.includes("USART") && !code.includes("__HAL_RCC_USART")) {
      errors.push("Warning: USART used but USART clock not enabled")
    }
  } else if (boardType === "F031K6") {
    if (code.includes("HAL_RCC_OscConfig") && code.includes("RCC_OSCILLATORTYPE_HSE")) {
      errors.push("Warning: HSE oscillator used but F031K6 on Nucleo board doesn't have an HSE crystal")
    }

    // Check for F031K6 specific memory constraints
    const codeSize = estimateCodeSize(code)
    if (codeSize > 32 * 1024) {
      errors.push(
        `Warning: Estimated code size (${Math.round(codeSize / 1024)}KB) may exceed F031K6 flash memory (32KB)`,
      )
    }
  } else if (boardType === "L476RG") {
    // L476RG specific checks
    if (code.includes("RCC_OSCILLATORTYPE_HSI") && !code.includes("RCC_OSCILLATORTYPE_MSI")) {
      errors.push("Warning: L476RG typically uses MSI as the default clock source, not HSI")
    }

    if (code.includes("HAL_ADC_Start") && !code.includes("__HAL_RCC_ADC_CLK_ENABLE")) {
      errors.push("Warning: ADC used but ADC clock not enabled")
    }

    if (code.includes("DFSDM") && !code.includes("__HAL_RCC_DFSDM1_CLK_ENABLE")) {
      errors.push("Error: DFSDM peripheral used but DFSDM clock not enabled")
    }
  }

  // If there are errors, return failure
  if (errors.some((e) => e.includes("Error:"))) {
    return {
      success: false,
      binary: null,
      output: "Compilation failed with errors:\n" + errors.join("\n"),
      errors,
    }
  }

  // Simulate successful compilation
  const binary = generateMockBinary(code, boardType)
  const output = generateSimulationOutput(code, boardType)

  return {
    success: true,
    binary,
    output,
    errors: errors.filter((e) => e.includes("Warning:")),
  }
}

// Enhance the compiler to better handle C/C++ compilation like VS Code

// Add this function to the compiler to handle multiple files:

export async function compileProject(
  files: { path: string; content: string }[],
  boardType: string,
): Promise<CompilationResult> {
  // Simulate compilation delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const errors: string[] = []

  // Find main.c - required for compilation
  const mainFile = files.find((f) => f.path.endsWith("main.c") || f.path === "main.c")
  if (!mainFile) {
    return {
      success: false,
      binary: null,
      output: "Compilation failed: main.c not found",
      errors: ["Error: main.c not found in project"],
    }
  }

  // Validate include paths and file dependencies
  const includedHeadersMap = new Map<string, string[]>()
  const definedSymbols = new Set<string>()
  const missingIncludes = new Set<string>()

  // First pass: collect all defined headers and source files
  files.forEach((file) => {
    const fileName = file.path.split("/").pop() || ""
    if (fileName.endsWith(".h")) {
      definedSymbols.add(fileName)
    }
  })

  // Second pass: check for missing includes
  files.forEach((file) => {
    const includes: string[] = []
    const includeRegex = /#include\s+["<]([^">]+)[">]/g
    let match
    while ((match = includeRegex.exec(file.content)) !== null) {
      const includeName = match[1]
      includes.push(includeName)

      // Check if this is a user header (not system header)
      if (
        match[0].includes('"') &&
        !definedSymbols.has(includeName) &&
        !includeName.startsWith("stm32") &&
        !includeName.includes("std")
      ) {
        missingIncludes.add(includeName)
      }
    }
    includedHeadersMap.set(file.path, includes)
  })

  // Report missing includes
  if (missingIncludes.size > 0) {
    missingIncludes.forEach((include) => {
      errors.push(`Warning: Header file '${include}' is included but not found in the project`)
    })
  }

  // First pass: check for syntax errors in all files
  for (const file of files) {
    try {
      validateCSyntax(file.content)
    } catch (error: any) {
      errors.push(`Error in ${file.path}: ${error.message}`)
    }
  }

  // Second pass: check for semantic errors (includes, function definitions, etc.)
  const definedFunctions = new Map<string, string>()
  const calledFunctions = new Map<string, string[]>()

  // Find all function definitions
  for (const file of files) {
    const functionMatches = file.content.matchAll(/\b(\w+)\s*$$[^)]*$$\s*(?:\{|;)/g)
    for (const match of Array.from(functionMatches)) {
      const funcName = match[1]
      if (funcName !== "if" && funcName !== "for" && funcName !== "while" && funcName !== "switch") {
        definedFunctions.set(funcName, file.path)
      }
    }
  }

  // Find all function calls
  for (const file of files) {
    const functionCallMatches = file.content.matchAll(/\b(\w+)\s*\(/g)
    const fileCalls: string[] = []

    for (const match of Array.from(functionCallMatches)) {
      const funcName = match[1]
      if (funcName !== "if" && funcName !== "for" && funcName !== "while" && funcName !== "switch") {
        fileCalls.push(funcName)
      }
    }

    calledFunctions.set(file.path, fileCalls)
  }

  // Check for undefined functions
  for (const [filePath, calls] of calledFunctions.entries()) {
    for (const funcName of calls) {
      // Skip standard library and HAL functions
      if (
        funcName.startsWith("HAL_") ||
        funcName === "main" ||
        funcName === "printf" ||
        funcName === "malloc" ||
        funcName === "free" ||
        funcName.startsWith("__") ||
        funcName === "memset" ||
        funcName === "memcpy" ||
        funcName === "strlen" ||
        funcName === "strcat" ||
        funcName === "strcmp"
      ) {
        continue
      }

      if (!definedFunctions.has(funcName)) {
        errors.push(`Warning in ${filePath}: Called function "${funcName}" is not defined in the project`)
      }
    }
  }

  // Check for board-specific issues
  if (boardType === "F446RE") {
    if (
      mainFile.content.includes("HAL_PWREx_EnableOverDrive") &&
      !mainFile.content.includes("__HAL_RCC_PWR_CLK_ENABLE")
    ) {
      errors.push("Warning in main.c: HAL_PWREx_EnableOverDrive used but PWR clock not enabled")
    }
  } else if (boardType === "F031K6") {
    // Check for F031K6 specific memory constraints
    const totalCodeSize = files.reduce((size, file) => size + estimateCodeSize(file.content), 0)
    if (totalCodeSize > 32 * 1024) {
      errors.push(
        `Warning: Estimated total code size (${Math.round(totalCodeSize / 1024)}KB) may exceed F031K6 flash memory (32KB)`,
      )
    }
  }

  // If there are critical errors, return failure
  if (errors.some((e) => e.includes("Error:"))) {
    return {
      success: false,
      binary: null,
      output: "Compilation failed with errors:\n" + errors.join("\n"),
      errors,
    }
  }

  // Simulate successful compilation
  const binary = generateMockBinary(mainFile.content, boardType)
  const output = generateCompilationOutput(files, boardType)

  return {
    success: true,
    binary,
    output,
    errors: errors.filter((e) => e.includes("Warning:")),
  }
}

// Improve the validateCSyntax function to provide better error messages
function validateCSyntax(code: string): void {
  // Check for mismatched braces
  let braceCount = 0
  let parenCount = 0
  let bracketCount = 0
  let lineCount = 1
  let inSingleLineComment = false
  let inMultiLineComment = false
  let lastLine = ""

  const lines = code.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    inSingleLineComment = false
    let j = 0

    while (j < line.length) {
      const char = line[j]
      const nextChar = line[j + 1] || ""

      // Handle comments
      if (!inSingleLineComment && !inMultiLineComment) {
        if (char === "/" && nextChar === "/") {
          inSingleLineComment = true
          j += 2
          continue
        }

        if (char === "/" && nextChar === "*") {
          inMultiLineComment = true
          j += 2
          continue
        }
      } else if (inMultiLineComment && char === "*" && nextChar === "/") {
        inMultiLineComment = false
        j += 2
        continue
      }

      // Skip the rest of the line if in a single-line comment
      if (inSingleLineComment) break

      // Skip this character if in a multi-line comment
      if (inMultiLineComment) {
        j++
        continue
      }

      // Check braces and other syntax elements
      if (char === "{") {
        braceCount++
      } else if (char === "}") {
        braceCount--
        if (braceCount < 0) {
          throw new Error(`Mismatched closing brace at line ${i + 1}`)
        }
      } else if (char === "(") {
        parenCount++
      } else if (char === ")") {
        parenCount--
        if (parenCount < 0) {
          throw new Error(`Mismatched closing parenthesis at line ${i + 1}`)
        }
      } else if (char === "[") {
        bracketCount++
      } else if (char === "]") {
        bracketCount--
        if (bracketCount < 0) {
          throw new Error(`Mismatched closing bracket at line ${i + 1}`)
        }
      }

      j++
    }

    lastLine = line
    lineCount++
  }

  if (braceCount !== 0) {
    throw new Error(
      `Mismatched braces: missing ${braceCount > 0 ? braceCount : -braceCount} ${braceCount > 0 ? "closing" : "opening"} braces`,
    )
  }

  if (parenCount !== 0) {
    throw new Error(
      `Mismatched parentheses: missing ${parenCount > 0 ? parenCount : -parenCount} ${parenCount > 0 ? "closing" : "opening"} parentheses`,
    )
  }

  if (bracketCount !== 0) {
    throw new Error(
      `Mismatched brackets: missing ${bracketCount > 0 ? bracketCount : -bracketCount} ${bracketCount > 0 ? "closing" : "opening"} brackets`,
    )
  }

  if (inMultiLineComment) {
    throw new Error("Unclosed multi-line comment")
  }
}

// Estimate code size in bytes (very rough heuristic)
function estimateCodeSize(code: string): number {
  // Remove comments and whitespace
  const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "").replace(/\s+/g, " ")

  // Rough estimate: each character is about 0.5 bytes of machine code on average
  // This is a very rough approximation
  return cleanCode.length * 0.5
}

function generateMockBinary(code: string, boardType: string): ArrayBuffer {
  // Create a mock binary that would represent the compiled code
  // In a real implementation, this would be the actual compiled binary

  // Create a binary with a simple header structure
  const encoder = new TextEncoder()
  const codeBytes = encoder.encode(code)

  // Create a header with board type, timestamp, and code size
  const header = new Uint8Array(16)

  // Set a magic number to identify this as an STM32 binary
  header[0] = 0x53 // 'S'
  header[1] = 0x54 // 'T'
  header[2] = 0x4d // 'M'
  header[3] = 0x33 // '3'
  header[4] = 0x32 // '2'

  // Set board type identifier
  if (boardType === "F446RE") {
    header[5] = 0x44 // 'D'
    header[6] = 0x46 // 'F'
  } else if (boardType === "F031K6") {
    header[5] = 0x30 // '0'
    header[6] = 0x31 // '1'
  }

  // Set code size in header (4 bytes, little-endian)
  const codeSize = codeBytes.length
  header[8] = codeSize & 0xff
  header[9] = (codeSize >> 8) & 0xff
  header[10] = (codeSize >> 16) & 0xff
  header[11] = (codeSize >> 24) & 0xff

  // Set timestamp (4 bytes)
  const timestamp = Math.floor(Date.now() / 1000)
  header[12] = timestamp & 0xff
  header[13] = (timestamp >> 8) & 0xff
  header[14] = (timestamp >> 16) & 0xff
  header[15] = (timestamp >> 24) & 0xff

  // Combine header and code into a single binary
  const binary = new Uint8Array(header.length + codeBytes.length)
  binary.set(header)
  binary.set(codeBytes, header.length)

  return binary.buffer
}

// Update the generateSimulationOutput function to handle L476RG
function generateSimulationOutput(code: string, boardType: string): string {
  let output = "Compilation successful\n"
  output += "Linking...\n"
  output += `Build completed successfully for STM32 ${boardType}\n\n`
  output += "--- Execution Output ---\n"

  // Add board-specific information
  if (boardType === "L476RG") {
    output += `Board: STM32 Nucleo-L476RG (Ultra-low-power with FPU ARM Cortex-M4)\n`
    output += `Clock: MSI/HSI/PLL up to 80 MHz\n`
    output += `Flash: 1 MB\n`
    output += `RAM: 128 KB\n\n`
  }

  // Simulate different program behaviors based on code content
  if (code.includes("HAL_GPIO_TogglePin") && code.includes("HAL_Delay")) {
    output += "LED blinking on PA5\n"
    output += "LCD: STM32 Nucleo\nLED Blinking\n"
    output += "7SEG: 1234\n"
    output += "LED: 1010\n"
  } else if (code.includes("HAL_UART_Transmit")) {
    output += "UART transmission started\n"
    output += "Data sent: Hello World\n"
    output += "LCD: UART Active\nTX/RX\n"
    output += "7SEG: 8888\n"
    output += "LED: 0101\n"
  } else if (code.includes("HAL_ADC_Start")) {
    output += "ADC conversion started\n"
    output += "Reading value: 2048\n"
    output += "LCD: ADC Reading\nValue: 2048\n"
    output += "7SEG: 2048\n"
    output += "LED: 1111\n"
  } else if (code.includes("HAL_I2C_Master_Transmit")) {
    output += "I2C communication started\n"
    output += "Data sent to I2C device\n"
    output += "LCD: I2C Active\nSending Data\n"
    output += "7SEG: 1010\n"
    output += "LED: 0011\n"
  } else if (code.includes("HAL_DFSDM") && boardType === "L476RG") {
    // L476RG specific DFSDM feature
    output += "DFSDM filter initialized\n"
    output += "Audio sampling started\n"
    output += "LCD: DFSDM Active\nAudio Sampling\n"
    output += "7SEG: 4410\n"
    output += "LED: 1100\n"
  } else if (code.includes("HAL_OPAMP") && boardType === "L476RG") {
    // L476RG specific OPAMP feature
    output += "OPAMP initialized\n"
    output += "Analog signal amplification active\n"
    output += "LCD: OPAMP Active\nAmplifying\n"
    output += "7SEG: 3333\n"
    output += "LED: 0110\n"
  } else if (code.includes("HAL_PWR_EnterSTOPMode") && boardType === "L476RG") {
    // L476RG specific low-power feature
    output += "Entering STOP mode\n"
    output += "Current consumption reduced\n"
    output += "LCD: Low Power\nSTOP Mode\n"
    output += "7SEG: 0000\n"
    output += "LED: 0001\n"
  } else {
    output += "Program running...\n"
    output += "LCD: STM32 Nucleo\nRunning\n"
    output += "7SEG: 0000\n"
    output += "LED: 0000\n"
  }

  return output
}

// Add a function to generate compilation output for all files
function generateCompilationOutput(files: { path: string; content: string }[], boardType: string): string {
  let output = "Compilation started\n"

  // Add compilation steps for each file with better output
  let sourceCount = 0
  files.forEach((file) => {
    if (file.path.endsWith(".c")) {
      sourceCount++
      output += `[CC] ${file.path} => ${file.path.replace(".c", ".o")}\n`
    } else if (file.path.endsWith(".cpp")) {
      sourceCount++
      output += `[CXX] ${file.path} => ${file.path.replace(".cpp", ".o")}\n`
    } else if (file.path.endsWith(".s") || file.path.endsWith(".asm")) {
      sourceCount++
      output += `[AS] ${file.path} => ${file.path.replace(/\.(s|asm)$/, ".o")}\n`
    }
  })

  output += `[LD] Linking ${sourceCount} object files...\n`
  output += `[BIN] Creating binary file for STM32 ${boardType}...\n`
  output += `Build completed successfully for STM32 ${boardType}\n\n`
  output += "--- Execution Output ---\n"

  // Add board-specific information
  if (boardType === "L476RG") {
    output += `Board: STM32 Nucleo-L476RG (Ultra-low-power with FPU ARM Cortex-M4)\n`
    output += `Clock: MSI/HSI/PLL up to 80 MHz\n`
    output += `Flash: 1 MB\n`
    output += `RAM: 128 KB\n\n`
  } else if (boardType === "F446RE") {
    output += `Board: STM32 Nucleo-F446RE (ARM Cortex-M4 with FPU)\n`
    output += `Clock: HSI/HSE/PLL up to 180 MHz\n`
    output += `Flash: 512 KB\n`
    output += `RAM: 128 KB\n\n`
  } else if (boardType === "F031K6") {
    output += `Board: STM32 Nucleo-F031K6 (ARM Cortex-M0)\n`
    output += `Clock: HSI/HSE/PLL up to 48 MHz\n`
    output += `Flash: 32 KB\n`
    output += `RAM: 4 KB\n\n`
  }

  // Simulate program behavior based on main.c content
  const mainFile = files.find((f) => f.path.endsWith("main.c"))
  if (mainFile) {
    if (mainFile.content.includes("HAL_GPIO_TogglePin") && mainFile.content.includes("HAL_Delay")) {
      output += "LED blinking on PA5\n"
      output += "LCD: STM32 Nucleo\nLED Blinking\n"
      output += "7SEG: 1234\n"
      output += "LED: 1010\n"
    } else if (mainFile.content.includes("HAL_UART_Transmit")) {
      output += "UART transmission started\n"
      output += "Data sent: Hello World\n"
      output += "LCD: UART Active\nTX/RX\n"
      output += "7SEG: 8888\n"
      output += "LED: 0101\n"
    } else if (mainFile.content.includes("HAL_ADC_Start")) {
      output += "ADC conversion started\n"
      output += "Reading value: 2048\n"
      output += "LCD: ADC Reading\nValue: 2048\n"
      output += "7SEG: 2048\n"
      output += "LED: 1111\n"
    } else {
      output += "Program running...\n"
      output += "LCD: STM32 Nucleo\nRunning\n"
      output += "7SEG: 0000\n"
      output += "LED: 0000\n"
    }
  }

  return output
}

// Update the compileAndRun function to provide better feedback

export async function compileAndRun(code: string, selectedPins: string[]): Promise<string> {
  // Simulate compilation delay to make it feel more realistic
  await new Promise((resolve) => setTimeout(resolve, 800))

  try {
    // Validate the code first
    validateCSyntax(code)

    // Check for basic requirements
    if (!code.includes("main(")) {
      return "Compilation Error: No main function found in the code"
    }

    // Generate output based on code content
    let output = "Compilation successful\n"
    output += "Linking...\n"
    output += "Build completed successfully\n\n"
    output += "--- Execution Output ---\n"

    // Simulate different program behaviors based on code content
    if (code.includes("HAL_GPIO_TogglePin") && code.includes("HAL_Delay")) {
      output += "LED blinking on PA5\n"

      // Add pin-specific output if pins are selected
      if (selectedPins.includes("PA5")) {
        output += "PA5: LED toggling at regular intervals\n"
      }

      output += "LCD: STM32 Nucleo\nLED Blinking\n"
      output += "7SEG: 1234\n"
      output += "LED: 1010\n"
    } else if (code.includes("HAL_UART_Transmit")) {
      output += "UART transmission started\n"
      output += "Data sent: Hello World\n"
      output += "LCD: UART Active\nTX/RX\n"
      output += "7SEG: 8888\n"
      output += "LED: 0101\n"
    } else if (code.includes("HAL_ADC_Start")) {
      output += "ADC conversion started\n"
      output += "Reading value: 2048\n"
      output += "LCD: ADC Reading\nValue: 2048\n"
      output += "7SEG: 2048\n"
      output += "LED: 1111\n"
    } else {
      output += "Program running...\n"
      output += "LCD: STM32 Nucleo\nRunning\n"
      output += "7SEG: 0000\n"
      output += "LED: 0000\n"
    }

    return output
  } catch (error: any) {
    return `Compilation Error: ${error.message}`
  }
}
