import { useEffect } from "react";
import { ScrollText, X, Download, ShieldCheck, Calendar, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ContractPreviewModalProps {
  open: boolean;
  clienteNome: string;
  valorMensal: number;
  diaVencimento: number;
  docxUrl?: string | null;
  dadosCadastrais?: Record<string, any> | null;
  onClose: () => void;
}

export function ContractPreviewModal({
  open,
  clienteNome,
  valorMensal,
  diaVencimento,
  docxUrl,
  dadosCadastrais,
  onClose,
}: ContractPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const razaoSocial = dadosCadastrais?.razao_social || dadosCadastrais?.nome_ou_razao || clienteNome;
  const cnpjCpf = dadosCadastrais?.cnpj || dadosCadastrais?.cpf_ou_cnpj || "A informar nos dados cadastrais";
  const email = dadosCadastrais?.email_financeiro || "A informar";
  const endereco = dadosCadastrais?.logradouro || "Teresina - PI";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-contract-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="metal-panel max-w-2xl w-full max-h-[90vh] flex flex-col p-6 space-y-4 animate-in zoom-in-95 duration-150 border-primary/40 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-border/70 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <ScrollText className="size-5 text-primary" />
            <h3 id="preview-contract-title" className="font-bold text-base sm:text-lg text-foreground">
              Pré-visualização da Minuta Contratual
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1 font-sans text-sm text-foreground/90 leading-relaxed scrollbar-thin">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-bold">
              Instrumento Particular de Prestação de Serviços
            </span>
            <h4 className="font-bold text-base text-foreground">
              CONTRATO DE MARKETING E PERFORMANCE DIGITAL
            </h4>
          </div>

          <div className="space-y-2 p-4 rounded-xl border border-border bg-secondary/20">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block">
              1. Qualificação das Partes
            </span>
            <p className="text-xs leading-relaxed">
              <strong className="text-foreground">CONTRATADA:</strong> K F G MOREIRA LTDA - WRMAX, sociedade empresária limitada, inscrita no CNPJ sob o nº 46.123.456/0001-00, com sede em Teresina/PI.
            </p>
            <p className="text-xs leading-relaxed pt-1">
              <strong className="text-foreground">CONTRATANTE:</strong> {razaoSocial}, inscrita sob o CNPJ/CPF nº {cnpjCpf}, com e-mail financeiro {email}, com sede/domicílio em {endereco}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-secondary/30 flex items-center gap-3">
              <DollarSign className="size-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">Investimento Mensal</span>
                <span className="font-bold text-base text-foreground font-mono">{formatCurrency(valorMensal)}</span>
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-secondary/30 flex items-center gap-3">
              <Calendar className="size-5 text-primary shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">Dia de Vencimento</span>
                <span className="font-bold text-base text-foreground font-mono">Todo dia {diaVencimento}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <h5 className="font-bold text-foreground text-xs uppercase font-mono">2. Resumo das Cláusulas Gerais</h5>
            <p>
              <strong>Cláusula 1ª (Objeto):</strong> O presente instrumento tem por objeto a prestação de serviços continuados de assessoria de marketing, branding, planejamento estratégico e produção de conteúdos de alta performance pela CONTRATADA em favor da CONTRATANTE.
            </p>
            <p>
              <strong>Cláusula 2ª (Vigência):</strong> O contrato possui vigência de 12 (doze) meses, renovando-se automaticamente por iguais períodos caso não haja denúncia prévia e expressa por qualquer das partes no prazo de 30 (trinta) dias.
            </p>
            <p>
              <strong>Cláusula 3ª (Pagamento):</strong> A remuneração mensal ajustada de {formatCurrency(valorMensal)} deverá ser quitada pontualmente até o dia {diaVencimento} de cada mês via transferência bancária ou PIX.
            </p>
            <p>
              <strong>Cláusula 4ª (Confidencialidade):</strong> Ambas as partes comprometem-se a resguardar o sigilo de todas as informações estratégicas e dados cadastrais trocados durante a execução dos serviços.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/70 shrink-0">
          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            Parâmetros validados para este cliente
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-secondary/40 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
            >
              Fechar
            </button>
            {docxUrl && (
              <a
                href={docxUrl}
                download={`Contrato_WRMAX_${clienteNome.replace(/\s+/g, "_")}.docx`}
                className="metal-button px-4 py-2 rounded-lg text-xs font-bold text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="size-3.5" />
                <span>Baixar Word (.docx)</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
