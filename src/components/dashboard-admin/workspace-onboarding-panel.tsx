import { useState } from "react";
import { Check, CheckCircle2, Clock, Copy, Edit2, ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { CabecalhoPainel } from "./cabecalho-painel";

const FORM_ONBOARDING_DEFAULT =
  "https://docs.google.com/forms/d/e/1FAIpQLSdyJjJicNhDIqPgkUSgEHwovvbywPsazFhWcPV3mJCVkobErg/viewform";

interface WorkspaceOnboardingPanelProps {
  clienteNome: string;
  linkOnboardingForm?: string | null | undefined;
  abertoEm?: string | null | undefined;
  confirmadoEm?: string | null | undefined;
  confirmadoPor?: "cliente" | "gestor" | null | undefined;
  onSalvarLinkOnboarding: (url: string) => Promise<void> | void;
  onMarcarPreenchido: (preenchido: boolean) => Promise<void> | void;
}

export function WorkspaceOnboardingPanel({
  clienteNome,
  linkOnboardingForm,
  abertoEm = null,
  confirmadoEm = null,
  confirmadoPor = null,
  onSalvarLinkOnboarding,
  onMarcarPreenchido,
}: WorkspaceOnboardingPanelProps) {
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [urlInput, setUrlInput] = useState(linkOnboardingForm || "");
  const [salvandoUrl, setSalvandoUrl] = useState(false);
  const [marcando, setMarcando] = useState(false);

  const formsUrl = (linkOnboardingForm && linkOnboardingForm.trim()) || FORM_ONBOARDING_DEFAULT;
  const confirmado = Boolean(confirmadoEm);

  const handleCopiar = () => {
    navigator.clipboard.writeText(formsUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleSalvarUrl = async () => {
    setSalvandoUrl(true);
    try {
      await onSalvarLinkOnboarding(urlInput.trim());
      setEditando(false);
    } finally {
      setSalvandoUrl(false);
    }
  };

  const handleMarcar = async (preenchido: boolean) => {
    setMarcando(true);
    try {
      await onMarcarPreenchido(preenchido);
    } finally {
      setMarcando(false);
    }
  };

  const quando = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "");

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <CabecalhoPainel
        etapa={3}
        titulo="Onboarding"
        descricao="Formulário do Google que o cliente responde pela Central."
        status={confirmado ? { tom: "verde", texto: "Onboarding preenchido" } : { tom: "neutro", texto: "Aguardando preenchimento" }}
      />

      {/* Situacao + acao */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {confirmado ? (
          <div className="flex items-center gap-3 text-sm min-w-0">
            <CheckCircle2 className="size-5 text-[#6fd39b] shrink-0" />
            <div>
              <p className="text-foreground">
                {confirmadoPor === "gestor" ? "Marcado como preenchido pelo gestor" : "Confirmado pelo cliente na Central"}
              </p>
              <p className="text-xs text-muted-foreground">Em {quando(confirmadoEm)}</p>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" />
            {abertoEm ? `${clienteNome} abriu o formulário em ${quando(abertoEm)}.` : `${clienteNome} ainda não abriu o formulário.`}
          </p>
        )}

        {confirmado ? (
          <button
            type="button"
            onClick={() => handleMarcar(false)}
            disabled={marcando}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {marcando ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Desfazer confirmação
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleMarcar(true)}
            disabled={marcando}
            title="Use depois de conferir as respostas no Google Forms"
            className="glass-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {marcando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {marcando ? "Salvando..." : "Marcar como preenchido"}
          </button>
        )}
      </div>

      {/* Link do formulario */}
      <div className="space-y-3 border-t border-[var(--linha)] pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rotulo">Link do formulário</span>
          <span className="text-xs text-muted-foreground">{linkOnboardingForm ? "Link Personalizado" : "Link padrão WRMax"}</span>
        </div>

        {editando ? (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              aria-label="Link do Google Forms"
              className="flex-1 min-w-0 h-11 px-3.5 rounded-lg border border-[var(--linha-2)] bg-[var(--campo)] text-sm font-mono text-foreground focus:outline-none focus:border-primary"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSalvarUrl}
                disabled={salvandoUrl}
                className="glass-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="size-4" />
                {salvandoUrl ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => setEditando(false)} className="h-11 px-3 text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <span className="flex-1 min-w-0 truncate text-sm font-mono text-foreground/90">{formsUrl}</span>
            <div className="flex items-center gap-5 text-sm font-semibold shrink-0">
              <a href={formsUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                Abrir <ExternalLink className="size-3.5" />
              </a>
              <button type="button" onClick={handleCopiar} className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer">
                {copiado ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copiado ? "Copiado!" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrlInput(linkOnboardingForm || "");
                  setEditando(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="size-3.5" />
                Alterar
              </button>
            </div>
          </div>
        )}

        {/forms\.gle\//.test(formsUrl) && (
          <p className="text-xs text-amber-300">
            Link encurtado (forms.gle) pode não abrir dentro da Central. Prefira o link completo (docs.google.com/forms/.../viewform).
          </p>
        )}
      </div>
    </section>
  );
}