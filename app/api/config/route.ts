import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';

// Sem parâmetros, vale a temporada/divisão selecionadas no site (cookies).
function params(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const t = sp.get('temporada'), d = sp.get('divisao');
  return { temporada: t ? Number(t) : undefined, divisao: d ? Number(d) : undefined };
}

export async function GET(req: NextRequest) {
  try {
    const { temporada, divisao } = params(req);
    return NextResponse.json(await getConfig(temporada, divisao));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { temporada, divisao } = params(req);
    const body = await req.json();
    await saveConfig(body, temporada, divisao);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
