import { NextRequest, NextResponse } from 'next/server';
import { getJogadores, saveJogadores, uid } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getJogadores());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const jogadores = getJogadores();
  const novo = {
    ...body,
    id: body.id || `j${uid()}`,
    transferencias: body.transferencias || [{ time_id: body.time_atual, data: new Date().toISOString().slice(0, 10) }],
  };
  jogadores.push(novo);
  saveJogadores(jogadores);
  return NextResponse.json(novo, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const jogadores = getJogadores();
  const idx = jogadores.findIndex(j => j.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  jogadores[idx] = body;
  saveJogadores(jogadores);
  return NextResponse.json(body);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const jogadores = getJogadores().filter(j => j.id !== id);
  saveJogadores(jogadores);
  return NextResponse.json({ ok: true });
}
