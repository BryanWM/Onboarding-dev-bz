import { useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Portal } from "@/components/portal";
import { useTravarRolagem } from "@/lib/use-travar-rolagem";

interface ProjectDeleteModalProps {
  open: boolean;
  clienteNome: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  loading?: boolean;
}

export function ProjectDeleteModal({
  open,
  clienteNome,
  onConfirm,
  onClose,
  loading = false,
}: ProjectDeleteModalProps) {
  useTravarRolagem(open);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-project-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="metal-panel max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 border-destructive/40 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar modal"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded-md"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="size-11 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 id="delete-project-title" className="font-bold text-base sm:text-lg text-foreground">
              Excluir Projeto
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dupla verificação de exclusão definitiva
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-foreground/90">
          <p>
            Tem certeza de que deseja excluir permanentemente o projeto de{" "}
            <strong className="text-foreground font-mono text-destructive">
              {clienteNome || "este cliente"}
            </strong>
            ?
          </p>
          <p className="text-xs text-muted-foreground">
            Esta ação excluirá todos os vínculos, incluindo o link temporário de acesso, apresentação enviada, dados cadastrais e minutas contratuais. Esta operação não pode ser desfeita.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg border border-border bg-secondary/40 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            <span>{loading ? "Excluindo Projeto..." : "Sim, Excluir Projeto"}</span>
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
