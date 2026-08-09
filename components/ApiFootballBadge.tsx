interface Props {
  apiFootballId?: number | null;
}

export function ApiFootballBadge({ apiFootballId }: Props) {
  if (apiFootballId) {
    return (
      <span
        title={`API-Football ID: ${apiFootballId}`}
        style={{
          fontSize: '.65rem', padding: '.1rem .4rem', borderRadius: 4,
          background: 'rgba(59,130,246,.12)', color: '#60a5fa',
          border: '1px solid rgba(59,130,246,.3)', fontWeight: 700,
        }}
      >
        🔗 API #{apiFootballId}
      </span>
    );
  }
  return (
    <span
      title="Sem correspondência na API-Football"
      style={{
        fontSize: '.65rem', padding: '.1rem .4rem', borderRadius: 4,
        background: 'rgba(255,255,255,.05)', color: 'var(--text-muted)',
        border: '1px solid var(--border)',
      }}
    >
      🔌 Não vinculado
    </span>
  );
}
