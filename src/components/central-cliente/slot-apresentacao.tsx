import { useState } from "react";
import { FileText, Download, ExternalLink, Clock, Eye, Maximize2 } from "lucide-react";
import { SlotHeader } from "./slot-header";

interface SlotApresentacaoProps {
  apresentacaoUrl?: string | null;
  apresentacaoNome?: string | null;
}

export function SlotApresentacao({
  apresentacaoUrl,
  apresentacaoNome = "Apresentacao_Estrategica_WRMax.pdf",
}: SlotApresentacaoProps) {
  const [expandido, setExpandido] = useState(true);

  return (
    <section className="metal-panel p-6">
      <SlotHeader
        index="01"
        icon={<FileText className="size-4" />}
        title="Apresentação do Projeto"
        subtitle="Confira a proposta estratégica e o escopo de atuação desenhados para a sua empresa."
      />

      <div className="mt-5">
        {apresentacaoUrl ? (
          <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <FileText className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground truncate max-w-[280px] sm:max-w-md">
                    {apresentacaoNome || "Apresentacao_Estrategica_WRMax.pdf"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Documento oficial em formato PDF
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandido(!expandido)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  title={expandido ? "Ocultar pré-visualização" : "Exibir pré-visualização"}
                >
                  <Eye className="size-3.5 text-primary" />
                  {expandido ? "Recolher" : "Pré-visualizar"}
                </button>
                <a
                  href={apresentacaoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  title="Abrir em tela cheia / nova aba"
                >
                  <Maximize2 className="size-3.5" />
                  Visualizar Apresentação
                </a>
                <a
                  href={apresentacaoUrl}
                  download={apresentacaoNome || "Apresentacao_WRMax.pdf"}
                  className="metal-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground cursor-pointer shadow-md"
                  title="Baixar arquivo no dispositivo"
                >
                  <Download className="size-3.5" />
                  Baixar PDF
                </a>
              </div>
            </div>

            {/* Pre-visualizacao Embutida do PDF */}
            {expandido && (
              <div className="rounded-xl overflow-hidden border border-border/80 bg-black/60 shadow-2xl relative">
                <div className="bg-secondary/40 px-3 py-1.5 border-b border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Pré-visualização do Documento</span>
                  <span>PDF Interativo</span>
                </div>
                <div className="w-full h-[480px] sm:h-[580px] bg-background">
                  <object
                    data={`${apresentacaoUrl}#toolbar=0&navpanes=0`}
                    type="application/pdf"
                    className="w-full h-full border-0 rounded-b-xl"
                  >
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(apresentacaoUrl)}&embedded=true`}
                      className="w-full h-full border-0 rounded-b-xl"
                      title="Visualização da Apresentação Comercial WRMax"
                    />
                  </object>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground/80 leading-relaxed border-t border-border/60 pt-3">
              Revise os pilares de entrega, canais de aquisição e o cronograma inicial alinhados na reunião com os especialistas da WRMax.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-secondary/10 p-6 text-center space-y-2">
            <div className="size-10 rounded-full bg-secondary/40 text-muted-foreground flex items-center justify-center mx-auto">
              <Clock className="size-4" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Apresentação em preparação
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              O arquivo em PDF personalizado com as diretrizes do seu projeto está sendo preparado pela equipe operacional e ficará acessível neste espaço.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
