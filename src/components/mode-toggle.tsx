"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-9 h-5 rounded-full bg-slate-200" /> // Placeholder
    }

    const isDark = theme === 'dark'

    return (
        <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-slate-500" />
            <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                id="mode-toggle"
            />
            <Moon className="h-4 w-4 text-slate-500" />
            <Label htmlFor="mode-toggle" className="sr-only">Dark Mode</Label>
        </div>
    )
}
