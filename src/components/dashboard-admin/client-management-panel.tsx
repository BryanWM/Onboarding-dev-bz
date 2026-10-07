import { useState, useEffect } from "react";
import { FolderKanban, RefreshCw, PlusCircle } from "lucide-react";
import { listarClientes, prorrogarLink, bloquearLink, desbloquearLink, excluirLinkTemporario } from "@/lib/supabase";
import { ClientCreateModal } from "./client-create-modal";
import { ClientWorkspaceView } from "./client-workspace-view";
import { LinkDeleteModal } from "./link-delete-modal";
import { ClientRow } from "./client-row";

export function ClientManagementPanel() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await listarClientes();
      setClientes(data);
      if (clienteSelecionado) {
        const atualizado = data.find((c: any) => c.id === clienteSelecionado.id);
        if (atualizado) setClienteSelecionado(atualizado);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleProrrogar = async (linkId: string, minutos: number) => {
    try {
      await prorrogarLink(linkId, minutos);
      await carregar();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBloqueio = async (link: any) => {
    try {
      if (link.bloqueado_manualmente) {
        await desbloquearLink(link.id);
      } else {
        await bloquearLink(link.id, "Bloqueado manualmente pelo gestor");
      }
      await carregar();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeleteLink = async () => {
    if (!deleteTarget?.linkId) return;
    try {
      await excluirLinkTemporario(deleteTarget.linkId);
      setDeleteTarget(null);
      await carregar();
    } catch (err) {
      console.error(err);
    }
  };

  if (clienteSelecionado) {
    return (
      <ClientWorkspaceView
        cliente={clienteSelecionado}
        onBack={() => setClienteSelecionado(null)}
        onRefresh={carregar}
      />
    );
  }

  return (
    <section className="metal-panel p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider mb-1">
            <FolderKanban className="size-4" />
            Gestão Operacional de Onboarding
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Novos Projetos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione um projeto para gerenciar apresentação, pagamento PIX, cadastro, contrato e checklist.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregar}
            className="h-9 px-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Recarregar lista"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="metal-button h-9 px-4 rounded-lg text-xs font-bold text-primary-foreground flex items-center gap-2 cursor-pointer shadow-md"
          >
            <PlusCircle className="size-3.5" />
            Novo Projeto
          </button>
        </div>
      </div>

      {modalOpen && (
        <ClientCreateModal
          onSuccess={carregar}
          onClose={() => setModalOpen(false)}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
              <th className="py-2.5 px-3">Projeto / Cliente</th>
              <th className="py-2.5 px-3">Status do Link</th>
              <th className="py-2.5 px-3">PIX</th>
              <th className="py-2.5 px-3">Contrato</th>
              <th className="py-2.5 px-3 text-right">Ações Operacionais</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {clientes.map((c) => (
              <ClientRow
                key={c.id}
                cliente={c}
                copiedToken={copiedToken}
                onCopy={handleCopy}
                onProrrogar={handleProrrogar}
                onToggleBloqueio={handleToggleBloqueio}
                onDeleteRequest={(target) => setDeleteTarget(target)}
                onSelect={(sel) => setClienteSelecionado(sel)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <LinkDeleteModal
        open={Boolean(deleteTarget)}
        clienteNome={deleteTarget?.nome || ""}
        onConfirm={handleConfirmDeleteLink}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
