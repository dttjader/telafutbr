import { NextRequest, NextResponse } from 'next/server';
import {
  buscarFixturesH2H,
  vincularPartida,
  desvincularPartida,
  preVisualizarImportacao,
  confirmarImportacao,
} from '@/lib/apiFootballPartida';
import { getPartida } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { acao } = body;

    if (acao === 'buscar-h2h') {
      const { timeCasaApiId, timeVisitanteApiId, season } = body;
      const candidatos = await buscarFixturesH2H(timeCasaApiId, timeVisitanteApiId, season);
      return NextResponse.json({ candidatos });
    }

    if (acao === 'vincular') {
      const { partidaId, fixtureId } = body;
      await vincularPartida(partidaId, fixtureId);
      return NextResponse.json({ ok: true });
    }

    if (acao === 'desvincular') {
      const { partidaId } = body;
      await desvincularPartida(partidaId);
      return NextResponse.json({ ok: true });
    }

    if (acao === 'pre-importar') {
      const { partidaId } = body;
      const partida = await getPartida(partidaId);
      if (!partida) return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 });
      const preview = await preVisualizarImportacao(partida);
      return NextResponse.json({ preview });
    }

    if (acao === 'confirmar-importar') {
      const { partidaId, preview } = body;
      const partida = await getPartida(partidaId);
      if (!partida) return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 });
      const atualizada = await confirmarImportacao(partida, preview);
      return NextResponse.json({ partida: atualizada });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
