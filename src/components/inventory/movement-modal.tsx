'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Ingredient, MovementType } from '@/types/inventory'

interface MovementModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    ingredients: Ingredient[]
    onSubmit: (data: FormData) => Promise<void>
}

export function MovementModal({ open, onOpenChange, ingredients, onSubmit }: MovementModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedType, setSelectedType] = useState<MovementType>(MovementType.PURCHASE)
    const [itemTypeFilter, setItemTypeFilter] = useState<string>('Ingrédients')

    // Filter ingredients based on item type
    const filteredIngredients = ingredients.filter(i => {
        if (itemTypeFilter === 'Packaging') return i.category === 'Packaging';
        if (itemTypeFilter === 'Accessoires') return i.category === 'Accessoire';
        // Ingrédients = everything else (exclude Packaging and Accessoires)
        return i.category !== 'Packaging' && i.category !== 'Accessoire';
    })

    // Determine unit and price label based on item type
    const isPerUnit = itemTypeFilter === 'Packaging' || itemTypeFilter === 'Accessoires';
    const quantityUnit = isPerUnit ? 'pcs' : 'g';
    const priceLabel = isPerUnit ? 'Prix d\'achat (€/pièce HT)' : 'Prix d\'achat (€/kg HT)';

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)
        await onSubmit(formData)
        setIsSubmitting(false)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Nouveau mouvement de stock</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type d'article</Label>
                            <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ingrédients">Ingrédients</SelectItem>
                                    <SelectItem value="Packaging">Packaging</SelectItem>
                                    <SelectItem value="Accessoires">Accessoires</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Type de mouvement</Label>
                            <Select name="type" value={selectedType} onValueChange={(v) => setSelectedType(v as MovementType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={MovementType.PURCHASE}>Achat</SelectItem>
                                    <SelectItem value={MovementType.SALE}>Vente</SelectItem>
                                    <SelectItem value={MovementType.LOSS}>Perte/Casse</SelectItem>
                                    <SelectItem value={MovementType.PRODUCTION}>Production</SelectItem>
                                    <SelectItem value={MovementType.ADJUSTMENT}>Correction</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Élément *</Label>
                        <Select name="ingredientId" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {filteredIngredients.map(i => (
                                    <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.currentStock})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantité</Label>
                            <div className="flex bg-background border border-input rounded-md ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                <Input
                                    name="quantity"
                                    type="number"
                                    step="0.01"
                                    className="border-0 focus-visible:ring-0 bg-transparent"
                                    required
                                />
                                <div className="px-3 py-2 text-sm text-muted-foreground bg-muted border-l border-input flex items-center rounded-r-md">
                                    {quantityUnit}
                                </div>
                            </div>
                        </div>
                        {selectedType === MovementType.PURCHASE && (
                            <div className="space-y-2">
                                <Label>{priceLabel}</Label>
                                <Input name="unitPrice" type="number" step="0.01" placeholder="Pour calcul CMP" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Raison</Label>
                        <Input name="reason" placeholder="Ex: Inventaire annuel, Échantillon client..." />
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea name="notes" placeholder="Notes..." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={isSubmitting}>Enregistrer</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
