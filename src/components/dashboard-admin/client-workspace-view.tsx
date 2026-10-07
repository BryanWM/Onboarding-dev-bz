import { useState, useEffect } from "react";
import {
  prorrogarLink,
  bloquearLink,
  desbloquearLink,
  excluirLinkTemporario,
  atualizarStatusPix,
  atualizarApresentacaoCliente,
  emitirEEnviarContrato,
  listarModelosContrato,
} from "@/lib/supabase";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceLinkPanel } from "./workspace-link-panel";
import { WorkspacePresentationPanel } from "./workspace-presentation-panel";
import { WorkspaceCadastralPanel } from "./workspace-cadastral-panel";
import { WorkspaceContractPanel } from "./workspace-contract-panel";
import { WorkspaceChecklist } from "./workspace-checklist";
import { LinkDeleteModal } from "./link-delete-modal";

interface ClientWorkspaceViewProps {
  cliente: any;
  onBack: () => void;
  onRefresh: () => void;
}

export function ClientWorkspaceView({
  cliente,
  onBack,
  onRefresh,
}: ClientWorkspaceViewProps) {
  const link = cliente.links_temporarios?.[0];
  const dadosCadastrais = cliente.dados_cadastrais_cliente;
  const contrato = cliente.contratos?.[0];

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [emitindoContrato, setEmitindoContrato] = useState(false);
  const [modelos, setModelos] = useState<any[]>([]);

  useEffect(() => {
    listarModelosContrato().then(setModelos).catch(console.error);
  }, []);

  const handleProrrogar = async (minutos: number) => {
    if (!link) return;
    setLoadingAction(true);
    try {
      await prorrogarLink(link.id, minutos);
      onRefresh();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleBloqueio = async () => {
    if (!link) return;
    setLoadingAction(true);
    try {
      if (link.bloqueado_manualmente) {
        await desbloquearLink(link.id);
      } else {
        await bloquearLink(link.id);
      }
      onRefresh();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmDeleteLink = async () => {
    if (!link) return;
    setLoadingAction(true);
    try {
      await excluirLinkTemporario(link.id);
      setDeleteModalOpen(false);
      onRefresh();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTogglePix = async () => {
    setLoadingAction(true);
    try {
      await atualizarStatusPix(cliente.id, !cliente.pix_pago);
      onRefresh();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUploadApresentacao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      await atualizarApresentacaoCliente(cliente.id, file);
      onRefresh();
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleEmitirContrato = async ({
    modeloId,
    valorMensal,
    diaVencimento,
  }: {
    modeloId: string;
    valorMensal: number;
    diaVencimento: number;
  }) => {
    setEmitindoContrato(true);
    try {
      await emitirEEnviarContrato(cliente.id, modeloId || null, valorMensal, diaVencimento);
      onRefresh();
    } finally {
      setEmitindoContrato(false);
    }
  };

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        cliente={cliente}
        onBack={onBack}
        onTogglePix={handleTogglePix}
        loadingAction={loadingAction}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspaceLinkPanel
          link={link}
          loadingAction={loadingAction}
          onProrrogar={handleProrrogar}
          onToggleBloqueio={handleToggleBloqueio}
          onDeleteClick={() => setDeleteModalOpen(true)}
        />
        <WorkspacePresentationPanel
          apresentacaoUrl={cliente.apresentacao_pdf_url}
          apresentacaoNome={cliente.apresentacao_pdf_nome}
          loading={uploadingPdf}
          onUpload={async (file) => {
            setUploadingPdf(true);
            try {
              await atualizarApresentacaoCliente(cliente.id, file);
              await onRefresh();
            } finally {
              setUploadingPdf(false);
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspaceCadastralPanel dadosCadastrais={dadosCadastrais} />
        <WorkspaceContractPanel
          contrato={contrato}
          modelos={modelos}
          emitindoContrato={emitindoContrato}
          onEmitirContrato={handleEmitirContrato}
        />
      </div>

      <WorkspaceChecklist
        clienteId={cliente.id}
        clienteNome={cliente.nome_completo}
      />

      {deleteModalOpen && (
        <LinkDeleteModal
          clienteNome={cliente.nome_completo}
          loading={loadingAction}
          onConfirm={handleConfirmDeleteLink}
          onClose={() => setDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}
