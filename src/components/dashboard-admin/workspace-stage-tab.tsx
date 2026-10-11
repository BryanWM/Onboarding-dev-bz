import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { stages } from "./stages-data";
import { CabecalhoPainel } from "./cabecalho-painel";
import {
  alternarItem,
  lerChecklist,
  tituloEtapa,
  useVersaoProducao,
  ETAPAS_PRODUCAO,
  type EtapaProducaoId,
} from "./producao";

interface WorkspaceStageTabProps {
  etapaId: EtapaProducaoId;
  clienteId: string;
  onIrPara?: (etapaId: EtapaProducaoId) => void;
}

// Aba da Producao: o que o cliente precisa receber nesta etapa, em forma de checklist.
export function WorkspaceStageTab({ etapaId, clienteId, onIrPara }: WorkspaceStageTabProps) {
  const posicao = ETAPAS_PRODUCAO.findIndex((e) => e.id === etapaId);
  const etapa = ETAPAS_PRODUCAO[posicao];
  const proxima = ETAPAS_PRODUCAO[posicao + 1];
  const stage = etapa ? stages[etapa.stageIndex] : undefined;

  useVersaoProducao(); // re-renderiza quando o checklist muda
  const [erro, setErro] = useState<string | null>(null);

  if (!etapa || !stage) return null;
  const marcados = lerChecklist(clienteId, etapa.stageIndex);

  const alternar = (item: string) => {
    setErro(null);
    alternarItem(clienteId, etapa.stageIndex, item, !marcados[item]).catch((err) =>
      setErro(err instanceof Error ? err.message : "Não foi possível salvar o item do checklist.")
    );
  };

  const grupos = stage.groups ?? [];
  const itens = grupos.flatMap((g) => g.items);
  const feitos = itens.filter((i) => marcados[i]).length;
  const completa = itens.length > 0 && feitos === itens.length;
  const pendente = itens.find((i) => !marcados[i]);

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <CabecalhoPainel
        etapa={etapa.numero}
        titulo={tituloEtapa(etapa)}
        descricao={stage.description}
        status={
          completa
            ? { tom: "verde", texto: "Etapa concluída" }
            : feitos > 0
              ? { tom: "ambar", texto: `Em andamento · ${feitos}/${itens.length}` }
              : { tom: "neutro", texto: "Não iniciada" }
        }
      />

      {erro && (
        <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {erro}
        </div>
      )}

      {/* Progresso da etapa */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-[var(--linha)] overflow-hidden" aria-hidden="true">
          <div
            className="h-full metal-fill rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ width: `${itens.length ? (feitos / itens.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {feitos} de {itens.length}
        </span>
      </div>

      {/* Entregas: uma linha por item, grupos so com rotulo */}
      <div className="space-y-6">
        {grupos.map((grupo) => (
          <div key={grupo.title} className="space-y-1">
            {grupos.length > 1 && <span className="rotulo block pb-1.5">{grupo.title}</span>}
            <ul className="divide-y divide-[var(--linha)] border-y border-[var(--linha)]">
              {grupo.items.map((item) => {
                const feito = Boolean(marcados[item]);
                return (
                  <li key={item}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={feito}
                      onClick={() => alternar(item)}
                      className="w-full flex items-center gap-3 px-1 py-3 text-left text-sm cursor-pointer group"
                    >
                      <span
                        aria-hidden="true"
                        className={`size-[18px] shrink-0 rounded-[5px] grid place-items-center border transition-colors ${
                          feito
                            ? "border-[#6fd39b]/60 bg-[#6fd39b]/15 text-[#6fd39b]"
                            : "border-[var(--linha-2)] text-transparent group-hover:border-[rgba(232,199,122,0.5)]"
                        }`}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span
                        className={`leading-snug transition-colors ${
                          feito ? "text-muted-foreground line-through decoration-[var(--linha-2)]" : "text-foreground group-hover:text-foreground"
                        }`}
                      >
                        {item}
                      </span>
                      {item === pendente && <span className="ml-auto rotulo !text-[10px] shrink-0">Próximo</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {completa && proxima && onIrPara && (
        <div className="flex justify-end border-t border-[var(--linha)] pt-5">
          <button
            type="button"
            onClick={() => onIrPara(proxima.id)}
            className="glass-button h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            Ir para {proxima.numero}. {proxima.nome} <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}
