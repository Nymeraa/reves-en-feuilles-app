import { RecipeService } from '@/services/recipe-service'
import { InventoryService } from '@/services/inventory-service'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { PrintButton } from '@/components/print-button'

interface PrintPageProps {
    params: {
        id: string
    }
}

export default async function RecipePrintPage({ params }: PrintPageProps) {
    const { id } = await params
    const recipe = await RecipeService.getRecipeById(id)
    if (!recipe) notFound()

    const ingredients = await InventoryService.getIngredients(recipe.organizationId)

    return (
        <div className="bg-white text-black p-8 max-w-[210mm] mx-auto min-h-screen">
            <div className="flex justify-between items-start border-b pb-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
                    <p className="text-slate-600 italic">Réf: {recipe.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500">Fiche Technique</div>
                    <div className="font-bold text-lg">{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8 mb-8">
                <div className="col-span-2 space-y-4">
                    <section>
                        <h3 className="font-bold uppercase tracking-wide border-b border-black mb-2">Description</h3>
                        <p className="text-sm leading-relaxed">{recipe.description || 'Aucune description.'}</p>
                    </section>

                    <section className="mt-8">
                        <h3 className="font-bold uppercase tracking-wide border-b border-black mb-2">Composition</h3>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="p-2">Ingrédient</th>
                                    <th className="p-2 text-right">Pourcentage</th>
                                    <th className="p-2 text-right">Quantité (100g)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipe.items.map((item, idx) => {
                                    const ing = ingredients.find(i => i.id === item.ingredientId)
                                    return (
                                        <tr key={idx} className="border-b border-slate-100">
                                            <td className="p-2 font-medium">{ing?.name || 'Inconnu'}</td>
                                            <td className="p-2 text-right">{item.percentage}%</td>
                                            <td className="p-2 text-right">{item.percentage} g</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-slate-50 p-4 rounded border">
                        <h3 className="font-bold text-sm uppercase mb-3">Formats Vente</h3>
                        <ul className="space-y-2 text-sm">
                            {Object.entries(recipe.prices).map(([fmt, price]) => (
                                <li key={fmt} className="flex justify-between">
                                    <span>{fmt}g</span>
                                    <span className="font-bold">{price.toFixed(2)} €</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="bg-slate-50 p-4 rounded border">
                        <h3 className="font-bold text-sm uppercase mb-3">Instructions</h3>
                        <div className="text-xs text-slate-500 italic">
                            Température: 80°C<br />
                            Temps: 3 min
                        </div>
                    </section>
                </div>
            </div>

            <div className="fixed bottom-8 right-8 print:hidden">
                <PrintButton />
            </div>
        </div>
    )
}

