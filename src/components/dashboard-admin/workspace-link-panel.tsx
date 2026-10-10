import { useState } from "react";
import { Clock, Check, Copy, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { LinkDeleteModal } from "./link-delete-modal";

// O link do Google Forms e a confirmacao do onboarding ficam na aba
// "3. Onboard" (workspace-onboarding-panel.tsx).
interface WorkspaceLinkPanelProps {
  link?: {
    id: string;
    token: string;
    expira_em?: string;
    bloqueado_manualmente?: boolean;
    segundos_restantes?: number;
  } | null;
  clienteNome: string;
  loadingAction?: boolean;
  onProrrogar: (minutos: number) => Promise<void> | void;
  onToggleBloqueio: () => Promise<void> | void;
  onExcluir: () => Promise<void> | void;
}

export function WorkspaceLinkPanel({
  link,
  clienteNome,
  loadingAction = false,
  onProrrogar,
  onToggleBloqueio,
  onExcluir,
}: WorkspaceLinkPanelProps) {
  const [copied, setCopied] = useState(false);
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

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <Clock className="size-5 text-primary" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Link Temporário de Acesso do Cliente (Etapa 0)
          </h2>
        </div>
        {link && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono self-start sm:self-auto ${
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
              className={`h-10 px-4 rounded-lg text-xs sm:text-sm font-mono transition-colors flex items-center gap-2 cursor-pointer ${
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
