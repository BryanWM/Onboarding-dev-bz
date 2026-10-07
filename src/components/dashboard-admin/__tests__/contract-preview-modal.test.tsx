import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContractPreviewModal } from "../contract-preview-modal";

describe("ContractPreviewModal", () => {
  it("should not render when open is false", () => {
    const { container } = render(
      <ContractPreviewModal
        open={false}
        clienteNome="Empresa Exemplo"
        valorMensal={2500}
        diaVencimento={10}
        onClose={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("should render modal with contract clauses and values when open", () => {
    const onClose = vi.fn();
    render(
      <ContractPreviewModal
        open={true}
        clienteNome="Empresa Exemplo"
        valorMensal={2500}
        diaVencimento={10}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Pré-visualização da Minuta Contratual/i)).toBeInTheDocument();
    expect(screen.getByText(/Empresa Exemplo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2\.500/i).length).toBeGreaterThanOrEqual(1);

    const closeButtons = screen.getAllByRole("button", { name: /Fechar/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
