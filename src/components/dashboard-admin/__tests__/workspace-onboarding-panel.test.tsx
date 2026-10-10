import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceOnboardingPanel } from "../workspace-onboarding-panel";

const base = {
  clienteNome: "Cliente X",
  onSalvarLinkOnboarding: vi.fn(),
  onMarcarPreenchido: vi.fn(),
};

describe("WorkspaceOnboardingPanel", () => {
  it("sem confirmacao: mostra aguardando e permite o gestor marcar como preenchido", async () => {
    const onMarcar = vi.fn().mockResolvedValue(undefined);
    render(<WorkspaceOnboardingPanel {...base} onMarcarPreenchido={onMarcar} />);

    expect(screen.getByText("AGUARDANDO PREENCHIMENTO")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /marcar como preenchido/i }));
    await waitFor(() => expect(onMarcar).toHaveBeenCalledWith(true));
  });

  it("confirmado pelo cliente: mostra autor e data, e permite desfazer", async () => {
    const onMarcar = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkspaceOnboardingPanel
        {...base}
        confirmadoEm="2026-10-08T12:00:00.000Z"
        confirmadoPor="cliente"
        onMarcarPreenchido={onMarcar}
      />,
    );

    expect(screen.getByText("ONBOARDING PREENCHIDO")).toBeInTheDocument();
    expect(screen.getByText("Confirmado pelo cliente na Central")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /desfazer confirmação/i }));
    await waitFor(() => expect(onMarcar).toHaveBeenCalledWith(false));
  });

  it("marcado pelo gestor mostra o autor certo", () => {
    render(<WorkspaceOnboardingPanel {...base} confirmadoEm="2026-10-08T12:00:00.000Z" confirmadoPor="gestor" />);
    expect(screen.getByText("Marcado como preenchido pelo gestor")).toBeInTheDocument();
  });

  it("mostra o link personalizado do Google Forms", () => {
    render(<WorkspaceOnboardingPanel {...base} linkOnboardingForm="https://forms.gle/abc" />);
    expect(screen.getByText("https://forms.gle/abc")).toBeInTheDocument();
    expect(screen.getByText("Link Personalizado")).toBeInTheDocument();
  });
});
