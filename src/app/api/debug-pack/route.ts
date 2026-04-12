import { NextResponse } from 'next/server';
import { PackService } from '@/services/pack-service';
import { sqlDb } from '@/lib/db-sql';

export async function GET() {
  const packs = await sqlDb.readAll<any>('packs', 'org-1');
  const targetId = 'lobkp7';
  const target = packs.find(p => p.id === targetId);
  if (!target) return NextResponse.json({ error: 'No test pack found' }, { status: 404 });
  
  try {
    const rawDb = await sqlDb.getById<any>('packs', target.id, 'org-1');
    const model = (sqlDb as any).getModel ? (sqlDb as any).getModel('packs') : null;
    let findUniqueResult = null;
    
    // Test prisma directly
    const { prisma } = await import('@/lib/db-sql');
    findUniqueResult = await prisma.pack.findUnique({ where: { id: target.id }, include: { items: true } });
    
    return NextResponse.json({ 
      targetId: target.id, 
      orgId: rawDb.organizationId,
      rawDb
    });
  } catch(e) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
