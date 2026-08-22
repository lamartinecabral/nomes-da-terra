import React, { useState, useEffect, useMemo } from "react";

import {
  Search,
  MapPin,
  TrendingUp,
  Users,
  Award,
  BookOpen,
  Sparkles,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  HelpCircle,
  GitBranch,
  ExternalLink,
} from "lucide-react";

import {
  queryLocalidades,
  queryNationWideDetails,
  queryStateRanking,
  querySurname,
} from "./query.mjs";

import { NationwideMap } from "./NationwideMap.tsx";

type Localidade = {
  cod?: number;
  uf: string;
  nome: string;
  pop_local: number;
  regiao: string;
};

export type Frequencia = {
  sobrenome: string;
  localidade?: number;
  uf: string;
  frequencia: number;
  quociente_locacional: number;
  origem?: string;
};

const RANKING_PAGE_SIZE = 30;

const REGIOES_POR_UF: Record<string, string> = {
  AC: "Norte",
  AL: "Nordeste",
  AP: "Norte",
  AM: "Norte",
  BA: "Nordeste",
  CE: "Nordeste",
  DF: "Centro-Oeste",
  ES: "Sudeste",
  GO: "Centro-Oeste",
  MA: "Nordeste",
  MT: "Centro-Oeste",
  MS: "Centro-Oeste",
  MG: "Sudeste",
  PA: "Norte",
  PB: "Nordeste",
  PR: "Sul",
  PE: "Nordeste",
  PI: "Nordeste",
  RJ: "Sudeste",
  RN: "Nordeste",
  RS: "Sul",
  RO: "Norte",
  RR: "Norte",
  SC: "Sul",
  SP: "Sudeste",
  SE: "Nordeste",
  TO: "Norte",
};

const format = (val: unknown, fractionDigits?: number) => {
  if (typeof val === "number") {
    if (fractionDigits === undefined) return val.toLocaleString("pt-BR");
    return val.toLocaleString("pt-BR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }
  return String(val);
};

const ibgeSurnameUrl = (surname: string) =>
  `https://censo2022.ibge.gov.br/nomes/nome/${encodeURIComponent(
    surname.toLocaleLowerCase("pt-BR"),
  )}?tipo=sobrenome&localidade=0`;

const storage = {
  uf: {
    load: () => localStorage.getItem("selectedUf") || "CE",
    save: (uf: string) => localStorage.setItem("selectedUf", uf),
  },
  page: {
    load: () => Number(localStorage.getItem("selectedPage") || "0"),
    save: (page: number) => localStorage.setItem("selectedPage", String(page)),
  },
};

export default function App() {
  const [selectedUf, setSelectedUf] = useState(() => storage.uf.load());
  const [rankingPage, setRankingPage] = useState(() => storage.page.load());
  const [totalStateFrequencies, setTotalStateFrequencies] = useState(0);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [stateFrequencies, setStateFrequencies] = useState<Frequencia[]>([]);
  const [nationwideFrequencies, setNationwideFrequencies] = useState<
    Frequencia[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNationwide, setIsLoadingNationwide] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [expandedSurname, setExpandedSurname] = useState<string | null>(null);
  const [detailSource, setDetailSource] = useState<"ranking" | "search" | null>(
    null,
  );
  const [surnameQuery, setSurnameQuery] = useState("");
  const [surnameSearchError, setSurnameSearchError] = useState<string | null>(
    null,
  );
  const [isSearchingSurname, setIsSearchingSurname] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("Todas");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [topTypicalSurname, setTopTypicalSurname] = useState<
    (Frequencia & { percentLocal: string }) | null
  >(null);

  useEffect(() => {
    let isCurrent = true;

    const loadLocalidades = async () => {
      const { data, error } = await queryLocalidades();

      if (!isCurrent) return;
      if (error) {
        setDataError(error.message);
        setIsLoading(false);
        return;
      }

      setLocalidades(
        (data ?? []).map((localidade) => ({
          ...localidade,
          regiao: REGIOES_POR_UF[localidade.uf] ?? "Não informada",
        })),
      );
    };

    void loadLocalidades();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const localidade = localidades.find((item) => item.uf === selectedUf);
    if (localidade?.cod === undefined) return;
    const localidadeCod = localidade.cod;

    let isCurrent = true;
    setIsLoading(true);
    setDataError(null);

    const loadStateRanking = async () => {
      const { data, error, count } = await queryStateRanking(
        localidadeCod,
        rankingPage,
        RANKING_PAGE_SIZE,
      );

      if (!isCurrent) return;
      if (error) {
        setDataError(error.message);
      } else {
        setTotalStateFrequencies(count ?? 0);
        setStateFrequencies(
          (data ?? []).map((item) => ({
            sobrenome: item.nome,
            localidade: item.localidade,
            uf: localidade.uf,
            frequencia: item.frequencia,
            quociente_locacional: item.quociente_locacional,
          })),
        );
      }
      setIsLoading(false);
    };

    void loadStateRanking();
    return () => {
      isCurrent = false;
    };
  }, [localidades, rankingPage, selectedUf]);

  useEffect(() => {
    if (!expandedSurname) {
      setNationwideFrequencies([]);
      return;
    }

    let isCurrent = true;
    setIsLoadingNationwide(true);

    const loadNationwideDetails = async () => {
      const { data, error } = await queryNationWideDetails(expandedSurname);

      if (!isCurrent) return;
      if (error) {
        setDataError(error.message);
      } else {
        const localidadesPorCodigo = new Map(
          localidades.flatMap((item) =>
            item.cod ? [[item.cod, item] as const] : [],
          ),
        );
        setNationwideFrequencies(
          (data ?? []).flatMap((item) => {
            const localidade = localidadesPorCodigo.get(item.localidade);
            return localidade
              ? [
                  {
                    sobrenome: item.nome,
                    localidade: item.localidade,
                    uf: localidade.uf,
                    frequencia: item.frequencia,
                    quociente_locacional: item.quociente_locacional,
                  },
                ]
              : [];
          }),
        );
      }
      setIsLoadingNationwide(false);
    };

    void loadNationwideDetails();
    return () => {
      isCurrent = false;
    };
  }, [expandedSurname, localidades]);

  const populacaoBrasil = useMemo(() => {
    return localidades.reduce((acc, curr) => acc + curr.pop_local, 0);
  }, [localidades]);

  /* Current State metadata */
  const currentStateInfo = useMemo(() => {
    return localidades.find((l) => l.uf === selectedUf) || localidades[0];
  }, [localidades, selectedUf]);

  /* Filtered list of UFs for header quick selection */
  const filteredStates = useMemo(() => {
    if (selectedRegion === "Todas") return localidades;
    return localidades.filter((l) => l.regiao === selectedRegion);
  }, [localidades, selectedRegion]);

  /* Ranking table calculation for selected UF */
  const stateRanking = useMemo(() => {
    let list = stateFrequencies;

    return list.map((item, index) => ({
      ...item,
      rank: rankingPage * RANKING_PAGE_SIZE + index + 1,
      percentLocal: currentStateInfo
        ? ((item.frequencia / currentStateInfo.pop_local) * 100).toFixed(3)
        : "0.000",
    }));
  }, [stateFrequencies, currentStateInfo]);

  const totalRankingPages = Math.ceil(
    totalStateFrequencies / RANKING_PAGE_SIZE,
  );

  /* Top typical surname stats for dashboard highlight */
  useEffect(() => {
    if (!currentStateInfo?.cod) return;
    queryStateRanking(currentStateInfo.cod, 0, 1).then(({ data, error }) => {
      if (error) {
        setTopTypicalSurname(null);
        return;
      }
      setTopTypicalSurname({
        frequencia: data[0].frequencia,
        uf: currentStateInfo.uf,
        sobrenome: data[0].nome,
        quociente_locacional: data[0].quociente_locacional,
        percentLocal: currentStateInfo
          ? ((data[0].frequencia / currentStateInfo.pop_local) * 100).toFixed(3)
          : "0.000",
      });
    });
  }, [currentStateInfo]);

  /* Selecting a ranking row opens the shared surname search section. */
  const openSurnameSearchDetails = (sobrenome: string) => {
    setSurnameQuery(sobrenome);
    setSurnameSearchError(null);
    setExpandedSurname(sobrenome);
    setDetailSource("search");

    requestAnimationFrame(() => {
      document
        .getElementById("surname-search-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const searchSurname = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = surnameQuery.trim();

    if (!query) return;

    setIsSearchingSurname(true);
    setSurnameSearchError(null);

    const { data, error } = await querySurname(query);

    if (error) {
      setSurnameSearchError("Não foi possível pesquisar este sobrenome.");
    } else if (!data?.[0]) {
      setSurnameSearchError("Sobrenome não encontrado na base disponível.");
    } else {
      setExpandedSurname(data[0].nome);
      setDetailSource("search");
      setSurnameQuery(data[0].nome);
    }

    setIsSearchingSurname(false);
  };

  const selectUf = (uf: string) => {
    setSelectedUf(uf);
    storage.uf.save(uf);
    setRankingPage(0);
    storage.page.save(0);
    setExpandedSurname(null);
    setDetailSource(null);
  };

  const selectNationwideUf = (uf: string) => {
    setSelectedUf(uf);
    storage.uf.save(uf);
    setRankingPage(0);
    storage.page.save(0);
  };

  const renderNationwideDetails = (sobrenome: string) => {
    const allStateData = nationwideFrequencies
      .map((item) => {
        const stateLoc = localidades.find((l) => l.uf === item.uf);
        return {
          ...item,
          nomeEstado: stateLoc ? stateLoc.nome : item.uf,
          popEstado: stateLoc ? stateLoc.pop_local : 1,
          percentState: (
            (item.frequencia / (stateLoc ? stateLoc.pop_local : 1)) *
            100
          ).toFixed(3),
        };
      })
      .sort((a, b) => b.quociente_locacional - a.quociente_locacional);

    if (isLoadingNationwide) {
      return (
        <div className="p-6 text-center text-sm text-slate-500">
          Carregando distribuição nacional...
        </div>
      );
    }

    if (allStateData.length === 0) {
      return (
        <div className="p-6 text-center text-sm text-slate-500">
          Não há dados nacionais disponíveis para este sobrenome.
        </div>
      );
    }

    const totalBrasilCount = allStateData.reduce((a, b) => a + b.frequencia, 0);
    const statePresenceCount = allStateData.filter(
      (d) => d.frequencia > 0,
    ).length;
    const top5States = allStateData.slice(0, 5);
    const maxQl = Math.max(...allStateData.map((d) => d.quociente_locacional));

    return (
      <div className="bg-slate-50 border-t-2 border-amber-400 p-4 md:p-6 rounded-b-lg space-y-6 animate-fadeIn">
        {/* Detail Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800">
                {sobrenome}
              </span>
              <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-300">
                Panorama Nacional
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              Presente em{" "}
              {statePresenceCount === 27 ? "todos os 27" : statePresenceCount}{" "}
              {statePresenceCount === 1 ? "estado" : "estados"}. Total estimado
              no Brasil:{" "}
              <strong className="text-slate-900">
                {format(totalBrasilCount)}
              </strong>{" "}
              pessoas.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs md:text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
              <span className="block text-slate-500 text-[10px] uppercase tracking-wider">
                Estado com Maior QL
              </span>
              <strong className="text-blue-900 text-base">
                {top5States[0]?.uf} (
                {format(top5States[0]?.quociente_locacional)}x)
              </strong>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
              <span className="block text-slate-500 text-[10px] uppercase tracking-wider">
                Média Nacional
              </span>
              <strong className="text-emerald-900 text-base">
                {format((totalBrasilCount / populacaoBrasil) * 100, 3)}%
              </strong>
            </div>
          </div>
        </div>

        {/* QL Choropleth Map */}
        <div>
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
            <MapPin className="h-4 w-4 text-blue-800" />
            Quociente Locacional por estado
          </h4>
          <p className="mb-3 text-xs text-slate-500">
            Passe o mouse sobre um estado para ver o QL. O estado selecionado
            aparece com contorno escuro.
          </p>
          <NationwideMap
            states={allStateData}
            selectedUf={selectedUf}
            onStateClick={selectNationwideUf}
          />
        </div>

        {/* Top Concentrated States Bar Visual */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-800" />
            Top 5 Estados com maior Quociente Locacional para "{sobrenome}"
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {top5States.map((st) => {
              const isCurrent = st.uf === selectedUf;
              const barHeightPct = Math.min(
                100,
                Math.max(15, (st.quociente_locacional / maxQl) * 100),
              );
              return (
                <div
                  key={st.uf}
                  className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-amber-400 ring-offset-1"
                      : "bg-white border-slate-200 hover:border-blue-300 text-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${isCurrent ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"}`}
                    >
                      {st.uf}
                    </span>
                    <span
                      className={`text-xs font-semibold ${isCurrent ? "text-amber-300" : "text-blue-800"}`}
                    >
                      {format(st.quociente_locacional)}x
                    </span>
                  </div>

                  <div className="my-2">
                    <div className="text-sm font-bold truncate">
                      {st.nomeEstado}
                    </div>
                    <div
                      className={`text-[11px] ${isCurrent ? "text-blue-200" : "text-slate-500"}`}
                    >
                      {format(st.frequencia)} pessoas (
                      {format(+st.percentState)}%)
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${isCurrent ? "bg-amber-400" : "bg-blue-800"}`}
                      style={{ width: `${barHeightPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete State Table View */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-800" />
              Distribuição Completa pelas 27 Unidades da Federação
            </h4>
            <span className="text-[11px] text-slate-500">
              Ordenado por Quociente Locacional
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-inner">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Pessoas</th>
                  <th className="px-3 py-2 text-right">% Pop. Local</th>
                  <th className="px-3 py-2 text-right">
                    Quociente Locacional (QL)
                  </th>
                  <th className="px-3 py-2">Classificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {allStateData.map((st) => {
                  const isSelected = st.uf === selectedUf;
                  let badgeColor = "bg-slate-100 text-slate-600";
                  let qlText = "Típico";

                  if (st.quociente_locacional >= 4.0) {
                    badgeColor =
                      "bg-amber-100 text-amber-900 border border-amber-300 font-bold";
                    qlText = "Extremamente Típico";
                  } else if (st.quociente_locacional >= 2.0) {
                    badgeColor =
                      "bg-blue-100 text-blue-900 border border-blue-200 font-semibold";
                    qlText = "Muito Típico";
                  } else if (st.quociente_locacional >= 1.2) {
                    badgeColor = "bg-emerald-50 text-emerald-800";
                    qlText = "Acima da Média";
                  } else if (st.quociente_locacional < 0.8) {
                    badgeColor = "bg-slate-100 text-slate-400";
                    qlText = "Sub-representado";
                  }

                  return (
                    <tr
                      key={st.uf}
                      className={`hover:bg-blue-50/50 ${isSelected ? "bg-amber-50 font-medium" : ""}`}
                    >
                      <td className="px-3 py-2 flex items-center gap-2">
                        <span
                          className={`w-6 text-center font-bold px-1 rounded text-[10px] ${isSelected ? "bg-blue-900 text-white" : "bg-slate-200 text-slate-700"}`}
                        >
                          {st.uf}
                        </span>
                        <span>{st.nomeEstado}</span>
                        {isSelected && (
                          <span className="text-[10px] text-amber-700 font-semibold">
                            (Estado Selecionado)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {format(st.frequencia)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {format(+st.percentState)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                        {format(st.quociente_locacional)}x
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${badgeColor}`}
                        >
                          {qlText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !currentStateInfo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm text-slate-600">
        Carregando dados do Censo...
      </div>
    );
  }

  if (dataError && !currentStateInfo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-center text-sm text-red-700">
        Não foi possível carregar os dados: {dataError}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased">
      {/* Official IBGE-Style Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b-4 border-amber-400 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* IBGE Nomes Branding Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-400 rounded-lg flex items-center justify-center font-black text-slate-950 text-xl md:text-2xl shadow-md tracking-tighter">
                IBGE
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                    Censo Demográfico 2022
                  </span>
                  <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full border border-blue-700">
                    Módulo Sobrenomes
                  </span>
                </div>
                <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight">
                  As famílias típicas de cada estado
                </h1>
              </div>
            </div>

            {/* Header Action / Info Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInfoModal(true)}
                className="flex items-center gap-2 bg-blue-900/80 hover:bg-blue-800 text-amber-300 border border-blue-700/80 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shadow-sm"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>O que é Quociente Locacional?</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* State Selector & Region Filters Bar */}
        <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-800" />
                Selecione a Unidade da Federação
              </h2>
              <p className="text-xs text-slate-500">
                Explore os sobrenomes com maior concentração comparativa em
                relação à média brasileira.
              </p>
            </div>

            {/* Region Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">
                Região:
              </span>
              {[
                "Todas",
                "Norte",
                "Nordeste",
                "Centro-Oeste",
                "Sudeste",
                "Sul",
              ].map((reg) => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                    selectedRegion === reg
                      ? "bg-blue-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
          </div>

          {/* Quick UF Selector Grid */}
          <div className="flex flex-wrap gap-1.5 md:gap-2 max-h-36 overflow-y-auto p-1">
            {filteredStates.map((st) => {
              const isSelected = st.uf === selectedUf;
              return (
                <button
                  key={st.uf}
                  onClick={() => selectUf(st.uf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-amber-400 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-300"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${isSelected ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {st.uf}
                  </span>
                  <span>{st.nome}</span>
                </button>
              );
            })}
          </div>
        </section>

        {}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Active State Card */}
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-xl shadow-md border-l-4 border-amber-400 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">
                  Estado Analisado
                </span>
                <h3 className="text-2xl font-black text-white">
                  {currentStateInfo.nome} ({currentStateInfo.uf})
                </h3>
              </div>
              <span className="bg-blue-800 text-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                {currentStateInfo.regiao}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-800/60 flex items-center justify-between text-xs text-blue-200">
              <span>População Censo 2022:</span>
              <strong className="text-white text-sm font-mono">
                {format(currentStateInfo.pop_local)} hab.
              </strong>
            </div>
          </div>

          {/* Top Overrepresented Surname */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Sobrenome Mais Típico
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <h4 className="text-2xl font-black text-slate-900">
                  {topTypicalSurname ? topTypicalSurname.sobrenome : "—"}
                </h4>
                {topTypicalSurname && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {format(topTypicalSurname.quociente_locacional)}x
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {topTypicalSurname
                ? `O sobrenome mais concentrado em ${currentStateInfo.uf} comparado à média nacional.`
                : "Nenhum resultado para os filtros atuais."}
            </p>
          </div>

          {/* Highest Location Quotient Value */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                Maior Quociente Locacional
              </span>
              <div className="mt-1">
                <span className="text-2xl font-black text-blue-900">
                  {topTypicalSurname
                    ? `${format(topTypicalSurname.quociente_locacional)}x`
                    : "0x"}
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  a média nacional
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Valores acima de 1.0x indicam presença superior ao padrão do
              Brasil.
            </p>
          </div>

          {/* Local Presence of the Top Typical Surname */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Presença em {currentStateInfo.uf}
              </span>
              <div className="mt-1">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {topTypicalSurname
                    ? `${format(+topTypicalSurname.percentLocal)}%`
                    : "—"}
                </span>
                {topTypicalSurname && (
                  <span className="text-xs text-slate-500 ml-1">
                    da população
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {topTypicalSurname
                ? `${format(topTypicalSurname.frequencia)} pessoas com o sobrenome ${topTypicalSurname.sobrenome} no Censo 2022.`
                : "Nenhum resultado para os filtros atuais."}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Table Control Bar */}
          <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Ranking das Famílias Típicas de {currentStateInfo.nome} (
                  {currentStateInfo.uf})
                </h3>
                <p className="text-xs text-slate-500">
                  Sobrenomes ordenados pelo Quociente Locacional (QL). Clique na
                  linha para consultar a distribuição nacional do sobrenome.
                </p>
              </div>
            </div>
          </div>

          {}
          <div className="min-h-0 max-h-[calc(100vh-20rem)] overflow-auto md:max-h-[calc(100vh-16rem)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Sobrenome</th>
                  <th className="py-3 px-4">Fonte</th>
                  <th className="py-3 px-4 text-right">
                    Pessoas em {currentStateInfo.uf}
                  </th>
                  <th className="py-3 px-4 text-right">% População</th>
                  <th className="py-3 px-4 text-right">Quociente Locacional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {stateRanking.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-500 bg-white"
                    >
                      <p className="font-semibold">
                        Nenhum sobrenome encontrado com os filtros selecionados.
                      </p>
                    </td>
                  </tr>
                ) : (
                  stateRanking.map((row) => {
                    /* Visual indicator color according to QL intensity */
                    let qlBadgeClass =
                      "bg-slate-100 text-slate-700 border-slate-200";
                    let qlIcon = null;

                    if (row.quociente_locacional >= 4.0) {
                      qlBadgeClass =
                        "bg-amber-100 text-amber-900 border-amber-300 font-black shadow-sm";
                      qlIcon = (
                        <Sparkles className="w-3 h-3 text-amber-600 inline mr-1" />
                      );
                    } else if (row.quociente_locacional >= 2.0) {
                      qlBadgeClass =
                        "bg-blue-100 text-blue-950 border-blue-200 font-bold";
                    } else if (row.quociente_locacional >= 1.3) {
                      qlBadgeClass =
                        "bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold";
                    }

                    return (
                      <React.Fragment key={row.sobrenome}>
                        {/* Table Main Row */}
                        <tr
                          onClick={() =>
                            openSurnameSearchDetails(row.sobrenome)
                          }
                          className="cursor-pointer bg-white transition-colors hover:bg-amber-50/60"
                        >
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                            {row.rank <= 3 ? (
                              <span
                                className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black ${
                                  row.rank === 1
                                    ? "bg-amber-400 text-slate-950 shadow-sm"
                                    : row.rank === 2
                                      ? "bg-slate-300 text-slate-900"
                                      : "bg-amber-700/20 text-amber-900"
                                }`}
                              >
                                {row.rank}
                              </span>
                            ) : (
                              row.rank
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-base">
                            <a
                              href={ibgeSurnameUrl(row.sobrenome)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1 text-blue-900 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 hover:decoration-blue-700"
                              title={`Ver ${row.sobrenome} no IBGE`}
                            >
                              {row.sobrenome}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            Dados do Censo 2022
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                            {format(row.frequencia)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                            {format(+row.percentLocal)}%
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs border ${qlBadgeClass}`}
                            >
                              {qlIcon}
                              {format(row.quociente_locacional)}x
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Mostrando <strong>{stateRanking.length}</strong> de{" "}
              <strong>{totalStateFrequencies}</strong> sobrenomes analisados
              para o estado de <strong>{currentStateInfo.nome}</strong>.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpandedSurname(null);
                  setDetailSource(null);
                  setRankingPage((page) => page - 1);
                  storage.page.save(rankingPage - 1);
                }}
                disabled={rankingPage === 0 || isLoading}
                aria-label="Página anterior"
                title="Página anterior"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-20 text-center font-medium text-slate-600">
                Página {rankingPage + 1} de {totalRankingPages || 1}
              </span>
              <button
                type="button"
                onClick={() => {
                  setExpandedSurname(null);
                  setDetailSource(null);
                  setRankingPage((page) => page + 1);
                  storage.page.save(rankingPage + 1);
                }}
                disabled={isLoading || rankingPage + 1 >= totalRankingPages}
                aria-label="Próxima página"
                title="Próxima página"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <BookOpen className="w-3.5 h-3.5" />
              Fonte: Dados estruturados com base no Censo Demográfico do IBGE.
            </div>
          </div>
        </section>

        {/* Surname search and nationwide details */}
        <section
          id="surname-search-section"
          aria-labelledby="surname-search-title"
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden scroll-mt-4"
        >
          <div className="p-4 md:p-6 bg-slate-50/50 space-y-4">
            <div>
              <h2
                id="surname-search-title"
                className="text-lg font-bold text-slate-900 flex items-center gap-2"
              >
                <Search className="w-5 h-5 text-blue-800" />
                Pesquisar um sobrenome
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Consulte a distribuição do sobrenome pelos estados brasileiros,
                mesmo quando ele não aparece na página atual do ranking.
              </p>
            </div>
            <form
              onSubmit={searchSurname}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <label className="sr-only" htmlFor="surname-search">
                Pesquisar sobrenome
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="surname-search"
                  type="search"
                  value={surnameQuery}
                  onChange={(event) => {
                    setSurnameQuery(event.target.value);
                    setSurnameSearchError(null);
                  }}
                  placeholder="Digite um sobrenome"
                  className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingSurname || !surnameQuery.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                {isSearchingSurname ? "Pesquisando..." : "Pesquisar"}
              </button>
              {detailSource === "search" && expandedSurname && (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedSurname(null);
                    setDetailSource(null);
                    setSurnameSearchError(null);
                    setSurnameQuery("");
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Fechar detalhes do sobrenome"
                  title="Fechar detalhes"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
            {surnameSearchError && (
              <p className="text-xs text-red-700" role="alert">
                {surnameSearchError}
              </p>
            )}
          </div>
          {detailSource === "search" && expandedSurname && (
            <div className="border-t border-slate-300">
              {renderNationwideDetails(expandedSurname)}
            </div>
          )}
        </section>
      </main>

      {showInfoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn relative">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-900">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  O que é Quociente Locacional (QL)?
                </h3>
                <p className="text-xs text-slate-500">
                  Metodologia de Análise Geográfica de Nomes
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <p>
                O <strong>Quociente Locacional (QL)</strong> é uma medida
                estatística utilizada para identificar a hiper-representação
                regional de um determinado sobrenome em relação ao padrão médio
                nacional do Brasil.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-[11px] text-slate-800">
                <div className="font-bold text-blue-900">
                  Fórmula do Quociente Locacional:
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 text-center">
                  QL = ( Frequência no Estado / População do Estado ) / (
                  Frequência no Brasil / População do Brasil )
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">
                  Como interpretar o resultado:
                </h4>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>
                    <strong className="text-amber-800">QL &gt; 1.0:</strong> O
                    sobrenome é <strong>mais concentrado</strong> no estado do
                    que na média do país. Por exemplo, um QL de 3.5x significa
                    que o nome é 3,5 vezes mais comum naquele estado do que no
                    Brasil em geral.
                  </li>
                  <li>
                    <strong className="text-slate-800">QL = 1.0:</strong> O
                    sobrenome tem exatamente a mesma proporção local que a média
                    nacional.
                  </li>
                  <li>
                    <strong className="text-slate-500">QL &lt; 1.0:</strong> O
                    sobrenome é sub-representado na Unidade da Federação.
                  </li>
                </ul>
              </div>

              <p className="text-slate-500 italic text-[11px] border-t border-slate-100 pt-3">
                Essa métrica permite revelar raízes de imigração histórica,
                povoamento indígena regional e clãs familiares típicos de cada
                estado brasileiro sem ser ofuscado por nomes ultra comuns de
                alcance nacional (como Silva ou Santos).
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-sm"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 border-t-4 border-amber-400 bg-slate-900 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-white">
              As famílias típicas de cada estado
            </p>
            <p className="mt-1 text-slate-400">Censo Demográfico 2022</p>
          </div>
          <a
            href="https://github.com/lamartinecabral/nomes-da-terra"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-slate-200 transition-colors hover:border-amber-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <GitBranch className="h-4 w-4" />
            Ver projeto no GitHub
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
          </a>
        </div>
      </footer>
    </div>
  );
}
