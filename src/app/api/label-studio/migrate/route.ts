import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-sql';

// Structure expected from the client
export interface MigrationPayload {
  media: any[];
  batches: any[];
  fonts: any[];
  folders: any[];
  templates: any[];
  presets: any[];
}

export async function POST(request: Request) {
  try {
    // Note: Assuming a single tenant or currently active organization ID
    // You might need to adjust based on how organizationId is determined in your app
    // For this context, let's assume we extract it from a simulated auth or fallback
    // Since this is a specialized app, we'll try to get it from headers or a mock if testing.
    // If you have a specific way to get organizationId, replace this:
    const organizationId = 'default_org'; // Override logic later if auth is strictly needed for migration
    const payload: MigrationPayload = await request.json();

    console.log('Starting Label Studio Migration...', {
      mediaCount: payload.media?.length || 0,
      batchesCount: payload.batches?.length || 0,
      templatesCount: payload.templates?.length || 0,
    });

    // Use a transaction to ensure all or nothing
    await prisma.$transaction(async (tx: any) => {
      // 1. Migrate Media
      if (payload.media && payload.media.length > 0) {
        for (const item of payload.media) {
          await tx.labelMedia.upsert({
            where: { id: item.id },
            update: {
              category: item.category,
              format: item.format,
              name: item.name,
              data: item.data,
              timestamp: item.timestamp,
            },
            create: {
              id: item.id,
              organizationId,
              category: item.category,
              format: item.format,
              name: item.name,
              data: item.data,
              timestamp: item.timestamp,
            },
          });
        }
      }

      // 2. Migrate Batches
      if (payload.batches && payload.batches.length > 0) {
        for (const batch of payload.batches) {
          await tx.labelBatch.upsert({
            where: { id: batch.id },
            update: {
              model: batch.model,
              format: batch.format,
              poids: batch.poids,
              lot: batch.lot,
              ddm: batch.ddm,
              labels: batch.labels,
              timestamp: batch.timestamp,
            },
            create: {
              id: batch.id,
              organizationId,
              model: batch.model,
              format: batch.format,
              poids: batch.poids,
              lot: batch.lot,
              ddm: batch.ddm,
              labels: batch.labels,
              timestamp: batch.timestamp,
            },
          });
        }
      }

      // 3. Migrate Fonts
      if (payload.fonts && payload.fonts.length > 0) {
        for (const font of payload.fonts) {
          await tx.labelFont.upsert({
            where: { id: font.id },
            update: {
              name: font.name,
              displayName: font.displayName,
              data: font.data,
              type: font.type,
            },
            create: {
              id: font.id,
              organizationId,
              name: font.name,
              displayName: font.displayName,
              data: font.data,
              type: font.type,
            },
          });
        }
      }

      // 4. Migrate Folders
      // Order might matter if parentId is checked by Prisma constraints,
      // but since parentId is just a String? (not a strict FK right now in the quick schema),
      // we can insert them in any order.
      if (payload.folders && payload.folders.length > 0) {
        for (const folder of payload.folders) {
          await tx.labelFolder.upsert({
            where: { id: folder.id },
            update: {
              name: folder.name,
              parentId: folder.parentId,
              createdAt: new Date(folder.createdAt),
            },
            create: {
              id: folder.id,
              organizationId,
              name: folder.name,
              parentId: folder.parentId,
              createdAt: folder.createdAt ? new Date(folder.createdAt) : new Date(),
            },
          });
        }
      }

      // 5. Migrate Templates
      if (payload.templates && payload.templates.length > 0) {
        for (const template of payload.templates) {
          await tx.labelTemplate.upsert({
            where: { id: template.id },
            update: {
              folderId: template.folderId,
              name: template.name,
              design: template.design,
              format: template.format,
              side: template.side,
              preview: template.preview,
              createdAt: new Date(template.createdAt),
            },
            create: {
              id: template.id,
              organizationId,
              folderId: template.folderId,
              name: template.name,
              design: template.design,
              format: template.format,
              side: template.side,
              preview: template.preview,
              createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
            },
          });
        }
      }

      // 6. Migrate Presets
      if (payload.presets && payload.presets.length > 0) {
        for (const preset of payload.presets) {
          await tx.labelPreset.upsert({
            where: { id: preset.id },
            update: {
              name: preset.name,
              type: preset.type,
              format: preset.format,
              folder: preset.folder,
              properties: preset.properties,
            },
            create: {
              id: preset.id,
              organizationId,
              name: preset.name,
              type: preset.type,
              format: preset.format,
              folder: preset.folder,
              properties: preset.properties,
            },
          });
        }
      }
    });

    console.log('Migration completed successfully');
    return NextResponse.json({ success: true, message: 'Data migrated successfully' });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { success: false, error: 'Migration failed', details: error },
      { status: 500 }
    );
  }
}
