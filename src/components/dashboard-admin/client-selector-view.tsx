import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Plus, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { ProjectDeleteModal } from "./project-delete-modal";
import { ClientCreateModal } from "./client-create-modal";
import { ClientEditModal } from "./client-edit-modal";
import { ProjectListCard } from "./project-list-card";
import { ProducaoKanban } from "./producao-kanban";
import { excluirProjeto, bloquearLink, desbloquearLink } from "@/lib/supabase";
import { clienteNoSetor, contratoFechado, type Setor } from "@/lib/fase-projeto";

const FILTROS = [
  { id: "todas", rotulo: "Tudo" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "7dias", rotulo: "7 dias" },
  { id: "30dias", rotulo: "30 dias" },
] as const;

const GAP_LISTA = 10; // gap-2.5

interface ClientSelectorViewProps {
  clientes: ClienteOnboarding[];
  setor?: Setor;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSelectCliente: (cliente: ClienteOnboarding) => void;
  onOpenModelos: () => void;
}

export function ClientSelectorView({
  clientes,
  setor = "comercial",
  loading,
  onRefresh,
  onSelectCliente,
  onOpenModelos,
}: ClientSelectorViewProps) {
  const producao = setor === "producao";
  const [busca, setBusca] = useState("");
  type FiltroData = "todas" | "hoje" | "7dias" | "30dias";
  const [filtroData, setFiltroData] = useState<FiltroData>("todas");
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<ClienteOnboarding | null>(null);
  const [clienteParaEditar, setClienteParaEditar] = useState<ClienteOnboarding | null>(null);

  // Cada secao ve so os seus projetos: Comercial ate o contrato assinado, depois Producao.
  const clientesDoSetor = useMemo(
    () => (Array.isArray(clientes) ? clientes : []).filter((c) => c && clienteNoSetor(c, setor)),
    [clientes, setor]
  );

  const clientesFiltrados = useMemo(() => {
    let list = clientesDoSetor;
    const termo = (busca || "").toLowerCase().trim();
    if (termo) {
      list = list.filter((c) => {
        if (!c) return false;
        const nome = (c.nome_completo || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const zap = c.whatsapp || "";
        return nome.includes(termo) || email.includes(termo) || zap.includes(termo);
      });
    }

    if (filtroData !== "todas") {
      const agora = Date.now();
      list = list.filter((c) => {
        if (!c.created_at) return false;
        const dt = new Date(c.created_at).getTime();
        const diffHoras = (agora - dt) / (1000 * 3600);
        if (filtroData === "hoje") return diffHoras <= 24;
        if (filtroData === "7dias") return diffHoras <= 24 * 7;
        if (filtroData === "30dias") return diffHoras <= 24 * 30;
        return true;
      });
    }

    return list;
  }, [clientesDoSetor, busca, filtroData]);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const handleConfirmarExclusao = async () => {
    if (!clienteParaExcluir) return;
    try {
      await excluirProjeto(clienteParaExcluir.id);
      await onRefresh();
    } catch (err) {
      console.error("Erro ao excluir projeto:", err);
    } finally {
      setModalExcluirAberto(false);
      setClienteParaExcluir(null);
    }
  };

  const handleToggleBloqueio = async (cliente: ClienteOnboarding) => {
    const link = cliente.links_temporarios?.[0];
    if (!link) return;
    try {
      if (link.bloqueado_manualmente || cliente.status === "bloqueado") {
        await desbloquearLink(link.id);
      } else {
        await bloquearLink(link.id);
      }
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };


  // Paginacao do tamanho da tela: quantos cards cabem na area da lista.
  const listaRef = useRef<HTMLDivElement>(null);
  const [porPagina, setPorPagina] = useState(5);
  const [pagina, setPagina] = useState(0);
  const temClientes = clientesFiltrados.length > 0;

  useEffect(() => {
    const el = listaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      if (!el.clientHeight) return; // sem layout (testes): mantem o padrao
      const cards = [...el.querySelectorAll<HTMLElement>("[data-card-cliente]")];
      const alturaCard = Math.max(64, ...cards.map((c) => c.offsetHeight));
      const n = Math.max(1, Math.floor((el.clientHeight + GAP_LISTA) / (alturaCard + GAP_LISTA)));
      setPorPagina((atual) => (atual === n ? atual : n));
    };
    medir();
    // observa a area e os cards (altura do card muda com os selos / largura da tela)
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    el.querySelectorAll("[data-card-cliente]").forEach((card) => ro.observe(card));
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [loading, temClientes, porPagina, pagina]);

  useEffect(() => setPagina(0), [busca, filtroData, setor]);

  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * porPagina;
  const clientesDaPagina = clientesFiltrados.slice(inicio, inicio + porPagina);

  return (
    // Ocupa a altura disponivel sem rolar: topo fixo e lista paginada no espaco que sobra
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Titulo + acoes principais (dourado: etiqueta, 1 palavra e "Novo Projeto") */}
      <section className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 px-1">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            {setor === "producao" ? (
              <>
                {saudacao}, equipe. Projetos em <span className="metal-text">produção</span>.
              </>
            ) : (
              <>
                {saudacao}, gestor. Seus clientes em <span className="metal-text">andamento</span>.
              </>
            )}
          </h1>
        </div>
        {setor === "comercial" && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenModelos}
              className="glass-button h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <FileText className="size-4" />
              <span className="sm:hidden">Modelos</span>
              <span className="hidden sm:inline">Modelos de Contrato</span>
            </button>
            <button
              type="button"
              onClick={() => setModalNovoAberto(true)}
              className="metal-button h-10 px-5 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Novo Projeto</span>
            </button>
          </div>
        )}
      </section>

      {/* Busca + filtros rapidos */}
      <section className="shrink-0 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Buscar cliente</span>
          <Search className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 pl-11 pr-4 rounded-[10px] border border-[var(--linha-2)] bg-[var(--campo)] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(232,199,122,0.55)] transition-colors"
          />
        </label>

        {producao ? (
          <span className="text-xs font-mono text-muted-foreground px-2 text-center md:text-left shrink-0">
            {clientesFiltrados.length} {clientesFiltrados.length === 1 ? "projeto" : "projetos"}
          </span>
        ) : (
        <div className="flex items-center justify-between gap-2 md:contents">
        <div role="group" aria-label="Filtro rápido por data de criação" className="flex items-center gap-1 p-1 rounded-[10px] bg-[var(--campo)] border border-[var(--linha)] overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtroData === f.id}
              onClick={() => setFiltroData(f.id)}
              className={`h-8 px-2.5 sm:px-3.5 rounded-[7px] text-sm font-semibold cursor-pointer transition-colors shrink-0 ${
                filtroData === f.id ? "chip-ouro" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        {totalPaginas > 1 ? (
          <nav aria-label="Paginação da lista de clientes" className="flex items-center justify-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setPagina(paginaAtual - 1)}
              disabled={paginaAtual === 0}
              aria-label="Página anterior"
              className="glass-button size-9 rounded-lg grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground px-1 min-w-[5.5rem] sm:min-w-[7.5rem] text-center" aria-live="polite">
              {inicio + 1}–{Math.min(inicio + porPagina, clientesFiltrados.length)} de {clientesFiltrados.length}
            </span>
            <button
              type="button"
              onClick={() => setPagina(paginaAtual + 1)}
              disabled={paginaAtual >= totalPaginas - 1}
              aria-label="Próxima página"
              className="glass-button size-9 rounded-lg grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </nav>
        ) : (
          <span className="text-xs font-mono text-muted-foreground px-2 text-center md:text-left">
            {clientesFiltrados.length} {clientesFiltrados.length === 1 ? "cliente" : "clientes"}
          </span>
        )}
        </div>
        )}
      </section>

      <h2 className="sr-only">{setor === "producao" ? "Projetos em produção" : "Novos Projetos"}</h2>
      <div ref={listaRef} className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm font-mono text-muted-foreground">Carregando projetos...</div>
        ) : !temClientes ? (
          <div className="metal-panel p-10 text-center space-y-2">
            <Search className="size-7 text-muted-foreground/70 mx-auto" />
            <p className="font-semibold text-sm text-foreground">
              {clientesDoSetor.length === 0 && setor === "producao" ? "Nenhum projeto em produção ainda" : "Nenhum cliente encontrado"}
            </p>
            <p className="text-muted-foreground text-xs">
              {clientesDoSetor.length === 0 && setor === "producao"
                ? "Os projetos aparecem aqui quando o gestor valida o contrato assinado."
                : "Ajuste a busca ou o filtro de período."}
            </p>
          </div>
        ) : producao ? (
          <ProducaoKanban clientes={clientesFiltrados} onSelect={onSelectCliente} />
        ) : (
          <div className="grid gap-2.5">
            {clientesDaPagina.map((cli) => (
              <div key={cli.id} data-card-cliente>
                <ProjectListCard
                  cliente={cli}
                  onSelect={onSelectCliente}
                  onEditar={(c) => {
                    setClienteParaEditar(c);
                    setModalEditarAberto(true);
                  }}
                  onToggleBloqueio={handleToggleBloqueio}
                  onExcluir={(c) => {
                    setClienteParaExcluir(c);
                    setModalExcluirAberto(true);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientCreateModal
        open={modalNovoAberto}
        onClose={() => {
          setModalNovoAberto(false);
          onRefresh();
        }}
        onSuccess={onRefresh}
      />
      <ClientEditModal
        open={modalEditarAberto}
        cliente={clienteParaEditar}
        onClose={() => { setModalEditarAberto(false); setClienteParaEditar(null); }}
        onUpdated={() => { onRefresh(); }}
      />
      <ProjectDeleteModal
        open={modalExcluirAberto}
        clienteNome={clienteParaExcluir?.nome_completo || ""}
        contratoFechado={clienteParaExcluir ? contratoFechado(clienteParaExcluir) : false}
        onClose={() => { setModalExcluirAberto(false); setClienteParaExcluir(null); }}
        onConfirm={handleConfirmarExclusao}
      />
    </div>
  );
}