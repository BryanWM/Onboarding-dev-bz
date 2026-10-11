import { useState, useEffect, type FormEvent } from "react";
import {
  ScrollText,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  Download,
  Eye,
  Upload,
  Wand2,
  PenLine,
  Send,
  EyeOff,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { obterContratoAssinado } from "@/lib/supabase";
import { useUrlArquivoGestor, obterUrlArquivoGestor } from "@/lib/storage-refs";
import { gerarContratoDocx, baixarBlobNoNavegador, type DadosContratoForm } from "@/lib/contrato-generator";
import { ContractPreviewModal } from "./contract-preview-modal";
import { ContractConfirmModal } from "./contract-confirm-modal";
import { CabecalhoPainel } from "./cabecalho-painel";

export interface ModeloContrato {
  id: string;
  titulo: string;
  descricao?: string | null;
  template_storage_path?: string | null;
}

interface ContratoItem {
  id?: string;
  origem?: "automatico" | "manual" | undefined;
  status_envio?: string | undefined;
  liberado_para_cliente?: boolean | undefined;
  valor_mensal?: number | null;
  dia_vencimento?: number | null;
  modelo_id?: string | null;
  docx_storage_path?: string | null;
  docx_nome?: string | null | undefined;
  docx_assinado_storage_path?: string | null;
  docx_assinado_nome?: string | null;
}

interface WorkspaceContractPanelProps {
  clienteId: string;
  clienteNome?: string;
  clienteEmail?: string | null | undefined;
  contrato?: ContratoItem | null;
  modelos?: ModeloContrato[];
  dadosCadastrais?: Record<string, any> | null;
  onEmitirContrato: (modeloId: string | null, valorMensal: number, diaVencimento: number) => Promise<void> | void;
  onAnexarManual?: (file: File, valorMensal: number | null, diaVencimento: number | null) => Promise<void> | void;
  onLiberarContrato?: (contratoId: string) => Promise<void> | void;
  loading?: boolean;
}

type Modo = "automatico" | "editar";

const CLASSE_CAMPO =
  "w-full h-11 px-3.5 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:border-primary/80 outline-none transition-colors";
const CLASSE_ROTULO = "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5";

export function WorkspaceContractPanel({
  clienteId,
  clienteNome = "Cliente",
  clienteEmail,
  contrato,
  modelos = [],
  dadosCadastrais = null,
  onEmitirContrato,
  onAnexarManual,
  onLiberarContrato,
  loading = false,
}: WorkspaceContractPanelProps) {
  const [modo, setModo] = useState<Modo>(contrato?.origem === "manual" ? "editar" : "automatico");
  const [modeloSelecionado, setModeloSelecionado] = useState<string>(contrato?.modelo_id || "");
  const [valorMensal, setValorMensal] = useState<number>(contrato?.valor_mensal || 1500);
  const [diaVencimento, setDiaVencimento] = useState<number>(contrato?.dia_vencimento || 10);
  const [emitindo, setEmitindo] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [liberando, setLiberando] = useState(false);

  // Anexo manual
  const [arquivoManual, setArquivoManual] = useState<File | null>(null);
  const [valorManual, setValorManual] = useState("");
  const [diaManual, setDiaManual] = useState("");
  const [anexando, setAnexando] = useState(false);
  const [erroManual, setErroManual] = useState<string | null>(null);

  const [contratoAssinadoDemo, setContratoAssinado] = useState<any>(
    () => obterContratoAssinado(clienteId) || (contrato?.id ? obterContratoAssinado(contrato.id) : null)
  );
  // Buckets privados: arquivo do contrato e via assinada abrem por URL assinada (sessao do gestor)
  const contratoArquivoUrl = useUrlArquivoGestor(contrato?.docx_storage_path);
  const assinadoUrl = useUrlArquivoGestor(contrato?.docx_assinado_storage_path);
  const contratoAssinado = contrato?.docx_assinado_storage_path
    ? { nome: contrato.docx_assinado_nome || "Contrato_Assinado.pdf", url: assinadoUrl }
    : contratoAssinadoDemo;

  useEffect(() => {
    const checarAssinado = () => {
      const assinado =
        obterContratoAssinado(clienteId) || (contrato?.id ? obterContratoAssinado(contrato.id) : null);
      setContratoAssinado(assinado);
    };
    checarAssinado();

    const onContratoAssinado = (e: any) => {
      const d = e?.detail;
      if (d?.identificador === clienteId || d?.clienteId === clienteId || (contrato?.id && d?.identificador === contrato.id)) {
        setContratoAssinado(d.info);
      } else {
        checarAssinado();
      }
    };

    window.addEventListener("wrmax:contrato_assinado_enviado", onContratoAssinado);
    window.addEventListener("storage", checarAssinado);
    return () => {
      window.removeEventListener("wrmax:contrato_assinado_enviado", onContratoAssinado);
      window.removeEventListener("storage", checarAssinado);
    };
  }, [clienteId, contrato?.id]);

  const listaModelos = Array.isArray(modelos) ? modelos : [];
  const ehManual = contrato?.origem === "manual";
  const liberado = Boolean(contrato?.liberado_para_cliente ?? (contrato && contrato.valor_mensal));
  const assinado = Boolean(contratoAssinado);

  const dadosContrato = (valor?: number | null, dia?: number | null): DadosContratoForm => {
    const cad = dadosCadastrais || {};
    return {
      nome: (cad.razao_social || cad.representante_nome || clienteNome).trim(),
      documento: (cad.cnpj || cad.representante_cpf || "A informar nos dados cadastrais").trim(),
      endereco: (cad.logradouro || "A informar").trim(),
      cep: (cad.cep || "").trim(),
      email: (cad.email_financeiro || clienteEmail || "").trim(),
      telefone: cad.telefone_financeiro || "",
      valorMensal: valor ? formatCurrency(valor).replace("R$", "").trim() : "",
      diaVencimento: dia ? String(dia) : "",
    };
  };

  // Gera o DOCX preenchido com os dados do cliente a partir de um modelo
  // (templateRef null = modelo padrao do app).
  const baixarPreenchido = async (chave: string, templateRef: string | null, valor?: number | null, dia?: number | null) => {
    setBaixando(chave);
    try {
      const templateUrl = templateRef ? await obterUrlArquivoGestor(templateRef) : null;
      const { blob, fileName } = await gerarContratoDocx(dadosContrato(valor, dia), undefined, templateUrl || undefined);
      baixarBlobNoNavegador(blob, fileName);
    } catch {
      window.open("/modelo_de_contratos/predefinidos/Contrato_WRMAX_Modelo_Parametrizado.docx", "_blank");
    } finally {
      setBaixando(null);
    }
  };

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    liberado && !ehManual ? setModalConfirmacaoAberto(true) : executarEmissao();
  };

  const executarEmissao = async () => {
    setEmitindo(true);
    setModalConfirmacaoAberto(false);
    try {
      await onEmitirContrato(modeloSelecionado || null, valorMensal, diaVencimento);
    } finally {
      setEmitindo(false);
    }
  };

  const handleAnexar = async (e: FormEvent) => {
    e.preventDefault();
    if (!arquivoManual || !onAnexarManual) return;
    const valor = valorManual ? Number(valorManual) : null;
    const dia = diaManual ? Number(diaManual) : null;
    if (valor !== null && !(valor > 0)) return setErroManual("Informe um valor mensal maior que zero ou deixe em branco.");
    if (dia !== null && !(dia >= 1 && dia <= 31)) return setErroManual("O dia de vencimento deve estar entre 1 e 31.");
    setErroManual(null);
    setAnexando(true);
    try {
      await onAnexarManual(arquivoManual, valor, dia);
      setArquivoManual(null);
      setValorManual("");
      setDiaManual("");
    } finally {
      setAnexando(false);
    }
  };

  const handleLiberar = async () => {
    if (!contrato?.id || !onLiberarContrato) return;
    setLiberando(true);
    try {
      await onLiberarContrato(contrato.id);
    } finally {
      setLiberando(false);
    }
  };

  const status = assinado
    ? { tom: "verde" as const, texto: "Assinado pelo cliente" }
    : contrato && liberado
      ? { tom: "verde" as const, texto: "Liberado ao cliente" }
      : contrato
        ? { tom: "ambar" as const, texto: "Anexado · aguardando liberação" }
        : { tom: "neutro" as const, texto: "Aguardando emissão" };

  const resumoContrato = contrato
    ? [
        ehManual ? contrato.docx_nome || "Contrato anexado" : "Gerado automaticamente",
        contrato.valor_mensal ? `${formatCurrency(contrato.valor_mensal)}/mês` : null,
        contrato.dia_vencimento ? `vence todo dia ${contrato.dia_vencimento}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const linkTexto = "text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60";

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <CabecalhoPainel etapa={5} titulo="Contrato" descricao="Gere ou anexe o contrato e libere para o cliente assinar." status={status} />

      {/* Contrato atual */}
      {contrato && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <span className="flex items-center gap-2.5 min-w-0 sm:mr-auto text-sm text-foreground">
              <FileText className="size-5 text-primary shrink-0" />
              <span className="truncate">{resumoContrato}</span>
            </span>
            {!ehManual && (
              <button type="button" onClick={() => setModalPreviewAberto(true)} className={linkTexto}>
                <Eye className="size-4" />
                Pré-visualizar
              </button>
            )}
            {ehManual ? (
              <a href={contratoArquivoUrl || "#"} download={contrato.docx_nome || "Contrato"} target="_blank" rel="noreferrer" className={linkTexto}>
                <Download className="size-4" />
                Baixar arquivo
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  baixarPreenchido(
                    "atual",
                    contrato.docx_storage_path?.startsWith("/") ? null : contrato.docx_storage_path || null,
                    contrato.valor_mensal,
                    contrato.dia_vencimento
                  )
                }
                disabled={baixando === "atual"}
                className={linkTexto}
              >
                {baixando === "atual" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Baixar DOCX
              </button>
            )}
          </div>

          {!liberado && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={handleLiberar}
                disabled={liberando || !onLiberarContrato}
                className="metal-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {liberando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                <span>{liberando ? "Liberando..." : "Liberar para o cliente"}</span>
              </button>
              <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <EyeOff className="size-4 shrink-0" />
                O cliente ainda não vê este contrato na Central.
              </span>
            </div>
          )}

          {contratoAssinado ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <span className="flex items-center gap-2.5 min-w-0 sm:mr-auto text-sm">
                <FileCheck className="size-5 text-[#6fd39b] shrink-0" />
                <span className="min-w-0">
                  <span className="block text-foreground">Via assinada enviada pelo cliente!</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {contratoAssinado?.nome || "Contrato_Assinado_Cliente.pdf"} · projeto enviado para a Produção
                  </span>
                </span>
              </span>
              <a href={contratoAssinado?.url || "#"} download={contratoAssinado?.nome || "Contrato_Assinado.pdf"} target="_blank" rel="noreferrer" className={linkTexto}>
                <Download className="size-4" />
                Baixar contrato assinado
              </a>
            </div>
          ) : (
            liberado && (
              <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <ScrollText className="size-4 shrink-0" />
                Aguardando o cliente assinar e enviar pela Central.
              </p>
            )
          )}
        </div>
      )}

      {/* Novo contrato */}
      <div className={`space-y-5 ${contrato ? "border-t border-[var(--linha)] pt-6" : ""}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="rotulo">{contrato ? "Substituir contrato" : "Preparar contrato"}</span>
          <div role="tablist" aria-label="Como preparar o contrato" className="inline-flex gap-1 p-1 rounded-[10px] bg-[var(--campo)] border border-[var(--linha)]">
            {(
              [
                { id: "automatico", rotulo: "Gerar automaticamente", icone: <Wand2 className="size-4" /> },
                { id: "editar", rotulo: "Editar um modelo", icone: <PenLine className="size-4" /> },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={modo === m.id}
                onClick={() => setModo(m.id)}
                className={`h-9 px-3.5 rounded-[7px] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                  modo === m.id ? "chip-ouro" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.icone}
                <span>{m.rotulo}</span>
              </button>
            ))}
          </div>
        </div>

        {modo === "automatico" ? (
          <form onSubmit={handleSubmitForm} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr] gap-4">
              <div>
                <label htmlFor="ct-valor" className={CLASSE_ROTULO}>Valor mensal (R$) *</label>
                <input id="ct-valor" type="number" min={1} step="any" value={valorMensal} onChange={(e) => setValorMensal(Number(e.target.value))} className={CLASSE_CAMPO} required />
              </div>
              <div>
                <label htmlFor="ct-dia" className={CLASSE_ROTULO}>Vencimento (dia) *</label>
                <input id="ct-dia" type="number" min={1} max={31} value={diaVencimento} onChange={(e) => setDiaVencimento(Number(e.target.value))} className={CLASSE_CAMPO} required />
              </div>
              <div>
                <label htmlFor="ct-modelo" className={CLASSE_ROTULO}>Modelo</label>
                <select id="ct-modelo" value={modeloSelecionado} onChange={(e) => setModeloSelecionado(e.target.value)} className={`${CLASSE_CAMPO} cursor-pointer`}>
                  <option value="">Contrato Padrão WRMax</option>
                  {listaModelos.map((m) => (
                    <option key={m.id} value={m.id}>{m.titulo}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <button
                type="submit"
                disabled={emitindo || loading}
                className={`${contrato && liberado ? "glass-button" : "metal-button"} h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
              >
                {emitindo || loading ? <Loader2 className="size-4 animate-spin" /> : <FileCheck className="size-4" />}
                <span>
                  {emitindo || loading
                    ? "Processando minuta contratual..."
                    : liberado && !ehManual
                      ? "Modificar e Substituir Minuta Contratual"
                      : "Emitir e Liberar Contrato ao Cliente"}
                </span>
              </button>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5" title="A contratada é fixa no contrato">
                <ShieldCheck className="size-3.5 shrink-0" />
                Contratada fixa: K F G MOREIRA LTDA (WRMAX) · CNPJ 40.034.078/0001-41
              </span>
            </div>
          </form>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* 1. Modelos para baixar */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">1. Baixe um modelo para editar</h3>
                <p className="text-xs text-muted-foreground mt-1">Já vem com os dados de {clienteNome}.</p>
              </div>
              <ul className="divide-y divide-[var(--linha)] border-y border-[var(--linha)]">
                {[{ id: "padrao", titulo: "Contrato Padrão WRMax", template_storage_path: null as string | null }, ...listaModelos].map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-sm text-foreground">{m.titulo}</span>
                    <button
                      type="button"
                      onClick={() => baixarPreenchido(m.id, m.template_storage_path || null)}
                      disabled={baixando === m.id}
                      aria-label={`Baixar ${m.titulo} preenchido`}
                      className={linkTexto}
                    >
                      {baixando === m.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      Baixar
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Anexar o contrato editado */}
            <form onSubmit={handleAnexar} className="space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-foreground">2. Anexe o contrato editado</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  O cliente só vê depois de você clicar em <strong className="text-foreground">Liberar para o cliente</strong>.
                </p>
              </div>

              {erroManual && (
                <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs">
                  {erroManual}
                </div>
              )}

              <label className="flex items-center gap-2 px-3.5 h-11 rounded-lg border border-dashed border-[var(--linha-2)] bg-[var(--campo)] text-sm text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="size-4 shrink-0 text-primary" />
                <span className="truncate">{arquivoManual ? arquivoManual.name : "Selecionar contrato (PDF ou DOCX, até 25MB)"}</span>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setArquivoManual(e.target.files?.[0] || null)}
                  className="sr-only"
                  aria-label="Arquivo do contrato"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ct-valor-manual" className={CLASSE_ROTULO}>Valor mensal</label>
                  <input id="ct-valor-manual" type="number" min={1} step="any" placeholder="Opcional" value={valorManual} onChange={(e) => setValorManual(e.target.value)} className={CLASSE_CAMPO} />
                </div>
                <div>
                  <label htmlFor="ct-dia-manual" className={CLASSE_ROTULO}>Vencimento</label>
                  <input id="ct-dia-manual" type="number" min={1} max={31} placeholder="Opcional" value={diaManual} onChange={(e) => setDiaManual(e.target.value)} className={CLASSE_CAMPO} />
                </div>
              </div>

              <button
                type="submit"
                disabled={!arquivoManual || anexando || !onAnexarManual}
                className="metal-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {anexando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                <span>{anexando ? "Anexando..." : "Anexar contrato"}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      <ContractPreviewModal
        open={modalPreviewAberto}
        clienteNome={clienteNome}
        valorMensal={contrato?.valor_mensal || valorMensal}
        diaVencimento={contrato?.dia_vencimento || diaVencimento}
        docxUrl={contratoArquivoUrl}
        onClose={() => setModalPreviewAberto(false)}
      />

      <ContractConfirmModal
        open={modalConfirmacaoAberto}
        clienteNome={clienteNome}
        valorMensal={valorMensal}
        diaVencimento={diaVencimento}
        onConfirm={executarEmissao}
        onClose={() => setModalConfirmacaoAberto(false)}
      />
    </section>
  );
}