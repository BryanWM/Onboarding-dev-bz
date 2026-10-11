import { useState, useEffect, type FormEvent } from "react";
import { UserPlus, Link as LinkIcon, Copy, Check, Loader2, FileUp, X } from "lucide-react";
import { criarClienteComLink } from "@/lib/supabase";
import { Portal } from "@/components/portal";
import { useTravarRolagem } from "@/lib/use-travar-rolagem";

interface ClientCreateModalProps {
  open?: boolean;
  onSuccess?: () => Promise<void> | void;
  onCreated?: () => void;
  onClose: () => void;
}

export function ClientCreateModal({
  open = true,
  onSuccess,
  onCreated,
  onClose,
}: ClientCreateModalProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dataProgramacao, setDataProgramacao] = useState("");
  const [linkOnboardingForm, setLinkOnboardingForm] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useTravarRolagem(open);

  const hojeFormatado = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const handleClose = () => {
    setNome("");
    setEmail("");
    setWhatsapp("");
    setDataProgramacao("");
    setLinkOnboardingForm("");
    setPdfFile(null);
    setLinkGerado(null);
    setCopied(false);
    setSubmitting(false);
    if (onCreated) onCreated();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setNome("");
      setEmail("");
      setWhatsapp("");
      setDataProgramacao("");
      setLinkOnboardingForm("");
      setPdfFile(null);
      setLinkGerado(null);
      setCopied(false);
      setSubmitting(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || submitting) return;
    setSubmitting(true);
    setErro(null);
    try {
      const res = await criarClienteComLink(
        nome.trim(),
        email.trim(),
        whatsapp.trim(),
        pdfFile || undefined,
        dataProgramacao || undefined,
        linkOnboardingForm || undefined,
      );
      setLinkGerado(res.linkCompleto);
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!linkGerado) return;
    navigator.clipboard.writeText(linkGerado);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const campo =
    "w-full h-9 px-3 rounded-lg bg-secondary/20 border border-border text-sm text-foreground focus:outline-none focus:border-primary";
  const rotulo = "block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1";

  return (
    <Portal>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Layout compacto em duas colunas: cabe na tela sem rolagem */}
      <div className="metal-panel max-w-2xl w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 border-primary/30 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3
            id="create-project-title"
            className="font-bold text-base text-foreground flex items-center gap-2"
          >
            <UserPlus className="size-4 text-primary" />
            Novo Projeto / Cliente
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>

        {linkGerado ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-3">
            <p className="text-xs font-semibold text-emerald-400">
              Projeto cadastrado e link de acesso gerado com sucesso (validade: 5 horas):
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={linkGerado}
                className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-xs font-mono text-foreground"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="metal-button h-10 px-4 rounded-lg text-xs font-semibold text-primary-foreground flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-border bg-secondary/30 text-xs text-foreground hover:bg-secondary cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
              <div className="sm:col-span-2">
                <label htmlFor="novo-nome" className={rotulo}>
                  Nome do Projeto ou da Pessoa *
                </label>
                <input
                  id="novo-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: WRMax Lançamento ou Dr. Lucas Clímaco"
                  required
                  className={campo}
                />
              </div>

              <div>
                <label htmlFor="novo-email" className={rotulo}>
                  E-mail
                </label>
                <input
                  id="novo-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  className={campo}
                />
              </div>
              <div>
                <label htmlFor="novo-whatsapp" className={rotulo}>
                  WhatsApp
                </label>
                <input
                  id="novo-whatsapp"
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(86) 99999-9999"
                  className={`${campo} font-mono`}
                />
              </div>

              <div>
                <label htmlFor="novo-programacao" className={rotulo}>
                  Programação do Onboarding
                </label>
                <input
                  id="novo-programacao"
                  type="datetime-local"
                  value={dataProgramacao}
                  onChange={(e) => setDataProgramacao(e.target.value)}
                  className={`${campo} font-mono`}
                />
              </div>
              <div>
                <span className={rotulo}>Apresentação em PDF (opcional)</span>
                <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-secondary/20 hover:border-primary/50 text-xs text-muted-foreground cursor-pointer transition-colors">
                  <FileUp className="size-4 text-primary shrink-0" />
                  <span className="truncate">{pdfFile ? pdfFile.name : "Selecionar PDF..."}</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => e.target.files && setPdfFile(e.target.files[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="novo-forms" className={rotulo}>
                  Link de Onboarding (Google Forms)
                </label>
                <input
                  id="novo-forms"
                  type="url"
                  value={linkOnboardingForm}
                  onChange={(e) => setLinkOnboardingForm(e.target.value)}
                  placeholder="Em branco = formulário padrão da WRMax"
                  className={campo}
                />
              </div>
            </div>

            {erro && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {erro}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-3 border-t border-border/60">
              {/* Data de criacao: registrada automaticamente, so informativa */}
              <span
                className="text-[11px] font-mono text-muted-foreground sm:mr-auto"
                title="Registrada automaticamente ao cadastrar"
              >
                Criado em {hojeFormatado}
              </span>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg border border-border bg-secondary/30 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !nome}
                  className="metal-button h-10 px-5 rounded-lg text-xs sm:text-sm font-semibold text-primary-foreground flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <LinkIcon className="size-3.5" />
                  )}
                  <span>{submitting ? "Cadastrando..." : "Cadastrar e Gerar Link"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
    </Portal>
  );
}
