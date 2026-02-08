'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    AlertTriangle,
    TrendingUp,
    FileText,
    Leaf,
    Coffee,
    Package,
    Box,
    ShoppingCart,
    Settings
} from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'

interface NavItem {
    title: string
    href: string
    icon: React.ReactNode
    disabled?: boolean
}

interface NavSection {
    title: string
    items: NavItem[]
}

const navSections: NavSection[] = [
    {
        title: "Pilotage",
        items: [
            { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
            { title: "Rentabilité", href: "/pilotage/rentabilite", icon: <TrendingUp className="w-4 h-4" /> },
            { title: "Rapports", href: "/pilotage/rapports", icon: <FileText className="w-4 h-4" /> },
        ]
    },
    {
        title: "Catalogue",
        items: [
            { title: "Ingrédients", href: "/inventory", icon: <Leaf className="w-4 h-4" /> },
            { title: "Recettes", href: "/recipes", icon: <Coffee className="w-4 h-4" /> },
            { title: "Packs", href: "/catalogue/packs", icon: <Package className="w-4 h-4" /> },

            { title: "Packaging", href: "/catalogue/packaging", icon: <Box className="w-4 h-4" /> },
            { title: "Accessoires", href: "/catalogue/accessoires", icon: <Box className="w-4 h-4" /> },
        ]
    },
    {
        title: "Opérations",
        items: [
            { title: "Commandes", href: "/orders", icon: <ShoppingCart className="w-4 h-4" /> },
            { title: "Mouvements Stock", href: "/stock-movements", icon: <TrendingUp className="w-4 h-4" /> },
            { title: "Fournisseurs", href: "/suppliers", icon: <Package className="w-4 h-4" /> },
        ]
    },
    {
        title: "Outils",
        items: [
            { title: "Simulation", href: "/tools/simulation", icon: <TrendingUp className="w-4 h-4" /> }, // Using TrendingUp as placeholder or similar
            { title: "Import CSV", href: "/tools/import", icon: <FileText className="w-4 h-4" /> },
            { title: "Label Studio", href: "/label-studio", icon: <Box className="w-4 h-4" /> }, // New Module
            { title: "Sauvegarde", href: "/tools/backup", icon: <Box className="w-4 h-4" /> },
        ]
    },
    {
        title: "Système",
        items: [
            { title: "Logs", href: "/system/logs", icon: <FileText className="w-4 h-4" /> },
            { title: "Paramètres", href: "/settings", icon: <Settings className="w-4 h-4" /> },
        ]
    }
]

export function MainSidebar() {
    const pathname = usePathname()

    return (
        <div className="w-64 border-r border-border bg-card h-full flex flex-col">
            <div className="p-6 border-b border-border flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
                <div className="font-bold text-lg text-foreground">Leaves & Dreams</div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-6 px-4">
                    {navSections.map((section, idx) => (
                        <div key={idx}>
                            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                {section.title}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item, i) => (
                                    <Link
                                        key={i}
                                        href={item.disabled ? '#' : item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            pathname === item.href
                                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                                            item.disabled && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {item.icon}
                                        {item.title}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-border text-xs text-center text-muted-foreground flex flex-col items-center gap-2">
                <ModeToggle />
                v0.6.0-beta
            </div>
        </div>
    )
}
