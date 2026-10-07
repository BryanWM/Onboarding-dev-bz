import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  FileText,
  QrCode,
  UserCheck,
  ScrollText,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceLinkPanel } from "./workspace-link-panel";
import { WorkspacePresentationPanel } from "./workspace-presentation-panel";
import { WorkspaceCadastralPanel } from "./workspace-cadastral-panel";
import { WorkspaceContractPanel } from "./workspace-contract-panel";
import { WorkspaceStageTab } from "./workspace-stage-tab";
import { WorkspacePixPanel } from "./workspace-pix-panel";
import {
  atualizarStatusPix,
  atualizarApresentacaoCliente,
  atualizarProjeto,
  prorrogarLink,
  bloquearLink,
  desbloquearLink,
  excluirLinkTemporario,
  emitirEEnviarContrato,
  listarModelosContrato,
  obterComprovantePix,
} from "@/lib/supabase";

export type ClientTabId =
  | "1_inicio"
  | "2_apresentacao"
  | "3_pix"
  | "4_cadastro"
  | "5_contrato"
  | "6_boas_vindas"
  | "7_3_dias_uteis"
  | "8_estrategia"
  | "9_producao";

interface ClientFocusedViewProps {
  cliente: ClienteOnboarding;
  onVoltar: () => void;
  onClienteAtualizado: () => Promise<void>;
}

const CLIENT_TABS: { id: ClientTabId; label: string; icon: React.ReactNode }[] = [
  { id: "1_inicio", label: "1. Início", icon: <LayoutDashboard className="size-4" /> },
  { id: "2_apresentacao", label: "2. Apresentação", icon: <FileText className="size-4" /> },
  { id: "3_pix", label: "3. PIX", icon: <QrCode className="size-4" /> },
  { id: "4_cadastro", label: "4. Dados Cadastrais", icon: <UserCheck className="size-4" /> },
  { id: "5_contrato", label: "5. Contrato", icon: <ScrollText className="size-4" /> },
  { id: "6_boas_vindas", label: "6. Boas-Vindas", icon: <Sparkles className="size-4" /> },
  { id: "7_3_dias_uteis", label: "7. 3 Dias Úteis", icon: <Calendar className="size-4" /> },
  { id: "8_estrategia", label: "8. Estratégia", icon: <Layers className="size-4" /> },
  { id: "9_producao", label: "9. Produção", icon: <Layers className="size-4" /> },
];

export function ClientFocusedView({
  cliente,
  onVoltar,
  onClienteAtualizado,
}: ClientFocusedViewProps) {
  const [activeTab, setActiveTab] = useState<ClientTabId>("1_inicio");
  const [modelos, setModelos] = useState<{ id: string; titulo: string }[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [temComprovante, setTemComprovante] = useState(false);

  const link = cliente.links_temporarios?.[0] || {
    id: cliente.id,
    token: "tok_padrao",
    expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    segundos_restantes: 18000,
    bloqueado_manualmente: false,
  };

  const verificarComprovante = useCallback(() => {
    const comp = obterComprovantePix(cliente.id) || obterComprovantePix(link.token);
    setTemComprovante(Boolean(comp));
  }, [cliente.id, link.token]);

  useEffect(() => {
    listarModelosContrato()
      .then((data) => setModelos(Array.isArray(data) ? data : []))
      .catch(() => setModelos([]));

    verificarComprovante();

    const onEventosCliente = () => {
      onClienteAtualizado();
      verificarComprovante();
    };

    const onProjetoExcluido = (e: any) => {
      if (e?.detail?.clienteId === cliente.id) {
        onVoltar();
      }
    };

    window.addEventListener("wrmax:cadastro_submetido", onEventosCliente);
    window.addEventListener("wrmax:comprovante_pix_enviado", onEventosCliente);
    window.addEventListener("wrmax:contrato_assinado_enviado", onEventosCliente);
    window.addEventListener("wrmax:pix_status_atualizado", onEventosCliente);
    window.addEventListener("wrmax:projeto_excluido", onProjetoExcluido);
    window.addEventListener("storage", onEventosCliente);

    return () => {
      window.removeEventListener("wrmax:cadastro_submetido", onEventosCliente);
      window.removeEventListener("wrmax:comprovante_pix_enviado", onEventosCliente);
      window.removeEventListener("wrmax:contrato_assinado_enviado", onEventosCliente);
      window.removeEventListener("wrmax:pix_status_atualizado", onEventosCliente);
      window.removeEventListener("wrmax:projeto_excluido", onProjetoExcluido);
      window.removeEventListener("storage", onEventosCliente);
    };
  }, [cliente.id, onClienteAtualizado, onVoltar, verificarComprovante]);

  const handleToggleBloqueio = async () => {
    setLoadingAction(true);
    try {
      if (link.bloqueado_manualmente || cliente.status === "bloqueado") {
        await desbloquearLink(link.id);
      } else {
        await bloquearLink(link.id);
      }
      await onClienteAtualizado();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleProrrogar = async (minutos: number) => {
    setLoadingAction(true);
    try {
      await prorrogarLink(link.id, minutos);
      await onClienteAtualizado();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleExcluirLink = async () => {
    setLoadingAction(true);
    try {
      await excluirLinkTemporario(link.id);
      await onClienteAtualizado();
      onVoltar();
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecalho unificado com botao unico de voltar */}
      <WorkspaceHeader
        clienteNome={cliente.nome_completo}
        clienteEmail={cliente.email}
        clienteWhatsapp={cliente.whatsapp}
        status={cliente.status}
        pixPago={Boolean(cliente.pix_pago)}
        temComprovantePix={temComprovante}
        loadingAction={loadingAction}
        onBack={onVoltar}
        onTogglePix={async (pago) => {
          setLoadingAction(true);
          try {
            await atualizarStatusPix(cliente.id, pago);
            await onClienteAtualizado();
          } finally {
            setLoadingAction(false);
          }
        }}
      />

      {/* Navegacao sequencial numerada de 1 a 9 com fontes aumentadas e scroll suave */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2.5 border-b border-border/60 scrollbar-thin">
        {CLIENT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-bold shadow-md"
                : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === "1_inicio" && (
          <WorkspaceLinkPanel
            link={link}
            clienteNome={cliente.nome_completo}
            linkOnboardingForm={cliente.link_onboarding_form}
            loadingAction={loadingAction}
            onProrrogar={handleProrrogar}
            onToggleBloqueio={handleToggleBloqueio}
            onExcluir={handleExcluirLink}
            onSalvarLinkOnboarding={async (url) => {
              await atualizarProjeto(cliente.id, {
                nome_completo: cliente.nome_completo,
                link_onboarding_form: url || null,
              });
              await onClienteAtualizado();
            }}
          />
        )}

        {activeTab === "2_apresentacao" && (
          <WorkspacePresentationPanel
            apresentacaoUrl={cliente.apresentacao_pdf_url}
            apresentacaoNome={cliente.apresentacao_pdf_nome}
            onUpload={async (f) => {
              await atualizarApresentacaoCliente(cliente.id, f);
              await onClienteAtualizado();
            }}
          />
        )}

        {activeTab === "3_pix" && (
          <WorkspacePixPanel
            clienteId={cliente.id}
            clienteNome={cliente.nome_completo}
            pixPago={Boolean(cliente.pix_pago)}
            whatsapp={cliente.whatsapp}
            onStatusAlterado={async () => {
              await onClienteAtualizado();
            }}
          />
        )}

        {activeTab === "4_cadastro" && (
          <WorkspaceCadastralPanel
            dadosCadastrais={cliente.dados_cadastrais_cliente?.[0] || null}
            clienteId={cliente.id}
            linkToken={link.token}
          />
        )}

        {activeTab === "5_contrato" && (
          <WorkspaceContractPanel
            clienteId={cliente.id}
            clienteNome={cliente.nome_completo}
            contrato={cliente.contratos?.[0] || null}
            modelos={modelos}
            onEmitirContrato={async (modId, val, dia) => {
              await emitirEEnviarContrato(cliente.id, modId || null, val, dia);
              await onClienteAtualizado();
            }}
          />
        )}

        {activeTab === "6_boas_vindas" && (
          <WorkspaceStageTab stageIndex={3} clienteId={cliente.id} clienteNome={cliente.nome_completo} />
        )}

        {activeTab === "7_3_dias_uteis" && (
          <WorkspaceStageTab stageIndex={4} clienteId={cliente.id} clienteNome={cliente.nome_completo} />
        )}

        {activeTab === "8_estrategia" && (
          <WorkspaceStageTab stageIndex={5} clienteId={cliente.id} clienteNome={cliente.nome_completo} />
        )}

        {activeTab === "9_producao" && (
          <WorkspaceStageTab stageIndex={6} clienteId={cliente.id} clienteNome={cliente.nome_completo} />
        )}
      </div>
    </div>
  );
}
