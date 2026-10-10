import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InstitucionalScreen } from "@/components/central-cliente";

describe("Index route (Tela Institucional de Fallback)", () => {
  it("should render institutional capture screen with headline and whatsapp button", () => {
    render(<InstitucionalScreen />);

    // Header title
    expect(screen.getByRole("img", { name: /WRMax/i })).toBeInTheDocument();

    // Headline solicitada na demanda.md
    expect(
      screen.getByText((content) =>
        content.includes("Deseja contratar os nossos serviços?")
      )
    ).toBeInTheDocument();

    // Botao para WhatsApp com numero 86999216675
    const whatsappLink = screen.getByRole("link", { name: /Contratar no WhatsApp/i });
    expect(whatsappLink).toBeInTheDocument();
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("5586999216675"));
  });
});
