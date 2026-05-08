import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Brasileirão Série A',
  description: 'Acompanhe o Campeonato Brasileiro Série A',
  openGraph: {
    title: 'Brasileirão Série A',
    description: 'Resultados, tabela e estatísticas do Campeonato Brasileiro',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <main style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
          {children}
        </main>
        <footer style={{
          background: '#111',
          borderTop: '1px solid #222',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.8rem',
          fontFamily: 'Barlow, sans-serif',
        }}>
          <p>Campeonato Brasileiro Série A · Atualizado via arquivos JSON</p>
        </footer>
      </body>
    </html>
  );
}
