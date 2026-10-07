import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InstitucionalScreen, WHATSAPP_COMERCIAL } from "../institucional-screen";

describe("InstitucionalScreen Component", () => {
  it("should render call to action headline and whatsapp links", () => {
    render(<InstitucionalScreen />);

    expect(screen.getByText("WRMAX")).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("Deseja contratar os nossos serviços?")
      )
    ).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    const hasWhatsappLink = links.some((l) =>
      l.getAttribute("href")?.includes(WHATSAPP_COMERCIAL)
    );
    expect(hasWhatsappLink).toBe(true);
  });
});
