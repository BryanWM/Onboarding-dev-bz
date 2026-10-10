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

    expect(screen.getByText("ANEXADO · AGUARDANDO LIBERAÇÃO")).toBeInTheDocument();
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
    expect(screen.getByText("LIBERADO AO CLIENTE")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Liberar para o cliente/ })).toBeNull();
  });
});
