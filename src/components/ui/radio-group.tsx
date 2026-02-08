"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
// import { Label } from "@/components/ui/label" // Avoid circular if possible, but fine here

const RadioGroupContext = React.createContext<{
    value: string
    onChange: (value: string) => void
    disabled?: boolean
} | undefined>(undefined)

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
}

export function RadioGroup({
    className,
    value: controlledValue,
    defaultValue,
    onValueChange,
    disabled,
    children,
    ...props
}: RadioGroupProps) {
    const [value, setValue] = React.useState(defaultValue || "")

    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : value

    const handleChange = React.useCallback((newValue: string) => {
        if (!isControlled) {
            setValue(newValue)
        }
        onValueChange?.(newValue)
    }, [isControlled, onValueChange])

    return (
        <RadioGroupContext.Provider value={{ value: currentValue || "", onChange: handleChange, disabled }}>
            <div className={cn("grid gap-2", className)} {...props}>
                {children}
            </div>
        </RadioGroupContext.Provider>
    )
}

export interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
    ({ className, value, disabled, ...props }, ref) => {
        const context = React.useContext(RadioGroupContext)

        if (!context) {
            throw new Error("RadioGroupItem must be used within a RadioGroup")
        }

        const isSelected = context.value === value
        const isDisabled = disabled || context.disabled

        return (
            <button
                ref={ref}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isDisabled}
                onClick={() => context.onChange(value)}
                className={cn(
                    "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center",
                    className
                )}
                {...props}
            >
                {isSelected && (
                    <div className="h-2.5 w-2.5 rounded-full bg-current" />
                )}
            </button>
        )
    }
)
RadioGroupItem.displayName = "RadioGroupItem"
