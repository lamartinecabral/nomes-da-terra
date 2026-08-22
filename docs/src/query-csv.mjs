// @ts-check
// @ts-ignore
import "https://cdn.jsdelivr.net/npm/zod@3.24.4/lib/index.umd.js";

/** @type {import("zod")} */ // @ts-ignore
const z = window.Zod.z;

const getLocalidades = (() => {
  const schema = z.array(
    z.object({
      cod: z.number(),
      nome: z.string(),
      uf: z.string(),
      pop_local: z.number(),
    }),
  );

  const fetcher = async () => {
    const csv = await fetch("./assets/localidades_rows.csv").then((res) =>
      res.text(),
    );
    return schema.parse(parseCsv(csv));
  };

  /** @type {ReturnType<typeof fetcher>} */
  let promise;
  return () => {
    if (promise) return promise;
    return (promise = fetcher());
  };
})();

const getFrequencias = (() => {
  const schema = z.array(
    z.object({
      id: z.number(),
      nome: z.string(),
      localidade: z.number(),
      frequencia: z.number(),
    }),
  );

  const fetcher = async () => {
    const csv = await fetch("./assets/frequencias_rows.csv").then((res) =>
      res.text(),
    );
    return schema.parse(parseCsv(csv));
  };

  /** @type {ReturnType<typeof fetcher>} */
  let promise;
  return () => {
    if (promise) return promise;
    return (promise = fetcher());
  };
})();

const getFrequenciasFromCompressed = (() => {
  const schema = z
    .object({
      nome: z.string(),
      localidade: z.coerce.number(),
      frequencia: z.number(),
    })
    .or(z.null())
    .catch(null);

  const fetcher = async () => {
    const csv = await fetch("./assets/frequencias_compressed.csv").then((res) =>
      res.text(),
    );

    /** @type {Awaited<ReturnType<typeof getFrequencias>>} */
    const frequencias = parseCsv(csv)
      .flatMap(({ nome, ...frequencias }) =>
        Object.entries(frequencias).map(([localidade, frequencia]) =>
          schema.parse({ nome, localidade, frequencia }),
        ),
      )
      .filter((f) => f !== null)
      .map((f, i) => ({ id: i + 1, ...f }));

    return frequencias;
  };

  /** @type {ReturnType<typeof fetcher>} */
  let promise;
  return () => {
    if (promise) return promise;
    return (promise = fetcher());
  };
})();

const getSobrenomes = (() => {
  /** @type {{nome: string}[]} */
  let sobrenomes;
  return async () => {
    if (sobrenomes) return sobrenomes;
    // const frequencias = await getFrequencias();
    const frequencias = await getFrequenciasFromCompressed();
    return (sobrenomes = frequencias
      .reduce((acc, f) => {
        if (!acc.includes(f.nome)) acc.push(f.nome);
        return acc;
      }, /** @type {string[]} */ ([]))
      .map((nome) => ({ nome })));
  };
})();

const getFrequenciasAnalise = (() => {
  /** @type {{nome: string, localidade: number, frequencia: number, share: number, concentracao: number, quociente_locacional: number}[]} */
  let frequenciasAnalise;
  return async () => {
    if (frequenciasAnalise) return frequenciasAnalise;

    // const frequencias = await getFrequencias();
    const frequencias = await getFrequenciasFromCompressed();
    const localidades = await getLocalidades();

    const localidadesMap = localidades.reduce((acc, l) => {
      acc[l.cod] = l;
      return acc;
    }, /** @type {Record<number, typeof localidades[number]>} */ ({}));

    const populacaoBr = find(localidades, (l) => l.uf === "BR").pop_local;

    const frequenciaBr = frequencias
      .filter((f) => f.localidade === 0)
      .reduce((acc, f) => {
        acc[f.nome] = f.frequencia;
        return acc;
      }, /** @type {Record<string, number>} */ ({}));

    return (frequenciasAnalise = frequencias
      .filter((f) => f.localidade !== 0)
      .map((f) => {
        const localidade = localidadesMap[f.localidade];
        if (!localidade)
          throw new Error(`Localidade ${f.localidade} not found`);
        const share = f.frequencia / frequenciaBr[f.nome];
        const concentracao = f.frequencia / localidade.pop_local;
        const quociente_locacional =
          concentracao / (frequenciaBr[f.nome] / populacaoBr);
        return {
          ...f,
          share,
          concentracao,
          quociente_locacional,
        };
      }));
  };
})();

const parseCsv = (csv = "") => {
  const [header, ...rows] = csv.split("\n");
  const headers = header.split(",").map((h) => h.trim());
  return rows.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(
      headers.map((header, i) => [header, parseCsvCell(values[i])]),
    );
  });
};

const parseCsvCell = (cell = "") => {
  const val = cell.trim();
  if (val === "") return null;
  if (!isNaN(Number(val))) return Number(val);
  return val;
};

/** @type {<T>(arr: T[], predicate: (item: T) => boolean) => T} */
const find = (arr, predicate) => {
  for (const item of arr) if (predicate(item)) return item;
  throw new Error("Item not found");
};

/** @type {<T>(data: T) => { data: T, error: null } | { data: null, error: Error }} */
const mapResponse = (data) => ({ data, error: null });

export const queryLocalidades = () => {
  // return supabase
  //   .from("localidades")
  //   .select("cod, nome, uf, pop_local")
  //   .neq("uf", "BR")
  //   .order("nome");
  return getLocalidades()
    .then((data) =>
      data
        .filter((l) => l.uf !== "BR")
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    )
    .then(mapResponse);
};

/**
 * @param {number} localidadeCod
 * @param {number} rankingPage
 * @param {number} pageSize
 */
export const queryStateRanking = (localidadeCod, rankingPage, pageSize) => {
  // return supabase
  //   .from("frequencias_analise")
  //   .select("nome, localidade, frequencia, quociente_locacional", {
  //     count: "exact",
  //   })
  //   .eq("localidade", localidadeCod)
  //   .order("quociente_locacional", { ascending: false })
  //   .range(rankingPage * pageSize, (rankingPage + 1) * pageSize - 1);
  let count = 0;
  return getFrequenciasAnalise()
    .then((data) => {
      const filtered = data.filter((f) => f.localidade === localidadeCod);
      const sorted = filtered.sort(
        (a, b) => b.quociente_locacional - a.quociente_locacional,
      );
      const start = rankingPage * pageSize;
      const end = (rankingPage + 1) * pageSize;
      count = filtered.length;
      return sorted.slice(start, end);
    })
    .then((data) => ({ ...mapResponse(data), count }));
};

/**
 * @param {string} expandedSurname
 */
export const queryNationWideDetails = (expandedSurname) => {
  // return supabase
  //   .from("frequencias_analise")
  //   .select("nome, localidade, frequencia, quociente_locacional")
  //   .eq("nome", expandedSurname)
  //   .order("quociente_locacional", { ascending: false });
  return getFrequenciasAnalise()
    .then((data) =>
      data
        .filter((f) => f.nome === expandedSurname)
        .sort((a, b) => b.quociente_locacional - a.quociente_locacional),
    )
    .then(mapResponse);
};

/**
 * @param {string} query
 */
export const querySurname = (query) => {
  // return supabase
  //   .from("sobrenomes")
  //   .select("nome")
  //   .ilike("nome", query)
  //   .limit(1);
  return getSobrenomes()
    .then((data) => {
      const found = data.find((f) =>
        f.nome.toLowerCase().startsWith(query.toLowerCase()),
      );
      return found ? [found] : [];
    })
    .then(mapResponse);
};
