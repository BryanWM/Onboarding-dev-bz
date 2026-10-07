import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ContractModelsPanel } from "../contract-models-panel";

vi.mock("@/lib/supabase", () => ({
  listarModelosContrato: vi.fn().mockResolvedValue([
    {
      id: "mod-teste-1",
      titulo: "Modelo de Teste de Prestação",
      descricao: "Descrição do modelo de teste",
      template_storage_path: "modelos-contrato/teste.docx",
      ativo: true,
    },
  ]),
  criarModeloContrato: vi.fn().mockResolvedValue({ id: "novo-mod" }),
}));

describe("ContractModelsPanel", () => {
  it("should render contract models panel with merge tags guide", async () => {
    render(<ContractModelsPanel />);

    expect(screen.getByText("Catálogo de Modelos DOCX")).toBeInTheDocument();
    expect(screen.getByText("Modelos de Contrato e Tags de Mesclagem")).toBeInTheDocument();
    expect(screen.getByText("{{RAZAO_SOCIAL}}")).toBeInTheDocument();
    expect(screen.getByText("{{CNPJ}}")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Modelo/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Modelo de Teste de Prestação")).toBeInTheDocument();
      expect(screen.getByText("Descrição do modelo de teste")).toBeInTheDocument();
    });
  });
});
