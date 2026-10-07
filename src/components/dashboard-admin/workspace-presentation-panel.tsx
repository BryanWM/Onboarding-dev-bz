import { useState, type ChangeEvent } from "react";
import { FileText, Upload, Download, ExternalLink, Loader2, Eye } from "lucide-react";
import { useUrlArquivoGestor } from "@/lib/storage-refs";

interface WorkspacePresentationPanelProps {
  // referencia "bucket/caminho" (ou URL antiga); a URL assinada e gerada aqui
  apresentacaoUrl?: string | null;
  apresentacaoNome?: string | null;
  onUpload: (file: File) => Promise<void> | void;
  loading?: boolean;
}

export function WorkspacePresentationPanel({
  apresentacaoUrl: apresentacaoRef,
  apresentacaoNome,
  onUpload,
  loading = false,
}: WorkspacePresentationPanelProps) {
  const [uploading, setUploading] = useState(false);
  const apresentacaoUrl = useUrlArquivoGestor(apresentacaoRef);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <section className="metal-panel p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <FileText className="size-4 text-primary" />
          <span>Apresentação Comercial do Projeto (PDF)</span>
        </div>
        {apresentacaoUrl && (
          <div className="flex items-center gap-2">
            <a
              href={apresentacaoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary/40 hover:bg-secondary text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ExternalLink className="size-3" />
              <span>Abrir em Nova Aba</span>
            </a>
            <a
              href={apresentacaoUrl}
              download={apresentacaoNome || "apresentacao-wrmax.pdf"}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-[11px] font-mono text-primary border border-primary/30 transition-colors cursor-pointer"
            >
              <Download className="size-3" />
              <span>Baixar PDF</span>
            </a>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-secondary/15 border border-border/70 text-xs">
          <span className="text-muted-foreground">
            {apresentacaoNome
              ? `Arquivo ativo: ${apresentacaoNome}`
              : "Nenhuma apresentação em PDF vinculada a este cliente."}
          </span>
          <label className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-foreground cursor-pointer transition-colors shrink-0">
            {uploading || loading ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <Upload className="size-3.5 text-primary" />
            )}
            <span>{uploading || loading ? "Enviando PDF..." : "Substituir / Enviar PDF"}</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={uploading || loading}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Pre-visualizacao integrada sem download obrigatorio */}
        {apresentacaoUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <Eye className="size-3.5 text-primary" />
              <span>Pré-visualização do Documento</span>
            </div>
            <div className="w-full h-[550px] rounded-xl border border-border/80 overflow-hidden bg-background">
              <object
                data={`${apresentacaoUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="w-full h-full border-none"
              >
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(apresentacaoUrl)}&embedded=true`}
                  title="Pré-visualização da Apresentação"
                  className="w-full h-full border-none"
                />
              </object>
            </div>
          </div>
        ) : (
          <div className="py-12 rounded-xl border border-dashed border-border/80 text-center space-y-2">
            <FileText className="size-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-semibold text-muted-foreground">
              Nenhuma pré-visualização disponível
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Faça o upload de uma apresentação em PDF para visualizá-la aqui e disponibilizá-la ao cliente.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
