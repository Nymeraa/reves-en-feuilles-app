'use client'

import { useState } from 'react'
import { StockMovement, Ingredient, MovementType } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
// Removed date-fns imports
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MovementTableProps {
    movements: StockMovement[]
    ingredients: Ingredient[]
    onAdd: () => void
}

export function MovementTable({ movements, ingredients, onAdd }: MovementTableProps) {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')

    const getIngredient = (id: string) => ingredients.find(i => i.id === id)
    const getIngredientName = (id: string) => getIngredient(id)?.name || 'Inconnu'
    const getIngredientCurrentStock = (id: string) => getIngredient(id)?.currentStock || 0
    const getIngredientRef = (id: string) => getIngredient(id)?.slug || '-'
    const isPerUnitCategory = (id: string) => {
        const category = getIngredient(id)?.category
        return category === 'Packaging' || category === 'Accessoire'
    }

    const filtered = movements.filter(m => {
        const ingName = getIngredientName(m.ingredientId).toLowerCase()
        const matchesSearch = ingName.includes(search.toLowerCase()) || m.reason?.toLowerCase().includes(search.toLowerCase())
        const matchesType = typeFilter === 'all' || m.type === typeFilter
        return matchesSearch && matchesType
    })

    const getTypeColor = (type: MovementType) => {
        switch (type) {
            case MovementType.PURCHASE: return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
            case MovementType.SALE: return "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
            case MovementType.LOSS: return "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
            case MovementType.PRODUCTION: return "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
            default: return "bg-muted text-muted-foreground hover:bg-muted"
        }
    }

    const getTypeLabel = (type: MovementType) => {
        switch (type) {
            case MovementType.PURCHASE: return "Achat"
            case MovementType.SALE: return "Vente"
            case MovementType.LOSS: return "Perte/Casse"
            case MovementType.PRODUCTION: return "Production"
            case MovementType.ADJUSTMENT: return "Correction"
            default: return type
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher..."
                            className="pl-8"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tous types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous types</SelectItem>
                            <SelectItem value={MovementType.PURCHASE}>Achat</SelectItem>
                            <SelectItem value={MovementType.SALE}>Vente</SelectItem>
                            <SelectItem value={MovementType.LOSS}>Perte/Casse</SelectItem>
                            <SelectItem value={MovementType.PRODUCTION}>Production</SelectItem>
                            <SelectItem value={MovementType.ADJUSTMENT}>Correction</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={onAdd} className="bg-indigo-950 hover:bg-indigo-900">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau mouvement
                </Button>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>DATE</TableHead>
                            <TableHead>TYPE</TableHead>
                            <TableHead>ÉLÉMENT</TableHead>
                            <TableHead>QUANTITÉ</TableHead>
                            <TableHead>STOCK</TableHead>
                            <TableHead>CMP</TableHead>
                            <TableHead>RÉFÉRENCE / RAISON</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map(m => {
                            const isPerUnit = isPerUnitCategory(m.ingredientId)
                            const quantityUnit = isPerUnit ? 'unités' : 'g'
                            const priceDisplay = m.unitPriceAtTime
                                ? isPerUnit
                                    ? `${m.unitPriceAtTime.toFixed(2)} €/U`
                                    : `${(m.unitPriceAtTime * 1000).toFixed(2)} €/kg`
                                : '-'

                            return (
                                <TableRow key={m.id}>
                                    <TableCell className="text-xs text-muted-foreground">
                                        <div className="font-medium text-foreground">
                                            {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(m.createdAt))}
                                        </div>
                                        <div>
                                            {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.createdAt))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getTypeColor(m.type)} variant="secondary">
                                            {getTypeLabel(m.type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-foreground">{getIngredientName(m.ingredientId)}</div>
                                        <div className="text-xs text-muted-foreground">{isPerUnit ? 'Packaging/Accessoire' : 'Ingrédient'}</div>
                                    </TableCell>
                                    <TableCell className={m.deltaQuantity > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                                        {m.deltaQuantity > 0 ? '+' : ''}{m.deltaQuantity} {quantityUnit}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {/* Placeholder for "Before -> After" */}
                                        -
                                    </TableCell>
                                    <TableCell className="text-sm text-foreground">
                                        {priceDisplay}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {m.reason || '-'}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    Aucun mouvement trouvé.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
