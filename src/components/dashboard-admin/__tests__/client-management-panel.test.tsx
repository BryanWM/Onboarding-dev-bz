import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ClientManagementPanel } from "../client-management-panel";

vi.mock("@/lib/supabase", () => ({
  listarClientes: vi.fn().mockResolvedValue([
    {
      id: "cli-1",
      nome_completo: "Loja Teste Alpha",
      email: "alpha@teste.com",
      status: "link_ativo",
      links_temporarios: [
        {
          id: "link-1",
          token: "tok_test_alpha_123",
          expira_em: new Date(Date.now() + 3600000).toISOString(),
          bloqueado_manualmente: false,
          acessos_count: 3,
        },
      ],
    },
  ]),
  prorrogarLink: vi.fn().mockResolvedValue({}),
  bloquearLink: vi.fn().mockResolvedValue({}),
}));

describe("ClientManagementPanel", () => {
  it("should render client management panel header and action buttons", async () => {
    render(<ClientManagementPanel />);

    expect(screen.getByText("Gestão Operacional de Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Novos Projetos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Projeto/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Loja Teste Alpha")).toBeInTheDocument();
      expect(screen.getByText("LINK ATIVO")).toBeInTheDocument();
      expect(screen.getByText("tok_test_alpha_123")).toBeInTheDocument();
    });
  });
});
