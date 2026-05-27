import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Brasileirão Série A 2026',
  description: 'Acompanhe o Campeonato Brasileiro Série A 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Nav />
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
