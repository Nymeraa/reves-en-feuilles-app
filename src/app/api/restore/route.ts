import { NextResponse } from 'next/server';

const disabledResponse = () =>
  NextResponse.json({ success: false, error: 'Feature disabled' }, { status: 410 });

export async function POST() {
  return disabledResponse();
}

export async function GET() {
  return disabledResponse();
}
