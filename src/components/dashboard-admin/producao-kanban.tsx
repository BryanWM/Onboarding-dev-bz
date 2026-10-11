import { useMemo } from "react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { SeloStatus } from "./cabecalho-painel";
import {
  ETAPAS_PRODUCAO,
  diasUteisDesde,
  fechadoEm,
  progressoProducao,
  useChecklistProducao,
  type ProgressoProducao,
} from "./producao";

interface ProducaoKanbanProps {
  clientes: ClienteOnboarding[];
  onSelect: (cliente: ClienteOnboarding) => void;
}

const COLUNAS = [
  ...ETAPAS_PRODUCAO.map((e) => ({ id: e.id as string, numero: String(e.numero), nome: e.nome, prazo: `até ${e.prazoDiasUteis}º dia útil` })),
  { id: "entregue", numero: "✓", nome: "Entregue", prazo: "onboarding concluído" },
];

// Quadro da Producao: cada cliente fica na coluna da primeira etapa com item pendente.
// O cartao mostra o que falta entregar e se o prazo da etapa ja passou.
export function ProducaoKanban({ clientes, onSelect }: ProducaoKanbanProps) {
  const ids = useMemo(() => clientes.map((c) => c.id), [clientes]);
  const { carregado, erro, versao } = useChecklistProducao(ids);

  const porColuna = useMemo(() => {
    const mapa: Record<string, { cliente: ClienteOnboarding; progresso: ProgressoProducao }[]> = {};
    for (const col of COLUNAS) mapa[col.id] = [];
    for (const cliente of clientes) {
      const progresso = progressoProducao(cliente.id);
      mapa[progresso.atual?.etapa.id ?? "entregue"]!.push({ cliente, progresso });
    }
    return mapa;
  }, [clientes, versao]);

  if (!carregado) {
    return <div className="py-12 text-center text-sm font-mono text-muted-foreground">Carregando quadro...</div>;
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {erro && (
        <div role="alert" className="shrink-0 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {erro}
        </div>
      )}
    <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-none lg:grid lg:grid-cols-5 lg:overflow-visible">
      {COLUNAS.map((col) => {
        const itens = porColuna[col.id] ?? [];
        return (
          <section
            key={col.id}
            aria-label={`${col.nome}: ${itens.length} ${itens.length === 1 ? "projeto" : "projetos"}`}
            className="snap-start shrink-0 w-[78vw] sm:w-[300px] lg:w-auto min-h-0 flex flex-col rounded-[16px] border border-[var(--linha)] bg-[var(--campo)]/60"
          >
            <header className="shrink-0 px-3.5 pt-3.5 pb-3 border-b border-[var(--linha)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
                  <span className="font-mono text-xs text-[#8c836f]">{col.numero}</span>
                  {col.nome}
                </h3>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">{itens.length}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{col.prazo}</p>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
              {itens.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground/70">Nenhum projeto</p>
              ) : (
                itens.map(({ cliente, progresso }) => (
                  <CartaoProducao key={cliente.id} cliente={cliente} progresso={progresso} onSelect={onSelect} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
    </div>
  );
}

function CartaoProducao({
  cliente,
  progresso,
  onSelect,
}: {
  cliente: ClienteOnboarding;
  progresso: ProgressoProducao;
  onSelect: (cliente: ClienteOnboarding) => void;
}) {
  const atual = progresso.atual;
  const inicio = fechadoEm(cliente);
  const diaUtil = inicio ? diasUteisDesde(inicio) : null;
  const atrasado = Boolean(atual && diaUtil !== null && diaUtil > atual.etapa.prazoDiasUteis);

  return (
    <button
      type="button"
      onClick={() => onSelect(cliente)}
      className="w-full text-left rounded-[12px] border border-[var(--linha)] bg-[var(--superficie)] p-3 space-y-2.5 cursor-pointer transition-colors hover:border-[var(--linha-2)] hover:bg-[var(--superficie-2)] focus-visible:outline-none focus-visible:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{cliente.nome_completo}</h4>
        {diaUtil !== null && atual && (
          <span className="text-[11px] font-mono text-muted-foreground shrink-0 pt-0.5" title="Dias úteis desde o contrato fechado">
            D{diaUtil}
          </span>
        )}
      </div>

      {atual ? (
        <>
          <p className="text-xs text-muted-foreground leading-snug">
            <span className="text-foreground/80">Próximo:</span> {atual.pendentes[0]}
          </p>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1 rounded-full bg-[var(--linha)] overflow-hidden" aria-hidden="true">
              <div className="h-full metal-fill rounded-full" style={{ width: `${(atual.feitos / atual.total) * 100}%` }} />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {atual.feitos}/{atual.total}
            </span>
          </div>
          {atrasado && <SeloStatus tom="vermelho">Prazo da etapa passou</SeloStatus>}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Todas as entregas concluídas.</p>
      )}
    </button>
  );
}
