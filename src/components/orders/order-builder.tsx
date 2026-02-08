'use client'

import { useState, useActionState } from 'react'
import { Order, OrderStatus } from '@/types/order'
import { Recipe, RECIPE_FORMATS, RecipeFormat } from '@/types/recipe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { confirmOrderAction, addOrderItemAction } from '@/actions/order'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, CheckCircle } from 'lucide-react'

interface OrderBuilderProps {
    order: Order
    recipes: Recipe[]
}

export function OrderBuilder({ order, recipes }: OrderBuilderProps) {
    const isLocked = order.status !== OrderStatus.DRAFT

    // Add Item Form State
    const [selectedRecipe, setSelectedRecipe] = useState<string>('')
    const [selectedFormat, setSelectedFormat] = useState<string>('100')
    const [quantity, setQuantity] = useState<number>(1)
    const [unitPrice, setUnitPrice] = useState<string>('')

    const [addItemState, addItemAction] = useActionState(addOrderItemAction.bind(null, order.id), null)
    const [confirmState, confirmAction] = useActionState(confirmOrderAction.bind(null, order.id), null)

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* Left Col: Order Details & Items */}
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Order #{order.id}</CardTitle>
                            <p className="text-sm text-muted-foreground">{order.customerName}</p>
                        </div>
                        <Badge variant={isLocked ? 'default' : 'secondary'}>{order.status}</Badge>
                    </CardHeader>
                    <CardContent>
                        {order.items.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                <ShoppingCart className="mx-auto h-10 w-10 mb-2 opacity-20" />
                                <p>No items in cart</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center border-b pb-4 last:border-0">
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {item.quantity} x {item.format}g
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">€{item.totalPrice.toFixed(2)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                (Cost: €{(item.unitCostSnapshot * item.quantity).toFixed(2)})
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between items-center border-t p-6 bg-slate-50">
                        <span className="text-lg font-medium">Total (Payé Client)</span>
                        {!isLocked ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">€</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="w-32 font-bold text-right"
                                    defaultValue={order.totalAmount.toFixed(2)}
                                    onBlur={async (e) => {
                                        const val = e.target.value;
                                        if (!val) return;
                                        const { updateOrderFieldAction } = await import('@/actions/order');
                                        await updateOrderFieldAction(order.id, 'totalAmount', val);
                                    }}
                                />
                            </div>
                        ) : (
                            <span className="text-2xl font-bold">€{order.totalAmount.toFixed(2)}</span>
                        )}
                    </CardFooter>
                </Card>

                {/* Actions */}
                {!isLocked && (
                    <form action={confirmAction} className="flex justify-end">
                        <Button size="lg" disabled={order.items.length === 0}>
                            <CheckCircle className="mr-2 h-5 w-5" /> Confirm Order & Deduct Stock
                        </Button>
                    </form>
                )}
            </div>

            {/* Right Col: Add Item Form */}
            {!isLocked && (
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Item</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form action={addItemAction} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Recipe</Label>
                                    <Select name="recipeId" value={selectedRecipe} onValueChange={setSelectedRecipe}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {recipes.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Format (g)</Label>
                                        <Select name="format" value={selectedFormat} onValueChange={setSelectedFormat}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {RECIPE_FORMATS.map(f => (
                                                    <SelectItem key={f} value={f.toString()}>{f}g</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Qty</Label>
                                        <Input
                                            name="quantity"
                                            type="number"
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Prix Unit. (€)</Label>
                                        <Input
                                            name="unitPrice"
                                            type="number"
                                            step="0.01"
                                            placeholder="Auto"
                                            value={unitPrice}
                                            onChange={(e) => setUnitPrice(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={!selectedRecipe}>
                                    Add to Order
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
