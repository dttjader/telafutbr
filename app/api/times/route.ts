import { NextResponse } from 'next/server';
import { getTimes } from '@/lib/data';

export async function GET() {
  try {
    return NextResponse.json(await getTimes());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
