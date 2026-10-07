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
  const statusDisplay = status ? status.replace("_", " ").toUpperCase() : "ATIVO";

  return (
    <div className="space-y-4">
      {/* Botao unico e nao redundante de retorno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Lista de Clientes</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {temComprovantePix && (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <FileCheck className="size-3.5" />
              Comprovante PIX Anexado
            </span>
          )}

          <span className="text-sm font-mono text-muted-foreground">Status:</span>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/25">
            {statusDisplay}
          </span>
        </div>
      </div>

      <div className="metal-panel p-5 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <span className="text-xs font-mono text-primary uppercase tracking-widest block font-semibold">
              Ambiente Operacional do Cliente
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {clienteNome || "Cliente Parceiro"}
            </h1>
            <p className="text-sm text-muted-foreground">
              WhatsApp: <span className="font-semibold text-foreground/90">{clienteWhatsapp || "Não informado"}</span>
              <span className="mx-2">·</span>
              E-mail: <span className="font-semibold text-foreground/90">{clienteEmail || "Não informado"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onTogglePix(!pixPago)}
              disabled={loadingAction}
              className={`h-11 px-5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md w-full md:w-auto ${
                pixPago
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  : "border border-border bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>{pixPago ? "PIX Confirmado (Pago)" : "Marcar PIX como Pago"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
