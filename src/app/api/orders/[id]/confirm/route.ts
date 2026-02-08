import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order-service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await OrderService.confirmOrder('org-1', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to confirm order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
