import { useState, useEffect } from "react";
import { FileText, Upload, PlusCircle, Check, Copy, Tag, RefreshCw, ChevronDown } from "lucide-react";
import { useTravarRolagem } from "@/lib/use-travar-rolagem";
import { listarModelosContrato, criarModeloContrato } from "@/lib/supabase";
import { Portal } from "@/components/portal";

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
  useTravarRolagem(novoModalOpen);

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
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="rotulo block">Catálogo</span>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Modelos de Contrato</h2>
          <p className="text-sm text-muted-foreground">Minutas DOCX com tags que o sistema preenche com os dados do cliente.</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={carregar}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Recarregar modelos"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setNovoModalOpen(true)}
            className="metal-button h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="size-4" />
            Novo Modelo
          </button>
        </div>
      </div>

      {/* Lista de modelos */}
      {modelos.length > 0 ? (
        <ul className="divide-y divide-[var(--linha)] border-y border-[var(--linha)]">
          {modelos.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3.5 min-w-0">
              <FileText className="size-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{m.titulo}</p>
                {m.descricao && <p className="text-xs text-muted-foreground truncate">{m.descricao}</p>}
              </div>
              <span className="inline-flex items-center gap-[7px] h-7 px-3 rounded-full border border-[var(--linha-2)] text-xs text-foreground shrink-0">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[#6fd39b]" />
                Ativo
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado. O contrato padrão WRMax continua disponível.</p>
      )}

      {/* Ajuda: tags e contratada, recolhidas */}
      <details className="group">
        <summary className="text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer list-none inline-flex items-center gap-1.5">
          <Tag className="size-4" />
          Tags suportadas no DOCX
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {TAGS_DISPONIVEIS.map(({ tag, desc }) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleCopy(tag)}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--linha)] hover:border-[var(--linha-2)] text-left transition-colors cursor-pointer"
                title={desc}
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] text-primary truncate">{tag}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{desc}</span>
                </span>
                {copiedTag === tag ? <Check className="size-3.5 text-emerald-400 shrink-0" /> : <Copy className="size-3.5 text-muted-foreground shrink-0" />}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Contratada fixa em todos os contratos: K F G MOREIRA LTDA - WRMAX (CNPJ 40.034.078/0001-41), sem precisar de tag.
          </p>
        </div>
      </details>
      {/* Modal de Novo Modelo */}
      {novoModalOpen && (
        <Portal>
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
                  className="metal-button px-4 py-2 rounded-lg text-xs font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="size-3" />
                  {salvando ? "Enviando..." : "Salvar Modelo"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </section>
  );
}
