import { NextRequest, NextResponse } from 'next/server';
import { getPartidas, upsertPartida, deletePartida, uid } from '@/lib/data';

export async function GET() {
  try {
    const data = await getPartidas();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nova = {
      id: `p${uid()}`,
      rodada: body.rodada,
      data: body.data,
      hora: body.hora,
      status: body.status || 'agendada',
      time_casa_id: body.time_casa_id,
      time_visitante_id: body.time_visitante_id,
      placar_casa: body.placar_casa ?? 0,
      placar_visitante: body.placar_visitante ?? 0,
      estadio_id: body.estadio_id,
      publico: body.publico ?? 0,
      acrescimo_primeiro: body.acrescimo_primeiro ?? 0,
      acrescimo_segundo: body.acrescimo_segundo ?? 0,
      arbitragem: body.arbitragem ?? { principal: '', assistente1: '', assistente2: '', quarto: '', var: '' },
      escalacao_casa: [],
      escalacao_visitante: [],
      gols: [],
      cartoes: [],
      substituicoes: [],
    };
    const data = await upsertPartida(nova as any);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await upsertPartida(body);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deletePartida(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
