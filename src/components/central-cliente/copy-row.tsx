import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyRowProps {
  label: string;
  value: string;
}

export function CopyRow({ label, value }: CopyRowProps) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {copiado && (
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            Copiado!
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/25 px-3 py-2 max-w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p
            className="truncate font-mono text-xs text-foreground/90 select-all"
            title={value}
          >
            {value}
          </p>
        </div>

        <button
          type="button"
          onClick={copiar}
          aria-label={`Copiar ${label}`}
          title="Copiar para área de transferência"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/50 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary cursor-pointer shadow-sm"
        >
          {copiado ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
