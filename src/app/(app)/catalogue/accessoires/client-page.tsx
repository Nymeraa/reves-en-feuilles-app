'use client';

import { useState } from 'react';
import { CatalogueTable } from '@/components/catalogue/catalogue-table';
import { CatalogueModal } from '@/components/catalogue/catalogue-modal';
import { Ingredient } from '@/types/inventory';
import { apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface AccessoriesClientProps {
  initialItems: Ingredient[];
}

export default function AccessoriesPageWrapper({ initialItems }: AccessoriesClientProps) {
  const [items, setItems] = useState<Ingredient[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: Ingredient) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet élément ?')) return;
    try {
      await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });
      setItems(items.filter((i) => i.id !== id));
      toast({ title: 'Élément supprimé' });
      router.refresh();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleSubmit = async (data: Partial<Ingredient>) => {
    // Enforce subtype mapping
    const saveData = { ...data, category: 'Accessoire' };

    if (editingItem) {
      try {
        const res = await apiFetch<any>(`/api/inventory/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(saveData),
        });
        if (res.success && res.data) {
          setItems(items.map((i) => (i.id === editingItem.id ? res.data : i)));
          toast({ title: 'Modifications enregistrées' });
        }
      } catch (e: any) {
        toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      }
    } else {
      try {
        const res = await apiFetch<any>('/api/inventory', {
          method: 'POST',
          body: JSON.stringify({
            name: data.name!,
            // category handled by saveData
            initialCost: data.weightedAverageCost,
            initialStock: data.currentStock,
            ...saveData,
          }),
        });
        if (res.success && res.data) {
          setItems([res.data, ...items]);
          toast({ title: 'Élément créé' });
        }
      } catch (e: any) {
        toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      }
    }
  };

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
  );
}
