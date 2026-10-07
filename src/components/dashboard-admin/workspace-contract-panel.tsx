import { useState, useEffect, type FormEvent } from "react";
import { ScrollText, Loader2, CheckCircle2, ShieldCheck, FileCheck, Download, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { obterContratoAssinado } from "@/lib/supabase";
import { gerarContratoDocx, baixarBlobNoNavegador } from "@/lib/contrato-generator";
import { ContractPreviewModal } from "./contract-preview-modal";
import { ContractConfirmModal } from "./contract-confirm-modal";

interface ModeloContrato {
  id: string;
  titulo: string;
}

interface ContratoItem {
  id?: string;
  status?: string;
  valor_mensal?: number;
  dia_vencimento?: number;
  modelo_id?: string | null;
  link_visualizacao?: string | null;
  docx_storage_path?: string | null;
  docx_assinado_storage_path?: string | null;
}

interface WorkspaceContractPanelProps {
  clienteId: string;
  clienteNome?: string;
  contrato?: ContratoItem | null;
  modelos?: ModeloContrato[];
  onEmitirContrato: (modeloId: string | null, valorMensal: number, diaVencimento: number) => Promise<void> | void;
  loading?: boolean;
}

export function WorkspaceContractPanel({
  clienteId,
  clienteNome = "Cliente",
  contrato,
  modelos = [],
  onEmitirContrato,
  loading = false,
}: WorkspaceContractPanelProps) {
  const [modeloSelecionado, setModeloSelecionado] = useState<string>(contrato?.modelo_id || "");
  const [valorMensal, setValorMensal] = useState<number>(contrato?.valor_mensal || 1500);
  const [diaVencimento, setDiaVencimento] = useState<number>(contrato?.dia_vencimento || 10);
  const [emitindo, setEmitindo] = useState(false);
  const [baixandoDocx, setBaixandoDocx] = useState(false);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [contratoAssinado, setContratoAssinado] = useState<any>(
    () => obterContratoAssinado(clienteId) || (contrato?.id ? obterContratoAssinado(contrato.id) : null)
  );

  useEffect(() => {
    const checarAssinado = () => {
      const assinado =
        obterContratoAssinado(clienteId) ||
        (contrato?.id ? obterContratoAssinado(contrato.id) : null);
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
  const contratoAtivo = Boolean(contrato && contrato.status !== "pendente" && contrato.valor_mensal);

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    contratoAtivo ? setModalConfirmacaoAberto(true) : executarEmissao();
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

  const handleBaixarDocxParametrizado = async () => {
    setBaixandoDocx(true);
    try {
      const valorStr = formatCurrency(contrato?.valor_mensal || valorMensal).replace("R$", "").trim();
      const { blob, fileName } = await gerarContratoDocx(
        {
          nome: clienteNome,
          documento: "A informar nos dados cadastrais",
          endereco: "Teresina - PI",
          cep: "64000-000",
          email: "contato@empresa.com",
          valorMensal: valorStr,
          diaVencimento: String(contrato?.dia_vencimento || diaVencimento),
        },
        undefined,
        contrato?.docx_storage_path && contrato.docx_storage_path !== "#"
          ? contrato.docx_storage_path
          : undefined,
      );
      baixarBlobNoNavegador(blob, fileName);
    } catch {
      window.open(contrato?.docx_storage_path || "/modelo_de_contratos/predefinidos/Contrato_WRMAX_Modelo_Parametrizado.docx", "_blank");
    } finally {
      setBaixandoDocx(false);
    }
  };

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <ScrollText className="size-5 text-primary" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Emissão e Liberação de Contrato (Etapa 5)
          </h2>
        </div>

        {contratoAtivo ? (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="size-3.5" />
            CONTRATO LIBERADO AO CLIENTE
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-mono text-muted-foreground border border-border bg-secondary/30 self-start sm:self-auto">
            AGUARDANDO EMISSÃO
          </span>
        )}
      </div>

      {/* Acoes de Visualizacao Direta para o Gestor */}
      {contratoAtivo && (
        <div className="p-4 sm:p-5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-primary font-bold">Minuta Parametrizada Ativa</span>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(contrato?.valor_mensal || valorMensal)}/mês · Vencimento todo dia {contrato?.dia_vencimento || diaVencimento}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setModalPreviewAberto(true)}
              className="px-4 py-2.5 rounded-lg border border-border bg-secondary/50 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Eye className="size-4 text-primary" />
              <span>Pré-visualizar Contrato</span>
            </button>
            <button
              type="button"
              onClick={handleBaixarDocxParametrizado}
              disabled={baixandoDocx}
              className="metal-button px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-primary-foreground flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
            >
              {baixandoDocx ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>{baixandoDocx ? "Gerando..." : "Baixar DOCX"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Secao de Contrato Assinado Recebido do Cliente */}
      {contratoAssinado || contrato?.docx_assinado_storage_path ? (
        <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileCheck className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-emerald-300">
                Via Assinada Enviada pelo Cliente!
              </p>
              <p className="text-xs text-muted-foreground">
                Arquivo: {contratoAssinado?.nome || "Contrato_Assinado_Cliente.pdf"}
              </p>
            </div>
          </div>

          <a
            href={contratoAssinado?.url || contrato?.docx_assinado_storage_path || "#"}
            download={contratoAssinado?.nome || "Contrato_Assinado.pdf"}
            target="_blank"
            rel="noreferrer"
            className="metal-button inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-primary-foreground cursor-pointer shadow-md shrink-0"
          >
            <Download className="size-4" />
            <span>Baixar Contrato Assinado</span>
          </a>
        </div>
      ) : (
        <div className="p-3.5 rounded-lg border border-border/80 bg-secondary/15 text-xs text-muted-foreground flex items-center gap-2">
          <ScrollText className="size-4 text-muted-foreground shrink-0" />
          <span>Aguardando o cliente assinar e anexar a via formal pela Central do Cliente.</span>
        </div>
      )}

      {/* Regra de Contratada Fixa */}
      <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Cláusula Institucional de Contratada Fixa</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          CONTRATADA: K F G MOREIRA LTDA (WRMAX) - CNPJ 40.034.078/0001-41. A contratada é padronizada e imutável pelo sistema. Os dados do contratante são mesclados na emissão.
        </p>
      </div>

      <form onSubmit={handleSubmitForm} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Valor Mensal (R$) *</label>
            <input type="number" min={1} step="any" value={valorMensal} onChange={(e) => setValorMensal(Number(e.target.value))} className="w-full h-11 px-3.5 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:border-primary/80 outline-none transition-colors" required />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Dia de Vencimento da Fatura *</label>
            <input type="number" min={1} max={31} value={diaVencimento} onChange={(e) => setDiaVencimento(Number(e.target.value))} className="w-full h-11 px-3.5 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:border-primary/80 outline-none transition-colors" required />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Modelo de Minuta (DOCX)</label>
          <select value={modeloSelecionado} onChange={(e) => setModeloSelecionado(e.target.value)} className="w-full h-11 px-3.5 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:border-primary/80 outline-none transition-colors cursor-pointer">
            <option value="">Contrato Padrão de Prestação de Serviços Digitais (WRMAX)</option>
            {listaModelos.map((m) => (<option key={m.id} value={m.id}>{m.titulo}</option>))}
          </select>
        </div>

        <button
          type="submit"
          disabled={emitindo || loading}
          className="metal-button w-full h-12 rounded-lg text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
        >
          {emitindo || loading ? <Loader2 className="size-4 animate-spin" /> : <FileCheck className="size-4" />}
          <span>
            {emitindo || loading
              ? "Processando minuta contratual..."
              : contratoAtivo
              ? "Modificar e Substituir Minuta Contratual"
              : "Emitir e Liberar Contrato ao Cliente"}
          </span>
        </button>
      </form>

      <ContractPreviewModal
        open={modalPreviewAberto}
        clienteNome={clienteNome}
        valorMensal={contrato?.valor_mensal || valorMensal}
        diaVencimento={contrato?.dia_vencimento || diaVencimento}
        docxUrl={contrato?.docx_storage_path}
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
