import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectListCard } from "../project-list-card";
import type { ClienteOnboarding } from "@/lib/mock-data";

describe("ProjectListCard", () => {
  const mockCliente: ClienteOnboarding = {
    id: "cli-alpha-001",
    nome_completo: "Projeto Alpha Corp",
    email: "alpha@corp.com",
    whatsapp: "86999216675",
    status: "link_ativo",
    pix_pago: true,
    created_at: new Date().toISOString(),
    links_temporarios: [
      {
        id: "l1",
        token: "tok_alpha",
        expira_em: new Date(Date.now() + 100000).toISOString(),
        segundos_restantes: 18000,
        bloqueado_manualmente: false,
      },
    ],
    contratos: [
      {
        id: "ct1",
        valor_mensal: 3000,
        dia_vencimento: 5,
        status_envio: "enviado_ao_cliente",
        liberado_para_cliente: true,
      },
    ],
  };

  it("should render client details, status badges and call onSelect", () => {
    const onSelect = vi.fn();
    render(
      <ProjectListCard
        cliente={mockCliente}
        onSelect={onSelect}
        onEditar={vi.fn()}
        onToggleBloqueio={vi.fn()}
        onExcluir={vi.fn()}
      />
    );

    expect(screen.getByText("Projeto Alpha Corp")).toBeInTheDocument();
    expect(screen.getByText("alpha@corp.com")).toBeInTheDocument();
    expect(screen.getByText(/PIX PAGO/i)).toBeInTheDocument();
    expect(screen.getByText(/CONTRATO EMITIDO/i)).toBeInTheDocument();

    const btnGerenciar = screen.getByRole("button", { name: /Gerenciar Cliente/i });
    fireEvent.click(btnGerenciar);
    expect(onSelect).toHaveBeenCalledWith(mockCliente);
  });
});
