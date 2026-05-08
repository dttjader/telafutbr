import { NextRequest, NextResponse } from 'next/server';
import { getPartidas, savePartidas, uid } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getPartidas());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const partidas = getPartidas();
  const nova: typeof partidas[0] = {
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
  partidas.push(nova);
  savePartidas(partidas);
  return NextResponse.json(nova, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const partidas = getPartidas();
  const idx = partidas.findIndex(p => p.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  partidas[idx] = { ...partidas[idx], ...body };
  savePartidas(partidas);
  return NextResponse.json(partidas[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  savePartidas(getPartidas().filter(p => p.id !== id));
  return NextResponse.json({ ok: true });
}
