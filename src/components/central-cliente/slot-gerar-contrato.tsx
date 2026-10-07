import { useState } from "react";
import {
  FileText,
  Download,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { SlotHeader } from "./slot-header";
import {
  type DadosContratoForm,
  gerarContratoDocx,
  baixarBlobNoNavegador,
  gerarLinkWhatsappContrato,
} from "@/lib/contrato-generator";
import {
  type CampoContratoConfig,
  CAMPOS_CONTRATO,
  DADOS_EXEMPLO_MOCK,
  VALORES_INICIAIS_FORM,
} from "./contrato-mock-data";

export type { CampoContratoConfig };
export { CAMPOS_CONTRATO, DADOS_EXEMPLO_MOCK, VALORES_INICIAIS_FORM };

export const WHATSAPP_CONTRATO_DEFAULT = "5586999216675";
export const EMAIL_CONTATO_DEFAULT = "financeiro@wrmaxmarketing.com.br";

interface SlotGerarContratoProps {
  whatsappDestino?: string;
  emailContato?: string;
  onContratoGerado?: (dados: DadosContratoForm, fileName: string) => void;
  templateBuffer?: ArrayBuffer;
}

export function SlotGerarContrato({
  whatsappDestino = WHATSAPP_CONTRATO_DEFAULT,
  onContratoGerado,
  templateBuffer,
}: SlotGerarContratoProps) {
  const [dados, setDados] = useState<DadosContratoForm>(VALORES_INICIAIS_FORM);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ blob: Blob; fileName: string } | null>(null);

  const obrigatoriosPreenchidos = CAMPOS_CONTRATO.filter((c) => c.required).every(
    (c) => (dados[c.id] ?? "").trim().length > 0,
  );

  const handleGerarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obrigatoriosPreenchidos || gerando) return;

    setGerando(true);
    setErro(null);

    try {
      const { blob, fileName } = await gerarContratoDocx(dados, templateBuffer);
      baixarBlobNoNavegador(blob, fileName);
      setResultado({ blob, fileName });
      onContratoGerado?.(dados, fileName);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar o contrato");
    } finally {
      setGerando(false);
    }
  };

  const handleBaixarNovamente = () => {
    if (resultado) {
      baixarBlobNoNavegador(resultado.blob, resultado.fileName);
    }
  };

  const handleNovoContrato = () => {
    setResultado(null);
    setErro(null);
  };

  return (
    <section className="metal-panel p-6">
      <SlotHeader
        index="04"
        icon={<FileText className="size-4" />}
        title="Criar contrato de prestação de serviço"
        subtitle="Preencha os dados e gere instantaneamente seu contrato em Word (.docx) pronto para assinatura."
      />

      {resultado ? (
        <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Contrato gerado com sucesso!
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                O arquivo <strong className="text-foreground">{resultado.fileName}</strong> foi
                preenchido e o download foi iniciado no seu navegador.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleBaixarNovamente}
              className="metal-button inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold text-primary-foreground"
            >
              <Download className="size-4" /> Baixar contrato (.docx) novamente
            </button>

            <a
              href={gerarLinkWhatsappContrato(dados, whatsappDestino)}
              target="_blank"
              rel="noopener noreferrer"
              className="metal-button inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold text-primary-foreground"
            >
              <MessageCircle className="size-4" /> Enviar contrato no WhatsApp
            </a>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleNovoContrato}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3" /> Preencher outro contrato
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Preenchimento do contrato
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDados(DADOS_EXEMPLO_MOCK)}
                className="inline-flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                <Sparkles className="size-3" /> Preencher exemplo (Mock)
              </button>
              <button
                type="button"
                onClick={() =>
                  setDados({
                    nome: "",
                    documento: "",
                    email: "",
                    telefone: "",
                    profissao: "",
                    estadoCivil: "",
                    endereco: "",
                    cep: "",
                    valorMensal: "2.850,00",
                    diaVencimento: "15",
                  })
                }
                className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3" /> Limpar
              </button>
            </div>
          </div>

          <form onSubmit={handleGerarContrato} className="grid gap-4 sm:grid-cols-2">
            {CAMPOS_CONTRATO.map((c) => (
              <label
                key={c.id}
                className={`block text-sm ${c.id === "endereco" ? "sm:col-span-2" : ""}`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {c.label} {c.required && <span className="text-primary">*</span>}
                </span>
                <input
                  type={c.type}
                  required={c.required}
                  maxLength={200}
                  name={c.id}
                  placeholder={c.placeholder}
                  value={dados[c.id] ?? ""}
                  onChange={(e) => setDados((d) => ({ ...d, [c.id]: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-border bg-input/30 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
                />
              </label>
            ))}

            {erro && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive sm:col-span-2">
                {erro}
              </div>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="metal-button inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                disabled={!obrigatoriosPreenchidos || gerando}
              >
                <Download className="size-4" />
                {gerando ? "Gerando contrato..." : "Gerar e baixar contrato (.docx)"}
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                O arquivo .docx será baixado automaticamente com todas as cláusulas e campos
                preenchidos.
              </p>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
