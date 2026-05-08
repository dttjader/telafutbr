import { NextResponse } from 'next/server';
import { getTimes } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getTimes());
}
