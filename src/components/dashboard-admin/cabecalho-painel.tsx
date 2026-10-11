import type { ReactNode } from "react";

export type TomStatus = "verde" | "ambar" | "vermelho" | "neutro";

const CORES: Record<TomStatus, string> = {
  verde: "#6fd39b",
  ambar: "#e7b45a",
  vermelho: "#ff6b8a",
  neutro: "#8c836f",
};

// Selo de status: texto neutro com um ponto colorido (mesmo padrao da lista de clientes)
export function SeloStatus({ tom, children }: { tom: TomStatus; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px] h-7 px-3 rounded-full border border-[var(--linha-2)] text-xs text-foreground shrink-0">
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: CORES[tom] }} />
      {children}
    </span>
  );
}

// Cabecalho padrao das abas do cliente: "Etapa N", titulo, uma linha de apoio e o status.
export function CabecalhoPainel({
  etapa,
  titulo,
  descricao,
  status,
  acao,
}: {
  etapa: number;
  titulo: string;
  descricao?: string;
  status?: { tom: TomStatus; texto: string } | null;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <span className="rotulo block">Etapa {etapa}</span>
        <h2 className="text-xl font-bold text-foreground tracking-tight">{titulo}</h2>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {(status || acao) && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {status && <SeloStatus tom={status.tom}>{status.texto}</SeloStatus>}
          {acao}
        </div>
      )}
    </div>
  );
}
