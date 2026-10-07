import { useState, type ChangeEvent } from "react";
import { ScrollText, Download, Upload, CheckCircle2, Clock, FileCheck, Loader2, Lock, AlertCircle } from "lucide-react";
import { SlotHeader } from "./slot-header";
import { formatCurrency } from "@/lib/utils";
import { enviarContratoAssinado } from "@/lib/supabase";
import { gerarContratoDocx, baixarBlobNoNavegador } from "@/lib/contrato-generator";

const MAX_FILE_SIZE_CONTRATO = 25 * 1024 * 1024; // 25MB

interface SlotContratoClienteProps {
  contratoLiberado?: boolean;
  contrato?: {
    id: string;
    valor_mensal: number;
    dia_vencimento: number;
    status_envio: string;
    docx_storage_path: string | null;
    docx_assinado_storage_path: string | null;
    docx_assinado_nome?: string | null;
  } | null;
  // URL ja resolvida (assinada) do modelo DOCX; null usa o modelo padrao do app
  modeloUrl?: string | null;
  onUploadAssinado?: (file: File) => Promise<void>;
  dadosCadastrais?: Record<string, any> | null;
  clienteNome?: string;
  clienteEmail?: string;
  clienteId?: string;
  token?: string;
}

export function SlotContratoCliente({
  contratoLiberado = false,
  contrato = null,
  modeloUrl = null,
  onUploadAssinado,
  dadosCadastrais = null,
  clienteNome,
  clienteEmail,
  clienteId,
  token,
}: SlotContratoClienteProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gerandoDocx, setGerandoDocx] = useState(false);
  const [erroTamanho, setErroTamanho] = useState<string | null>(null);
  const [assinadoEnviado, setAssinadoEnviado] = useState(
    Boolean(contrato?.docx_assinado_storage_path)
  );
  const [nomeArquivoAssinado, setNomeArquivoAssinado] = useState<string | null>(
    contrato?.docx_assinado_nome || null
  );
  const modeloDocx = modeloUrl && modeloUrl !== "#" ? modeloUrl : undefined;

  const handleBaixarContratoParametrizado = async () => {
    if (!contrato) return;
    setGerandoDocx(true);

    try {
      let cad = dadosCadastrais;
      if (!cad && typeof window !== "undefined" && token) {
        try {
          const raw = localStorage.getItem(`wrmax_cadastro_${token}`);
          if (raw) cad = JSON.parse(raw);
        } catch {}
      }

      const nomeFinal = (cad?.razao_social || cad?.nome_ou_razao || cad?.representante_nome || clienteNome || "Cliente Parceiro").trim();
      const docFinal = (cad?.cnpj || cad?.cpf_ou_cnpj || cad?.representante_cpf || "A informar nos dados cadastrais").trim();
      const enderecoFinal = (cad?.logradouro || cad?.endereco || "Teresina - PI").trim();
      const cepFinal = (cad?.cep || "64000-000").trim();
      const emailFinal = (cad?.email_financeiro || cad?.email || clienteEmail || "contato@empresa.com").trim();
      const valorStr = contrato.valor_mensal ? formatCurrency(contrato.valor_mensal).replace("R$", "").trim() : "1.500,00";

      const { blob, fileName } = await gerarContratoDocx(
        {
          nome: nomeFinal,
          documento: docFinal,
          endereco: enderecoFinal,
          cep: cepFinal,
          email: emailFinal,
          telefone: cad?.telefone_financeiro || cad?.telefone || "",
          nacionalidade: cad?.nacionalidade || "brasileiro(a)",
          estadoCivil: cad?.estado_civil || "solteiro(a)",
          profissao: cad?.profissao || "empresário(a)",
          valorMensal: valorStr,
          diaVencimento: String(contrato.dia_vencimento || 10),
        },
        undefined,
        modeloDocx,
      );

      baixarBlobNoNavegador(blob, fileName);
    } catch (err) {
      console.error("Falha ao compilar contrato parametrizado:", err);
      const fallbackUrl =
        modeloDocx || "/modelo_de_contratos/predefinidos/Contrato_WRMAX_Modelo_Parametrizado.docx";
      const link = document.createElement("a");
      link.href = fallbackUrl;
      link.download = "Contrato_WRMAX.docx";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setGerandoDocx(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErroTamanho(null);
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > MAX_FILE_SIZE_CONTRATO) {
        setErroTamanho("O arquivo excede o limite máximo permitido de 25MB. Por favor, envie um arquivo menor.");
        setFile(null);
        return;
      }
      setFile(f);
    }
  };

  const handleEnviarAssinado = async () => {
    if (!file) return;
    setUploading(true);
    setErroTamanho(null);
    try {
      if (onUploadAssinado) {
        await onUploadAssinado(file);
      } else {
        await enviarContratoAssinado(token || "", file, { clienteId, contratoId: contrato?.id });
      }
      setAssinadoEnviado(true);
      setNomeArquivoAssinado(file.name);
      setFile(null);
    } catch (err) {
      console.error(err);
      setErroTamanho(err instanceof Error ? err.message : "Não foi possível enviar o contrato assinado.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="metal-panel p-5 sm:p-7">
      <SlotHeader
        index="05"
        icon={<ScrollText className="size-5" />}
        title="Contrato de Prestação de Serviços"
        subtitle="Acesse a minuta oficial emitida pela WRMax e envie sua via assinada."
      />

      <div className="mt-6">
        {contratoLiberado && contrato ? (
          <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  <FileCheck className="size-3.5" />
                  Contrato Liberado para Assinatura
                </span>
                <h3 className="font-bold text-base text-foreground">
                  Condições Comerciais Validadas
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
                <div className="bg-secondary/40 px-3.5 py-2 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase">Investimento Mensal</span>
                  <span className="font-bold text-base text-foreground">{formatCurrency(contrato.valor_mensal)}</span>
                </div>
                <div className="bg-secondary/40 px-3.5 py-2 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase">Vencimento</span>
                  <span className="font-bold text-base text-foreground">Todo dia {contrato.dia_vencimento}</span>
                </div>
              </div>
            </div>

            {/* Acao 1: Baixar Minuta Contratual (so aparece quando o admin define e envia) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-secondary/30 p-5 rounded-xl border border-border/60">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  1. Baixar Minuta Contratual Oficial
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Documento em Word (.docx) parametrizado com seus dados cadastrais e as cláusulas acordadas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBaixarContratoParametrizado}
                disabled={gerandoDocx}
                className="metal-button inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-primary-foreground cursor-pointer shadow-md shrink-0 w-full sm:w-auto disabled:opacity-60"
              >
                {gerandoDocx ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                <span>{gerandoDocx ? "Compilando Contrato..." : "Baixar Contrato Oficial (.docx)"}</span>
              </button>
            </div>

            {/* Acao 2: Enviar Contrato Assinado */}
            <div className="bg-secondary/30 p-5 rounded-xl border border-border/60 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  2. Enviar Contrato Assinado
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Assine digitalmente (Gov.br, DocuSign, etc.) ou anexe o documento escaneado/assinado.
                </p>
              </div>

              {erroTamanho && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{erroTamanho}</span>
                </div>
              )}

              {assinadoEnviado ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-3">
                  <CheckCircle2 className="size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">Via assinada enviada com sucesso!</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {nomeArquivoAssinado || "Documento assinado recebido pelo gestor da WRMax."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="flex-1 w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{file ? file.name : "Selecionar arquivo assinado (PDF ou DOCX - máx 25MB)..."}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleEnviarAssinado}
                    disabled={!file || uploading}
                    className="metal-button w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold text-primary-foreground cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-2 shadow-md"
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    <span>{uploading ? "Enviando via..." : "Enviar Via Assinada"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-secondary/10 p-6 sm:p-8 text-center space-y-4">
            <div className="size-12 rounded-full bg-secondary/40 text-muted-foreground flex items-center justify-center mx-auto">
              <Lock className="size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-foreground">
                Contrato em elaboração pelo gestor
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Após o preenchimento dos seus dados cadastrais, o gestor da sua conta emitirá o contrato oficial de prestação de serviços com o valor e vencimento acordados.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                disabled
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-border/80 bg-secondary/30 text-muted-foreground/60 text-sm font-semibold flex items-center justify-center gap-2.5 cursor-not-allowed select-none"
                title="Download bloqueado: aguardando liberação do contrato pelo gestor"
              >
                <Lock className="size-4" />
                <span>Download Bloqueado (Aguardando Liberação pelo Gestor)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
