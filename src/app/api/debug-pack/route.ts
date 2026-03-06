import { NextResponse } from 'next/server';
import { sqlDb } from '@/lib/db-sql';

export async function GET() {
  const packs = await sqlDb.readAll<any>('packs', 'org-1');
  const target = packs.find(p => p.name.includes("Local Test Pack"));
  if (target) {
     return NextResponse.json({ id: target.id, items: target.items });
  } else {
     return NextResponse.json({ error: 'No pack found' }, { status: 404 });
  }
}
