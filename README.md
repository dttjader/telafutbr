# ⚽ Brasileirão — Projeto de Resultados

Site de acompanhamento do Campeonato Brasileiro, publicado no Vercel, com **atualização via arquivos JSON**.

## 🚀 Deploy no Vercel

1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → **Add New Project** → importe o repo
3. O Vercel detecta Next.js automaticamente
4. Clique em **Deploy** — pronto!

A cada push no repositório, o Vercel faz novo deploy automaticamente.

---

## 📁 Como atualizar os dados

Todo o conteúdo do site vem de **um único arquivo**:

```
src/data/campeonato.json
```

Edite esse arquivo e faça push para o GitHub — o Vercel deploya automaticamente.

---

## 📋 Estrutura do JSON

### Cabeçalho

```json
{
  "campeonato": {
    "nome": "Campeonato Brasileiro Série A",
    "edicao": "2024",
    "organizador": "CBF"
  }
}
```

---

### Times

```json
"times": [
  {
    "id": "FLA",           // ID único — usado em todo o arquivo
    "nome": "Flamengo",
    "sigla": "FLA",        // Abreviação (3 letras) exibida nos escudos
    "cor_primaria": "#FF0000",
    "cor_secundaria": "#000000",
    "escudo": "/escudos/flamengo.png",  // Opcional
    "estadio": "Maracanã"
  }
]
```

---

### Rodadas e Partidas

```json
"rodadas": [
  {
    "numero": 19,
    "status": "encerrada",   // "futura" | "em_andamento" | "encerrada"
    "partidas": [ ... ]
  }
]
```

#### Estrutura de uma Partida

```json
{
  "id": "2024-19-001",           // ID único da partida
  "rodada": 19,
  "data": "2024-08-10",          // AAAA-MM-DD
  "hora": "16:00",
  "status": "encerrada",         // "agendada" | "ao_vivo" | "encerrada" | "adiada"
  "time_casa": "FLA",            // ID do time (deve existir em "times")
  "time_visitante": "PAL",
  "placar_casa": 2,
  "placar_visitante": 1,
  "estadio": "Maracanã",
  "cidade": "Rio de Janeiro",
  "publico": 68420,
  "arbitragem": {
    "principal": "Anderson Daronco",
    "assistente1": "Bruno Raphael Pires",
    "assistente2": "Fabricio Vilarinho da Silva",
    "quarto": "Rodrigo Guarizo Ferreira",
    "var": "Rodrigo Nunes de Sá"
  },
  "escalacao_casa": { ... },
  "escalacao_visitante": { ... },
  "gols": [ ... ],
  "cartoes": [ ... ],
  "substituicoes": [ ... ]
}
```

#### Escalação

```json
"escalacao_casa": {
  "formacao": "4-2-3-1",
  "titulares": [
    { "numero": 1, "nome": "Rossi", "posicao": "GOL" },
    { "numero": 4, "nome": "Fabrício Bruno", "posicao": "ZAG" }
  ],
  "reservas": [
    { "numero": 23, "nome": "Matheus Cunha", "posicao": "MEI" }
  ]
}
```

Posições aceitas: `GOL` | `ZAG` | `LAT` | `VOL` | `MEI` | `ATA`

#### Gols

```json
"gols": [
  {
    "id": "g001",                      // ID único
    "minuto": 23,
    "acrescimo": 0,                    // Minutos de acréscimo (0 se não houver)
    "time": "FLA",                     // Quem marcou
    "jogador": "Pedro",
    "assistencia": "Arrascaeta",       // null se não houver
    "tipo": "normal",                  // "normal" | "penalti" | "falta" | "contra"
    "goleiro_adversario": "Weverton",  // Goleiro que levou o gol
    "descricao": "Cabeceio após cruzamento..."
  }
]
```

#### Cartões

```json
"cartoes": [
  {
    "minuto": 34,
    "tipo": "amarelo",          // "amarelo" | "vermelho"
    "jogador": "Erick Pulgar",
    "time": "FLA",
    "motivo": "Falta tática"
  }
]
```

#### Substituições

```json
"substituicoes": [
  {
    "minuto": 60,
    "time": "FLA",
    "sai": "Luiz Araújo",
    "entra": "Nicolás De La Cruz"
  }
]
```

---

### Tabela de Classificação

```json
"tabela": [
  {
    "posicao": 1,
    "time": "BOT",
    "pontos": 38,
    "jogos": 19,
    "vitorias": 11,
    "empates": 5,
    "derrotas": 3,
    "gols_pro": 30,
    "gols_contra": 17,
    "saldo": 13
  }
]
```

As posições de classificação são coloridas automaticamente:
- 🟢 1º–4º → Libertadores
- 🔵 5º–6º → Sul-Americana
- 🔴 18º–20º → Rebaixamento

---

## 🔄 Fluxo de Atualização

```
Atualiza campeonato.json → git commit & push → Vercel deploya → Site atualizado
```

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
src/
├── app/
│   ├── page.tsx              # Página de rodadas
│   ├── tabela/page.tsx       # Tabela de classificação
│   ├── artilharia/page.tsx   # Artilharia
│   └── partida/[id]/page.tsx # Detalhes de partida
├── components/
│   ├── Header.tsx
│   ├── CardPartida.tsx
│   └── EscudoTime.tsx
├── data/
│   └── campeonato.json       # ← ÚNICO ARQUIVO PARA ATUALIZAR
└── lib/
    ├── types.ts              # Tipos TypeScript
    └── data.ts               # Funções de acesso aos dados
```
