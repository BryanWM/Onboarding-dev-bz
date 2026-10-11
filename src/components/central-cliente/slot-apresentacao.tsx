import { useState } from "react";
import { FileText, Clock, ChevronDown } from "lucide-react";
import { SlotHeader } from "./slot-header";

interface SlotApresentacaoProps {
  apresentacaoUrl?: string | null;
  apresentacaoNome?: string | null;
}

export function SlotApresentacao({
  apresentacaoUrl,
  apresentacaoNome = "Apresentacao_Estrategica_WRMax.pdf",
}: SlotApresentacaoProps) {
  // Pre-visualizacao embutida fica recolhida: o principal e abrir o PDF
  const [preview, setPreview] = useState(false);

  return (
    <section className="metal-panel p-5 sm:p-7">
      <SlotHeader
        index="01"
        icon={<FileText className="size-4" />}
        title="Apresentação do Projeto"
        subtitle="A proposta e o escopo preparados para a sua empresa."
      />

      <div className="mt-6">
        {apresentacaoUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="size-5 text-primary shrink-0" />
              <p className="text-sm text-foreground truncate">{apresentacaoNome || "Apresentacao_Estrategica_WRMax.pdf"}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <a
                href={apresentacaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="metal-button h-12 px-6 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                Visualizar Apresentação
              </a>
              <a
                href={apresentacaoUrl}
                download={apresentacaoNome || "Apresentacao_WRMax.pdf"}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Baixar PDF
              </a>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                aria-expanded={preview}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer sm:ml-auto"
              >
                {preview ? "Ocultar prévia" : "Ver prévia aqui"}
                <ChevronDown className={`size-3.5 transition-transform ${preview ? "rotate-180" : ""}`} />
              </button>
            </div>

            {preview && (
              <div className="rounded-xl overflow-hidden border border-[var(--linha)] h-[520px] bg-background">
                <object data={`${apresentacaoUrl}#toolbar=0&navpanes=0`} type="application/pdf" className="w-full h-full border-0">
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(apresentacaoUrl)}&embedded=true`}
                    className="w-full h-full border-0"
                    title="Visualização da Apresentação Comercial WRMax"
                  />
                </object>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 text-sm">
            <Clock className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-foreground">Apresentação em preparação</p>
              <p className="text-muted-foreground mt-0.5">Assim que a equipe WRMax enviar o PDF, ele aparece aqui.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
