import { useState, useEffect, type FormEvent } from "react";
import { Edit3, Save, X, Loader2, FileUp } from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { atualizarProjeto, atualizarApresentacaoCliente } from "@/lib/supabase";
import { Portal } from "@/components/portal";
import { useTravarRolagem } from "@/lib/use-travar-rolagem";

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
  useTravarRolagem(open && Boolean(cliente));

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


  const campo =
    "w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors";
  const rotulo = "block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1";

  return (
    <Portal>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Layout compacto em duas colunas: cabe na tela sem rolagem */}
      <div className="metal-panel max-w-2xl w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 border-primary/30 shadow-2xl relative">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
            <div className="sm:col-span-2">
              <label htmlFor="editar-nome" className={rotulo}>
                Nome do Projeto ou da Pessoa *
              </label>
              <input
                id="editar-nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: WRMax Lançamento ou Dr. Lucas Clímaco"
                className={campo}
              />
            </div>

            <div>
              <label htmlFor="editar-email" className={rotulo}>
                E-mail de Contato
              </label>
              <input
                id="editar-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="editar-whatsapp" className={rotulo}>
                WhatsApp
              </label>
              <input
                id="editar-whatsapp"
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(86) 99999-9999"
                className={`${campo} font-mono`}
              />
            </div>

            <div>
              <label htmlFor="editar-programacao" className={rotulo}>
                Programação do Onboarding
              </label>
              <input
                id="editar-programacao"
                type="datetime-local"
                value={dataProgramacao}
                onChange={(e) => setDataProgramacao(e.target.value)}
                className={`${campo} font-mono`}
              />
            </div>
            <div>
              <span className={rotulo}>Apresentação em PDF</span>
              <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background hover:border-primary/50 text-xs text-muted-foreground cursor-pointer transition-colors">
                <FileUp className="size-4 text-primary shrink-0" />
                <span className="truncate">
                  {pdfFile ? pdfFile.name : cliente.apresentacao_pdf_nome || "Selecionar novo PDF..."}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => e.target.files && setPdfFile(e.target.files[0] ?? null)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="editar-forms" className={rotulo}>
                Link de Onboarding (Google Forms)
              </label>
              <input
                id="editar-forms"
                type="url"
                value={linkOnboardingForm}
                onChange={(e) => setLinkOnboardingForm(e.target.value)}
                placeholder="Em branco = formulário padrão da WRMax"
                className={campo}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-3 border-t border-border/60">
            {/* Data de criacao: fixa, so informativa */}
            <span
              className="text-[11px] font-mono text-muted-foreground sm:mr-auto"
              title="Registro do sistema, não pode ser alterado"
            >
              Criado em {dataCriacaoFormatada}
            </span>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-border bg-secondary/30 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !nome}
                className="metal-button h-10 px-5 rounded-lg text-xs sm:text-sm font-semibold text-primary-foreground flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
