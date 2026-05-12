import { NextRequest, NextResponse } from 'next/server';
import { getEstadios, upsertEstadio, deleteEstadio, uid } from '@/lib/data';

export async function GET() {
  try {
    return NextResponse.json(await getEstadios());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(await upsertEstadio({ ...body, id: body.id || `est-${uid()}` }), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    return NextResponse.json(await upsertEstadio(await req.json()));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteEstadio(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
