import { useState, useEffect, type FormEvent } from "react";
import { UserPlus, Link as LinkIcon, Copy, Check, Loader2, FileUp, X, Calendar, Lock, FolderOpen } from "lucide-react";
import { criarClienteComLink } from "@/lib/supabase";

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
    try {
      const res = await criarClienteComLink(
        nome.trim(),
        email.trim(),
        whatsapp.trim(),
        pdfFile || undefined,
        dataProgramacao || undefined,
        linkOnboardingForm || undefined
      );
      setLinkGerado(res.linkCompleto);
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error(err);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="metal-panel max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 border-primary/30 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 id="create-project-title" className="font-bold text-base text-foreground flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            Novo Projeto / Cliente
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground font-mono cursor-pointer p-1 rounded-md"
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
                className="metal-button h-10 px-4 rounded-lg text-xs font-bold text-primary-foreground flex items-center gap-1.5 cursor-pointer"
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
            {/* Registro da Data de Criacao */}
            <div className="p-3 rounded-lg border border-border/60 bg-secondary/30 flex items-center justify-between text-xs">
              <span className="font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                <Lock className="size-3 text-amber-400" />
                Data de Criação (Registrada Automaticamente)
              </span>
              <span className="font-mono font-bold text-foreground">{hojeFormatado}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Nome do Projeto ou da Pessoa *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: WRMax Lançamento ou Dr. Lucas Clímaco"
                required
                className="w-full h-10 px-3 rounded-lg bg-secondary/20 border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                Programação do Onboarding ou Apresentação ao Cliente
              </label>
              <input
                type="datetime-local"
                value={dataProgramacao}
                onChange={(e) => setDataProgramacao(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-secondary/20 border border-border text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  className="w-full h-10 px-3 rounded-lg bg-secondary/20 border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(86) 99999-9999"
                  className="w-full h-10 px-3 rounded-lg bg-secondary/20 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FolderOpen className="size-3.5 text-primary" />
                Link de Onboarding do Cliente (Google Forms)
              </label>
              <input
                type="url"
                value={linkOnboardingForm}
                onChange={(e) => setLinkOnboardingForm(e.target.value)}
                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                className="w-full h-10 px-3 rounded-lg bg-secondary/20 border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground block">
                Deixe em branco para usar o formulário de onboarding padrão da WRMax.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Apresentação Comercial em PDF (opcional)
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/20 hover:border-primary/50 text-xs text-muted-foreground cursor-pointer transition-colors">
                <FileUp className="size-4 text-primary shrink-0" />
                <span className="truncate">{pdfFile ? pdfFile.name : "Clique para selecionar o PDF da apresentação..."}</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => e.target.files && setPdfFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
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
                className="metal-button h-10 px-5 rounded-lg text-xs sm:text-sm font-bold text-primary-foreground flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <LinkIcon className="size-3.5" />}
                <span>{submitting ? "Cadastrando..." : "Cadastrar e Gerar Link"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
