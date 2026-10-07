import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlotPix, CHAVE_PIX_DEFAULT, FAVORECIDO_DEFAULT, WHATSAPP_DEFAULT } from "../slot-pix";

describe("SlotPix component", () => {
  it("should render QR Code, PIX key, favored party and whatsapp link with defaults", () => {
    render(<SlotPix />);

    expect(screen.getByText("Pagamento via PIX")).toBeInTheDocument();
    expect(screen.getByAltText(/QR Code PIX/i)).toBeInTheDocument();
    expect(screen.getByText(CHAVE_PIX_DEFAULT)).toBeInTheDocument();
    expect(screen.getByText(FAVORECIDO_DEFAULT)).toBeInTheDocument();

    const whatsappLink = screen.getByRole("link", { name: /enviar comprovante via whatsapp/i });
    expect(whatsappLink).toHaveAttribute(
      "href",
      expect.stringContaining(`https://wa.me/${WHATSAPP_DEFAULT}`),
    );
  });

  it("should allow custom props for chave, favorecido and whatsapp", () => {
    render(
      <SlotPix chavePix="custom@pix.com" favorecido="Empresa Teste" whatsapp="5511988887777" />,
    );

    expect(screen.getByText("custom@pix.com")).toBeInTheDocument();
    expect(screen.getByText("Empresa Teste")).toBeInTheDocument();

    const whatsappLink = screen.getByRole("link", { name: /enviar comprovante via whatsapp/i });
    expect(whatsappLink).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/5511988887777"),
    );
  });
});
