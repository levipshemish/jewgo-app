import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface VerificationInputProps {
  length?: number
  onComplete?: (code: string) => void
  onChange?: (code: string) => void
  className?: string
}

export function VerificationInput({ 
  length = 6, 
  onComplete, 
  onChange, 
  className 
}: VerificationInputProps) {
  const [values, setValues] = useState<string[]>(new Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) return
    
    const newValues = [...values]
    newValues[index] = value
    setValues(newValues)
    
    const code = newValues.join("")
    onChange?.(code)
    
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    
    if (code.length === length && !code.includes("")) {
      onComplete?.(code)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, length)
    const pastedArray = pastedData.split("")
    
    const newValues = new Array(length).fill("")
    pastedArray.forEach((char, index) => {
      if (index < length && /^\d$/.test(char)) {
        newValues[index] = char
      }
    })
    
    setValues(newValues)
    const code = newValues.join("")
    onChange?.(code)
    
    if (code.length === length && !code.includes("")) {
      onComplete?.(code)
    }
  }

  return (
    <div className={cn("flex gap-3 justify-center", className)}>
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none bg-white"
        />
      ))}
    </div>
  )
}
