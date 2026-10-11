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
  FolderOpen,
  ArrowRight,
  PartyPopper,
} from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceLinkPanel } from "./workspace-link-panel";
import { WorkspacePresentationPanel } from "./workspace-presentation-panel";
import { WorkspaceCadastralPanel } from "./workspace-cadastral-panel";
import { WorkspaceContractPanel, type ModeloContrato } from "./workspace-contract-panel";
import { WorkspaceStageTab } from "./workspace-stage-tab";
import { WorkspacePixPanel } from "./workspace-pix-panel";
import { WorkspaceOnboardingPanel } from "./workspace-onboarding-panel";
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
  marcarOnboardingGestor,
  anexarContratoManual,
  liberarContratoCliente,
  validarViaAssinada,
  removerViaAssinada,
} from "@/lib/supabase";
import { contratoFechado, type Setor } from "@/lib/fase-projeto";

export type ClientTabId =
  | "1_inicio"
  | "2_apresentacao"
  | "3_pix"
  | "3b_onboard"
  | "4_cadastro"
  | "5_contrato"
  | "6_boas_vindas"
  | "7_3_dias_uteis"
  | "8_estrategia"
  | "9_producao";

interface ClientFocusedViewProps {
  cliente: ClienteOnboarding;
  setor?: Setor;
  onVoltar: () => void;
  onClienteAtualizado: () => Promise<void>;
  onIrParaSetor?: (setor: Setor) => void;
}

const CLIENT_TABS: { id: ClientTabId; label: string; icon: React.ReactNode; setor: Setor }[] = [
  { id: "1_inicio", label: "0. Início", icon: <LayoutDashboard className="size-4" />, setor: "comercial" },
  { id: "2_apresentacao", label: "1. Apresentação", icon: <FileText className="size-4" />, setor: "comercial" },
  { id: "3_pix", label: "2. PIX", icon: <QrCode className="size-4" />, setor: "comercial" },
  { id: "3b_onboard", label: "3. Onboard", icon: <FolderOpen className="size-4" />, setor: "comercial" },
  { id: "4_cadastro", label: "4. Dados Cadastrais", icon: <UserCheck className="size-4" />, setor: "comercial" },
  { id: "5_contrato", label: "5. Contrato", icon: <ScrollText className="size-4" />, setor: "comercial" },
  { id: "6_boas_vindas", label: "6. Boas-Vindas", icon: <Sparkles className="size-4" />, setor: "producao" },
  { id: "7_3_dias_uteis", label: "7. 3 Dias Úteis", icon: <Calendar className="size-4" />, setor: "producao" },
  { id: "8_estrategia", label: "8. Estratégia", icon: <Layers className="size-4" />, setor: "producao" },
  { id: "9_producao", label: "9. Produção", icon: <Layers className="size-4" />, setor: "producao" },
];

export function ClientFocusedView({
  cliente,
  setor = "comercial",
  onVoltar,
  onClienteAtualizado,
  onIrParaSetor,
}: ClientFocusedViewProps) {
  // Comercial ve as etapas 0-5; Producao, de Boas-vindas em diante.
  const abas = CLIENT_TABS.filter((t) => t.setor === setor);
  const [activeTab, setActiveTab] = useState<ClientTabId>(abas[0]!.id);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const fechado = contratoFechado(cliente);

  useEffect(() => {
    if (!abas.some((t) => t.id === activeTab)) setActiveTab(abas[0]!.id);
  }, [setor]);
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
    const comp =
      cliente.comprovante_pix_path || obterComprovantePix(cliente.id) || obterComprovantePix(link.token);
    setTemComprovante(Boolean(comp));
  }, [cliente.id, cliente.comprovante_pix_path, link.token]);

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

  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const executarAcao = async (acao: () => Promise<unknown>) => {
    setLoadingAction(true);
    setErroAcao(null);
    try {
      await acao();
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleBloqueio = () =>
    executarAcao(async () => {
      if (link.bloqueado_manualmente || cliente.status === "bloqueado") {
        await desbloquearLink(link.id);
      } else {
        await bloquearLink(link.id);
      }
      await onClienteAtualizado();
    });

  const handleProrrogar = (minutos: number) =>
    executarAcao(async () => {
      await prorrogarLink(link.id, minutos);
      await onClienteAtualizado();
    });

  const handleExcluirLink = () =>
    executarAcao(async () => {
      await excluirLinkTemporario(link.id);
      await onClienteAtualizado();
      onVoltar();
    });

  return (
    <div className="space-y-6">
      {/* Cabecalho unificado com botao unico de voltar */}
      <WorkspaceHeader
        clienteNome={cliente.nome_completo}
        clienteEmail={cliente.email}
        clienteWhatsapp={cliente.whatsapp}
        status={cliente.status}
        onBack={onVoltar}
      />

      {erroAcao && (
        <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {erroAcao}
        </div>
      )}

      {setor === "comercial" && fechado && (
        <div role="status" className="chip-ouro rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm flex items-center gap-2.5">
            <PartyPopper className="size-4 shrink-0" />
            <span>Contrato fechado. Este projeto também está com a <strong>Produção</strong>.</span>
          </p>
          {onIrParaSetor && (
            <button
              type="button"
              onClick={() => onIrParaSetor("producao")}
              className="glass-button h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              Abrir na Produção <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Navegacao numerada: o setor ve so as suas etapas */}
      {/* Abas sublinhadas: so o fio da aba ativa e o numero dela em dourado */}
      <nav aria-label="Etapas do cliente" className="flex items-center gap-6 sm:gap-7 overflow-x-auto border-b border-[var(--linha)] scrollbar-none">
        {abas.map((tab) => {
          const [numero, nome] = tab.label.split(". ");
          const ativa = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={ativa ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`h-12 -mb-px flex items-center gap-2 border-b-2 text-sm transition-colors cursor-pointer shrink-0 ${
                ativa
                  ? "border-[var(--ouro)] text-foreground font-semibold"
                  : "border-transparent text-muted-foreground font-semibold hover:text-foreground"
              }`}
            >
              <span className={`font-mono text-xs ${ativa ? "text-[var(--ouro)]" : "text-[#8c836f]"}`}>{numero}</span>
              <span>{nome}</span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-6">
        {activeTab === "1_inicio" && (
          <WorkspaceLinkPanel
            link={link}
            clienteNome={cliente.nome_completo}
            loadingAction={loadingAction}
            onProrrogar={handleProrrogar}
            onToggleBloqueio={handleToggleBloqueio}
            onExcluir={handleExcluirLink}
          />
        )}

        {activeTab === "2_apresentacao" && (
          <WorkspacePresentationPanel
            apresentacaoUrl={cliente.apresentacao_pdf_url}
            apresentacaoNome={cliente.apresentacao_pdf_nome}
            onUpload={(f) =>
              executarAcao(async () => {
                await atualizarApresentacaoCliente(cliente.id, f);
                await onClienteAtualizado();
              })
            }
          />
        )}

        {activeTab === "3_pix" && (
          <WorkspacePixPanel
            clienteId={cliente.id}
            clienteNome={cliente.nome_completo}
            pixPago={Boolean(cliente.pix_pago)}
            whatsapp={cliente.whatsapp}
            comprovanteRef={cliente.comprovante_pix_path}
            comprovanteNome={cliente.comprovante_pix_nome}
            comprovanteEnviadoEm={cliente.comprovante_pix_enviado_em}
            onStatusAlterado={async () => {
              await onClienteAtualizado();
            }}
          />
        )}

        {activeTab === "3b_onboard" && (
          <WorkspaceOnboardingPanel
            clienteNome={cliente.nome_completo}
            linkOnboardingForm={cliente.link_onboarding_form}
            abertoEm={cliente.onboarding_aberto_em}
            confirmadoEm={cliente.onboarding_confirmado_em}
            confirmadoPor={cliente.onboarding_confirmado_por}
            onSalvarLinkOnboarding={(url) =>
              executarAcao(async () => {
                await atualizarProjeto(cliente.id, {
                  nome_completo: cliente.nome_completo,
                  link_onboarding_form: url || null,
                });
                await onClienteAtualizado();
              })
            }
            onMarcarPreenchido={(preenchido) =>
              executarAcao(async () => {
                await marcarOnboardingGestor(cliente.id, preenchido);
                await onClienteAtualizado();
              })
            }
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
            clienteEmail={cliente.email}
            contrato={cliente.contratos?.[0] || null}
            modelos={modelos}
            dadosCadastrais={cliente.dados_cadastrais_cliente?.[0] || null}
            onAnexarManual={(file, valor, dia) =>
              executarAcao(async () => {
                await anexarContratoManual(cliente.id, file, valor, dia);
                await onClienteAtualizado();
              })
            }
            onLiberarContrato={(contratoId) =>
              executarAcao(async () => {
                await liberarContratoCliente(contratoId);
                await onClienteAtualizado();
              })
            }
            onValidarVia={(contratoId) =>
              executarAcao(async () => {
                await validarViaAssinada(contratoId);
                await onClienteAtualizado();
              })
            }
            onRemoverVia={(contratoId, ref) =>
              executarAcao(async () => {
                await removerViaAssinada(contratoId, ref);
                await onClienteAtualizado();
              })
            }
            onEmitirContrato={(modId, val, dia) =>
              executarAcao(async () => {
                await emitirEEnviarContrato(cliente.id, modId || null, val, dia);
                await onClienteAtualizado();
              })
            }
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
