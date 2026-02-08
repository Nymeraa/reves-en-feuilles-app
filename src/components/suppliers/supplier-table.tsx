'use client'

import { useState } from 'react'
import { Supplier } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, ExternalLink, Mail, Edit, Trash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SupplierTableProps {
    suppliers: Supplier[]
    onAdd: () => void
    onEdit: (supplier: Supplier) => void
    onDelete: (id: string) => void
}

export function SupplierTable({ suppliers, onAdd, onEdit, onDelete }: SupplierTableProps) {
    const [search, setSearch] = useState('')

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher un fournisseur..."
                        className="pl-8"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                </Button>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>FOURNISSEUR</TableHead>
                            <TableHead>SITE WEB</TableHead>
                            <TableHead>DÉLAI LIVRAISON</TableHead>
                            <TableHead>INGRÉDIENTS</TableHead>
                            <TableHead>STATUT</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map(s => (
                            <TableRow key={s.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                                            {s.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-foreground">{s.name}</div>
                                            {s.contactEmail && (
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> {s.contactEmail}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {s.website ? (
                                        <a href={s.website} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm">
                                            <ExternalLink className="w-3 h-3" /> Visiter
                                        </a>
                                    ) : '-'}
                                </TableCell>
                                <TableCell>
                                    {s.leadTime ? `${s.leadTime} jours` : '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{s.ingredientCount || 0} ingrédient{s.ingredientCount !== 1 && 's'}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={s.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground hover:bg-muted"}>
                                        {s.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(s)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" onClick={() => onDelete(s.id)}>
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Aucun fournisseur trouvé.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
