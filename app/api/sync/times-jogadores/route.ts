import { NextRequest, NextResponse } from 'next/server';
import { sincronizarTimes, sincronizarJogadores } from '@/lib/apiFootballSync';
import { getOrcamentoRestante } from '@/lib/apiFootball';

export async function GET() {
  try {
    return NextResponse.json(await getOrcamentoRestante());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { season, etapa } = await req.json();
    const temporada = season ?? new Date().getFullYear();

    if (etapa === 'times') {
      return NextResponse.json(await sincronizarTimes(temporada));
    }
    if (etapa === 'jogadores') {
      return NextResponse.json(await sincronizarJogadores());
    }
    return NextResponse.json({ error: "Parâmetro 'etapa' deve ser 'times' ou 'jogadores'." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
