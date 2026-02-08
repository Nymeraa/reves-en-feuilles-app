'use client'

import { useState } from 'react'
import { CatalogueTable } from '@/components/catalogue/catalogue-table'
import { CatalogueModal } from '@/components/catalogue/catalogue-modal'
import { Ingredient } from '@/types/inventory'
import { createIngredientAction, updateIngredientAction, deleteIngredientAction } from '@/actions/inventory'
import { useToast } from '@/components/ui/use-toast'

interface AccessoriesClientProps {
    initialItems: Ingredient[]
}

export default function AccessoriesPageWrapper({ initialItems }: AccessoriesClientProps) {
    const [items, setItems] = useState<Ingredient[]>(initialItems)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<Ingredient | null>(null)
    const { toast } = useToast()

    const handleAdd = () => {
        setEditingItem(null)
        setIsModalOpen(true)
    }

    const handleEdit = (item: Ingredient) => {
        setEditingItem(item)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cet élément ?')) return
        const res = await deleteIngredientAction(id)
        if (res.success) {
            setItems(items.filter(i => i.id !== id))
            toast({ title: "Élément supprimé" })
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" })
        }
    }

    const handleSubmit = async (data: Partial<Ingredient>) => {
        // Enforce subtype mapping
        const saveData = { ...data, category: 'Accessoire' };

        if (editingItem) {
            const res = await updateIngredientAction(editingItem.id, saveData)
            if (res.success && res.data) {
                setItems(items.map(i => i.id === editingItem.id ? res.data! : i))
                toast({ title: "Modifications enregistrées" })
            }
        } else {
            const res = await createIngredientAction({
                name: data.name!,

                // category handled by saveData
                initialCost: data.weightedAverageCost,
                initialStock: data.currentStock,
                ...saveData
            } as any)
            if (res.success && res.data) {
                setItems([res.data!, ...items])
                toast({ title: "Élément créé" })
            }
        }
    }

    return (
        <div className="space-y-6">
            <CatalogueTable
                items={items}
                title="Accessoires"
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                typeFilterOptions={['Théière', 'Filtre', 'Boîte', 'Autre']}
            />
            <CatalogueModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                initialData={editingItem}
                onSubmit={handleSubmit}
                category="Accessoire"
                types={['Théière', 'Filtre', 'Boîte', 'Autre']}
            />
        </div>
    )
}
