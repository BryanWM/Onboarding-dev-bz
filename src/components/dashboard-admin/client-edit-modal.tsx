import { useState, useEffect, type FormEvent } from "react";
import { Edit3, Lock, Calendar, Save, X, Loader2, FolderOpen, FileUp } from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { atualizarProjeto, atualizarApresentacaoCliente } from "@/lib/supabase";

interface ClientEditModalProps {
  open: boolean;
  cliente: ClienteOnboarding | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ClientEditModal({
  open,
  cliente,
  onClose,
  onUpdated,
}: ClientEditModalProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dataProgramacao, setDataProgramacao] = useState("");
  const [linkOnboardingForm, setLinkOnboardingForm] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome_completo || "");
      setEmail(cliente.email || "");
      setWhatsapp(cliente.whatsapp || "");
      setDataProgramacao(cliente.data_programacao || "");
      setLinkOnboardingForm(cliente.link_onboarding_form || "");
      setPdfFile(null);
    }
  }, [cliente]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !cliente) return null;

  const dataCriacaoFormatada = cliente.created_at
    ? new Date(cliente.created_at).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Data não registrada";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    setSaving(true);
    try {
      await atualizarProjeto(cliente.id, {
        nome_completo: nome,
        email: email || null,
        whatsapp: whatsapp || null,
        data_programacao: dataProgramacao || null,
        link_onboarding_form: linkOnboardingForm || null,
      });
      if (pdfFile) {
        await atualizarApresentacaoCliente(cliente.id, pdfFile);
      }
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar projeto:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="metal-panel max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 border-primary/30 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 id="edit-project-title" className="font-bold text-base text-foreground flex items-center gap-2">
            <Edit3 className="size-4 text-primary" />
            Editar Projeto
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Data de Criacao: Bloqueada, nao editavel */}
          <div className="p-3 rounded-lg border border-border/70 bg-secondary/30 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase text-muted-foreground flex items-center gap-1">
                <Lock className="size-3 text-amber-400" />
                Data de Criação (Fixa e Não Editável)
              </span>
              <span className="font-mono text-foreground">{dataCriacaoFormatada}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A data de criação é um registro cronológico do sistema e não pode ser modificada.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Nome do Projeto ou da Pessoa *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: WRMax Lançamento ou Dr. Lucas Clímaco"
              className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              Programação do Onboarding / Apresentação
            </label>
            <input
              type="datetime-local"
              value={dataProgramacao}
              onChange={(e) => setDataProgramacao(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 font-mono transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                E-mail de Contato
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                WhatsApp
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(86) 99999-9999"
                className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 font-mono transition-colors"
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
              className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors"
            />
            <span className="text-[10px] text-muted-foreground block">
              Deixe em branco para usar o formulário de onboarding padrão da WRMax.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileUp className="size-3.5 text-primary" />
              Apresentação Comercial em PDF
            </label>
            <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 text-xs text-muted-foreground cursor-pointer transition-colors">
              <FileUp className="size-4 text-primary shrink-0" />
              <span className="truncate">
                {pdfFile
                  ? pdfFile.name
                  : (cliente.apresentacao_pdf_nome || "Selecionar novo PDF de apresentação...")}
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files && setPdfFile(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-border bg-secondary/30 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nome}
              className="metal-button px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-primary-foreground flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
