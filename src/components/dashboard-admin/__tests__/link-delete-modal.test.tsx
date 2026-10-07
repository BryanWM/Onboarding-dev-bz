import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LinkDeleteModal } from "../link-delete-modal";

describe("LinkDeleteModal", () => {
  it("should NOT render anything in the DOM when open is false", () => {
    const { container } = render(
      <LinkDeleteModal
        open={false}
        clienteNome="Cliente Teste"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Excluir Link Temporário/i)).not.toBeInTheDocument();
  });

  it("should render dialog content when open is true", () => {
    render(
      <LinkDeleteModal
        open={true}
        clienteNome="Cliente Alpha"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Excluir Link Temporário")).toBeInTheDocument();
    expect(screen.getByText(/Cliente Alpha/i)).toBeInTheDocument();
  });

  it("should call onClose when clicking Cancelar", () => {
    const onClose = vi.fn();
    render(
      <LinkDeleteModal
        open={true}
        clienteNome="Cliente Alpha"
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
