import { useRef, useState } from "react";
import { ArrowUpRight, FileText, Upload } from "lucide-react";
import { SlotHeader } from "./slot-header";

export function SlotContrato() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<{ nome: string; url: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setArquivo({ nome: f.name, url: URL.createObjectURL(f) });
    }
  };

  return (
    <section className="metal-panel p-6">
      <SlotHeader
        index="01"
        icon={<FileText className="size-4" />}
        title="Contrato da reunião"
        subtitle="Importe aqui o contrato apresentado na nossa reunião para visualizar e revisar."
      />
      <div className="mt-5">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          data-testid="input-contrato-file"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border bg-input/20 px-4 py-10 text-center transition-colors hover:border-primary/50"
        >
          <Upload className="size-5 text-primary" />
          <span className="text-sm font-semibold">Importar contrato</span>
          <span className="text-xs text-muted-foreground">PDF ou Word, até 20 MB</span>
        </button>

        {arquivo && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-input/30 p-3">
            <span className="truncate text-sm">{arquivo.nome}</span>
            <a
              href={arquivo.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              Abrir <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
