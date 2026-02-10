import { NextRequest, NextResponse } from 'next/server';
import { BackupService } from '@/services/backup-service';
import { z } from 'zod';

const restoreSchema = z.object({
  organizationId: z.string(),
  mode: z.enum(['dryRun', 'commit']),
  format: z.enum(['zip', 'json']),
  payload: z.any(),
  confirm: z.string(),
  replace: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = restoreSchema.parse(body);

    const report = await BackupService.restore(
      validated.organizationId,
      validated.payload,
      validated.mode,
      validated.format,
      validated.confirm,
      validated.replace
    );

    return NextResponse.json(report);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Restore Failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
