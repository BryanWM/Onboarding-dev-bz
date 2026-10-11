import { useEffect } from "react";
import { ArrowUpRight, Save, X } from "lucide-react";
import { Portal } from "@/components/portal";
import { useTravarRolagem } from "@/lib/use-travar-rolagem";

// Google Forms aceita ser embutido com ?embedded=true
export function urlFormularioEmbutido(url: string) {
  if (!/docs\.google\.com\/forms\//.test(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("embedded", "true");
    return u.toString();
  } catch {
    return url;
  }
}

interface OnboardingFormModalProps {
  open: boolean;
  formUrl: string;
  onClose: () => void;
}

export function OnboardingFormModal({ open, formUrl, onClose }: OnboardingFormModalProps) {
  useTravarRolagem(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[60] bg-[rgba(4,3,2,0.72)] backdrop-blur-md flex items-stretch sm:items-center justify-center sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-titulo"
        className="metal-panel !bg-[var(--card)] w-full sm:max-w-3xl h-full sm:h-[min(88vh,860px)] !rounded-none sm:!rounded-[18px] flex flex-col overflow-hidden"
      >
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[var(--linha)]">
          <div className="min-w-0 space-y-1">
            <h2 id="onboarding-modal-titulo" className="text-base sm:text-lg font-bold text-foreground">
              Formulário de onboarding
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <Save className="size-3.5 shrink-0 mt-0.5 text-primary" />
              <span>
                Para salvar e continuar depois, entre com sua conta Google: o formulário guarda o rascunho das respostas
                automaticamente.{" "}
                <a href={formUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">
                  Abrir no Google <ArrowUpRight className="size-3" />
                </a>
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="glass-button size-9 shrink-0 rounded-lg grid place-items-center cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        <iframe
          title="Formulário de onboarding WRMax"
          src={urlFormularioEmbutido(formUrl)}
          className="flex-1 w-full bg-white"
        />

        <footer className="px-5 sm:px-6 py-3 border-t border-[var(--linha)] flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">Depois de enviar no Google, feche e confirme o preenchimento.</p>
          <button
            type="button"
            onClick={onClose}
            className="glass-button h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
    </Portal>
  );
}
