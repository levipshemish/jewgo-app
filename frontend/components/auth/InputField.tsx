import React, { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showPasswordToggle?: boolean
}

export function InputField({ 
  label, 
  error, 
  showPasswordToggle = false, 
  className,
  type,
  ...props 
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  
  const inputType = showPasswordToggle && type === "password" 
    ? (showPassword ? "text" : "password") 
    : type

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-900">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          className={cn(
            "w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none",
            "bg-white placeholder-gray-400 text-gray-900",
            error 
              ? "border-red-500 focus:border-red-500" 
              : isFocused 
                ? "border-green-500" 
                : "border-gray-200 focus:border-green-500",
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {showPasswordToggle && type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
