'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Supplier } from '@/types/inventory';
import { SupplierTable } from '@/components/suppliers/supplier-table';
import { SupplierModal } from '@/components/suppliers/supplier-modal';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/api-client';

interface SuppliersClientProps {
  initialSuppliers: Supplier[];
}

export default function SuppliersClientPage({ initialSuppliers }: SuppliersClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    try {
      await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
      toast({ title: 'Fournisseur supprimé' });
      router.refresh();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleSubmit = async (formData: FormData) => {
    const data = {
      name: formData.get('name'),
      contactEmail: formData.get('contactEmail'),
      contactPhone: formData.get('contactPhone'), // The modal binds this to same input, usually.
      website: formData.get('website'),
      leadTime: formData.get('leadTime'),
      defaultConditioning: formData.get('defaultConditioning'),
      notes: formData.get('notes'),
    };

    try {
      if (editingSupplier) {
        await apiFetch(`/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        toast({ title: 'Modifications enregistrées' });
      } else {
        await apiFetch('/suppliers', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        toast({ title: 'Fournisseur créé' });
      }
      setIsModalOpen(false); // Close modal here on success
      router.refresh();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Fournisseurs</h1>
        <p className="text-muted-foreground">
          Gérez vos partenaires et approvisionnements ({(initialSuppliers || []).length}{' '}
          fournisseurs)
        </p>
      </div>

      <SupplierTable
        suppliers={initialSuppliers || []}
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
  );
}
