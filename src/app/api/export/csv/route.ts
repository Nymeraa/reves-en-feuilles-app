import { NextRequest, NextResponse } from 'next/server';
import { BackupService, ExportEntity } from '@/services/backup-service';
import { AuditService } from '@/services/audit-service';
import { AuditAction, AuditEntity } from '@/types/audit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity') as ExportEntity;
  const organizationId = searchParams.get('organizationId');

  if (!entity || !organizationId) {
    return NextResponse.json({ error: 'Missing entity or organizationId' }, { status: 400 });
  }

  try {
    const csv = await BackupService.getCsvData(organizationId, entity);
    const filename = `${entity}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('CSV Export Failed', error);
    if (error.message.includes('Payload Too Large')) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
