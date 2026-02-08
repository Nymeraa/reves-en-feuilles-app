'use client'

import { useState, useActionState, useEffect } from 'react'
import { Pack, PackStatus, PackRecipeItem, PackPackagingItem } from '@/types/pack'
import { Recipe, RECIPE_FORMATS } from '@/types/recipe'
import { Ingredient, IngredientStatus } from '@/types/inventory'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Box, Coffee } from 'lucide-react' // Box for pack, Coffee for recipe
import { savePackFullAction, createPackAction } from '@/actions/pack'
import { findMatchingPackaging } from '@/lib/packaging-logic';

interface PackDialogProps {
    pack?: Pack
    recipes: Recipe[]
    ingredients: Ingredient[] // For packaging selection
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    readonly?: boolean
}

export function PackDialog({ pack, recipes, ingredients, trigger, open, onOpenChange, readonly = false }: PackDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const isEdit = !!pack
    const effectiveOpen = open !== undefined ? open : isOpen
    const setEffectiveOpen = onOpenChange || setIsOpen

    // State
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState<PackStatus>(PackStatus.DRAFT)
    const [price, setPrice] = useState(0)

    const [packRecipes, setPackRecipes] = useState<Partial<PackRecipeItem>[]>([])
    const [packPackaging, setPackPackaging] = useState<Partial<PackPackagingItem>[]>([])

    // Initialize
    useEffect(() => {
        if (effectiveOpen && pack) {
            setName(pack.name)
            setDescription(pack.description || '')
            setStatus(pack.status)
            setPrice(pack.price)
            setPackRecipes(pack.recipes)
            setPackPackaging(pack.packaging)
        } else if (effectiveOpen && !pack) {
            setName('')
            setDescription('')
            setStatus(PackStatus.ACTIVE)
            setPrice(0)
            setPackRecipes([])
            setPackPackaging([])
        }
    }, [effectiveOpen, pack])

    // Save Action
    const [saveState, saveAction] = useActionState(async (prev: any, formData: FormData) => {
        const fullData = {
            name, description, status, price,
            recipes: packRecipes.filter(r => r.recipeId),
            packaging: packPackaging.filter(p => p.ingredientId)
        }
        formData.set('data', JSON.stringify(fullData));

        if (isEdit && pack) {
            return await savePackFullAction(pack.id, prev, formData);
        } else {
            const res = await createPackAction(prev, formData);
            if (res.packId) return await savePackFullAction(res.packId, prev, formData);
            return { error: 'Failed to create' };
        }
    }, null)

    // Handlers
    const addRecipe = () => setPackRecipes([...packRecipes, { recipeId: '', quantity: 1, format: 50 }])
    const updateRecipe = (idx: number, field: string, val: any) => {
        const ag = [...packRecipes];
        // @ts-ignore
        ag[idx][field] = val;
        setPackRecipes(ag);
    }
    const removeRecipe = (idx: number) => setPackRecipes(packRecipes.filter((_, i) => i !== idx))

    const addPackaging = () => setPackPackaging([...packPackaging, { ingredientId: '', quantity: 1 }])
    const updatePackaging = (idx: number, field: string, val: any) => {
        const ag = [...packPackaging];
        // @ts-ignore
        ag[idx][field] = val;
        setPackPackaging(ag);
    }
    const removePackaging = (idx: number) => setPackPackaging(packPackaging.filter((_, i) => i !== idx))

    // Cost Est.
    const calculateRecipeCost = (recipeId: string, format: number) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return 0;

        // 1. Mix Cost
        const mixCost = recipe.items.reduce((total, item) => {
            const ingredient = ingredients.find(i => i.id === item.ingredientId)
            if (!ingredient || !item.percentage) return total
            const weight = (format * item.percentage) / 100
            return total + (weight * ingredient.weightedAverageCost)
        }, 0);

        // 2. Packaging (Doypack)
        const { ingredient: doypack } = findMatchingPackaging(ingredients, format, 'Sachet');
        const doypackCost = doypack ? (doypack.weightedAverageCost || 0) : 0;

        // 3. Fixed Costs (Approximate)
        const laborCost = recipe.laborCost || 0.50;
        const stickerCost = 0.10;

        return mixCost + doypackCost + laborCost + stickerCost;
    };


    const packagingCost = packPackaging.reduce((acc, p) => {
        const ing = ingredients.find(i => i.id === p.ingredientId);
        return acc + (ing ? (ing.weightedAverageCost * (p.quantity || 0)) : 0);
    }, 0);

    const recipesCost = packRecipes.reduce((acc, r) => {
        if (!r.recipeId || !r.format) return acc;
        const unitCost = calculateRecipeCost(r.recipeId, r.format);
        return acc + (unitCost * (r.quantity || 1));
    }, 0);

    const totalCost = packagingCost + recipesCost;
    const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;

    return (
        <>
            {/* DEBUG: Render trigger OUTSIDE Dialog to verify visibility */}
            {/* <DialogTrigger asChild>{trigger}</DialogTrigger> 
                Workaround: DialogTrigger was failing to render. Using manual trigger.
            */}
            {trigger && (
                <div onClick={() => setEffectiveOpen(true)} className="inline-block cursor-pointer">
                    {trigger}
                </div>
            )}
            {/* 
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button>Fallback Trigger</Button>
                </DialogTrigger>
            )}
            */}
            <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-muted/30 dark:bg-background border-purple-200 dark:border-purple-900">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="text-purple-900 dark:text-purple-300">
                            {readonly ? 'Détail du pack' : (isEdit ? 'Modifier le pack' : 'Nouveau pack')}
                        </DialogTitle>
                    </DialogHeader>

                    <form action={async (fd) => { await saveAction(fd); setEffectiveOpen(false); }} className="space-y-6">
                        {/* Header */}
                        <div className="bg-card p-4 rounded-lg border border-purple-100 dark:border-purple-900 shadow-sm space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-purple-900 dark:text-purple-300">Nom *</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} name="name" required className="border-purple-200 dark:border-purple-800 focus:ring-purple-500" disabled={readonly} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-purple-900 dark:text-purple-300">Statut</Label>
                                    <Select value={status} onValueChange={(v) => setStatus(v as PackStatus)} disabled={readonly}>
                                        <SelectTrigger className="border-purple-200 dark:border-purple-800"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={PackStatus.ACTIVE}>Actif</SelectItem>
                                            <SelectItem value={PackStatus.DRAFT}>Brouillon</SelectItem>
                                            <SelectItem value={PackStatus.ARCHIVED}>Archivé</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-purple-900 dark:text-purple-300">Prix de vente TTC</Label>
                                    <Input type="number" step="0.10" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="border-purple-200 dark:border-purple-800 font-bold" disabled={readonly} />
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="bg-card p-4 rounded-lg border border-purple-100 dark:border-purple-900 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                                    <Coffee className="w-4 h-4" /> Recettes incluses
                                </Label>
                                {!readonly && (
                                    <Button type="button" size="sm" variant="outline" onClick={addRecipe} className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                                        <Plus className="w-4 h-4 mr-1" /> Ajouter
                                    </Button>
                                )}
                            </div>
                            {packRecipes.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center p-2 bg-purple-50/50 dark:bg-purple-900/10 rounded">
                                    <Select value={item.recipeId} onValueChange={v => updateRecipe(idx, 'recipeId', v)} disabled={readonly}>
                                        <SelectTrigger className="flex-1 border-purple-200 dark:border-purple-800"><SelectValue placeholder="Choisir une recette" /></SelectTrigger>
                                        <SelectContent>
                                            {recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={item.format?.toString()} onValueChange={v => updateRecipe(idx, 'format', parseInt(v))} disabled={readonly}>
                                        <SelectTrigger className="w-24 border-purple-200 dark:border-purple-800"><SelectValue placeholder="Format" /></SelectTrigger>
                                        <SelectContent>
                                            {RECIPE_FORMATS.map(f => (
                                                <SelectItem key={f} value={f.toString()}>{f}g</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={e => updateRecipe(idx, 'quantity', parseInt(e.target.value))}
                                        className="w-16 border-purple-200 dark:border-purple-800"
                                        min="1"
                                        disabled={readonly}
                                    />
                                    {!readonly && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRecipe(idx)}>
                                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="bg-card p-4 rounded-lg border border-purple-100 dark:border-purple-900 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                                    <Box className="w-4 h-4" /> Accessoires inclus
                                </Label>
                                {!readonly && (
                                    <Button type="button" size="sm" variant="outline" onClick={addPackaging} className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                                        <Plus className="w-4 h-4 mr-1" /> Ajouter
                                    </Button>
                                )}
                            </div>
                            {packPackaging.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center p-2 bg-purple-50/50 dark:bg-purple-900/10 rounded">
                                    <Select value={item.ingredientId} onValueChange={v => updatePackaging(idx, 'ingredientId', v)} disabled={readonly}>
                                        <SelectTrigger className="flex-1 border-purple-200 dark:border-purple-800"><SelectValue placeholder="Choisir un accessoire" /></SelectTrigger>
                                        <SelectContent>
                                            {ingredients.filter(ing => {
                                                return ing.category === 'Accessoire';
                                            }).map(ing => <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={e => updatePackaging(idx, 'quantity', parseInt(e.target.value))}
                                        className="w-16 border-purple-200 dark:border-purple-800"
                                        min="1"
                                        disabled={readonly}
                                    />
                                    {!readonly && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePackaging(idx)}>
                                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Stats Footer */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/10 rounded border border-purple-100 dark:border-purple-800">
                                <div className="text-xs text-purple-600 dark:text-purple-400">Coût Accessoires</div>
                                <div className="font-bold text-purple-900 dark:text-purple-200">{packagingCost.toFixed(2)} €</div>
                            </div>
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/10 rounded border border-purple-100 dark:border-purple-800">
                                <div className="text-xs text-purple-600 dark:text-purple-400">Coût Recettes</div>
                                <div className="font-bold text-purple-900 dark:text-purple-200">{recipesCost.toFixed(2)} €</div>
                            </div>
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/10 rounded border border-purple-100 dark:border-purple-800">
                                <div className="text-xs text-purple-600 dark:text-purple-400">Marge Brute</div>
                                <div className="font-bold text-purple-900 dark:text-purple-200">{margin.toFixed(0)}%</div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEffectiveOpen(false)}>{readonly ? 'Fermer' : 'Annuler'}</Button>
                            {!readonly && (
                                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                                    {isEdit ? 'Enregistrer' : 'Créer le pack'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >
        </>
    )
}
