'use client'

import { useState } from 'react'
import { Supplier } from '@/types/inventory'
import { SupplierTable } from '@/components/suppliers/supplier-table'
import { SupplierModal } from '@/components/suppliers/supplier-modal'
import { createSupplierAction, updateSupplierAction, deleteSupplierAction } from '@/actions/suppliers'
import { useToast } from '@/components/ui/use-toast'

interface SuppliersClientProps {
    initialSuppliers: Supplier[]
}

export default function SuppliersClientPage({ initialSuppliers }: SuppliersClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const { toast } = useToast()

    // In a real app we might rely purely on router refresh, but here we can optimistic update or just refresh.
    // Since actions revalidatePath, the prop initialSuppliers should update if this is a server component child.
    // Wait, Client Component does not auto-update props from Server Component re-render unless parent re-renders.
    // Next.js Server Actions usually trigger a router refresh which re-runs server components.

    // For now, let's presume we might need to handle state if we want instant feedback? 
    // Or just trust the refresh. Let's use router?
    // Actually simplicity: Pass data, trust revalidatePath.

    const handleAdd = () => {
        setEditingSupplier(null)
        setIsModalOpen(true)
    }

    const handleEdit = (s: Supplier) => {
        setEditingSupplier(s)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce fournisseur ?')) return
        const res = await deleteSupplierAction(id)
        if (res.success) {
            toast({ title: "Fournisseur supprimé" })
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" })
        }
    }

    const handleSubmit = async (formData: FormData) => {
        let res;
        if (editingSupplier) {
            res = await updateSupplierAction(editingSupplier.id, null, formData)
        } else {
            res = await createSupplierAction(null, formData)
        }

        if (res.success) {
            toast({ title: editingSupplier ? "Modifications enregistrées" : "Fournisseur créé" })
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Fournisseurs</h1>
                <p className="text-muted-foreground">Gérez vos partenaires et approvisionnements ({initialSuppliers.length} fournisseurs)</p>
            </div>

            <SupplierTable
                suppliers={initialSuppliers}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <SupplierModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                initialData={editingSupplier}
                onSubmit={handleSubmit}
            />
        </div>
    )
}
