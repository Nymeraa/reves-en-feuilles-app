import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-sql';

// GET /api/label-studio/data?type=...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // media, batches, templates, folders, fonts, presets

  try {
    let data: any[] = [];
    switch (type) {
      case 'media':
        data = await prisma.labelMedia.findMany();
        break;
      case 'batches':
        data = await prisma.labelBatch.findMany();
        break;
      case 'templates':
        data = await prisma.labelTemplate.findMany();
        break;
      case 'folders':
        data = await prisma.labelFolder.findMany();
        break;
      case 'fonts':
        data = await prisma.labelFont.findMany();
        break;
      case 'presets':
        data = await prisma.labelPreset.findMany();
        break;
      default:
        return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[API] Erreur GET ${type}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/label-studio/data
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { type, data } = payload; // data est un objet unique (item)

    if (!type || !data || !data.id) {
      return NextResponse.json({ error: 'Payload ou ID manquant' }, { status: 400 });
    }

    let result;
    // Upsert behavior on all tables
    switch (type) {
      case 'media':
        result = await prisma.labelMedia.upsert({
          where: { id: data.id },
          update: {
            category: data.category || '',
            format: data.format || '',
            name: data.name || '',
            data: data.data || '',
            timestamp: data.timestamp || 0,
          },
          create: {
            id: data.id,
            organizationId: 'default_org',
            category: data.category || '',
            format: data.format || '',
            name: data.name || '',
            data: data.data || '',
            timestamp: data.timestamp || 0,
          },
        });
        break;

      case 'batches':
        result = await prisma.labelBatch.upsert({
          where: { id: data.id },
          update: {
            model: data.model || '',
            format: data.format || '',
            poids: data.poids || '',
            lot: data.lot || '',
            ddm: data.ddm || '',
            labels: data.labels ? JSON.stringify(data.labels) : '[]',
            timestamp: data.timestamp || 0,
          },
          create: {
            id: data.id,
            organizationId: 'default_org',
            model: data.model || '',
            format: data.format || '',
            poids: data.poids || '',
            lot: data.lot || '',
            ddm: data.ddm || '',
            labels: data.labels ? JSON.stringify(data.labels) : '[]',
            timestamp: data.timestamp || 0,
          },
        });
        break;

      case 'templates':
        result = await prisma.labelTemplate.upsert({
          where: { id: data.id },
          update: {
            folderId: data.folderId || null,
            name: data.name || '',
            design: data.design ? JSON.stringify(data.design) : '{}',
            format: data.format || '',
            side: data.side || '',
          },
          create: {
            id: data.id,
            organizationId: 'default_org',
            folderId: data.folderId || null,
            name: data.name || '',
            design: data.design ? JSON.stringify(data.design) : '{}',
            format: data.format || '',
            side: data.side || '',
          },
        });
        break;

      case 'folders':
        result = await prisma.labelFolder.upsert({
          where: { id: data.id },
          update: {
            name: data.name || '',
            parentId: data.parentId || null,
          },
          create: {
            id: data.id,
            organizationId: 'default_org',
            name: data.name || '',
            parentId: data.parentId || null,
          },
        });
        break;

      case 'fonts':
        result = await prisma.labelFont.upsert({
          where: { id: data.id },
          update: {
            name: data.name || '',
            displayName: data.displayName || '',
            data: data.data || '',
            type: data.type || '',
          },
          create: {
            id: data.id,
            organizationId: 'default_org',
            name: data.name || '',
            displayName: data.displayName || '',
            data: data.data || '',
            type: data.type || '',
          },
        });
        break;

      case 'presets':
        result = await prisma.labelPreset.upsert({
          where: { id: data.id },
          update: {
            name: data.name || '',
            type: data.type || '',
            format: data.format || '',
            folder: data.folder || null,
            properties: data.properties ? JSON.stringify(data.properties) : '{}',
          },
          create: {
            id: data.id,
            organizationId: 'default_org',
            name: data.name || '',
            type: data.type || '',
            format: data.format || '',
            folder: data.folder || null,
            properties: data.properties ? JSON.stringify(data.properties) : '{}',
          },
        });
        break;

      default:
        return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('[API] Erreur POST /api/label-studio/data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/label-studio/data?type=...&id=...
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'Type ou ID manquant' }, { status: 400 });
  }

  try {
    switch (type) {
      case 'media':
        await prisma.labelMedia.delete({ where: { id } });
        break;
      case 'batches':
        await prisma.labelBatch.delete({ where: { id } });
        break;
      case 'templates':
        await prisma.labelTemplate.delete({ where: { id } });
        break;
      case 'folders':
        await prisma.labelFolder.delete({ where: { id } });
        break;
      case 'fonts':
        await prisma.labelFont.delete({ where: { id } });
        break;
      case 'presets':
        await prisma.labelPreset.delete({ where: { id } });
        break;
      default:
        return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[API] Erreur DELETE ${type} ${id}:`, error);
    // Ignore error if record doesn't exist
    if (error.code === 'P2025') {
      return NextResponse.json({ success: true, note: 'Introuvable' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
