import { useState, type ChangeEvent } from "react";
import { FileText, Upload, Loader2, ChevronDown } from "lucide-react";
import { useUrlArquivoGestor } from "@/lib/storage-refs";
import { CabecalhoPainel } from "./cabecalho-painel";

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
  const [preview, setPreview] = useState(false);
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

  const enviando = uploading || loading;

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <CabecalhoPainel
        etapa={1}
        titulo="Apresentação"
        descricao="O PDF da proposta que o cliente vê na Central."
        status={apresentacaoNome ? { tom: "verde", texto: "PDF enviado" } : { tom: "neutro", texto: "Sem PDF" }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        {apresentacaoNome && (
          <span className="flex items-center gap-2.5 min-w-0 text-sm text-foreground sm:mr-auto">
            <FileText className="size-5 text-primary shrink-0" />
            <span className="truncate">{apresentacaoNome}</span>
          </span>
        )}
        {apresentacaoUrl && (
          <>
            <a href={apresentacaoUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Abrir
            </a>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              aria-expanded={preview}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              {preview ? "Ocultar prévia" : "Ver prévia"}
              <ChevronDown className={`size-3.5 transition-transform ${preview ? "rotate-180" : ""}`} />
            </button>
          </>
        )}
        <label
          className={`${apresentacaoNome ? "glass-button" : "metal-button"} h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
            enviando ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span>{enviando ? "Enviando PDF..." : apresentacaoNome ? "Substituir PDF" : "Enviar PDF"}</span>
          <input type="file" accept=".pdf,application/pdf" disabled={enviando} onChange={handleFileChange} className="sr-only" />
        </label>
      </div>

      {apresentacaoUrl && preview && (
        <div className="w-full h-[520px] rounded-xl border border-[var(--linha)] overflow-hidden bg-background">
          <object data={`${apresentacaoUrl}#toolbar=1&navpanes=0`} type="application/pdf" className="w-full h-full border-none">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(apresentacaoUrl)}&embedded=true`}
              title="Pré-visualização da Apresentação"
              className="w-full h-full border-none"
            />
          </object>
        </div>
      )}
    </section>
  );
}