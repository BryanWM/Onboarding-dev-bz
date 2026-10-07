import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspacePixPanel } from "../workspace-pix-panel";

describe("WorkspacePixPanel", () => {
  it("should render QR Code, BR Code and client name", () => {
    render(
      <WorkspacePixPanel
        clienteId="cli-test-123"
        clienteNome="Empresa Parceira"
        pixPago={false}
      />
    );

    expect(screen.getByText(/Gestão Financeira & Comprovante PIX/i)).toBeInTheDocument();
    expect(screen.getByText(/Empresa Parceira/i)).toBeInTheDocument();
    expect(screen.getByText(/Chave PIX \(E-mail\)/i)).toBeInTheDocument();
  });

  it("should toggle payment status when clicking action button", async () => {
    const onStatusAlterado = vi.fn();
    const supabaseLib = await import("@/lib/supabase");
    vi.spyOn(supabaseLib, "atualizarStatusPix").mockResolvedValue({ sucesso: true, pix_pago: true } as any);

    render(
      <WorkspacePixPanel
        clienteId="cli-test-123"
        clienteNome="Empresa Parceira"
        pixPago={false}
        onStatusAlterado={onStatusAlterado}
      />
    );

    const btn = screen.getByRole("button", { name: /Marcar PIX como Pago/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    await waitFor(() => {
      expect(onStatusAlterado).toHaveBeenCalledWith(true);
    });
  });
});
