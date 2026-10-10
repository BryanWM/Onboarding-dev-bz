import { ArrowLeft, CheckCircle2, FileCheck } from "lucide-react";

interface WorkspaceHeaderProps {
  clienteNome: string;
  clienteEmail?: string | null;
  clienteWhatsapp?: string | null;
  status?: string | null;
  pixPago: boolean;
  temComprovantePix?: boolean;
  onBack: () => void;
  onTogglePix: (novoStatus: boolean) => Promise<void> | void;
  loadingAction?: boolean;
}

function iniciais(nome: string) {
  const partes = nome.split(/\s+/).filter((p) => p.length > 2);
  return ((partes[0]?.[0] || nome[0] || "?") + (partes[1]?.[0] || "")).toUpperCase();
}

export function WorkspaceHeader({
  clienteNome,
  clienteEmail,
  clienteWhatsapp,
  status,
  pixPago,
  temComprovantePix = false,
  onBack,
  onTogglePix,
  loadingAction = false,
}: WorkspaceHeaderProps) {
  const statusDisplay = status ? status.replaceAll("_", " ").toUpperCase() : "ATIVO";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit group"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Voltar para Lista de Clientes</span>
      </button>

      <section className="metal-panel p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div
            aria-hidden="true"
            className="size-14 sm:size-16 shrink-0 rounded-xl grid place-items-center chip-ouro font-display font-bold text-lg"
          >
            {iniciais(clienteNome || "Cliente")}
          </div>
          <div className="min-w-0 space-y-1.5">
            <span className="rotulo block">Ambiente operacional do cliente</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
              {clienteNome || "Cliente Parceiro"}
            </h1>
            <p className="text-[13px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>{clienteEmail || "E-mail não informado"}</span>
              <span className="font-mono">WhatsApp {clienteWhatsapp || "não informado"}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {temComprovantePix && (
            <span className="h-8 px-3 rounded-full text-xs border border-[var(--linha-2)] text-foreground inline-flex items-center gap-[7px]">
              <FileCheck className="size-3.5 text-[#e7b45a]" />
              Comprovante PIX anexado
            </span>
          )}
          <span className="h-8 px-3 rounded-full text-[11px] font-mono tracking-wider chip-ouro inline-flex items-center">
            {statusDisplay}
          </span>
          <button
            type="button"
            onClick={() => onTogglePix(!pixPago)}
            disabled={loadingAction}
            className={`h-11 px-5 rounded-lg text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 glass-button ${
              pixPago ? "!text-[#6fd39b]" : ""
            }`}
          >
            <CheckCircle2 className="size-4" />
            <span>{pixPago ? "PIX Confirmado (Pago)" : "Marcar PIX como Pago"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
