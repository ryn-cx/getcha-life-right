import { X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ColorInputProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
  id?: string
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

const ColorInput = React.forwardRef<HTMLInputElement, ColorInputProps>(
  ({ value, onChange, disabled, id }, ref) => {
    const display = value ?? ""
    const pickerValue = isHexColor(display) ? display : "#3b82f6"

    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "relative size-9 shrink-0 rounded-md border overflow-hidden",
            disabled && "opacity-50",
          )}
          style={display ? { backgroundColor: display } : undefined}
        >
          {!display && (
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  "conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)",
              }}
            />
          )}
          <input
            type="color"
            aria-label="Pick a color"
            disabled={disabled}
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </div>
        <Input
          ref={ref}
          id={id}
          type="text"
          placeholder="e.g. #3b82f6 or red"
          value={display}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          className="font-mono"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          disabled={disabled || !display}
          aria-label="Clear color"
        >
          <X />
        </Button>
      </div>
    )
  },
)
ColorInput.displayName = "ColorInput"

export { ColorInput }
