import { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface LinkDeleteModalProps {
  open: boolean;
  clienteNome: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function LinkDeleteModal({
  open,
  clienteNome,
  onConfirm,
  onClose,
  loading = false,
}: LinkDeleteModalProps) {
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
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

        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 id="delete-modal-title" className="font-bold text-base text-foreground">
              Excluir Link Temporário
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dupla verificação de segurança do sistema
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive space-y-2">
          <p className="font-semibold">
            Tem certeza que deseja excluir o link de acesso de &ldquo;{clienteNome}&rdquo;?
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Esta ação revogará permanentemente o token criptográfico. O cliente perderá imediatamente o acesso à Central e qualquer sessão ativa será encerrada.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-xs font-semibold text-destructive-foreground transition-colors flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            {loading ? "Excluindo..." : "Confirmar Exclusão Definitiva"}
          </button>
        </div>
      </div>
    </div>
  );
}
