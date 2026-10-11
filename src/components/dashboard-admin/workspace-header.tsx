import { ArrowLeft } from "lucide-react";
import { SeloStatus, type TomStatus } from "./cabecalho-painel";

interface WorkspaceHeaderProps {
  clienteNome: string;
  clienteEmail?: string | null | undefined;
  clienteWhatsapp?: string | null | undefined;
  status?: string | null | undefined;
  onBack: () => void;
}

function iniciais(nome: string) {
  const partes = nome.split(/\s+/).filter((p) => p.length > 2);
  return ((partes[0]?.[0] || nome[0] || "?") + (partes[1]?.[0] || "")).toUpperCase();
}

// Status do banco -> texto curto para o gestor
const STATUS: Record<string, { texto: string; tom: TomStatus }> = {
  pendente_link: { texto: "Sem link", tom: "neutro" },
  link_ativo: { texto: "Link ativo", tom: "verde" },
  aguardando_cadastro: { texto: "Aguardando cadastro", tom: "ambar" },
  cadastro_recebido: { texto: "Cadastro recebido", tom: "verde" },
  contrato_gerado: { texto: "Contrato gerado", tom: "ambar" },
  contrato_enviado: { texto: "Contrato enviado", tom: "ambar" },
  assinado: { texto: "Contrato assinado", tom: "verde" },
  concluido: { texto: "Concluído", tom: "verde" },
  expirado: { texto: "Link expirado", tom: "ambar" },
  bloqueado: { texto: "Acesso bloqueado", tom: "vermelho" },
};

export function WorkspaceHeader({ clienteNome, clienteEmail, clienteWhatsapp, status, onBack }: WorkspaceHeaderProps) {
  const selo = (status && STATUS[status]) || { texto: "Ativo", tom: "neutro" as TomStatus };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit group"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Clientes</span>
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4 min-w-0">
          <div
            aria-hidden="true"
            className="size-12 shrink-0 rounded-xl grid place-items-center chip-ouro font-display font-bold text-base"
          >
            {iniciais(clienteNome || "Cliente")}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-foreground tracking-tight truncate">
              {clienteNome || "Cliente Parceiro"}
            </h1>
            <p className="text-[13px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
              {clienteEmail && <span>{clienteEmail}</span>}
              {clienteWhatsapp && <span className="font-mono">WhatsApp {clienteWhatsapp}</span>}
            </p>
          </div>
        </div>
        <SeloStatus tom={selo.tom}>{selo.texto}</SeloStatus>
      </div>
    </div>
  );
}
