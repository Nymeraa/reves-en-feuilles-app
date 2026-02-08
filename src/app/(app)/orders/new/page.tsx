'use client'

import { useActionState } from 'react'
import { createOrderAction } from '@/actions/order'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function NewOrderPage() {
    const [state, formAction] = useActionState(createOrderAction, null)

    return (
        <div className="max-w-md mx-auto mt-10">
            <Card>
                <CardHeader>
                    <CardTitle>Start New Order</CardTitle>
                    <CardDescription>Enter customer details to begin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="customerName">Customer Name / Reference</Label>
                            <Input
                                id="customerName"
                                name="customerName"
                                placeholder="e.g. Walk-in Customer"
                                required
                            />
                        </div>

                        {state?.error && (
                            <p className="text-sm text-red-500">{state.error}</p>
                        )}

                        <Button type="submit" className="w-full">Create Order</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
