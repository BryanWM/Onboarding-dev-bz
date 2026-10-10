import { AlertTriangle, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ContractConfirmModalProps {
  open: boolean;
  clienteNome: string;
  valorMensal: number;
  diaVencimento: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function ContractConfirmModal({
  open,
  clienteNome,
  valorMensal,
  diaVencimento,
  onConfirm,
  onClose,
}: ContractConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="metal-panel max-w-md w-full p-6 space-y-5 border-amber-500/40 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="size-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Confirmar Substituição de Contrato</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Duplo check de segurança operacional</p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 space-y-2">
          <p className="font-semibold text-foreground">Deseja substituir o contrato de &ldquo;{clienteNome}&rdquo;?</p>
          <p className="text-muted-foreground leading-relaxed">
            Novo valor: <strong className="text-foreground">{formatCurrency(valorMensal)}</strong> com vencimento todo dia <strong className="text-foreground">{diaVencimento}</strong>.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            A minuta anterior será imediatamente revogada e o novo documento ficará disponível para o cliente na Central.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="metal-button px-4 py-2.5 rounded-lg text-xs font-semibold text-primary-foreground cursor-pointer shadow-md"
          >
            Confirmar e Substituir Minuta
          </button>
        </div>
      </div>
    </div>
  );
}
