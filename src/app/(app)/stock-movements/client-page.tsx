'use client'

import { useState } from 'react'
import { StockMovement, Ingredient } from '@/types/inventory'
import { MovementTable } from '@/components/inventory/movement-table'
import { MovementModal } from '@/components/inventory/movement-modal'
import { createMovementAction } from '@/actions/movements'
import { useToast } from '@/components/ui/use-toast'

interface StockMovementsClientProps {
    movements: StockMovement[]
    ingredients: Ingredient[]
}

export default function StockMovementsClientPage({ movements, ingredients }: StockMovementsClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const { toast } = useToast()

    const handleAdd = () => {
        setIsModalOpen(true)
    }

    const handleSubmit = async (formData: FormData) => {
        const res = await createMovementAction(null, formData)
        if (res.success) {
            toast({ title: "Mouvement enregistré" })
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" })
        }
    }

    // Sort movements by date desc
    const sortedMovements = [...movements].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Mouvements de stock</h1>
                <p className="text-muted-foreground">{movements.length} mouvements enregistrés</p>
            </div>

            <MovementTable
                movements={sortedMovements}
                ingredients={ingredients}
                onAdd={handleAdd}
            />

            <MovementModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                ingredients={ingredients}
                onSubmit={handleSubmit}
            />
        </div>
    )
}
