'use client'

import { useState, useMemo } from 'react'
import { Ingredient } from '@/types/inventory'
import { AppSettings } from '@/types/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Info, ArrowRight, Trash } from 'lucide-react'
import { RECIPE_FORMATS } from '@/types/recipe'

interface SimulationClientProps {
    ingredients: Ingredient[]
    settings: AppSettings
}

interface SimItem {
    id: string
    ingredientId: string
    quantity: number // typically implied 1 unit or percentage? Screenshot says "Ajoutez des ingrédients". 
    // Usually recipes have quantities in grams. 
    // In Simulation Screenshot 1, "Composition" is just a list. 
    // Let's assume user adds ingredients and sets quantity per ingredient?
    // Screenshot 1 is empty unfortunately.
    // Let's assume standard recipe composition : Ingredient + Qty.
}

export default function SimulationClientPage({ ingredients, settings }: SimulationClientProps) {
    // State
    const [simItems, setSimItems] = useState<any[]>([]) // TODO: Define type

    // Format & Packaging
    const [format, setFormat] = useState('100')
    const [packQuantity, setPackQuantity] = useState(1) // "Quantité" input
    const [sachetType, setSachetType] = useState('Automatique')
    const [cartonType, setCartonType] = useState('Aucun')
    const [accessoryType, setAccessoryType] = useState('Aucun')
    const [sourceType, setSourceType] = useState('Manuel')
    const [extraFees, setExtraFees] = useState(0)

    // Price & Margin
    const [calcMode, setCalcMode] = useState<'priceToMargin' | 'marginToPrice'>('priceToMargin')
    const [targetPrice, setTargetPrice] = useState(0)
    const [targetMargin, setTargetMargin] = useState(0) // Percentage

    // Helpers
    const getIngredient = (id: string) => ingredients.find(i => i.id === id)

    // VAT Multipliers
    const vatIng = 1 + (settings.tvaIngredients / 100)
    const vatPack = 1 + (settings.tvaPackaging / 100)

    // Calculations
    const costMat = useMemo(() => {
        const formatNum = parseInt(format)
        return simItems.reduce((sum: number, item: any) => {
            const ing = getIngredient(item.ingredientId)
            if (!ing) return sum
            // cost per gram × percentage/100 × format size
            // APPLY VAT (Ingredients)
            const costTTC = (ing.weightedAverageCost || 0) * vatIng
            return sum + (costTTC * (item.quantity / 100) * formatNum)
        }, 0)
    }, [simItems, format, ingredients, vatIng])

    // Helper to map selected format to sachet capacity
    const getDoypackCapacity = (format: number): number => {
        if (format <= 25) return 25
        if (format <= 50) return 50
        if (format <= 100) return 100
        if (format <= 250) return 250
        if (format <= 500) return 500
        return format
    }

    // Auto-select sachet based on format
    const availableDoypacks = useMemo(() => {
        const formatNum = parseInt(format)
        const targetCapacity = getDoypackCapacity(formatNum)
        return ingredients.filter(i => {
            if (i.category !== 'Packaging') return false

            // Check subtype or name for Doypack/Sachet
            const isSachet = i.subtype === 'Doypack' || i.subtype === 'Sachet' || i.name.toLowerCase().includes('doypack') || i.name.toLowerCase().includes('sachet')
            if (!isSachet) return false

            // Check capacity or name fallback
            const capMatch = i.capacity === targetCapacity
            const nameMatch = i.name.toLowerCase().includes(`${targetCapacity}g`) || i.name.toLowerCase().includes(`${targetCapacity} g`)

            return capMatch || nameMatch
        })
    }, [ingredients, format])

    const costSachet = useMemo(() => {
        let cost = 0
        if (sachetType === 'Automatique' && availableDoypacks.length > 0) {
            cost = availableDoypacks[0].weightedAverageCost || 0
        } else {
            // Find by name if specific type selected
            const match = ingredients.find(i => i.name?.toLowerCase().includes(sachetType.toLowerCase()))
            cost = match?.weightedAverageCost || 0
        }
        // APPLY VAT (Packaging)
        return cost * vatPack
    }, [sachetType, format, ingredients, availableDoypacks, vatPack])

    const urssafRate = settings.urssafRate || 12.3 // Default to 12.3 if missing
    const shopifyPercent = settings.shopifyTransactionPercent || 2.9
    const shopifyFixed = settings.shopifyFixedFee || 0.30

    const costUrssaf = useMemo(() => {
        return targetPrice * (urssafRate / 100)
    }, [targetPrice, urssafRate])

    const costShopify = useMemo(() => {
        if (sourceType === 'Shopify') {
            return (targetPrice * (shopifyPercent / 100)) + shopifyFixed
        }
        return 0
    }, [targetPrice, sourceType, shopifyPercent, shopifyFixed])

    // Available accessories
    const availableAccessories = useMemo(() => {
        return ingredients.filter(i => i.category === 'Accessoire')
    }, [ingredients])

    const costAccessory = useMemo(() => {
        if (accessoryType === 'Aucun') return 0
        const acc = availableAccessories.find(i => i.name === accessoryType)
        const cost = (acc?.weightedAverageCost || 0) * packQuantity
        // APPLY VAT (Accessory -> Packaging rate usually)
        return cost * vatPack
    }, [accessoryType, packQuantity, availableAccessories, vatPack])

    const costCarton = useMemo(() => {
        if (cartonType === 'Aucun') return 0
        const carton = ingredients.find(i =>
            i.category === 'Packaging' &&
            i.subtype === 'Carton' &&
            i.name?.includes(cartonType)
        )
        const cost = carton?.weightedAverageCost || 0
        // APPLY VAT (Packaging)
        return cost * vatPack
    }, [cartonType, ingredients, vatPack])

    const totalPercentage = useMemo(() => {
        return simItems.reduce((acc, item) => acc + (item.quantity || 0), 0)
    }, [simItems])

    const totalCogs = costMat + costSachet + costAccessory + costCarton + costUrssaf + costShopify + extraFees

    // Derived
    const netProfit = targetPrice - totalCogs
    const marginPercent = targetPrice > 0 ? (netProfit / targetPrice) * 100 : 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Simulation rentabilité</h2>
                <p className="text-slate-500">Simulez vos marges avant de créer une recette ou un pack</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex gap-3 text-blue-900 text-sm">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                    <div className="font-semibold mb-1">Mode simulation uniquement</div>
                    <div>Cette simulation n'impacte ni le stock, ni les rapports, ni la comptabilité. C'est un outil d'aide à la décision.</div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="col-span-8 space-y-6">
                    {/* Composition */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-base">Composition</CardTitle>
                            <Badge variant={totalPercentage === 100 ? "default" : "destructive"} className={totalPercentage === 100 ? "bg-green-600 hover:bg-green-700" : ""}>
                                Total: {totalPercentage}%
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {simItems.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    Ajoutez des ingrédients
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {simItems.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            <Select
                                                value={item.ingredientId || undefined}
                                                onValueChange={(v) => {
                                                    setSimItems(prev => prev.map((i: any) =>
                                                        i.id === item.id ? { ...i, ingredientId: v } : i
                                                    ))
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Choisir ingrédient..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ingredients
                                                        .filter(i => i.category !== 'Packaging' && i.category !== 'Accessoire')
                                                        .map(ing => (
                                                            <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    setSimItems(prev => prev.map((i: any) =>
                                                        i.id === item.id ? { ...i, quantity: parseFloat(e.target.value) || 0 } : i
                                                    ))
                                                }}
                                                className="w-24"
                                                placeholder="0"
                                            />
                                            <span className="text-sm">%</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSimItems(prev => prev.filter((i: any) => i.id !== item.id))}
                                            >
                                                <Trash className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Button variant="outline" className="w-full border-dashed" onClick={() => {
                                const newItem = {
                                    id: `temp-${Date.now()}-${Math.random()}`,
                                    ingredientId: '',
                                    quantity: 0
                                }
                                setSimItems(prev => [...prev, newItem])
                            }}>
                                <Plus className="w-4 h-4 mr-2" /> Ajouter Ingrédient
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Format & Packaging */}
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-base">Format & Packaging</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Format (g)</Label>
                                <Select value={format} onValueChange={setFormat}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {RECIPE_FORMATS.map(f => <SelectItem key={f} value={f.toString()}>{f}g</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantité</Label>
                                <Input type="number" value={packQuantity} onChange={e => setPackQuantity(parseInt(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Sachet</Label>
                                <Select value={sachetType} onValueChange={setSachetType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Automatique">Automatique</SelectItem>
                                        {availableDoypacks.map(d => (
                                            <SelectItem key={d.id} value={d.name || d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Carton</Label>
                                <Select value={cartonType} onValueChange={setCartonType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Aucun">Aucun</SelectItem>
                                        {ingredients
                                            .filter(i => i.category === 'Packaging' && i.subtype === 'Carton')
                                            .map(c => (
                                                <SelectItem key={c.id} value={c.name || c.id}>{c.name}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Accessoire</Label>
                                <Select value={accessoryType} onValueChange={setAccessoryType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Aucun">Aucun</SelectItem>
                                        {availableAccessories.map(a => (
                                            <SelectItem key={a.id} value={a.name || a.id}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Source vente</Label>
                                <Select value={sourceType} onValueChange={setSourceType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Manuel">Manuel</SelectItem>
                                        <SelectItem value="Shopify">Shopify</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Frais supplémentaires (€)</Label>
                                <Input type="number" step="0.01" value={extraFees} onChange={e => setExtraFees(parseFloat(e.target.value))} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prix & Marge Cible */}
                    <Card>
                        <CardHeader className="py-4 flex flex-row items-center gap-2">
                            <CalculatorIcon />
                            <CardTitle className="text-base">Prix & Marge cible</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-slate-100 p-1 rounded-md flex">
                                <button
                                    className={`flex-1 text-sm font-medium py-1.5 rounded-sm transition-all ${calcMode === 'priceToMargin' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setCalcMode('priceToMargin')}
                                >
                                    Prix → Marge
                                </button>
                                <button
                                    className={`flex-1 text-sm font-medium py-1.5 rounded-sm transition-all ${calcMode === 'marginToPrice' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setCalcMode('marginToPrice')}
                                >
                                    Marge → Prix
                                </button>
                            </div>

                            <div className="relative">
                                {calcMode === 'priceToMargin' ? (
                                    <>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="h-12 text-lg font-bold pl-4"
                                            value={targetPrice}
                                            onChange={e => setTargetPrice(parseFloat(e.target.value))}
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-4 top-3 text-slate-400 font-bold">€</span>
                                    </>
                                ) : (
                                    <>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            className="h-12 text-lg font-bold pl-4"
                                            value={targetMargin}
                                            onChange={e => {
                                                const margin = parseFloat(e.target.value)
                                                setTargetMargin(margin)

                                                // Fixed Costs
                                                const fixedCogs = costMat + costSachet + costAccessory + costCarton + extraFees + (sourceType === 'Shopify' ? shopifyFixed : 0)

                                                // Variable Rates (URSSAF + Shopify)
                                                const variableRate = (urssafRate / 100) + (sourceType === 'Shopify' ? (shopifyPercent / 100) : 0)

                                                // Target Margin Rate
                                                const marginRate = margin / 100

                                                // Formula: Price = FixedCosts / (1 - MarginRate - VariableRate)
                                                const denominator = 1 - marginRate - variableRate

                                                if (fixedCogs > 0 && denominator > 0) {
                                                    const price = fixedCogs / denominator
                                                    setTargetPrice(price)
                                                }
                                            }}
                                            placeholder="0.0"
                                        />
                                        <span className="absolute right-4 top-3 text-slate-400 font-bold">%</span>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <span className="text-xs text-slate-500 py-1 w-full">Marges suggérées :</span>
                                {[60, 70, 80].map(margin => {
                                    // Fixed Costs
                                    const fixedCogs = costMat + costSachet + costAccessory + costCarton + extraFees + (sourceType === 'Shopify' ? shopifyFixed : 0)
                                    // Variable Rates
                                    const variableRate = (urssafRate / 100) + (sourceType === 'Shopify' ? (shopifyPercent / 100) : 0)
                                    // Denominator
                                    const denominator = 1 - (margin / 100) - variableRate

                                    const price = (fixedCogs > 0 && denominator > 0) ? fixedCogs / denominator : 0

                                    return (
                                        <Badge
                                            key={margin}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-slate-50"
                                            onClick={() => {
                                                setCalcMode('marginToPrice')
                                                setTargetMargin(margin)
                                                setTargetPrice(price)
                                            }}
                                        >
                                            {margin}% → {price.toFixed(2)}€
                                        </Badge>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="col-span-4 space-y-6">
                    {/* Summary Card */}
                    <Card className={`text-center ${netProfit < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <CardContent className="pt-6 pb-6">
                            <div className={`text-sm font-medium ${netProfit < 0 ? 'text-red-600' : 'text-emerald-600'} mb-1`}>Profit net</div>
                            <div className={`text-3xl font-bold ${netProfit < 0 ? 'text-red-700' : 'text-emerald-700'} mb-2`}>
                                {netProfit.toFixed(2)} €
                            </div>
                            {netProfit < 0 && <div className="text-xs text-red-500 mb-4">Non rentable, ajustez vos coûts ou prix</div>}

                            <div className="border-t border-slate-200/50 pt-4 flex justify-between items-center px-4">
                                <span className="text-sm text-slate-500">Marge</span>
                                <span className={`text-xl font-bold ${marginPercent < 20 ? 'text-red-600' : 'text-slate-900'}`}>
                                    {marginPercent.toFixed(1)}%
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detail Card */}
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileTextIcon /> Détail des coûts</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Coût matière</span>
                                <span>{costMat.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Sachet</span>
                                <span className="text-blue-600">{costSachet.toFixed(2)} €</span>
                            </div>
                            {costAccessory > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Accessoire</span>
                                    <span>{costAccessory.toFixed(2)} €</span>
                                </div>
                            )}
                            {costCarton > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Carton</span>
                                    <span>{costCarton.toFixed(2)} €</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-500">URSSAF ({urssafRate}%)</span>
                                <span>{costUrssaf.toFixed(2)} €</span>
                            </div>
                            {costShopify > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Com. Shopify</span>
                                    <span>{costShopify.toFixed(2)} €</span>
                                </div>
                            )}
                            {extraFees > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Frais divers</span>
                                    <span>{extraFees.toFixed(2)} €</span>
                                </div>
                            )}

                            <div className="border-t pt-2 flex justify-between font-bold text-slate-900">
                                <span>COGS Total</span>
                                <span className="text-red-600">{totalCogs.toFixed(2)} €</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chart Placeholder */}
                    <Card>
                        <CardHeader className="py-4"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingIcon /> Répartition du prix</CardTitle></CardHeader>
                        <CardContent className="min-h-[150px] flex items-center justify-center text-xs text-slate-400 text-center">
                            Entrez un prix de vente pour voir la répartition
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function CalculatorIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
}

function FileTextIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
}

function TrendingIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
}
