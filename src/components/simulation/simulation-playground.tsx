'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash, Info } from 'lucide-react'
import { Recipe } from '@/types/recipe'
import { Pack } from '@/types/pack'
import { Ingredient } from '@/types/inventory'
import { AppSettings } from '@/types/settings'

interface SimulationProps {
    recipes: Recipe[];
    ingredients: Ingredient[];
    packs: Pack[];
}

interface CompositionItem {
    tempId: string;
    ingredientId: string;
    percentage: number;
}

export function SimulationPlayground({ recipes, ingredients, packs }: SimulationProps) {
    // Composition
    const [compositionItems, setCompositionItems] = useState<CompositionItem[]>([])

    // Format & Packaging
    const [selectedFormat, setSelectedFormat] = useState<number>(100)
    const [quantity, setQuantity] = useState<number>(1)
    const [selectedDoypackId, setSelectedDoypackId] = useState<string>('')
    const [selectedAccessoryId, setSelectedAccessoryId] = useState<string>('')
    const [selectedAuthentiqueId, setSelectedAuthentiqueId] = useState<string>('')
    const [overheadCost, setOverheadCost] = useState<number>(0)

    // Sales
    const [salesSource, setSalesSource] = useState<'Manuel' | 'Shopify'>('Manuel')
    const [totalRevenue, setTotalRevenue] = useState<number>(0)
    const [targetMargin, setTargetMargin] = useState<number>(30)

    // Settings (hardcoded for now, should come from AppSettings)
    const urssafRate = 20 // 20%
    const shopifyPercent = 2.9 // 2.9%
    const shopifyFixed = 0.30 // 0.30€

    // Handlers
    const handleAddIngredient = () => {
        const newItem: CompositionItem = {
            tempId: `temp-${Date.now()}-${Math.random()}`,
            ingredientId: '',
            percentage: 0
        }
        setCompositionItems(prev => [...prev, newItem])
    }

    const updateCompositionItem = (tempId: string, field: keyof CompositionItem, value: any) => {
        setCompositionItems(prev => prev.map(item =>
            item.tempId === tempId ? { ...item, [field]: value } : item
        ))
    }

    const removeCompositionItem = (tempId: string) => {
        setCompositionItems(prev => prev.filter(item => item.tempId !== tempId))
    }

    // Calculations
    const calculatedCosts = useMemo(() => {
        // 1. Coût matière
        const materialCost = compositionItems.reduce((sum, item) => {
            const ing = ingredients.find(i => i.id === item.ingredientId)
            if (!ing) return sum
            // Cost per gram × percentage × format
            return sum + ((ing.weightedAverageCost || 0) * (item.percentage / 100) * selectedFormat)
        }, 0)

        // 2. Coût Pack (Doypack + Accessory + Authentique)
        const doypack = ingredients.find(i => i.id === selectedDoypackId)
        const accessory = ingredients.find(i => i.id === selectedAccessoryId)
        const authentique = ingredients.find(i => i.id === selectedAuthentiqueId)

        const packCost =
            (doypack?.weightedAverageCost || 0) +
            ((accessory?.weightedAverageCost || 0) * quantity) +
            (authentique?.weightedAverageCost || 0)

        // 3. URSSAF
        const urssafCost = totalRevenue * (urssafRate / 100)

        // 4. Shopify
        const shopifyCost = salesSource === 'Shopify'
            ? (totalRevenue * (shopifyPercent / 100)) + shopifyFixed
            : 0

        // 5. Total COGS
        const cogsTotal = materialCost + packCost + urssafCost + shopifyCost + overheadCost

        // 6. Profit & Margin
        const netProfit = totalRevenue - cogsTotal
        const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

        return {
            materialCost,
            packCost,
            urssafCost,
            shopifyCost,
            cogsTotal,
            netProfit,
            margin
        }
    }, [compositionItems, selectedFormat, selectedDoypackId, selectedAccessoryId, selectedAuthentiqueId, quantity, totalRevenue, salesSource, overheadCost, ingredients, urssafRate, shopifyPercent, shopifyFixed])

    const handleReverseCalc = () => {
        if (calculatedCosts.cogsTotal <= 0) return
        // Price = COGS / (1 - targetMargin/100)
        const price = calculatedCosts.cogsTotal / (1 - (targetMargin / 100))
        setTotalRevenue(Number(price.toFixed(2)))
    }

    // Filter doypacks by format capacity
    const availableDoypacks = useMemo(() => {
        return ingredients.filter(i =>
            i.category === 'Packaging' &&
            i.subtype === 'Doypack' &&
            i.capacity === selectedFormat
        )
    }, [ingredients, selectedFormat])

    // Filter accessories
    const availableAccessories = useMemo(() => {
        return ingredients.filter(i => i.category === 'Accessoire')
    }, [ingredients])

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-900">Mode simulation uniquement</p>
                            <p className="text-sm text-blue-700">Cette simulation s'démarque de la recette, et ne l'a modifie pas. C'est un outil d'aide à la décision.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* LEFT PANEL */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Composition Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Composition</CardTitle>
                            <CardDescription>Ajoutez les ingrédients et leurs pourcentages</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button onClick={handleAddIngredient} variant="outline" className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter ingrédient
                            </Button>

                            <div className="space-y-2">
                                {compositionItems.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-4">
                                        Aucun ingrédient. Cliquez sur "Ajouter ingrédient" pour commencer.
                                    </p>
                                )}
                                {compositionItems.map((item) => (
                                    <div key={item.tempId} className="flex items-center gap-2">
                                        <Select
                                            value={item.ingredientId}
                                            onValueChange={(v) => updateCompositionItem(item.tempId, 'ingredientId', v)}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Sélectionner ingrédient..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ingredients
                                                    .filter(i => i.category === 'Ingrédient')
                                                    .map(i => (
                                                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            value={item.percentage}
                                            onChange={(e) => updateCompositionItem(item.tempId, 'percentage', parseFloat(e.target.value) || 0)}
                                            className="w-24"
                                            placeholder="0"
                                        />
                                        <span className="text-sm">%</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeCompositionItem(item.tempId)}
                                        >
                                            <Trash className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Format & Packaging Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Format & Packaging</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Format (g)</Label>
                                    <Select value={selectedFormat.toString()} onValueChange={(v) => setSelectedFormat(parseInt(v))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="25">25g</SelectItem>
                                            <SelectItem value="50">50g</SelectItem>
                                            <SelectItem value="100">100g</SelectItem>
                                            <SelectItem value="250">250g</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Quantité</Label>
                                    <Input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label>Sachet (avec sélé)</Label>
                                    <Select value={selectedDoypackId} onValueChange={setSelectedDoypackId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner sachet..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Aucun</SelectItem>
                                            {availableDoypacks.map(i => (
                                                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Authentique</Label>
                                    <Select value={selectedAuthentiqueId} onValueChange={setSelectedAuthentiqueId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Aucun</SelectItem>
                                            <SelectItem value="authentique">Authentique</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Accessoire</Label>
                                    <Select value={selectedAccessoryId} onValueChange={setSelectedAccessoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Aucun</SelectItem>
                                            {availableAccessories.map(i => (
                                                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label>Frais supplémentaires (€)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={overheadCost}
                                        onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT PANEL */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Détail des ventes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Détail des ventes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Coût matière</span>
                                <span className="font-mono">{calculatedCosts.materialCost.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Coût Pack</span>
                                <span className="font-mono">{calculatedCosts.packCost.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>URSSAF (%)</span>
                                <span className="font-mono">{calculatedCosts.urssafCost.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Autres / Plt (Shopify)</span>
                                <span className="font-mono">{calculatedCosts.shopifyCost.toFixed(2)} €</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-red-600">
                                <span>COGS Total</span>
                                <span className="font-mono">{calculatedCosts.cogsTotal.toFixed(2)} €</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Résultat du prix */}
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardHeader>
                            <CardTitle className="text-emerald-900">Résultat du prix</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Source de vente</Label>
                                <Select value={salesSource} onValueChange={(v: any) => setSalesSource(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Manuel">Manuel</SelectItem>
                                        <SelectItem value="Shopify">Shopify</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-lg">Total (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={totalRevenue}
                                    onChange={(e) => setTotalRevenue(parseFloat(e.target.value) || 0)}
                                    className="text-2xl font-bold h-14"
                                />
                            </div>

                            <Separator />

                            <div className="flex justify-between">
                                <span className="font-medium">Profit net</span>
                                <span className={`text-xl font-bold ${calculatedCosts.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {calculatedCosts.netProfit.toFixed(2)} €
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="font-medium">Marge</span>
                                <span className={`text-3xl font-bold ${calculatedCosts.margin >= 30 ? 'text-emerald-600' : calculatedCosts.margin >= 20 ? 'text-orange-500' : 'text-red-600'}`}>
                                    {calculatedCosts.margin.toFixed(1)} %
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Prix & Marge cible */}
            <Card>
                <CardHeader>
                    <CardTitle>Prix & Marge cible</CardTitle>
                    <CardDescription>Calculez le prix nécessaire pour atteindre votre marge cible</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Objectif Marge (%)</Label>
                            <Input
                                type="number"
                                value={targetMargin}
                                onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <Button onClick={handleReverseCalc} size="lg">
                            Calculer Prix
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
