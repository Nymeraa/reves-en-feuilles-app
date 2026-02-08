import { Supplier } from '@/types/inventory';
import { db } from '@/lib/db';
import { InventoryService } from './inventory-service'; // For dependency check

export const SupplierService = {
  async getSuppliers(orgId?: string): Promise<Supplier[]> {
    return db.readAll('suppliers', orgId);
  },

  async getSupplierById(id: string, orgId?: string): Promise<Supplier | undefined> {
    const result = await db.getById<Supplier>('suppliers', id, orgId);
    return result || undefined;
  },

  async createSupplier(orgId: string, input: Partial<Supplier>): Promise<Supplier> {
    const newSupplier: Supplier = {
      id: Math.random().toString(36).substring(7),
      organizationId: orgId, // Ensure we store orgId!
      name: input.name!,
      status: 'ACTIVE',
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      website: input.website,
      leadTime: input.leadTime,
      defaultConditioning: input.defaultConditioning,
      notes: input.notes,
      ...input,
    } as Supplier;

    await db.upsert('suppliers', newSupplier, orgId);
    return newSupplier;
  },

  async bulkCreateSuppliers(orgId: string, inputs: Partial<Supplier>[]): Promise<Supplier[]> {
    if (inputs.length === 0) return [];
    const existing = await this.getSuppliers(orgId);
    const newSuppliers: Supplier[] = [];

    for (const input of inputs) {
      const exists = existing.find((s) => s.name.toLowerCase() === input.name?.toLowerCase());
      if (exists) continue;

      const newSupplier: Supplier = {
        id: Math.random().toString(36).substring(7),
        organizationId: orgId, // Ensure orgId
        name: input.name!,
        status: 'ACTIVE',
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        website: input.website,
        leadTime: input.leadTime,
        defaultConditioning: input.defaultConditioning,
        notes: input.notes,
        ...input,
      } as Supplier;

      await db.upsert('suppliers', newSupplier, orgId);
      newSuppliers.push(newSupplier);
    }

    return newSuppliers;
  },

  async updateSupplier(orgId: string, id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const existing = await db.getById<Supplier>('suppliers', id, orgId);
    if (!existing) throw new Error('Supplier not found');

    const updated = { ...existing, ...updates };
    await db.upsert('suppliers', updated, orgId);
    return updated;
  },

  async archiveSupplier(orgId: string, id: string): Promise<Supplier> {
    return this.updateSupplier(orgId, id, { status: 'INACTIVE' });
  },

  async deleteSupplier(orgId: string, id: string): Promise<boolean> {
    const existing = await db.getById('suppliers', id, orgId);
    if (!existing) return false;

    // Security Check: Usage in Ingredients
    // Need to check generic DB or InventoryService
    // Ideally InventoryService exposes "getIngredientsBySupplier"
    // But for now we read all ingredients.
    // A optimized way would be db.find 'ingredients' where supplierId = id.
    // generic DB readAll + filter is what we have for now.
    const ingredients = await InventoryService.getIngredients(orgId);
    const isUsed = ingredients.some((i) => i.supplierId === id); // Missing nested check i.supplier?.id?
    // Types say supplierId string.

    if (isUsed) {
      throw new Error(
        'Cannot delete supplier associated with active ingredients. Please archive instead.'
      );
    }

    await db.delete('suppliers', id, orgId);
    return true;
  },
};
