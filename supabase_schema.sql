-- Estádios
create table if not exists estadios (
  id text primary key,
  nome text not null,
  cidade text not null,
  estado text not null,
  capacidade integer
);

-- Times
create table if not exists times (
  id text primary key,
  nome text not null,
  sigla text not null,
  cor_primaria text not null,
  cor_secundaria text,
  estadio_id text references estadios(id)
);

-- Jogadores
create table if not exists jogadores (
  id text primary key,
  nome text not null,
  posicao text not null,
  numero integer,
  time_atual text references times(id),
  transferencias jsonb not null default '[]'
);

-- Partidas (armazena tudo em jsonb para manter flexibilidade)
create table if not exists partidas (
  id text primary key,
  rodada integer not null,
  data text not null,
  hora text not null,
  status text not null default 'agendada',
  time_casa_id text references times(id),
  time_visitante_id text references times(id),
  placar_casa integer not null default 0,
  placar_visitante integer not null default 0,
  estadio_id text references estadios(id),
  publico integer not null default 0,
  acrescimo_primeiro integer not null default 0,
  acrescimo_segundo integer not null default 0,
  arbitragem jsonb not null default '{}',
  escalacao_casa jsonb not null default '[]',
  escalacao_visitante jsonb not null default '[]',
  gols jsonb not null default '[]',
  cartoes jsonb not null default '[]',
  substituicoes jsonb not null default '[]'
);

-- Seed: Times 2026
insert into times (id, nome, sigla, cor_primaria, cor_secundaria) values
  ('FLA', 'Flamengo', 'FLA', '#CC0000', '#000000'),
  ('PAL', 'Palmeiras', 'PAL', '#006437', '#FFFFFF'),
  ('ATL', 'Atlético-MG', 'CAM', '#000000', '#FFFFFF'),
  ('BOT', 'Botafogo', 'BOT', '#000000', '#FFFFFF'),
  ('FLU', 'Fluminense', 'FLU', '#6B0A0A', '#228B22'),
  ('VAS', 'Vasco', 'VAS', '#000000', '#FFFFFF'),
  ('SAO', 'São Paulo', 'SPF', '#CC0000', '#FFFFFF'),
  ('COR', 'Corinthians', 'COR', '#000000', '#FFFFFF'),
  ('SAN', 'Santos', 'SAN', '#000000', '#FFFFFF'),
  ('INT', 'Internacional', 'INT', '#CC0000', '#FFFFFF'),
  ('GRE', 'Grêmio', 'GRE', '#0B3D91', '#000000'),
  ('CRU', 'Cruzeiro', 'CRU', '#0A2C6E', '#FFFFFF'),
  ('BAH', 'Bahia', 'BAH', '#0A2C6E', '#CC0000'),
  ('ATG', 'Athletico-PR', 'CAP', '#CC0000', '#000000'),
  ('RBB', 'RB Bragantino', 'RBB', '#CC0000', '#FFFFFF'),
  ('MIR', 'Mirassol', 'MIR', '#FFD700', '#000000'),
  ('CHA', 'Chapecoense', 'CHA', '#2D8C2D', '#FFFFFF'),
  ('COT', 'Coritiba', 'COT', '#006633', '#FFFFFF'),
  ('REM', 'Remo', 'REM', '#003DA5', '#FFFFFF'),
  ('FOR', 'Fortaleza', 'FOR', '#0A2C6E', '#CC0000')
on conflict (id) do nothing;

-- Seed: Estádios principais
insert into estadios (id, nome, cidade, estado, capacidade) values
  ('estadio-1', 'Maracanã', 'Rio de Janeiro', 'RJ', 78838),
  ('estadio-2', 'Allianz Parque', 'São Paulo', 'SP', 43713),
  ('estadio-3', 'Arena MRV', 'Belo Horizonte', 'MG', 46000),
  ('estadio-4', 'Arena Castelão', 'Fortaleza', 'CE', 63903),
  ('estadio-5', 'Nilton Santos', 'Rio de Janeiro', 'RJ', 46831),
  ('estadio-6', 'MorumBIS', 'São Paulo', 'SP', 72000),
  ('estadio-7', 'Neo Química Arena', 'São Paulo', 'SP', 49205),
  ('estadio-8', 'Arena do Grêmio', 'Porto Alegre', 'RS', 55000),
  ('estadio-9', 'Beira-Rio', 'Porto Alegre', 'RS', 50128),
  ('estadio-10', 'Mineirão', 'Belo Horizonte', 'MG', 61846),
  ('estadio-11', 'Vila Belmiro', 'Santos', 'SP', 16798),
  ('estadio-12', 'Arena Condá', 'Chapecó', 'SC', 22600),
  ('estadio-13', 'Couto Pereira', 'Curitiba', 'PR', 30000),
  ('estadio-14', 'Baenão', 'Belém', 'PA', 16200),
  ('estadio-15', 'Arena Mirassol', 'Mirassol', 'SP', 12000)
on conflict (id) do nothing;

-- Habilitar RLS mas com acesso público para leitura e escrita
-- (ajuste conforme necessidade de segurança futura)
alter table estadios enable row level security;
alter table times enable row level security;
alter table jogadores enable row level security;
alter table partidas enable row level security;

create policy "public read estadios" on estadios for select using (true);
create policy "public write estadios" on estadios for all using (true);

create policy "public read times" on times for select using (true);
create policy "public write times" on times for all using (true);

create policy "public read jogadores" on jogadores for select using (true);
create policy "public write jogadores" on jogadores for all using (true);

create policy "public read partidas" on partidas for select using (true);
create policy "public write partidas" on partidas for all using (true);
