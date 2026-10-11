import { useEffect, useState, type ChangeEvent } from "react";
import { ScrollText, Download, Upload, CheckCircle2, Loader2, Lock, AlertCircle } from "lucide-react";
import { SlotHeader } from "./slot-header";
import { formatCurrency } from "@/lib/utils";
import { enviarContratoAssinado } from "@/lib/supabase";
import { gerarContratoDocx, baixarBlobNoNavegador } from "@/lib/contrato-generator";

const MAX_FILE_SIZE_CONTRATO = 25 * 1024 * 1024; // 25MB

interface SlotContratoClienteProps {
  contratoLiberado?: boolean;
  contrato?: {
    id: string;
    origem?: "automatico" | "manual" | undefined;
    valor_mensal: number | null;
    dia_vencimento: number | null;
    status_envio: string;
    docx_storage_path: string | null;
    docx_nome?: string | null | undefined;
    docx_assinado_storage_path: string | null;
    docx_assinado_nome?: string | null;
    validado_em?: string | null | undefined;
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
  // O gestor pode apagar a via para o cliente reenviar: acompanha o que vem do servidor
  useEffect(() => {
    setAssinadoEnviado(Boolean(contrato?.docx_assinado_storage_path));
    setNomeArquivoAssinado(contrato?.docx_assinado_nome || null);
  }, [contrato?.docx_assinado_storage_path, contrato?.docx_assinado_nome]);

  const modeloDocx = modeloUrl && modeloUrl !== "#" ? modeloUrl : undefined;

  // Contrato anexado manualmente pelo gestor: baixa o arquivo como esta.
  const contratoManual = contrato?.origem === "manual";

  const handleBaixarContratoManual = () => {
    if (!modeloDocx) return;
    const link = document.createElement("a");
    link.href = modeloDocx;
    link.download = contrato?.docx_nome || "Contrato_WRMAX";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBaixarContratoParametrizado = async () => {
    if (!contrato) return;
    // Anexo manual em PDF baixa como esta; em DOCX passa pela troca de tags (valor,
    // vencimento, dados do cliente), com o arquivo anexado como modelo.
    const manualDocx = contratoManual && /\.docx$/i.test(contrato.docx_nome || "");
    if (contratoManual && !manualDocx) return handleBaixarContratoManual();
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

  // Selecionar o arquivo assinado ja envia (um clique, como no comprovante PIX)
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setErroTamanho(null);
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_FILE_SIZE_CONTRATO) {
      setErroTamanho("O arquivo excede o limite de 25MB. Envie um arquivo menor.");
      return;
    }
    setFile(f);
    setUploading(true);
    try {
      if (onUploadAssinado) {
        await onUploadAssinado(f);
      } else {
        await enviarContratoAssinado(token || "", f, { clienteId, contratoId: contrato?.id });
      }
      setAssinadoEnviado(true);
      setNomeArquivoAssinado(f.name);
    } catch (err) {
      console.error(err);
      setErroTamanho(err instanceof Error ? err.message : "Não foi possível enviar o contrato assinado.");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const condicoes = [
    contrato?.valor_mensal != null ? { rotulo: "Investimento mensal", valor: formatCurrency(contrato.valor_mensal) } : null,
    contrato?.dia_vencimento != null ? { rotulo: "Vencimento", valor: `Todo dia ${contrato.dia_vencimento}` } : null,
  ].filter(Boolean) as { rotulo: string; valor: string }[];

  return (
    <section className="metal-panel p-5 sm:p-7">
      <SlotHeader
        index="05"
        icon={<ScrollText className="size-5" />}
        title="Contrato de Prestação de Serviços"
        subtitle="Baixe o contrato, assine e envie a via assinada."
      />

      <div className="mt-6">
        {contratoLiberado && contrato ? (
          <div className="space-y-6">
            {condicoes.length > 0 && (
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                {condicoes.map((c) => (
                  <div key={c.rotulo}>
                    <dt className="rotulo">{c.rotulo}</dt>
                    <dd className="mt-0.5 text-base font-semibold text-foreground tabular-nums">{c.valor}</dd>
                  </div>
                ))}
              </dl>
            )}

            <ol className="space-y-4">
              <li className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <span className="text-sm text-foreground sm:w-44 shrink-0">
                  <span className="font-mono text-xs text-muted-foreground mr-2">1</span>Baixar o contrato
                </span>
                <button
                  type="button"
                  onClick={handleBaixarContratoParametrizado}
                  disabled={gerandoDocx || (contratoManual && !modeloDocx)}
                  className={`glass-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60`}
                >
                  {gerandoDocx ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  <span>{gerandoDocx ? "Preparando..." : "Baixar contrato"}</span>
                </button>
              </li>

              <li className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <span className="text-sm text-foreground sm:w-44 shrink-0">
                  <span className="font-mono text-xs text-muted-foreground mr-2">2</span>Enviar assinado
                </span>
                {assinadoEnviado ? (
                  <span role="status" className="flex items-center gap-2 text-sm text-emerald-300 min-w-0">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <span className="font-semibold">{contrato.validado_em ? "Contrato validado pela WRMax!" : "Via assinada enviada!"}</span>
                    {nomeArquivoAssinado && <span className="text-xs text-muted-foreground truncate">{nomeArquivoAssinado}</span>}
                  </span>
                ) : (
                  <label
                    className={`metal-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer ${
                      uploading ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    <span>{uploading ? `Enviando ${file?.name || "contrato"}...` : "Enviar contrato assinado"}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="sr-only"
                      aria-label="Enviar contrato assinado (PDF ou DOCX, até 25MB)"
                    />
                  </label>
                )}
              </li>
            </ol>

            {erroTamanho && (
              <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{erroTamanho}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">Pode assinar pelo gov.br ou imprimir, assinar e escanear.</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 text-sm">
            <Lock className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-foreground">Contrato em elaboração pelo gestor</p>
              <p className="text-muted-foreground mt-0.5">Depois dos seus dados cadastrais, o gestor libera o contrato aqui.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}