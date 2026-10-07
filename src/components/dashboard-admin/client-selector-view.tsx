import { useState, useMemo } from "react";
import { Search, Plus, FileText, ShieldCheck } from "lucide-react";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { ProjectDeleteModal } from "./project-delete-modal";
import { ClientCreateModal } from "./client-create-modal";
import { ClientEditModal } from "./client-edit-modal";
import { ProjectListCard } from "./project-list-card";
import { excluirProjeto, bloquearLink, desbloquearLink } from "@/lib/supabase";

interface ClientSelectorViewProps {
  clientes: ClienteOnboarding[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSelectCliente: (cliente: ClienteOnboarding) => void;
  onOpenModelos: () => void;
}

export function ClientSelectorView({
  clientes,
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

  const clientesFiltrados = useMemo(() => {
    let list = Array.isArray(clientes) ? clientes : [];
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
  }, [clientes, busca, filtroData]);

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-primary flex items-center gap-1.5 mb-1 font-semibold">
            <ShieldCheck className="size-4" /> Gestão Operacional de Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Novos Projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Selecione um cliente para abrir seu ambiente exclusivo de acompanhamento e implantação.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenModelos}
            className="px-4 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <FileText className="size-4 text-primary" />
            <span>Modelos de Contrato</span>
          </button>
          <button
            type="button"
            onClick={() => setModalNovoAberto(true)}
            className="metal-button px-5 py-2.5 rounded-lg text-sm font-bold text-primary-foreground flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="size-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do projeto, pessoa, e-mail ou WhatsApp..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/80 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFiltroData("todas")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-colors shrink-0 ${
              filtroData === "todas"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFiltroData("hoje")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-colors shrink-0 ${
              filtroData === "hoje"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setFiltroData("7dias")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-colors shrink-0 ${
              filtroData === "7dias"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            7 dias
          </button>
          <button
            type="button"
            onClick={() => setFiltroData("30dias")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-colors shrink-0 ${
              filtroData === "30dias"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            30 dias
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-sm font-mono text-muted-foreground">Carregando projetos...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="metal-panel p-8 text-center space-y-3">
            <p className="text-muted-foreground text-sm font-mono">Nenhum projeto encontrado para o termo pesquisado.</p>
          </div>
        ) : (
          <div className="grid gap-3.5">
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
