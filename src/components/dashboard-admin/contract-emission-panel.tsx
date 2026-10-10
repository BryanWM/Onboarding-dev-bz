import { useState, useEffect } from "react";
import { Send, FileCheck, CheckCircle2, AlertCircle, RefreshCw, Building2 } from "lucide-react";
import { listarClientes, listarModelosContrato, emitirEEnviarContrato } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export function ContractEmissionPanel() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [selectedModeloId, setSelectedModeloId] = useState<string>("");
  const [valorMensal, setValorMensal] = useState<string>("1500.00");
  const [diaVencimento, setDiaVencimento] = useState<number>(10);
  const [enviando, setEnviando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const carregar = async () => {
    try {
      const [cliData, modData] = await Promise.all([listarClientes(), listarModelosContrato()]);
      setClientes(cliData);
      setModelos(modData);
      if (modData.length > 0 && !selectedModeloId) {
        setSelectedModeloId(modData[0].id);
      }
      const pronto = cliData.find((c: any) => c.status === "cadastro_recebido");
      if (pronto && !selectedClienteId) {
        setSelectedClienteId(pronto.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const clienteAtual = clientes.find((c) => c.id === selectedClienteId);
  const dadosCadastrais = clienteAtual?.dados_cadastrais_cliente;

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteId) return;

    setEnviando(true);
    setMensagemSucesso(null);
    try {
      const numValor = parseFloat(valorMensal.replace(",", ".")) || 0;
      await emitirEEnviarContrato(selectedClienteId, selectedModeloId || null, numValor, diaVencimento);
      setMensagemSucesso(`Contrato emitido e liberado com sucesso para ${clienteAtual?.nome_completo}!`);
      await carregar();
      setTimeout(() => setMensagemSucesso(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="metal-panel p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider mb-1">
            <FileCheck className="size-4" />
            Emissão Exclusiva pelo Administrador
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Estruturação e Liberação de Contrato
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina mensalidade e vencimento para liberar a via oficial no Slot 04 do cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={carregar}
          className="h-9 px-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground font-mono transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="size-3" />
          Atualizar
        </button>
      </div>

      {mensagemSucesso && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          {mensagemSucesso}
        </div>
      )}

      <form onSubmit={handleEmitir} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
              Selecionar Cliente *
            </label>
            <select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_completo} ({c.status.replace("_", " ").toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {dadosCadastrais ? (
            <div className="p-3 rounded-lg border border-border/80 bg-secondary/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Building2 className="size-3.5" />
                Dados Cadastrais Recebidos do Cliente:
              </div>
              <p><span className="text-muted-foreground font-mono">Razão Social:</span> {dadosCadastrais.razao_social}</p>
              <p><span className="text-muted-foreground font-mono">CNPJ:</span> {dadosCadastrais.cnpj}</p>
              <p><span className="text-muted-foreground font-mono">Representante:</span> {dadosCadastrais.representante_nome}</p>
              <p><span className="text-muted-foreground font-mono">E-mail Financeiro:</span> {dadosCadastrais.email_financeiro}</p>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-border/60 bg-secondary/10 text-xs text-muted-foreground flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-400 shrink-0" />
              <span>Cliente ainda não submeteu dados cadastrais no Slot 03.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
              Modelo DOCX de Contrato
            </label>
            <select
              value={selectedModeloId}
              onChange={(e) => setSelectedModeloId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
              Valor da Mensalidade (R$) *
            </label>
            <input
              type="text"
              required
              value={valorMensal}
              onChange={(e) => setValorMensal(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:border-primary"
              placeholder="Ex: 1500.00"
            />
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Valor formalizado: {formatCurrency(parseFloat(valorMensal.replace(",", ".")) || 0)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
              Dia de Vencimento da Fatura *
            </label>
            <input
              type="number"
              min={1}
              max={31}
              required
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(parseInt(e.target.value, 10) || 1)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:border-primary"
            />
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Dia {diaVencimento} de cada mês
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={enviando || !selectedClienteId}
              className="metal-button w-full h-10 px-4 rounded-lg text-xs font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <Send className="size-3.5" />
              {enviando ? "Processando envio..." : "Emitir e Enviar Contrato ao Cliente"}
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Ao clicar, o contrato será liberado imediatamente no Slot 04 do cliente.
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}
