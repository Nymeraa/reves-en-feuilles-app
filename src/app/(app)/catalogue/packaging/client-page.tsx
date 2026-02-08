'use client'

import { useState, useEffect } from 'react'
import { CatalogueTable } from '@/components/catalogue/catalogue-table'
import { CatalogueModal } from '@/components/catalogue/catalogue-modal'
import { Ingredient } from '@/types/inventory'
import { createIngredientAction, updateIngredientAction, deleteIngredientAction } from '@/actions/inventory'
// Using client-side fetching as we need to filter and refresh actions inside client component wrapper for now
// Or better: Server Component page + Client Component wrapper.
// Let's stick effectively to client-logic wrapped as the logic is similar to Inventory page.
// Actually, let's build a Client Page wrapper to handle state.

import { useToast } from '@/components/ui/use-toast'

interface PackagingClientProps {
    initialItems: Ingredient[]
}

export default function PackagingPageWrapper({ initialItems }: PackagingClientProps) {
    const [items, setItems] = useState<Ingredient[]>(initialItems)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<Ingredient | null>(null)
    const { toast } = useToast()

    // Sync with server if needed or assume optimistic updates + refresh. 
    // Ideally we revalidatePath on server actions.

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
        if (editingItem) {
            const res = await updateIngredientAction(editingItem.id, data)
            if (res.success && res.data) {
                setItems(items.map(i => i.id === editingItem.id ? res.data! : i))
                toast({ title: "Modifications enregistrées" })
            }
        } else {
            const res = await createIngredientAction({
                name: data.name!,
                category: 'Packaging',
                initialCost: data.weightedAverageCost,
                initialStock: data.currentStock,
                ...data
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
                title="Packaging"
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                typeFilterOptions={['Carton', 'Sachet', 'Boîte', 'Autre']}
            />
            <CatalogueModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                initialData={editingItem}
                onSubmit={handleSubmit}
                category="Packaging"
                types={['Carton', 'Sachet', 'Boîte', 'Autre']}
            />
        </div>
    )
}
