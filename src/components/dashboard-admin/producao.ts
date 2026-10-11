import { useEffect, useState } from "react";
import { stages, stageItems } from "./stages-data";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { listarChecklistProducao, marcarItemProducao } from "@/lib/producao-service";

// Etapas da Producao (abas 6-9). Cada uma usa a etapa do playbook em stages-data
// e o prazo em dias uteis contados a partir do contrato fechado.
export const ETAPAS_PRODUCAO = [
  { id: "6_boas_vindas", numero: 6, nome: "Boas-vindas", stageIndex: 3, prazoDiasUteis: 1 },
  { id: "7_3_dias_uteis", numero: 7, nome: "3 dias úteis", stageIndex: 4, prazoDiasUteis: 3 },
  { id: "8_estrategia", numero: 8, nome: "Estratégia", stageIndex: 5, prazoDiasUteis: 3 },
  { id: "9_producao", numero: 9, nome: "Produção", stageIndex: 6, prazoDiasUteis: 5 },
] as const;

export type EtapaProducao = (typeof ETAPAS_PRODUCAO)[number];
export type EtapaProducaoId = EtapaProducao["id"];

export const EVENTO_PRODUCAO = "wrmax:producao_atualizada";
const INTERVALO_ATUALIZACAO = 15000;

// Checklist no banco (checklist_producao), compartilhado pela equipe. Fica em memoria
// para o quadro e as abas lerem na hora; quem altera avisa pelo EVENTO_PRODUCAO.
const cache = new Map<string, Record<number, Record<string, true>>>();

function avisar() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO_PRODUCAO));
}

function aplicar(clienteId: string, stageIndex: number, item: string, feito: boolean) {
  const cliente = cache.get(clienteId) ?? {};
  const etapa = { ...(cliente[stageIndex] ?? {}) };
  if (feito) etapa[item] = true;
  else delete etapa[item];
  cache.set(clienteId, { ...cliente, [stageIndex]: etapa });
}

export function lerChecklist(clienteId: string, stageIndex: number): Record<string, boolean> {
  return cache.get(clienteId)?.[stageIndex] ?? {};
}

export async function carregarChecklist(clienteIds: string[]) {
  const linhas = await listarChecklistProducao(clienteIds);
  const novo = new Map(clienteIds.map((id) => [id, {} as Record<number, Record<string, true>>]));
  for (const l of linhas) {
    const cliente = novo.get(l.cliente_id);
    if (cliente) (cliente[l.etapa] ??= {})[l.item] = true;
  }
  novo.forEach((v, id) => cache.set(id, v));
  avisar();
}

// Marca na tela na hora e grava no banco; se falhar, desfaz e repassa o erro
export async function alternarItem(clienteId: string, stageIndex: number, item: string, feito: boolean) {
  aplicar(clienteId, stageIndex, item, feito);
  avisar();
  try {
    await marcarItemProducao(clienteId, stageIndex, item, feito);
  } catch (err) {
    aplicar(clienteId, stageIndex, item, !feito);
    avisar();
    throw err;
  }
}

// Re-renderiza quando o checklist muda (marcacao local ou nova carga do banco)
export function useVersaoProducao() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const atualizar = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_PRODUCAO, atualizar);
    return () => window.removeEventListener(EVENTO_PRODUCAO, atualizar);
  }, []);
  return versao;
}

// Carrega o checklist dos clientes e busca de novo a cada 15s (marcacoes de outros gestores)
export function useChecklistProducao(clienteIds: string[]) {
  const chave = [...clienteIds].sort().join(",");
  const [carregado, setCarregado] = useState(() => clienteIds.every((id) => cache.has(id)));
  const [erro, setErro] = useState<string | null>(null);
  const versao = useVersaoProducao();

  useEffect(() => {
    if (!chave) {
      setCarregado(true);
      return;
    }
    let ativo = true;
    const ids = chave.split(",");
    const carregar = () =>
      carregarChecklist(ids)
        .then(() => ativo && (setErro(null), setCarregado(true)))
        .catch((err) => {
          if (!ativo) return;
          setErro(err instanceof Error ? err.message : "Não foi possível carregar o checklist da produção.");
          setCarregado(true);
        });
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [chave]);

  return { carregado, erro, versao };
}

export interface ProgressoEtapa {
  etapa: EtapaProducao;
  feitos: number;
  total: number;
  pendentes: string[];
  completa: boolean;
}

export interface ProgressoProducao {
  etapas: ProgressoEtapa[];
  // primeira etapa com item pendente; null = tudo entregue
  atual: ProgressoEtapa | null;
}

export function progressoProducao(clienteId: string): ProgressoProducao {
  const etapas = ETAPAS_PRODUCAO.map((etapa) => {
    const itens = stageItems(etapa.stageIndex);
    const marcados = lerChecklist(clienteId, etapa.stageIndex);
    const pendentes = itens.filter((item) => !marcados[item]);
    return {
      etapa,
      feitos: itens.length - pendentes.length,
      total: itens.length,
      pendentes,
      completa: pendentes.length === 0,
    };
  });
  return { etapas, atual: etapas.find((e) => !e.completa) ?? null };
}

export function tituloEtapa(etapa: EtapaProducao) {
  return stages[etapa.stageIndex]?.title ?? etapa.nome;
}

// Quando o projeto chegou na Producao: validacao do contrato (ou assinatura, em contratos antigos)
export function fechadoEm(cliente: ClienteOnboarding): string | null {
  const contrato = cliente.contratos?.[0];
  return contrato?.validado_em || contrato?.assinado_em || null;
}

// Dias uteis (seg-sex) desde a data, sem contar o proprio dia
export function diasUteisDesde(iso: string, agora = new Date()): number {
  const dia = new Date(iso);
  if (Number.isNaN(dia.getTime())) return 0;
  dia.setHours(0, 0, 0, 0);
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  let n = 0;
  while (dia < hoje) {
    dia.setDate(dia.getDate() + 1);
    const semana = dia.getDay();
    if (semana !== 0 && semana !== 6) n++;
  }
  return n;
}
