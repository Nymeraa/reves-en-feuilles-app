import { NextRequest, NextResponse } from 'next/server';
import { BackupService } from '@/services/backup-service';
import { AuditService } from '@/services/audit-service';
import { AuditAction, AuditEntity } from '@/types/audit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'zip';
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
  }

  try {
    if (format === 'json') {
      const data = await BackupService.createGlobalExportJson(organizationId);
      return NextResponse.json(data);
    } else {
      const buffer = await BackupService.createGlobalExportZip(organizationId);
      const filename = `backup_${organizationId}_${new Date().toISOString().split('T')[0]}.zip`;

      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Global Export Failed', error);
    if (error.message.includes('Payload Too Large')) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
