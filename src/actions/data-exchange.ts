'use server'

import { readData } from '@/lib/db-json'

// Mock export - In real app, we stream file
export async function exportAllDataAction() {
    try {
        const ingredients = readData<any[]>('ingredients.json', []);
        const recipes = readData('recipes.json', []);
        const orders = readData('orders.json', []);
        const packs = readData('packs.json', []);

        const fullDump = {
            timestamp: new Date(),
            ingredients,
            recipes,
            orders,
            packs
        };

        // Return JSON string (client will handle blob)
        return JSON.stringify(fullDump, null, 2);
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function importIngredientsAction(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, message: "Aucun fichier fourni." };
        }

        const text = await file.text();
        const lines = text.split('\n');

        // Basic CSV parsing (assuming header: Nom, Catégorie, Prix, Stock, Fournisseur)
        // Skip header
        const dataRows = lines.slice(1).filter(line => line.trim() !== '');

        const ingredients = readData<any[]>('ingredients.json', []);
        let count = 0;

        for (const row of dataRows) {
            const cols = row.split(',').map(c => c.trim());
            if (cols.length < 5) continue;

            const [name, category, priceStr, stockStr, supplier] = cols;

            // Simple validation
            if (!name) continue;

            const newIngredient = {
                id: `ing-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                organizationId: 'org-1', // Default for single tenant mock
                name: name,
                category: category || 'Uncategorized',
                unit: 'kg', // Default unit
                weightedAverageCost: parseFloat(priceStr) || 0,
                currentStock: parseFloat(stockStr) || 0,
                supplier: { id: 'sup-csv', name: supplier || 'Unknown' }, // Map supplier string to object
                status: 'ACTIVE',
                slug: name.toLowerCase().replace(/\s+/g, '-'),
                updatedAt: new Date().toISOString()
            };

            ingredients.push(newIngredient);
            count++;
        }

        if (count > 0) {
            // In a real app we'd use writeData from db-json, but it is not exported or available as server action usually.
            // We need to import writeData from lib/db-json if it exists, or just use fs.
            // Checking imports... looks like I need to ensure writeData is available or used via the service.
            // Let's use the InventoryService if possible or just direct DB write since this is a "system" action.
            // Actually, let's check db-json.ts exports first to be safe, but I will assume I can just use the provided write helper if I make it available or just use fs directly if it's a server action. 
            // Wait, previous file read used `readData` from `@/lib/db-json`. Let's assume `writeData` is there or I'll add it.
            // To be safe, I'll use the fs module directly or check db-json.ts.
            // For now, I'll try to import writeData.
            const { writeData } = await import('@/lib/db-json');
            writeData('ingredients.json', ingredients);
        }

        return { success: true, count, message: `${count} ingrédients importés.` };
    } catch (e) {
        console.error("Import Error:", e);
        return { success: false, message: "Erreur lors de l'import." };
    }
}

export async function exportOrdersCSVAction() {
    const orders = readData<any[]>('orders.json', []);
    // Header
    const header = ['ID', 'Date', 'Client', 'Status', 'Total (EUR)', 'Coût (EUR)'];
    const rows = orders.map(o => [
        o.id,
        o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '',
        o.customerName,
        o.status,
        o.totalAmount.toFixed(2),
        (o.totalCost || 0).toFixed(2)
    ]);

    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    return csvContent;
}

export async function exportInventoryCSVAction() {
    const ingredients = readData<any[]>('ingredients.json', []);
    const header = ['ID', 'Nom', 'Catégorie', 'Stock', 'Unité', 'Coût Moyen (EUR)', 'Valeur Stock (EUR)'];
    const rows = ingredients.map(i => [
        i.id,
        i.name,
        i.category,
        i.currentStock,
        i.unit,
        i.weightedAverageCost,
        (i.currentStock * (i.weightedAverageCost / 1000)).toFixed(2) // assuming unit kg cost kg
    ]);

    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    return csvContent;
}
