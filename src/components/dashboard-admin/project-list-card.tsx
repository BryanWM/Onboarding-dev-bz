import { ArrowRight, Clock, Trash2, Ban, Edit3, Calendar, FileText } from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";

interface ProjectListCardProps {
  cliente: ClienteOnboarding;
  onSelect: (cliente: ClienteOnboarding) => void;
  onEditar: (cliente: ClienteOnboarding) => void;
  onToggleBloqueio: (cliente: ClienteOnboarding) => void;
  onExcluir: (cliente: ClienteOnboarding) => void;
}

export function ProjectListCard({
  cliente,
  onSelect,
  onEditar,
  onToggleBloqueio,
  onExcluir,
}: ProjectListCardProps) {
  const link = cliente.links_temporarios?.[0];
  const isBloqueado = Boolean(link?.bloqueado_manualmente || cliente.status === "bloqueado");
  const temContrato = Boolean(cliente.contratos && cliente.contratos.length > 0);

  const formatarData = (dataStr?: string | null) => {
    if (!dataStr) return null;
    try {
      return new Date(dataStr).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return dataStr;
    }
  };

  const dataCriacao = formatarData(cliente.created_at);
  const dataProg = formatarData(cliente.data_programacao);

  return (
    <div className="metal-panel p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/50 transition-colors group">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-bold text-base sm:text-lg text-foreground truncate">{cliente.nome_completo}</h3>
          {dataCriacao && (
            <span className="text-[11px] font-mono text-muted-foreground/80 px-2 py-0.5 rounded bg-secondary/40 border border-border/50">
              Criado em: {dataCriacao}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {cliente.email && <span>{cliente.email}</span>}
          {cliente.whatsapp && <span>WhatsApp: {cliente.whatsapp}</span>}
          {dataProg && (
            <span className="text-primary font-semibold flex items-center gap-1">
              <Calendar className="size-3" /> Onboarding: {dataProg}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {isBloqueado ? (
          <span className="px-3 py-1 rounded-full border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono font-bold">
            ACESSO BLOQUEADO
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
            <Clock className="size-3.5" /> LINK ATIVO
          </span>
        )}
        {cliente.pix_pago ? (
          <span className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold">
            PIX PAGO
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono font-bold">
            PIX PENDENTE
          </span>
        )}
        {temContrato ? (
          <span className="px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-mono font-bold flex items-center gap-1.5">
            <FileText className="size-3.5" /> CONTRATO EMITIDO
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full border border-border bg-secondary/40 text-muted-foreground text-xs font-mono">
            AGUARDANDO CONTRATO
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto justify-end pt-2 md:pt-0">
        <button
          type="button"
          title="Editar Projeto"
          onClick={() => onEditar(cliente)}
          className="p-2.5 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
        >
          <Edit3 className="size-4" />
        </button>
        <button
          type="button"
          title={isBloqueado ? "Desbloquear Link" : "Bloquear Link"}
          onClick={() => onToggleBloqueio(cliente)}
          className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
            isBloqueado
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-secondary/40 border-border text-muted-foreground hover:text-amber-400 hover:border-amber-500/40"
          }`}
        >
          <Ban className="size-4" />
        </button>
        <button
          type="button"
          title="Excluir Projeto Definitivamente"
          onClick={() => onExcluir(cliente)}
          className="p-2.5 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-colors cursor-pointer"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onSelect(cliente)}
          className="metal-button px-5 py-2.5 rounded-lg text-sm font-bold text-primary-foreground flex items-center gap-2 cursor-pointer shadow-md"
        >
          <span>Gerenciar Cliente</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
