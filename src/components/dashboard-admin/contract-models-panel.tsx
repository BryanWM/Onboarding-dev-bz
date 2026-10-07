import { useState, useEffect } from "react";
import { FileText, Upload, PlusCircle, Check, Copy, Tag, RefreshCw } from "lucide-react";
import { listarModelosContrato, criarModeloContrato } from "@/lib/supabase";

const TAGS_DISPONIVEIS = [
  { tag: "{{NOME_COMPLETO_OU_RAZAO_SOCIAL}}", desc: "Nome (PF) ou Razao Social (PJ)" },
  { tag: "{{CPF_OU_CNPJ}}", desc: "CPF ou CNPJ do contratante" },
  { tag: "{{VALOR_MENSAL}}", desc: "Valor da mensalidade (R$)" },
  { tag: "{{DIA_VENCIMENTO}}", desc: "Dia de vencimento da fatura" },
  { tag: "{{ENDERECO_COMPLETO}}", desc: "Endereco / Cidade / UF" },
  { tag: "{{EMAIL_CLIENTE}}", desc: "E-mail de contato do cliente" },
  { tag: "{{RAZAO_SOCIAL}}", desc: "Alias para Razao Social / Nome" },
  { tag: "{{CNPJ}}", desc: "Alias para CNPJ / CPF" },
];

export function ContractModelsPanel() {
  const [modelos, setModelos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await listarModelosContrato();
      setModelos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleSalvarModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !arquivo) return;
    setSalvando(true);
    try {
      await criarModeloContrato(titulo, descricao, arquivo);
      setNovoModalOpen(false);
      setTitulo("");
      setDescricao("");
      setArquivo(null);
      await carregar();
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="metal-panel p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider mb-1">
            <FileText className="size-4" />
            Catálogo de Modelos DOCX
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Modelos de Contrato e Tags de Mesclagem
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie minutas contratuais pré-aprovadas com tags automáticas de substituição.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregar}
            className="h-9 px-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Recarregar modelos"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setNovoModalOpen(true)}
            className="metal-button h-9 px-4 rounded-lg text-xs font-bold text-primary-foreground flex items-center gap-2 cursor-pointer shadow-md"
          >
            <PlusCircle className="size-3.5" />
            Novo Modelo
          </button>
        </div>
      </div>

      {/* Aviso institucional sobre a Contratada */}
      <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">CONTRATADA PADRÃO:</strong> K F G MOREIRA LTDA - WRMAX (CNPJ 40.034.078/0001-41). Permanece fixa por padrão no cabeçalho de todos os contratos e não necessita de preenchimento ou tags.
      </div>

      {/* Guia Didatico de Tags de Substituicao */}
      <div className="rounded-lg border border-border/70 bg-secondary/15 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Tag className="size-3.5 text-primary" />
          Tags Suportadas no Arquivo DOCX (Clique para copiar)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TAGS_DISPONIVEIS.map(({ tag, desc }) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleCopy(tag)}
              className="flex flex-col items-start p-2 rounded border border-border/60 bg-background/50 hover:border-primary/50 text-left transition-colors cursor-pointer group"
              title={desc}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-[11px] font-bold text-primary group-hover:text-primary">
                  {tag}
                </span>
                {copiedTag === tag ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Copy className="size-3 text-muted-foreground opacity-40 group-hover:opacity-100" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Modelos */}
      <div className="space-y-3">
        {modelos.map((m) => (
          <div
            key={m.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border/60 bg-secondary/20 hover:border-border transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{m.titulo}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ATIVO
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{m.descricao || "Sem descrição"}</p>
              <p className="text-[10px] font-mono text-muted-foreground/80">
                Arquivo: {m.template_storage_path}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-muted-foreground">
                DOCX Modelo
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Novo Modelo */}
      {novoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="metal-panel max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground">Upload de Novo Modelo DOCX</h3>
              <button
                type="button"
                onClick={() => setNovoModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarModelo} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
                  Título do Modelo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contrato de Manutenção Mensal"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
                  Descrição Resumida
                </label>
                <input
                  type="text"
                  placeholder="Ex: Utilizado para clientes de suporte recorrente"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
                  Arquivo DOCX com Tags *
                </label>
                <input
                  type="file"
                  required
                  accept=".docx"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:bg-secondary/40 file:text-xs file:font-mono file:text-foreground hover:file:bg-secondary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setNovoModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando || !titulo || !arquivo}
                  className="metal-button px-4 py-2 rounded-lg text-xs font-bold text-primary-foreground disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="size-3" />
                  {salvando ? "Enviando..." : "Salvar Modelo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
