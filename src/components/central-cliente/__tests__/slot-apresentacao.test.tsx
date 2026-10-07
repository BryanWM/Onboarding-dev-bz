import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SlotApresentacao } from "../slot-apresentacao";

describe("SlotApresentacao Component", () => {
  it("should render empty state when no presentation URL is provided", () => {
    render(<SlotApresentacao apresentacaoUrl={null} />);
    expect(screen.getByText("Apresentação do Projeto")).toBeInTheDocument();
    expect(screen.getByText("Apresentação em preparação")).toBeInTheDocument();
  });

  it("should render file details and view/download buttons when URL is provided", () => {
    render(
      <SlotApresentacao
        apresentacaoUrl="https://example.com/apresentacao.pdf"
        apresentacaoNome="Minha_Proposta.pdf"
      />
    );
    expect(screen.getByText("Minha_Proposta.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Visualizar Apresentação/i })).toHaveAttribute(
      "href",
      "https://example.com/apresentacao.pdf"
    );
  });
});
