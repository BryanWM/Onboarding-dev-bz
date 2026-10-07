import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ContractEmissionPanel } from "../contract-emission-panel";

vi.mock("@/lib/supabase", () => ({
  listarClientes: vi.fn().mockResolvedValue([
    {
      id: "cli-emissao-1",
      nome_completo: "Farmacia Pague Bem",
      status: "cadastro_recebido",
      dados_cadastrais_cliente: {
        razao_social: "Pague Bem Medicamentos Ltda",
        cnpj: "12.345.678/0001-90",
        representante_nome: "Maria Jose",
        email_financeiro: "financeiro@paguebem.com",
      },
    },
  ]),
  listarModelosContrato: vi.fn().mockResolvedValue([
    {
      id: "mod-1",
      titulo: "Modelo Padrao WRMax",
      descricao: "Clausulas gerais de marketing",
    },
  ]),
  emitirEEnviarContrato: vi.fn().mockResolvedValue({ sucesso: true }),
}));

describe("ContractEmissionPanel", () => {
  it("should render emission form with client cadastral details", async () => {
    render(<ContractEmissionPanel />);

    expect(screen.getByText("Emissão Exclusiva pelo Administrador")).toBeInTheDocument();
    expect(screen.getByText("Estruturação e Liberação de Contrato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Emitir e Enviar Contrato ao Cliente/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Pague Bem Medicamentos Ltda")).toBeInTheDocument();
      expect(screen.getByText("12.345.678/0001-90")).toBeInTheDocument();
      expect(screen.getByText("Maria Jose")).toBeInTheDocument();
    });
  });
});
