'use client'

import { useState } from 'react'
import { Ingredient } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit2, Trash2, Box, Package } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CatalogueTableProps {
    items: Ingredient[]
    title: string
    onAdd: () => void
    onEdit: (item: Ingredient) => void
    onDelete: (id: string) => void
    typeFilterOptions: string[]
}

export function CatalogueTable({ items, title, onAdd, onEdit, onDelete, typeFilterOptions }: CatalogueTableProps) {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')

    const filtered = items.filter(i => {
        const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.slug.includes(search.toLowerCase())
        const matchType = typeFilter === 'all' || i.subtype === typeFilter
        return matchSearch && matchType
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                    <p className="text-muted-foreground">{items.length} éléments en catalogue</p>
                </div>
                <Button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Ajouter
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-transparent border-none shadow-none focus-visible:ring-0"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px] border-none shadow-none bg-muted/50">
                        <SelectValue placeholder="Tous types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous types</SelectItem>
                        {typeFilterOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase border-b bg-muted/50">
                    <div className="col-span-5">Élément</div>
                    <div className="col-span-2">Prix HT</div>
                    <div className="col-span-2">Prix TTC</div>
                    <div className="col-span-1">Stock</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y">
                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">Aucun élément trouvé.</div>
                    ) : (
                        filtered.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/50 transition-colors">
                                <div className="col-span-5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Box className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">{item.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                            <span>{item.subtype || item.category}</span>
                                            {item.dimensions && <span>• {item.dimensions}</span>}
                                            {item.capacity && <span>• {item.capacity}g</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2 font-medium text-foreground">
                                    {item.weightedAverageCost.toFixed(3)} €
                                </div>
                                <div className="col-span-2 text-muted-foreground">
                                    {(item.weightedAverageCost * 1.2).toFixed(3)} €
                                </div>
                                <div className="col-span-1">
                                    <div className="font-medium text-foreground">{item.currentStock}</div>
                                    <Badge variant={item.currentStock > (item.alertThreshold || 10) ? 'outline' : 'destructive'} className="text-[10px] h-5 px-1">
                                        {item.currentStock > (item.alertThreshold || 10) ? 'OK' : 'Bas'}
                                    </Badge>
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                                        <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
                                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
