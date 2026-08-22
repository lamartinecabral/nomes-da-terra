import { createClient } from "@supabase/supabase-js";

const projectId = "";
const supabaseKey = "";

/** @typedef {import("../../src/generated/db.types.ts").Database} Database */

/** @type {import("@supabase/supabase-js").SupabaseClient<Database>} */
const supabase = createClient(`https://${projectId}.supabase.co`, supabaseKey);

export const queryLocalidades = () => {
  return supabase
    .from("localidades")
    .select("cod, nome, uf, pop_local")
    .neq("uf", "BR")
    .order("nome");
};

/**
 * @param {number} localidadeCod
 * @param {number} rankingPage
 * @param {number} pageSize
 */
export const queryStateRanking = (localidadeCod, rankingPage, pageSize) => {
  return supabase
    .from("frequencias_analise")
    .select("nome, localidade, frequencia, quociente_locacional", {
      count: "exact",
    })
    .eq("localidade", localidadeCod)
    .order("quociente_locacional", { ascending: false })
    .range(rankingPage * pageSize, (rankingPage + 1) * pageSize - 1);
};

/**
 * @param {string} expandedSurname
 */
export const queryNationWideDetails = (expandedSurname) => {
  return supabase
    .from("frequencias_analise")
    .select("nome, localidade, frequencia, quociente_locacional")
    .eq("nome", expandedSurname)
    .order("quociente_locacional", { ascending: false });
};

/**
 * @param {string} query
 */
export const querySurname = (query) => {
  return supabase
    .from("sobrenomes")
    .select("nome")
    .ilike("nome", query)
    .limit(1);
};
