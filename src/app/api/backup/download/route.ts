import { NextRequest, NextResponse } from 'next/server';
import { BackupService } from '@/services/backup-service';

export async function GET(request: NextRequest) {
  try {
    const zipBuffer = await BackupService.createGlobalExportZip('org-1');
    const filename = `backup-${new Date().toISOString().split('T')[0]}.zip`;

    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup Download Failed', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
