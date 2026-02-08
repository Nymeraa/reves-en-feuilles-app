import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/services/analytics-service';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const orgId = 'org-1'; // Hardcoded for this context, normally from session
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    let csvData = '';
    let filename = '';

    try {
        if (type === 'sales') {
            csvData = await AnalyticsService.getSalesCsv(orgId, startDate, endDate);
            filename = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (type === 'inventory') {
            csvData = await AnalyticsService.getInventoryMovementsCsv(orgId, startDate, endDate);
            filename = `stock_movements_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            return NextResponse.json({ error: 'Invalid type. Use "sales" or "inventory".' }, { status: 400 });
        }

        return new NextResponse(csvData, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Export Failed', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
