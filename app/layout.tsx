import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { getTemporadas, temporadaSelecionada } from '@/lib/temporada';

export const metadata: Metadata = {
  title: 'Brasileirão Série A',
  description: 'Acompanhe o Campeonato Brasileiro Série A',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [temporadas, selecionada] = await Promise.all([getTemporadas(), temporadaSelecionada()]);
  return (
    <html lang="pt-BR">
      <body>
        <Nav temporadas={temporadas} selecionada={selecionada} />
        <main style={{ minHeight: '90vh', paddingBottom: '3rem' }}>
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '.8rem', borderTop: '1px solid var(--border)' }}>
          Brasileirão Série A · Sistema de Gestão
        </footer>
      </body>
    </html>
  );
}
