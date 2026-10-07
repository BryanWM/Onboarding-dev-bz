import { useState } from "react";
import { Clock, Check, Copy, ShieldAlert, ShieldCheck, Trash2, FolderOpen, ExternalLink, Edit2, Save } from "lucide-react";
import { LinkDeleteModal } from "./link-delete-modal";

const FORM_ONBOARDING_DEFAULT =
  "https://docs.google.com/forms/d/e/1FAIpQLSdyJjJicNhDIqPgkUSgEHwovvbywPsazFhWcPV3mJCVkobErg/viewform";

interface WorkspaceLinkPanelProps {
  link?: {
    id: string;
    token: string;
    expira_em?: string;
    bloqueado_manualmente?: boolean;
    segundos_restantes?: number;
  } | null;
  clienteNome: string;
  linkOnboardingForm?: string | null;
  loadingAction?: boolean;
  onProrrogar: (minutos: number) => Promise<void> | void;
  onToggleBloqueio: () => Promise<void> | void;
  onExcluir: () => Promise<void> | void;
  onSalvarLinkOnboarding?: (url: string) => Promise<void> | void;
}

export function WorkspaceLinkPanel({
  link,
  clienteNome,
  linkOnboardingForm,
  loadingAction = false,
  onProrrogar,
  onToggleBloqueio,
  onExcluir,
  onSalvarLinkOnboarding,
}: WorkspaceLinkPanelProps) {
  const [copied, setCopied] = useState(false);
  const [copiedForms, setCopiedForms] = useState(false);
  const [editandoForms, setEditandoForms] = useState(false);
  const [formsUrlInput, setFormsUrlInput] = useState(linkOnboardingForm || "");
  const [salvandoForms, setSalvandoForms] = useState(false);
  const [modalDeleteAberto, setModalDeleteAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const baseOrigin = typeof window !== "undefined"
    ? (window.location.port === "8081" ? "http://localhost:8080" : window.location.origin)
    : "http://localhost:8080";
  const linkUrl = link ? `${baseOrigin}/c/${link.token}` : "";
  const isBloqueado = Boolean(link?.bloqueado_manualmente);
  const isExpirado = link?.expira_em ? new Date(link.expira_em) <= new Date() : false;

  const handleCopy = () => {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calcularTempoRestante = () => {
    if (!link || isBloqueado) return null;
    if (!link.expira_em) return "Sem validade definida";
    const diff = new Date(link.expira_em).getTime() - Date.now();
    if (diff <= 0) return "Expirado";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m restantes`;
  };

  const handleConfirmarExclusao = async () => {
    setExcluindo(true);
    try {
      await onExcluir();
    } finally {
      setExcluindo(false);
      setModalDeleteAberto(false);
    }
  };

  const currentFormsUrl = (linkOnboardingForm && linkOnboardingForm.trim()) || FORM_ONBOARDING_DEFAULT;

  const handleCopyForms = () => {
    navigator.clipboard.writeText(currentFormsUrl);
    setCopiedForms(true);
    setTimeout(() => setCopiedForms(false), 2000);
  };

  const handleSalvarForms = async () => {
    if (!onSalvarLinkOnboarding) return;
    setSalvandoForms(true);
    try {
      await onSalvarLinkOnboarding(formsUrlInput.trim());
      setEditandoForms(false);
    } finally {
      setSalvandoForms(false);
    }
  };

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <Clock className="size-5 text-primary" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Link Temporário de Acesso do Cliente (Etapa 1)
          </h2>
        </div>
        {link && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold self-start sm:self-auto ${
              isBloqueado
                ? "bg-destructive/15 text-destructive border border-destructive/30"
                : isExpirado
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {isBloqueado ? "BLOQUEADO" : isExpirado ? "EXPIRADO" : `ATIVO (${calcularTempoRestante()})`}
          </span>
        )}
      </div>

      {link ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-border bg-background/80 text-sm font-mono">
            <span className="truncate flex-1 text-foreground/90 font-medium">{linkUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-border font-sans text-sm font-semibold shadow-sm"
            >
              {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              <span>{copied ? "Copiado!" : "Copiar Link"}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onProrrogar(30)}
                disabled={loadingAction}
                className="h-10 px-3.5 rounded-lg border border-border bg-secondary/50 text-xs sm:text-sm font-mono hover:bg-secondary cursor-pointer transition-colors"
              >
                +30 min
              </button>
              <button
                type="button"
                onClick={() => onProrrogar(60)}
                disabled={loadingAction}
                className="h-10 px-3.5 rounded-lg border border-border bg-secondary/50 text-xs sm:text-sm font-mono hover:bg-secondary cursor-pointer transition-colors"
              >
                +1 hora
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleBloqueio}
              disabled={loadingAction}
              className={`h-10 px-4 rounded-lg text-xs sm:text-sm font-mono font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                isBloqueado
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                  : "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25"
              }`}
            >
              {isBloqueado ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
              <span>{isBloqueado ? "Desbloquear Acesso" : "Bloquear Acesso"}</span>
            </button>

            <button
              type="button"
              onClick={() => setModalDeleteAberto(true)}
              disabled={loadingAction}
              className="h-10 px-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs sm:text-sm font-mono hover:bg-destructive/20 cursor-pointer ml-auto flex items-center gap-1.5"
            >
              <Trash2 className="size-4" />
              <span>Excluir Link</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum link temporário ativo para este cliente.</p>
      )}

      {/* Secao de Gestao do Link de Onboarding (Google Forms) */}
      <div className="pt-5 border-t border-border/60 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="size-5 text-primary" />
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Questionário de Onboarding (Google Forms)
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/25 self-start sm:self-auto">
            {linkOnboardingForm ? "Link Personalizado" : "Link Padrão WRMax"}
          </span>
        </div>

        {editandoForms ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="url"
              value={formsUrlInput}
              onChange={(e) => setFormsUrlInput(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary font-mono"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSalvarForms}
                disabled={salvandoForms}
                className="metal-button h-10 px-4 rounded-lg text-xs font-bold text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="size-3.5" />
                <span>{salvandoForms ? "Salvando..." : "Salvar"}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditandoForms(false)}
                className="h-10 px-3 rounded-lg border border-border bg-secondary/30 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-border bg-background/80 text-xs sm:text-sm font-mono">
            <span className="truncate flex-1 text-foreground/90 font-medium">
              {currentFormsUrl}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={currentFormsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer flex items-center gap-1.5 border border-border font-sans text-xs font-semibold"
              >
                <ExternalLink className="size-3.5 text-primary" />
                <span>Abrir</span>
              </a>
              <button
                type="button"
                onClick={handleCopyForms}
                className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer flex items-center gap-1.5 border border-border font-sans text-xs font-semibold"
              >
                {copiedForms ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copiedForms ? "Copiado!" : "Copiar"}</span>
              </button>
              {onSalvarLinkOnboarding && (
                <button
                  type="button"
                  onClick={() => {
                    setFormsUrlInput(linkOnboardingForm || "");
                    setEditandoForms(true);
                  }}
                  className="px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-1.5 font-sans text-xs font-semibold"
                >
                  <Edit2 className="size-3.5" />
                  <span>Alterar Link</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <LinkDeleteModal
        open={modalDeleteAberto}
        clienteNome={clienteNome}
        loading={excluindo}
        onConfirm={handleConfirmarExclusao}
        onClose={() => setModalDeleteAberto(false)}
      />
    </section>
  );
}
