import { useState, useMemo } from "react";
import { Search, Plus, FileText } from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { ProjectDeleteModal } from "./project-delete-modal";
import { ClientCreateModal } from "./client-create-modal";
import { ClientEditModal } from "./client-edit-modal";
import { ProjectListCard } from "./project-list-card";
import { excluirProjeto, bloquearLink, desbloquearLink } from "@/lib/supabase";
import { setorDoCliente, type Setor } from "@/lib/fase-projeto";

const FILTROS = [
  { id: "todas", rotulo: "Tudo" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "7dias", rotulo: "7 dias" },
  { id: "30dias", rotulo: "30 dias" },
] as const;

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
    () => (Array.isArray(clientes) ? clientes : []).filter((c) => c && setorDoCliente(c) === setor),
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

  // Mensagens iniciais calculadas a partir dos clientes reais
  const avisos = useMemo(() => {
    const lista = clientesDoSetor;
    const umDia = 24 * 3600 * 1000;
    if (setor === "producao") {
      const assinadoEm = (c: ClienteOnboarding) => {
        const datas = (c.contratos || []).map((ct) => ct.assinado_em).filter(Boolean) as string[];
        return datas.length ? Math.max(...datas.map((d) => new Date(d).getTime())) : null;
      };
      const recentes = lista.filter((c) => {
        const t = assinadoEm(c);
        return t !== null && Date.now() - t <= 7 * umDia;
      }).length;
      const noComercial = (Array.isArray(clientes) ? clientes : []).filter((c) => c && setorDoCliente(c) === "comercial").length;
      return [
        { rotulo: "Em produção", valor: lista.length, texto: "projetos com contrato assinado" },
        { rotulo: "Chegaram na semana", valor: recentes, texto: "contratos assinados nos últimos 7 dias" },
        { rotulo: "No comercial", valor: noComercial, texto: "projetos ainda em negociação" },
      ];
    }
    const novosHoje = lista.filter((c) => c.created_at && Date.now() - new Date(c.created_at).getTime() <= umDia).length;
    const pixPendentes = lista.filter((c) => !c.pix_pago).length;
    const contratosParaEmitir = lista.filter(
      (c) => (c.dados_cadastrais_cliente?.length ?? 0) > 0 && !(c.contratos?.length ?? 0)
    ).length;
    return [
      { rotulo: "Novos hoje", valor: novosHoje, texto: "clientes cadastrados nas últimas 24h" },
      { rotulo: "PIX pendente", valor: pixPendentes, texto: "aguardando confirmação do financeiro" },
      { rotulo: "Contratos", valor: contratosParaEmitir, texto: "com cadastro recebido, prontos para emitir" },
    ];
  }, [clientes, clientesDoSetor, setor]);

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

  return (
    <div className="space-y-5">
      {/* Mensagens iniciais + acoes principais */}
      {/* Mensagens iniciais + acoes principais (dourado: etiqueta, 1 palavra e "Novo Projeto") */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-7 pt-4 sm:pt-6 px-1">
        <div className="space-y-4 min-w-0">
          <span className="tag-ouro inline-block">{setor === "producao" ? "Produção" : "Comercial"}</span>
          {setor === "producao" ? (
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-[1.04]">
              {saudacao}, equipe.
              <br />
              Projetos em <span className="metal-text">produção</span>.
            </h1>
          ) : (
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-[1.04]">
              {saudacao}, gestor.
              <br />
              Seus clientes em <span className="metal-text">andamento</span>.
            </h1>
          )}
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {setor === "producao"
              ? "Projetos chegam aqui quando o cliente envia o contrato assinado. Abra um projeto para conduzir as boas-vindas, a estratégia e a produção."
              : "Abra um cliente para acompanhar a implantação ou cadastre um novo projeto para gerar o link de acesso."}
          </p>
        </div>
        {setor === "comercial" && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenModelos}
            className="glass-button h-12 px-5 rounded-lg text-sm font-semibold flex items-center gap-2.5 cursor-pointer"
          >
            <FileText className="size-4" />
            <span>Modelos de Contrato</span>
          </button>
          <button
            type="button"
            onClick={() => setModalNovoAberto(true)}
            className="metal-button h-12 px-6 rounded-lg text-sm font-semibold flex items-center gap-2.5 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
        )}
      </section>

      {/* Numeros do dia (valor em dourado suave) */}
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {avisos.map((a) => (
          <li key={a.rotulo} className="metal-panel px-5 py-5 flex flex-col gap-1.5">
            <span className="rotulo">{a.rotulo}</span>
            <strong className="font-display text-4xl font-bold tracking-tight text-primary">{a.valor}</strong>
            <span className="text-[13px] text-muted-foreground">{a.texto}</span>
          </li>
        ))}
      </ul>

      {/* Busca + filtros rapidos */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Buscar cliente</span>
          <Search className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-[10px] border border-[var(--linha-2)] bg-[var(--campo)] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[rgba(232,199,122,0.55)] transition-colors"
          />
        </label>

        <div role="group" aria-label="Filtro rápido por data de criação" className="flex items-center gap-1 p-1 rounded-[10px] bg-[var(--campo)] border border-[var(--linha)] overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtroData === f.id}
              onClick={() => setFiltroData(f.id)}
              className={`h-10 px-4 rounded-[7px] text-sm font-semibold cursor-pointer transition-colors shrink-0 ${
                filtroData === f.id ? "chip-ouro" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-muted-foreground px-2 text-center md:text-left">
          {clientesFiltrados.length} {clientesFiltrados.length === 1 ? "cliente" : "clientes"}
        </span>
      </section>

      <div className="space-y-3">
        <h2 className="sr-only">{setor === "producao" ? "Projetos em produção" : "Novos Projetos"}</h2>
        {loading ? (
          <div className="py-12 text-center text-sm font-mono text-muted-foreground">Carregando projetos...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="metal-panel p-10 text-center space-y-2">
            <Search className="size-7 text-muted-foreground/70 mx-auto" />
            <p className="font-semibold text-sm text-foreground">
              {clientesDoSetor.length === 0 && setor === "producao" ? "Nenhum projeto em produção ainda" : "Nenhum cliente encontrado"}
            </p>
            <p className="text-muted-foreground text-xs">
              {clientesDoSetor.length === 0 && setor === "producao"
                ? "Os projetos aparecem aqui quando o cliente envia o contrato assinado."
                : "Ajuste a busca ou o filtro de período."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {clientesFiltrados.map((cli) => (
              <ProjectListCard
                key={cli.id}
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
        onClose={() => { setModalExcluirAberto(false); setClienteParaExcluir(null); }}
        onConfirm={handleConfirmarExclusao}
      />
    </div>
  );
}
