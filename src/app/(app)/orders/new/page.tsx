'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewOrderPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const customerName = formData.get('customerName') as string;

    try {
      const res = await apiFetch<{ success: boolean; data: { id: string } }>('/orders', {
        method: 'POST',
        body: JSON.stringify({ customerName }), // api/orders handles default creation logic
      });
      router.push(`/orders/${res.data.id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to create order');
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Start New Order</CardTitle>
          <CardDescription>Enter customer details to begin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name / Reference</Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder="e.g. Walk-in Customer"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Order'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
