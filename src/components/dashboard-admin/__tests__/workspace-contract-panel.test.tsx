import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceContractPanel } from "../workspace-contract-panel";

describe("WorkspaceContractPanel", () => {
  it("separa 'Gerar automaticamente' de 'Editar um modelo' (modelos para baixar + anexo manual)", async () => {
    const onAnexarManual = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkspaceContractPanel
        clienteId="cli-1"
        clienteNome="Loja Alpha"
        modelos={[{ id: "mod-1", titulo: "Contrato Social Media", template_storage_path: "modelos-contrato/a.docx" }]}
        onEmitirContrato={vi.fn()}
        onAnexarManual={onAnexarManual}
      />,
    );

    expect(screen.getByRole("tab", { name: /Gerar automaticamente/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Emitir e Liberar Contrato/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Editar um modelo/ }));
    expect(screen.getByRole("button", { name: "Baixar Contrato Padrão WRMax preenchido" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar Contrato Social Media preenchido" })).toBeInTheDocument();

    const anexar = screen.getByRole("button", { name: /Anexar contrato/ });
    expect(anexar).toBeDisabled();

    const arquivo = new File(["%PDF"], "contrato-editado.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Arquivo do contrato"), { target: { files: [arquivo] } });
    fireEvent.change(screen.getByLabelText("Valor mensal"), { target: { value: "2000" } });
    fireEvent.click(anexar);

    await waitFor(() => expect(onAnexarManual).toHaveBeenCalledWith(arquivo, 2000, null));
  });

  it("contrato manual nao liberado: cliente nao ve ate o gestor liberar", () => {
    const onLiberarContrato = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkspaceContractPanel
        clienteId="cli-1"
        contrato={{
          id: "ct-1",
          origem: "manual",
          liberado_para_cliente: false,
          valor_mensal: null,
          dia_vencimento: null,
          docx_nome: "contrato-editado.pdf",
          docx_storage_path: "contratos-docx/cli-1/x.pdf",
        }}
        onEmitirContrato={vi.fn()}
        onLiberarContrato={onLiberarContrato}
      />,
    );

    expect(screen.getByText("Anexado · aguardando liberação")).toBeInTheDocument();
    expect(screen.getByText("O cliente ainda não vê este contrato na Central.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Liberar para o cliente/ }));
    expect(onLiberarContrato).toHaveBeenCalledWith("ct-1");
  });

  it("contrato liberado nao mostra o botao de liberar", () => {
    render(
      <WorkspaceContractPanel
        clienteId="cli-1"
        contrato={{ id: "ct-2", origem: "automatico", liberado_para_cliente: true, valor_mensal: 1500, dia_vencimento: 10 }}
        onEmitirContrato={vi.fn()}
      />,
    );
    expect(screen.getByText("Liberado ao cliente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Liberar para o cliente/ })).toBeNull();
  });

  it("via assinada enviada: gestor valida ou apaga para o cliente reenviar", async () => {
    const onValidarVia = vi.fn().mockResolvedValue(undefined);
    const onRemoverVia = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkspaceContractPanel
        clienteId="cli-1"
        contrato={{
          id: "ct-3",
          origem: "automatico",
          liberado_para_cliente: true,
          valor_mensal: 1500,
          dia_vencimento: 10,
          docx_assinado_storage_path: "contratos-assinados/cli-1/via.pdf",
          docx_assinado_nome: "via.pdf",
        }}
        onEmitirContrato={vi.fn()}
        onValidarVia={onValidarVia}
        onRemoverVia={onRemoverVia}
      />,
    );

    expect(screen.getByText("Via assinada · aguardando validação")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Validar via assinada/ }));
    await waitFor(() => expect(onValidarVia).toHaveBeenCalledWith("ct-3"));

    fireEvent.click(screen.getByRole("button", { name: /Apagar via anexada/ }));
    fireEvent.click(screen.getByRole("button", { name: /Sim, apagar/ }));
    await waitFor(() => expect(onRemoverVia).toHaveBeenCalledWith("ct-3", "contratos-assinados/cli-1/via.pdf"));
  });

  it("contrato validado: fechado, sem validar/apagar e sem substituir", () => {
    render(
      <WorkspaceContractPanel
        clienteId="cli-1"
        contrato={{
          id: "ct-4",
          origem: "automatico",
          liberado_para_cliente: true,
          valor_mensal: 1500,
          dia_vencimento: 10,
          docx_assinado_storage_path: "contratos-assinados/cli-1/via.pdf",
          validado_em: "2026-10-11T12:00:00Z",
        }}
        onEmitirContrato={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Contrato fechado").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Validar via assinada/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Apagar via anexada/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Gerar automaticamente/ })).toBeNull();
  });
});