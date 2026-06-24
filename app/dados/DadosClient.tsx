"use client";

import React from "react";

interface Props {
  time: {
    nome: string;
    escudo?: string;
    fundacao?: string;
    apelido?: string;
    estadio?: string;
  };
  tecnicos?: {
    nome: string;
    inicio: string;
    fim?: string;
    vitorias: number;
    empates: number;
    derrotas: number;
  }[];
  placares?: {
    mandante: string;
    visitante: string;
    golsMandante: number;
    golsVisitante: number;
    data: string;
  }[];
  estadios?: {
    nome: string;
    cidade: string;
    capacidade: number;
    jogos: number;
  }[];
  rankingCidade?: {
    nome: string;
    estado: string;
    gols: number;
    jogos: number;
    media: number;
  }[];
}

export default function DadosClient({
  time,
  tecnicos = [],
  placares = [],
  estadios = [],
  rankingCidade = [],
}: Props) {
  const maxCidade = rankingCidade[0]?.media ?? 1;

  const totalJogosTecnicos = tecnicos.reduce(
    (acc, t) => acc + t.vitorias + t.empates + t.derrotas,
    0
  );

  return (
    <div className="space-y-6 p-4">
      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-center gap-4">
          {time.escudo && (
            <img
              src={time.escudo}
              alt={time.nome}
              className="h-16 w-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{time.nome}</h1>
            {time.apelido && (
              <p className="text-sm text-gray-600">{time.apelido}</p>
            )}
            {time.fundacao && (
              <p className="text-sm text-gray-600">
                Fundação: {time.fundacao}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Técnicos
            </h2>
            {tecnicos.length === 0 ? (
              <p className="text-gray-600">Nenhum técnico registrado.</p>
            ) : (
              <div className="space-y-4">
                {tecnicos.map((tecnico, index) => {
                  const jogos =
                    tecnico.vitorias + tecnico.empates + tecnico.derrotas;
                  const aproveitamento =
                    jogos > 0
                      ? ((tecnico.vitorias * 3 + tecnico.empates) / (jogos * 3)) *
                        100
                      : 0;

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                          {tecnico.nome}
                        </h3>
                        <span className="text-sm text-gray-600">
                          {tecnico.inicio} {tecnico.fim && `– ${tecnico.fim}`}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-sm">
                        <div className="rounded bg-green-100 p-2">
                          <p className="font-bold text-green-700">
                            {tecnico.vitorias}
                          </p>
                          <p className="text-xs text-green-600">Vitórias</p>
                        </div>
                        <div className="rounded bg-yellow-100 p-2">
                          <p className="font-bold text-yellow-700">
                            {tecnico.empates}
                          </p>
                          <p className="text-xs text-yellow-600">Empates</p>
                        </div>
                        <div className="rounded bg-red-100 p-2">
                          <p className="font-bold text-red-700">
                            {tecnico.derrotas}
                          </p>
                          <p className="text-xs text-red-600">Derrotas</p>
                        </div>
                        <div className="rounded bg-blue-100 p-2">
                          <p className="font-bold text-blue-700">
                            {aproveitamento.toFixed(1)}%
                          </p>
                          <p className="text-xs text-blue-600">Aprov.</p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Total de jogos: {jogos}
                      </p>
                    </div>
                  );
                })}
                <p className="text-sm text-gray-600">
                  Total de jogos dos técnicos: {totalJogosTecnicos}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Últimos Placares
            </h2>
            {placares.length === 0 ? (
              <p className="text-gray-600">Nenhum placar registrado.</p>
            ) : (
              <div className="space-y-3">
                {placares.map((placar, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex-1 text-right">
                      <p className="font-medium text-gray-900">
                        {placar.mandante}
                      </p>
                    </div>
                    <div className="mx-4 rounded-lg bg-gray-100 px-4 py-2">
                      <p className="font-bold text-gray-900">
                        {placar.golsMandante} x {placar.golsVisitante}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {placar.visitante}
                      </p>
                    </div>
                    <div className="ml-4 text-sm text-gray-600">
                      {placar.data}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Estádios
            </h2>
            {estadios.length === 0 ? (
              <p className="text-gray-600">Nenhum estádio registrado.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {estadios.map((estadio, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <h3 className="font-medium text-gray-900">
                      {estadio.nome}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Cidade: {estadio.cidade}
                    </p>
                    <p className="text-sm text-gray-600">
                      Capacidade: {estadio.capacidade.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm text-gray-600">
                      Jogos: {estadio.jogos}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {time.estadio && (
              <p className="mt-4 text-sm text-gray-600">
                Estádio principal: {time.estadio}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Cidade
            </h2>
            {rankingCidade.length === 0 ? (
              <p className="text-gray-600">Nenhuma cidade registrada.</p>
            ) : (
              <div className="space-y-3">
                {rankingCidade.map((cidade, index) => {
                  const percentual =
                    maxCidade > 0 ? (cidade.media / maxCidade) * 100 : 0;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {index + 1}. {cidade.nome}
                        </span>
                        <span className="text-gray-600">
                          {cidade.media.toFixed(2)} gols/jogo
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {cidade.gols} gols em {cidade.jogos} jogos
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Estado
            </h2>
            {rankingCidade.length === 0 ? (
              <p className="text-gray-600">Nenhum estado registrado.</p>
            ) : (
              <div className="space-y-3">
                {Array.from(
                  new Map(
                    rankingCidade.map((c) => [c.estado, c])
                  ).values()
                ).map((cidade, index) => {
                  const percentual =
                    maxCidade > 0 ? (cidade.media / maxCidade) * 100 : 0;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {index + 1}. {cidade.estado}
                        </span>
                        <span className="text-gray-600">
                          {cidade.media.toFixed(2)} gols/jogo
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-green-600 transition-all"
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {cidade.gols} gols em {cidade.jogos} jogos
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
