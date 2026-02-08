'use client';

import { useState, useEffect } from 'react';
import { CatalogueTable } from '@/components/catalogue/catalogue-table';
import { CatalogueModal } from '@/components/catalogue/catalogue-modal';
import { Ingredient } from '@/types/inventory';
import { apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
// Using client-side fetching as we need to filter and refresh actions inside client component wrapper for now
// Or better: Server Component page + Client Component wrapper.
// Let's stick effectively to client-logic wrapped as the logic is similar to Inventory page.
// Actually, let's build a Client Page wrapper to handle state.

import { useToast } from '@/components/ui/use-toast';

interface PackagingClientProps {
  initialItems: Ingredient[];
}

export default function PackagingPageWrapper({ initialItems }: PackagingClientProps) {
  const [items, setItems] = useState<Ingredient[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const { toast } = useToast();

  // Sync with server if needed or assume optimistic updates + refresh.
  // Ideally we revalidatePath on server actions.

  const router = useRouter();

  // Sync with server if needed or assume optimistic updates + refresh.
  // Ideally we revalidatePath on server actions.

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
    if (editingItem) {
      try {
        const res = await apiFetch<any>(`/api/inventory/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        if (res.success && res.data) {
          setItems(items.map((i) => (i.id === editingItem.id ? res.data : i)));
          toast({ title: 'Modifications enregistrées' });
          router.refresh();
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
            category: 'Packaging',
            initialCost: data.weightedAverageCost,
            initialStock: data.currentStock,
            ...data,
          }),
        });
        if (res.success && res.data) {
          setItems([res.data, ...items]);
          toast({ title: 'Élément créé' });
          router.refresh();
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
  );
}
