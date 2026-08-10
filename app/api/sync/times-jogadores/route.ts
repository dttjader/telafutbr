import { NextRequest, NextResponse } from 'next/server';
import { sincronizarTimes, sincronizarJogadores, descobrirLigasBrasil } from '@/lib/apiFootballSync';
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
    const body = await req.json();
    const { etapa } = body;

    if (etapa === 'descobrir-ligas') {
      return NextResponse.json({ ligas: await descobrirLigasBrasil() });
    }

    if (etapa === 'times') {
      const temporadas: number[] = Array.isArray(body.temporadas) && body.temporadas.length > 0
        ? body.temporadas
        : [new Date().getFullYear()];
      const ligasExtras: number[] = Array.isArray(body.ligasExtras) ? body.ligasExtras : [];
      return NextResponse.json(await sincronizarTimes(temporadas, ligasExtras));
    }

    if (etapa === 'jogadores') {
      return NextResponse.json(await sincronizarJogadores());
    }

    return NextResponse.json({ error: "Parâmetro 'etapa' deve ser 'times', 'jogadores' ou 'descobrir-ligas'." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
