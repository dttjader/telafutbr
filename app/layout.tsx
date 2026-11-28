import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { ImpressaoSetup } from '@/components/Impressao';
import { nomeDivisao } from '@/lib/utils';
import { getTemporadas, temporadaSelecionada, getDivisoesDaTemporada, divisaoSelecionada } from '@/lib/temporada';

export const metadata: Metadata = {
  title: 'Brasileirão Série A',
  description: 'Acompanhe o Campeonato Brasileiro Série A',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [temporadas, selecionada] = await Promise.all([getTemporadas(), temporadaSelecionada()]);
  const [divisoes, divisao] = await Promise.all([getDivisoesDaTemporada(selecionada), divisaoSelecionada(selecionada)]);
  return (
    <html lang="pt-BR">
      <body>
        <Nav temporadas={temporadas} selecionada={selecionada} divisoes={divisoes} divisao={divisao} />
        <ImpressaoSetup titulo={`Brasileirão ${nomeDivisao(divisao)} ${selecionada}`} />
        <main style={{ minHeight: '90vh', paddingBottom: '3rem' }}>
          <div className="print-only print-header">
            <strong>BRASILEIRÃO · {nomeDivisao(divisao)} · {selecionada}</strong>
            <span>Gerado em <span id="print-data" /></span>
          </div>
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '.8rem', borderTop: '1px solid var(--border)' }}>
          Brasileirão Série A · Sistema de Gestão
        </footer>
      </body>
    </html>
  );
}
