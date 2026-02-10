import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-sql';
import { AuditAction, AuditEntity } from '@/types/audit';

export async function GET() {
  try {
    const lastBackup = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.EXPORT,
        entity: AuditEntity.BACKUP,
      },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({
      status: 'healthy',
      canExportZip: true, // Zip is enabled via adm-zip
      restoreEnabled: process.env.NODE_ENV !== 'production' || process.env.ALLOW_RESTORE === 'true',
      lastBackupAt: lastBackup?.timestamp || null,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health Check Failed', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
