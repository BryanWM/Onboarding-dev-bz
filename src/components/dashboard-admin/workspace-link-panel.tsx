import { useState } from "react";
import { Check, Copy, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { LinkDeleteModal } from "./link-delete-modal";
import { CabecalhoPainel } from "./cabecalho-painel";

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

  const status = !link
    ? null
    : isBloqueado
      ? { tom: "vermelho" as const, texto: "Acesso bloqueado" }
      : isExpirado
        ? { tom: "ambar" as const, texto: "Link expirado" }
        : { tom: "verde" as const, texto: `Ativo · ${calcularTempoRestante()}` };

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <CabecalhoPainel
        etapa={0}
        titulo="Link de acesso"
        descricao="Envie este link ao cliente. Ele vale 5 horas e pode ser prorrogado."
        status={status}
      />

      {link ? (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              readOnly
              value={linkUrl}
              aria-label="Link do cliente"
              className="flex-1 min-w-0 h-11 px-3.5 rounded-lg border border-[var(--linha-2)] bg-[var(--campo)] text-sm font-mono text-foreground"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="metal-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span>{copied ? "Copiado!" : "Copiar Link"}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <span className="text-muted-foreground">Prorrogar:</span>
            <button type="button" onClick={() => onProrrogar(30)} disabled={loadingAction} className="font-semibold text-foreground hover:text-[var(--ouro)] transition-colors cursor-pointer disabled:opacity-50">
              +30 min
            </button>
            <button type="button" onClick={() => onProrrogar(60)} disabled={loadingAction} className="font-semibold text-foreground hover:text-[var(--ouro)] transition-colors cursor-pointer disabled:opacity-50">
              +1 hora
            </button>
            <span className="hidden sm:block h-4 w-px bg-[var(--linha-2)]" aria-hidden="true" />
            <button
              type="button"
              onClick={onToggleBloqueio}
              disabled={loadingAction}
              className={`font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                isBloqueado ? "text-emerald-300 hover:text-emerald-200" : "text-muted-foreground hover:text-amber-300"
              }`}
            >
              {isBloqueado ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
              {isBloqueado ? "Desbloquear acesso" : "Bloquear acesso"}
            </button>
            <button
              type="button"
              onClick={() => setModalDeleteAberto(true)}
              disabled={loadingAction}
              className="sm:ml-auto font-semibold inline-flex items-center gap-1.5 text-muted-foreground hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              Excluir link
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum link ativo para este cliente.</p>
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