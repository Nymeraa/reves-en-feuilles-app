'use server';

import { revalidatePath } from 'next/cache';
import { InventoryService } from '@/services/inventory-service';
import { IngredientStatus } from '@/types/inventory';

export async function createIngredientAction(prevStateOrData: any, formData?: FormData) {
  let name,
    category,
    supplierId,
    supplierUrl,
    stock,
    cost,
    threshold,
    notes,
    subtype,
    dimensions,
    capacity;

  if (formData) {
    const fd = formData;
    name = fd.get('name') as string;
    category = fd.get('category') as string;
    const rawSupplierId = fd.get('supplierId') as string;
    supplierId = rawSupplierId && rawSupplierId !== 'NO_SUPPLIER' ? rawSupplierId : undefined;
    supplierUrl = fd.get('supplierUrl') as string;
    stock = parseFloat(fd.get('initialStock') as string) || 0;
    cost = parseFloat(fd.get('initialCost') as string) || 0;
    threshold = parseFloat(fd.get('alertThreshold') as string) || 100;
    notes = fd.get('notes') as string;
    subtype = fd.get('subtype') as string;
    dimensions = fd.get('dimensions') as string;
    capacity = parseFloat(fd.get('capacity') as string) || undefined;
  } else {
    const data = prevStateOrData || {};
    name = data.name;
    category = data.category;
    supplierId = data.supplierId;
    supplierUrl = data.supplierUrl;
    stock = data.initialStock || 0;
    cost = data.initialCost || 0;
    threshold = data.alertThreshold || 100;
    notes = data.notes;
    subtype = data.subtype;
    dimensions = data.dimensions;
    capacity = data.capacity;
  }

  if (!name) return { error: 'Name Required' };

  try {
    // NOTE: Pass cost in €/kg directly - InventoryService will convert to €/g
    const newIngredient = await InventoryService.createIngredient('org-1', {
      name,
      category,
      supplierId,
      supplierUrl,
      initialStock: stock,
      initialCost: cost, // In €/kg - service will convert
      alertThreshold: threshold,
      notes,
      subtype,
      dimensions,
      capacity,
    });
    revalidatePath('/inventory');
    revalidatePath('/catalogue/packaging');
    revalidatePath('/catalogue/accessoires');
    // Also revalidate ingredients list if that's where we are
    revalidatePath('/catalogue/ingredients');
    revalidatePath('/inventory');
    return { success: true, data: newIngredient };
  } catch (e) {
    return { error: 'Failed to create' };
  }
}

// Flexible signature to support both useFormState and direct calls
export async function updateIngredientAction(
  id: string,
  prevStateOrData: any,
  formData?: FormData
) {
  let name,
    category,
    supplierId,
    supplierUrl,
    threshold,
    notes,
    subtype,
    dimensions,
    capacity,
    currentStock,
    weightedAverageCost;

  if (formData) {
    // Called via useFormState: (id, prevState, formData)
    const fd = formData;
    name = fd.get('name') as string;
    category = fd.get('category') as string;
    const rawSupplierId = fd.get('supplierId') as string;
    supplierId = rawSupplierId && rawSupplierId !== 'NO_SUPPLIER' ? rawSupplierId : undefined;
    supplierUrl = fd.get('supplierUrl') as string;
    threshold = parseFloat(fd.get('alertThreshold') as string);
    notes = fd.get('notes') as string;
    subtype = fd.get('subtype') as string;
    dimensions = fd.get('dimensions') as string;
    capacity = parseFloat(fd.get('capacity') as string) || undefined;
    currentStock = parseFloat(fd.get('currentStock') as string);
    weightedAverageCost = parseFloat(fd.get('weightedAverageCost') as string);
  } else {
    // Called directly: (id, data)
    const data = prevStateOrData || {};
    name = data.name;
    category = data.category;
    supplierId = data.supplierId;
    supplierUrl = data.supplierUrl;
    threshold = data.alertThreshold;
    notes = data.notes;
    subtype = data.subtype;
    dimensions = data.dimensions;
    capacity = data.capacity;
    currentStock = data.currentStock;
    weightedAverageCost = data.weightedAverageCost; // Map directly if passed
  }

  try {
    const updated = await InventoryService.updateIngredient('org-1', id, {
      name,
      category,
      supplierId,
      supplierUrl,
      alertThreshold: threshold,
      notes,
      subtype,
      dimensions,
      capacity,
      // Allow direct edit for these specific pages as requested by UI design
      initialStock: currentStock !== undefined && !isNaN(currentStock) ? currentStock : undefined,
      initialCost:
        weightedAverageCost !== undefined && !isNaN(weightedAverageCost)
          ? weightedAverageCost
          : undefined,
    } as any);

    revalidatePath('/inventory');
    revalidatePath('/catalogue/packaging');
    revalidatePath('/catalogue/accessoires');
    return { success: true, data: updated };
  } catch (e) {
    return { error: 'Failed to update' };
  }
}

export async function deleteIngredientAction(id: string) {
  try {
    await InventoryService.deleteIngredient('org-1', id);
    revalidatePath('/inventory');
    revalidatePath('/catalogue/packaging');
    revalidatePath('/catalogue/accessoires');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete' };
  }
}
