import { supabase, isSupabaseConfigured, isModoDemo } from "./supabase-client";
import { mensagemDeErro } from "./erros";

// Checklist da Producao: uma linha por item entregue (tabela checklist_producao).
// etapa = indice da etapa no playbook (stages-data.ts).
export interface ItemChecklistProducao {
  cliente_id: string;
  etapa: number;
  item: string;
}

// Chave antiga (so navegador). No modo demo continua sendo o armazenamento;
// com Supabase, o que estiver nela e levado para o banco uma vez e apagado.
const CHAVE_LOCAL = /^wrmax_stage_(.+)_(\d+)$/;
const chaveLocal = (clienteId: string, etapa: number) => `wrmax_stage_${clienteId}_${etapa}`;

function lerLocal(clienteIds?: string[]): ItemChecklistProducao[] {
  if (typeof window === "undefined") return [];
  const linhas: ItemChecklistProducao[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i) || "";
      const m = CHAVE_LOCAL.exec(chave);
      if (!m || (clienteIds && !clienteIds.includes(m[1]!))) continue;
      const marcados = JSON.parse(localStorage.getItem(chave) || "{}") as Record<string, boolean>;
      for (const [item, feito] of Object.entries(marcados)) {
        if (feito) linhas.push({ cliente_id: m[1]!, etapa: Number(m[2]), item });
      }
    }
  } catch {}
  return linhas;
}

function usarSupabase(): boolean {
  if (isSupabaseConfigured) return true;
  if (isModoDemo) return false;
  throw new Error("SUPABASE_NAO_CONFIGURADO");
}

const importados = new Set<string>();

// Leva para o banco o que a equipe ja tinha marcado no navegador (uma vez por cliente)
async function importarLocal(clienteIds: string[]) {
  const pendentes = clienteIds.filter((id) => !importados.has(id));
  if (pendentes.length === 0) return;
  const linhas = lerLocal(pendentes);
  if (linhas.length > 0) {
    const { error } = await supabase
      .from("checklist_producao")
      .upsert(linhas, { onConflict: "cliente_id,etapa,item", ignoreDuplicates: true });
    if (error) return; // tenta de novo na proxima carga, sem bloquear a tela
    for (const l of linhas) {
      try {
        localStorage.removeItem(chaveLocal(l.cliente_id, l.etapa));
      } catch {}
    }
  }
  pendentes.forEach((id) => importados.add(id));
}

export async function listarChecklistProducao(clienteIds: string[]): Promise<ItemChecklistProducao[]> {
  if (clienteIds.length === 0) return [];
  if (!usarSupabase()) return lerLocal(clienteIds);

  await importarLocal(clienteIds);
  const { data, error } = await supabase
    .from("checklist_producao")
    .select("cliente_id, etapa, item")
    .in("cliente_id", clienteIds);
  if (error) throw new Error(mensagemDeErro(error, "Não foi possível carregar o checklist da produção."));
  return (data ?? []) as ItemChecklistProducao[];
}

export async function marcarItemProducao(clienteId: string, etapa: number, item: string, feito: boolean) {
  if (!usarSupabase()) {
    const atual = Object.fromEntries(
      lerLocal([clienteId]).filter((l) => l.etapa === etapa).map((l) => [l.item, true])
    ) as Record<string, boolean>;
    if (feito) atual[item] = true;
    else delete atual[item];
    try {
      localStorage.setItem(chaveLocal(clienteId, etapa), JSON.stringify(atual));
    } catch {}
    return;
  }

  const { error } = feito
    ? await supabase
        .from("checklist_producao")
        .upsert({ cliente_id: clienteId, etapa, item }, { onConflict: "cliente_id,etapa,item", ignoreDuplicates: true })
    : await supabase.from("checklist_producao").delete().match({ cliente_id: clienteId, etapa, item });
  if (error) throw new Error(mensagemDeErro(error, "Não foi possível salvar o item do checklist."));
}
