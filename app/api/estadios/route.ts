import { NextRequest, NextResponse } from 'next/server';
import { getEstadios, saveEstadios, uid } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getEstadios());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const estadios = getEstadios();
  const novo = { ...body, id: body.id || `estadio-${uid()}` };
  estadios.push(novo);
  saveEstadios(estadios);
  return NextResponse.json(novo, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const estadios = getEstadios();
  const idx = estadios.findIndex(e => e.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  estadios[idx] = body;
  saveEstadios(estadios);
  return NextResponse.json(body);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const estadios = getEstadios().filter(e => e.id !== id);
  saveEstadios(estadios);
  return NextResponse.json({ ok: true });
}
