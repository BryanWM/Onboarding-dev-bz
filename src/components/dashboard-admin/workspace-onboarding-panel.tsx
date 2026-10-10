import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  FolderOpen,
  Loader2,
  RotateCcw,
  Save,
  UserCheck,
} from "lucide-react";

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

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="size-5 text-primary" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">Onboarding do Cliente (Etapa 3)</h2>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-mono self-start sm:self-auto flex items-center gap-1.5 ${
            confirmado
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-secondary text-muted-foreground border border-border"
          }`}
        >
          {confirmado ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
          {confirmado ? "ONBOARDING PREENCHIDO" : "AGUARDANDO PREENCHIMENTO"}
        </span>
      </div>

      {/* Confirmacao do preenchimento */}
      <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
          <UserCheck className="size-4 text-primary" />
          Confirmação de Preenchimento do Formulário
        </h3>

        {confirmado ? (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">
                  {confirmadoPor === "gestor" ? "Marcado como preenchido pelo gestor" : "Confirmado pelo cliente na Central"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Em {new Date(confirmadoEm as string).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleMarcar(false)}
              disabled={marcando}
              className="px-3.5 py-2 rounded-lg border border-border bg-secondary/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {marcando ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              <span>Desfazer confirmação</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-dashed border-border/80 bg-background/50 text-xs sm:text-sm text-muted-foreground flex items-start gap-2.5">
              <Clock className="size-4 shrink-0 mt-0.5" />
              <span>
                {abertoEm
                  ? `{clienteNome} abriu o formulário em ${new Date(abertoEm).toLocaleString("pt-BR")}, mas ainda não confirmou o preenchimento.`
                  : `{clienteNome} ainda não abriu o formulário.`}{" "}
                A confirmação é liberada para o cliente alguns minutos depois que ele abre o formulário na Central.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleMarcar(true)}
              disabled={marcando}
              className="metal-button w-full h-11 rounded-lg text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {marcando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>{marcando ? "Salvando..." : "Marcar como preenchido"}</span>
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Use depois de conferir as respostas no Google Forms, caso o cliente não tenha confirmado pela Central.
            </p>
          </div>
        )}
      </div>

      {/* Link do Google Forms */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">Questionário de Onboarding (Google Forms)</h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/25 self-start sm:self-auto">
            {linkOnboardingForm ? "Link Personalizado" : "Link Padrão WRMax"}
          </span>
        </div>

        {/forms\.gle\//.test(formsUrl) && (
          <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
            Link encurtado (forms.gle) pode não abrir dentro da plataforma. Prefira o link completo
            (docs.google.com/forms/.../viewform) para o formulário abrir no modal da Central.
          </p>
        )}

        {editando ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary font-mono"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSalvarUrl}
                disabled={salvandoUrl}
                className="glass-button h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="size-3.5" />
                <span>{salvandoUrl ? "Salvando..." : "Salvar"}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="h-10 px-3 rounded-lg border border-border bg-secondary/30 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-border bg-background/80 text-xs sm:text-sm font-mono">
            <span className="truncate flex-1 text-foreground/90 font-medium">{formsUrl}</span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={formsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer flex items-center gap-1.5 border border-border font-sans text-xs font-semibold"
              >
                <ExternalLink className="size-3.5 text-primary" />
                <span>Abrir</span>
              </a>
              <button
                type="button"
                onClick={handleCopiar}
                className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer flex items-center gap-1.5 border border-border font-sans text-xs font-semibold"
              >
                {copiado ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copiado ? "Copiado!" : "Copiar"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrlInput(linkOnboardingForm || "");
                  setEditando(true);
                }}
                className="px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-1.5 font-sans text-xs font-semibold"
              >
                <Edit2 className="size-3.5" />
                <span>Alterar Link</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
