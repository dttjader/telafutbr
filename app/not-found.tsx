import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--verde)', marginBottom: '.5rem' }}>404</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Página não encontrada.</p>
      <Link href="/" className="btn btn-primary">← Voltar ao início</Link>
    </div>
  );
}
