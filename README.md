# ⚽ Brasileirão — Projeto de Resultados

Site de acompanhamento do Campeonato Brasileiro Série A, feito em **Next.js (App Router)**, com dados
persistidos no **Supabase** (Postgres). Publicado no Vercel.

> ℹ️ Este projeto já teve uma versão anterior baseada em um único arquivo `campeonato.json` editado
> manualmente. Essa arquitetura foi **descontinuada**. Os arquivos e o README daquela época foram
> preservados em [`docs/legado/`](./docs/legado/README.md) apenas como referência histórica — não
> refletem o funcionamento atual do site.

---

## 🚀 Deploy no Vercel

1. Suba o projeto para um repositório GitHub.
2. Configure as variáveis de ambiente (veja [Variáveis de ambiente](#-variáveis-de-ambiente) abaixo)
   no painel do projeto na Vercel.
3. Acesse [vercel.com](https://vercel.com) → **Add New Project** → importe o repo.
4. O Vercel detecta Next.js automaticamente.
5. Clique em **Deploy** — pronto!

A cada push no repositório, o Vercel faz novo deploy automaticamente.

---

## 🗄️ Banco de dados (Supabase)

Todo o conteúdo do site — estádios, times, jogadores, técnicos, partidas, gols, cartões, escalações,
configurações de zonas de classificação — é armazenado no Supabase.

- **Schema**: veja [`supabase_schema.sql`](./supabase_schema.sql). Rode esse script no SQL Editor do
  seu projeto Supabase para criar as tabelas e o seed inicial de times/estádios.
- **Acesso aos dados**:
  - `lib/supabase.ts` / `lib/data.ts` — funções server-side (Server Components e Route Handlers).
  - `lib/client.ts` — funções client-side (`'use client'`, usadas nas telas de admin).
- **Tabelas principais**: `estadios`, `times`, `jogadores`, `tecnicos`, `partidas`, `configuracoes`.
  Eventos de partida (gols, cartões, substituições, escalações, stats Opta) ficam em colunas `jsonb`
  dentro de `partidas`, para manter flexibilidade sem migrations constantes.

### Variáveis de ambiente

Crie um `.env.local` (nunca commitado) com:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
API_FOOTBALL_KEY=...   # opcional — só necessário para as telas /admin/sync e importação de partidas
```

---

## 🔄 Fluxo de atualização de dados

Diferente da versão antiga (edição manual de JSON + git push), hoje os dados são gerenciados pelas
telas de **admin**, que gravam direto no Supabase:

```
/admin/estadios   → cadastro de estádios
/admin/jogadores  → cadastro de jogadores e transferências
/admin/tecnicos   → cadastro de técnicos e histórico de vínculos
/admin/partidas   → cadastro de partidas (rodada, times, estádio, arbitragem, técnicos)
/admin/partida/[id] → eventos da partida: escalação, gols, cartões, substituições, stats
/admin/config     → vagas de Libertadores/Sul-Americana/Rebaixamento e vagas diretas por título
/admin/sync       → sincronização opcional com a API-Football (vínculo de times/jogadores/partidas)
```

Não há mais "um único arquivo para editar" — a fonte de verdade é o banco.

---

## 💻 Rodando localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## 📂 Estrutura do Projeto

```
app/
├── page.tsx                      # Rodadas
├── tabela/                       # Classificação (com config de zonas)
├── confrontos/                   # Confrontos diretos
├── resumo/                       # Painel condensado (não está no menu público)
├── partida/[id]/                 # Detalhes de uma partida
├── dados/                        # Estatísticas: artilharia, gols, goleiros, cartões, analítico, times, árbitros
├── admin/                        # Telas de cadastro/gestão (estádios, jogadores, técnicos, partidas, config, sync)
└── api/                          # Route Handlers usados pelas telas server-side / integrações

components/                       # Componentes compartilhados (Nav, EscudoTime, CardPartida, etc.)

lib/
├── supabase.ts                   # Client Supabase (server)
├── client.ts                     # Client Supabase (client components)
├── data.ts                       # Funções de leitura/escrita + cálculos agregados (server-safe)
├── config.ts                     # Configuração de zonas de classificação (Libertadores/Sula/Rebaixamento)
├── utils.ts                      # Utilitários puros, seguros para Client Components
├── types.ts                      # Tipos TypeScript compartilhados
├── apiFootball*.ts               # Integração opcional com a API-Football

docs/legado/                      # Documentação e dados da arquitetura antiga (histórico, não usado)
supabase_schema.sql               # Schema + seed inicial do banco
```

---

## 🧩 Convenções internas

- **Zona de classificação**: a única fonte de verdade é `lib/config.ts` (`zonaClassificacao`), que
  recebe a configuração salva em `/admin/config` (vagas por tabela + vagas diretas por título). Não
  existem mais versões alternativas dessa função espalhadas pelo código.
- **Formatação de data**: `formatDate` vive em `lib/utils.ts` (seguro para uso em Client Components).
  `lib/data.ts` reexporta a mesma função para não quebrar imports server-side existentes.
