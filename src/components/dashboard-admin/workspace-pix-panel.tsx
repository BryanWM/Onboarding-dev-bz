import { useState, useEffect } from "react";
import { QrCode, CheckCircle2, Clock, Upload, Download, FileCheck, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { obterComprovantePix, anexarComprovantePixGestor, atualizarStatusPix } from "@/lib/supabase";
import { useUrlArquivoGestor } from "@/lib/storage-refs";
import { gerarPixCopiaECola } from "@/lib/pix-util";
import { CopyRow } from "@/components/central-cliente/copy-row";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErroArquivo(null);
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      setErroArquivo("O arquivo excede o limite máximo permitido de 15MB. Selecione um comprovante menor.");
      setArquivoManual(null);
      return;
    }
    setArquivoManual(file);
  };

  const handleUploadManual = async () => {
    if (!arquivoManual) return;
    setSalvandoManual(true);
    setErroArquivo(null);
    try {
      const res = await anexarComprovantePixGestor(clienteId, arquivoManual);
      setComprovante(res.info);
      setArquivoManual(null);
      if (onStatusAlterado) await onStatusAlterado(pixPago);
    } catch (err) {
      setErroArquivo(err instanceof Error ? err.message : "Não foi possível anexar o comprovante.");
    } finally {
      setSalvandoManual(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
            <QrCode className="size-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Gestão Financeira & Comprovante PIX (Etapa 2)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confira os dados bancários e acesse o comprovante enviado pelo cliente {clienteNome}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={alterandoStatus}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-md transition-all ${
              pixPago
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                : "border border-border bg-secondary hover:bg-secondary/80 text-foreground"
            }`}
          >
            {alterandoStatus ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            <span>{pixPago ? "PIX Confirmado (Pago)" : "Marcar PIX como Pago"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Bloco 1: Recepcao do Comprovante do Cliente */}
        <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <FileCheck className="size-4 text-primary" />
              Comprovante Enviado pelo Cliente
            </h3>
            {comprovante ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                RECEBIDO
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-secondary/50 text-muted-foreground border border-border">
                PENDENTE
              </span>
            )}
          </div>

          {comprovante ? (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{comprovante.nome}</p>
                  {comprovante.data && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enviado em: {new Date(comprovante.data).toLocaleString("pt-BR")}
                    </p>
                  )}
                  {comprovante.tamanho && (
                    <p className="text-[11px] font-mono text-muted-foreground">
                      Tamanho: {(comprovante.tamanho / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                {comprovante.url && (
                  <a
                    href={comprovante.url}
                    download={comprovante.nome}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-button p-2.5 rounded-lg cursor-pointer shrink-0"
                    title="Baixar Comprovante"
                  >
                    <Download className="size-4" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-border/80 bg-background/50 text-center space-y-2">
              <Clock className="size-5 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                O cliente ainda não enviou o comprovante de pagamento para este projeto.
              </p>
            </div>
          )}

          {/* Anexar Comprovante Recebido Manualmente */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <span className="text-xs font-mono uppercase text-muted-foreground block">
              Anexar Comprovante Manualmente (Recebido via WhatsApp/E-mail)
            </span>
            {erroArquivo && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{erroArquivo}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 text-xs text-muted-foreground cursor-pointer transition-colors bg-background">
                <Upload className="size-3.5 text-primary shrink-0" />
                <span className="truncate">{arquivoManual ? arquivoManual.name : "Selecionar arquivo (máx. 15MB)..."}</span>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleUploadManual}
                disabled={!arquivoManual || salvandoManual}
                className="glass-button px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {salvandoManual ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                <span>{salvandoManual ? "Salvando..." : "Anexar"}</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Formatos aceitos: PDF, PNG, JPG, WEBP. Limite de 15MB por arquivo.
            </p>
          </div>
        </div>

        {/* Bloco 2: Dados do PIX para Conferencia do Operador */}
        <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 sm:p-6 space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <ShieldCheck className="size-4 text-emerald-400" />
            Dados Oficiais do PIX (Conferência)
          </h3>
          <div className="space-y-3">
            <CopyRow label="Chave PIX (E-mail)" value="financeiro@wrmaxmarketing.com.br" />
            <CopyRow label="Favorecido" value="K F G MOREIRA LTDA - WRMAX" />
            <CopyRow label="Código Copia e Cola (BR Code)" value={pixPayload} isSecret />
          </div>
          <div className="p-3.5 rounded-lg bg-secondary/30 border border-border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Regra Operacional:</p>
            <p>
              Ao confirmar o recebimento do valor na conta bancária, clique no botão \"Marcar PIX como Pago\". O status será atualizado instantaneamente na Central do Cliente.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
