import { NextRequest, NextResponse } from 'next/server';
import { getJogadores, upsertJogador, deleteJogador, uid } from '@/lib/data';

export async function GET() {
  try {
    const data = await getJogadores();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const novo = {
      ...body,
      id: body.id || `j${uid()}`,
      transferencias: body.transferencias || [{ time_id: body.time_atual, data: new Date().toISOString().slice(0, 10) }],
    };
    const data = await upsertJogador(novo);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await upsertJogador(body);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteJogador(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
