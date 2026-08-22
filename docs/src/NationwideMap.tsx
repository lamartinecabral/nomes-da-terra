import React from "react";

import geoJson from "../assets/br_states.geojson.json" with { type: "json" };

import type { Frequencia } from "./App.tsx";

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

type NationwideStateData = Frequencia & {
  nomeEstado: string;
  popEstado: number;
  percentState: string;
};

type StateGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    id?: string;
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
    properties?: { SIGLA?: string; Estado?: string };
  }>;
};

const qlMapColor = (ql: number | undefined) => {
  if (ql === undefined) return "#e2e8f0";
  if (ql < 0.8) return "#cbd5e1";
  if (ql < 1.2) return "#94a3b8";
  if (ql < 2) return "#86efac";
  if (ql < 4) return "#60a5fa";
  return "#fbbf24";
};

const darkerColor = (hex: string, amount = 0.4) => {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) =>
    Math.round(parseInt(value.slice(index, index + 2), 16) * (1 - amount)),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

const geometryRings = (
  geometry: StateGeoJson["features"][number]["geometry"],
) =>
  geometry.type === "Polygon"
    ? (geometry.coordinates as number[][][])
    : (geometry.coordinates as number[][][][]).flat();

export function NationwideMap({
  states,
  selectedUf,
  onStateClick,
}: {
  states: NationwideStateData[];
  selectedUf: string;
  onStateClick: (uf: string) => void;
}) {
  const allPoints = (geoJson as StateGeoJson).features.flatMap((feature) =>
    geometryRings(feature.geometry).flat(),
  );
  const minX = Math.min(...allPoints.map((point) => point[0]));
  const maxX = Math.max(...allPoints.map((point) => point[0]));
  const minY = Math.min(...allPoints.map((point) => point[1]));
  const maxY = Math.max(...allPoints.map((point) => point[1]));
  const width = 700;
  const height = 520;
  const padding = 18;
  const scale = Math.min(
    (width - padding * 2) / (maxX - minX),
    (height - padding * 2) / (maxY - minY),
  );
  const project = ([x, y]: number[]) => [
    padding +
      (x - minX) * scale +
      (width - (maxX - minX) * scale - padding * 2) / 2,
    height -
      padding -
      (y - minY) * scale -
      (height - (maxY - minY) * scale - padding * 2) / 2,
  ];
  const pathForFeature = (feature: StateGeoJson["features"][number]) =>
    geometryRings(feature.geometry)
      .map(
        (ring) =>
          `${ring.map((point, index) => `${index ? "L" : "M"}${project(point).join(",")}`).join(" ")} Z`,
      )
      .join(" ");
  const stateByUf = new Map(states.map((state) => [state.uf, state]));

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 md:p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-2xl"
        role="img"
        aria-label="Mapa do Brasil colorido pelo Quociente Locacional"
      >
        {(geoJson as StateGeoJson).features
          .slice()
          .sort((f1, f2) => {
            // selected state should be drawn on top of others
            const uf1 = f1.properties?.SIGLA ?? f1.id ?? "";
            const uf2 = f2.properties?.SIGLA ?? f2.id ?? "";
            if (uf1 === selectedUf) return 1;
            if (uf2 === selectedUf) return -1;
            return 0;
          })
          .map((feature) => {
            const uf = feature.properties?.SIGLA ?? feature.id ?? "";
            const state = stateByUf.get(uf);
            const isSelected = uf === selectedUf;
            const fillColor = qlMapColor(state?.quociente_locacional);
            return (
              <path
                key={uf}
                d={pathForFeature(feature)}
                fill={fillColor}
                stroke={isSelected ? darkerColor(fillColor) : "#ffffff"}
                strokeWidth={isSelected ? 2.5 : 1}
                strokeLinejoin="round"
                className="transition-opacity hover:opacity-80 outline-none cursor-pointer"
                onClick={() => onStateClick(uf)}
                aria-label={`Selecionar ${state?.nomeEstado ?? feature.properties?.Estado ?? uf}`}
              >
                <title>{`${uf} — ${state?.nomeEstado ?? feature.properties?.Estado ?? "Estado"}: ${state ? `${format(state.quociente_locacional)}x de QL` : "sem dados"}`}</title>
              </path>
            );
          })}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-2 pb-1 text-[11px] text-slate-600">
        {[
          "Sub-representado (< 0,8x)",
          "Típico (0,8–1,2x)",
          "Acima da média (1,2–2x)",
          "Muito típico (2–4x)",
          "Extremamente típico (≥ 4x)",
        ].map((label, index) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-white"
              style={{
                backgroundColor: [
                  "#cbd5e1",
                  "#94a3b8",
                  "#86efac",
                  "#60a5fa",
                  "#fbbf24",
                ][index],
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
