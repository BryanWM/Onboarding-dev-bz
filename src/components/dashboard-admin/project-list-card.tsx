import { ArrowRight, Trash2, Ban, Edit3, Calendar } from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";

interface ProjectListCardProps {
  cliente: ClienteOnboarding;
  onSelect: (cliente: ClienteOnboarding) => void;
  onEditar: (cliente: ClienteOnboarding) => void;
  onToggleBloqueio: (cliente: ClienteOnboarding) => void;
  onExcluir: (cliente: ClienteOnboarding) => void;
}

type Tom = "verde" | "ambar" | "neutro" | "vermelho";

// Selo neutro com ponto colorido: o status aparece na cor do ponto, sem dourado
const PONTOS: Record<Tom, string> = {
  verde: "#6fd39b",
  ambar: "#e7b45a",
  neutro: "#8c836f",
  vermelho: "#ff6b8a",
};

function Selo({ tom, children }: { tom: Tom; children: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] h-6 px-2.5 rounded-full border border-[var(--linha-2)] text-xs text-foreground">
      <span className="size-[7px] rounded-full shrink-0" style={{ background: PONTOS[tom] }} />
      {children}
    </span>
  );
}

function iniciais(nome: string) {
  const partes = nome.split(/\s+/).filter((p) => p.length > 2);
  return ((partes[0]?.[0] || nome[0] || "?") + (partes[1]?.[0] || "")).toUpperCase();
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
  const isExpirado = Boolean(link?.expira_em && new Date(link.expira_em).getTime() <= Date.now());
  const contrato = cliente.contratos?.[0];
  const assinado = Boolean(contrato?.docx_assinado_storage_path) || cliente.status === "assinado";

  const formatarData = (dataStr?: string | null) => {
    if (!dataStr) return null;
    try {
      return new Date(dataStr).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return dataStr;
    }
  };

  const dataCriacao = formatarData(cliente.created_at);
  const dataProg = formatarData(cliente.data_programacao);

  return (
    <article className="metal-panel p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          aria-hidden="true"
          className="size-12 shrink-0 rounded-xl grid place-items-center chip-ouro font-display font-bold text-[15px]"
        >
          {iniciais(cliente.nome_completo || "?")}
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-bold text-base sm:text-lg text-foreground truncate">{cliente.nome_completo}</h3>
            {dataCriacao && <span className="text-[11px] font-mono text-muted-foreground/80">Criado em {dataCriacao}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {cliente.email && <span>{cliente.email}</span>}
            {cliente.whatsapp && <span className="font-mono">WhatsApp {cliente.whatsapp}</span>}
            {dataProg && (
              <span className="text-primary font-semibold flex items-center gap-1">
                <Calendar className="size-3" /> Onboarding: {dataProg}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {isBloqueado ? (
              <Selo tom="vermelho">Acesso bloqueado</Selo>
            ) : isExpirado ? (
              <Selo tom="ambar">Link expirado</Selo>
            ) : (
              <Selo tom="verde">Link ativo</Selo>
            )}
            {cliente.pix_pago ? <Selo tom="verde">PIX pago</Selo> : <Selo tom="ambar">PIX pendente</Selo>}
            {cliente.onboarding_confirmado_em ? (
              <Selo tom="verde">Onboard preenchido</Selo>
            ) : (
              <Selo tom="neutro">Aguardando onboard</Selo>
            )}
            {assinado ? (
              <Selo tom="verde">Contrato assinado</Selo>
            ) : contrato ? (
              <Selo tom="ambar">Contrato emitido</Selo>
            ) : (
              <Selo tom="neutro">Aguardando contrato</Selo>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end shrink-0">
        <button
          type="button"
          aria-label="Editar projeto"
          title="Editar projeto"
          onClick={() => onEditar(cliente)}
          className="glass-button size-10 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Edit3 className="size-4" />
        </button>
        <button
          type="button"
          aria-label={isBloqueado ? "Desbloquear link" : "Bloquear link"}
          title={isBloqueado ? "Desbloquear link" : "Bloquear link"}
          onClick={() => onToggleBloqueio(cliente)}
          className={`glass-button size-10 rounded-lg grid place-items-center cursor-pointer ${
            isBloqueado ? "!text-emerald-300 !border-emerald-400/35" : "text-muted-foreground hover:!text-amber-300"
          }`}
        >
          <Ban className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Excluir projeto"
          title="Excluir projeto definitivamente"
          onClick={() => onExcluir(cliente)}
          className="glass-button size-10 rounded-lg grid place-items-center text-muted-foreground hover:!text-red-300 hover:!border-red-400/40 cursor-pointer"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onSelect(cliente)}
          className="glass-button h-10 px-4 sm:px-5 rounded-lg text-[13px] font-semibold flex items-center gap-2 cursor-pointer"
        >
          <span>Gerenciar Cliente</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </article>
  );
}
