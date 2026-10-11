import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Upload, Download, FileCheck, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { obterComprovantePix, anexarComprovantePixGestor, atualizarStatusPix } from "@/lib/supabase";
import { useUrlArquivoGestor } from "@/lib/storage-refs";
import { gerarPixCopiaECola } from "@/lib/pix-util";
import { CopyRow } from "@/components/central-cliente/copy-row";
import { CabecalhoPainel } from "./cabecalho-painel";

interface WorkspacePixPanelProps {
  clienteId: string;
  clienteNome: string;
  pixPago: boolean;
  whatsapp?: string | null;
  // comprovante registrado no banco (bucket privado comprovantes-pix)
  comprovanteRef?: string | null;
  comprovanteNome?: string | null;
  comprovanteEnviadoEm?: string | null;
  onStatusAlterado?: (novoPago: boolean) => Promise<void> | void;
}

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15MB

export function WorkspacePixPanel({
  clienteId,
  clienteNome,
  pixPago,
  whatsapp,
  comprovanteRef,
  comprovanteNome,
  comprovanteEnviadoEm,
  onStatusAlterado,
}: WorkspacePixPanelProps) {
  const [comprovanteDemo, setComprovante] = useState<any>(() => obterComprovantePix(clienteId));
  const [arquivoManual, setArquivoManual] = useState<File | null>(null);
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const urlComprovante = useUrlArquivoGestor(comprovanteRef);
  const comprovante = comprovanteRef
    ? { nome: comprovanteNome || "comprovante", data: comprovanteEnviadoEm, url: urlComprovante }
    : comprovanteDemo;

  useEffect(() => {
    const checarComprovante = () => {
      const comp = obterComprovantePix(clienteId);
      setComprovante(comp);
    };
    checarComprovante();

    const onComprovanteEnviado = (e: any) => {
      if (e?.detail?.identificador === clienteId) {
        setComprovante(e.detail.info);
      }
    };

    window.addEventListener("wrmax:comprovante_pix_enviado", onComprovanteEnviado);
    window.addEventListener("storage", checarComprovante);
    return () => {
      window.removeEventListener("wrmax:comprovante_pix_enviado", onComprovanteEnviado);
      window.removeEventListener("storage", checarComprovante);
    };
  }, [clienteId]);

  const handleToggleStatus = async () => {
    setAlterandoStatus(true);
    setErroArquivo(null);
    const novoStatus = !pixPago;
    try {
      await atualizarStatusPix(clienteId, novoStatus);
      if (onStatusAlterado) await onStatusAlterado(novoStatus);
    } catch (err) {
      setErroArquivo(err instanceof Error ? err.message : "Não foi possível atualizar o status do PIX.");
    } finally {
      setAlterandoStatus(false);
    }
  };

  // Comprovante recebido por WhatsApp/e-mail: escolher o arquivo ja anexa
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErroArquivo(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      setErroArquivo("O arquivo excede o limite de 15MB. Selecione um comprovante menor.");
      return;
    }
    setArquivoManual(file);
    setSalvandoManual(true);
    try {
      const res = await anexarComprovantePixGestor(clienteId, file);
      setComprovante(res.info);
      if (onStatusAlterado) await onStatusAlterado(pixPago);
    } catch (err) {
      setErroArquivo(err instanceof Error ? err.message : "Não foi possível anexar o comprovante.");
    } finally {
      setSalvandoManual(false);
      setArquivoManual(null);
    }
  };

  const pixPayload = gerarPixCopiaECola({
    chavePix: "financeiro@wrmaxmarketing.com.br",
    nomeRecebedor: "K F G MOREIRA LTDA",
    cidadeRecebedor: "TERESINA",
    txid: "KFGMoreira",
  });

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <CabecalhoPainel
        etapa={2}
        titulo="PIX"
        descricao={`Comprovante e confirmação do pagamento de ${clienteNome}.`}
        status={
          pixPago
            ? { tom: "verde", texto: "PIX pago" }
            : comprovante
              ? { tom: "ambar", texto: "Comprovante recebido" }
              : { tom: "neutro", texto: "Aguardando pagamento" }
        }
      />

      {/* Comprovante */}
      {comprovante ? (
        <div className="flex items-center gap-3 min-w-0">
          <FileCheck className="size-5 text-[#6fd39b] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground truncate">{comprovante.nome}</p>
            {comprovante.data && (
              <p className="text-xs text-muted-foreground">Enviado em {new Date(comprovante.data).toLocaleString("pt-BR")}</p>
            )}
          </div>
          {comprovante.url && (
            <a
              href={comprovante.url}
              download={comprovante.nome}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <Download className="size-4" />
              Baixar
            </a>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Clock className="size-4 shrink-0" />
          O cliente ainda não enviou o comprovante.
        </p>
      )}

      {erroArquivo && (
        <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{erroArquivo}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 pt-1">
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={alterandoStatus}
          className={`${pixPago ? "glass-button" : "metal-button"} h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60`}
        >
          {alterandoStatus ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          <span>{pixPago ? "Desmarcar PIX pago" : "Marcar PIX como Pago"}</span>
        </button>
        <label
          className={`text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
            salvandoManual ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {salvandoManual ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {salvandoManual ? `Anexando ${arquivoManual?.name || ""}...` : "Anexar comprovante recebido por WhatsApp"}
          <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={handleFileChange} className="sr-only" />
        </label>
      </div>

      {/* Dados do PIX so para conferencia, recolhidos */}
      <details className="group border-t border-[var(--linha)] pt-4">
        <summary className="text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer list-none inline-flex items-center gap-1.5">
          Dados do PIX para conferência
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <CopyRow label="Chave PIX (E-mail)" value="financeiro@wrmaxmarketing.com.br" />
          <CopyRow label="Favorecido" value="K F G MOREIRA LTDA - WRMAX" />
          <div className="lg:col-span-2">
            <CopyRow label="Código Copia e Cola (BR Code)" value={pixPayload} />
          </div>
        </div>
      </details>
    </section>
  );
}