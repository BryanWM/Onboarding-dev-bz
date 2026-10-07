import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SlotContrato } from "../slot-contrato";

describe("SlotContrato component", () => {
  it("should render initial upload button and instructions", () => {
    render(<SlotContrato />);
    expect(screen.getByText("Contrato da reunião")).toBeInTheDocument();
    expect(screen.getByText("Importar contrato")).toBeInTheDocument();
    expect(screen.getByText("PDF ou Word, até 20 MB")).toBeInTheDocument();
  });

  it("should display selected file name and open link upon file selection", () => {
    // Mock URL.createObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/fake-file");
    globalThis.URL.createObjectURL = createObjectURLMock;

    render(<SlotContrato />);

    const fileInput = screen.getByTestId("input-contrato-file");
    const fakeFile = new File(["dummy content"], "contrato_prestacao.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    expect(screen.getByText("contrato_prestacao.pdf")).toBeInTheDocument();
    const openLink = screen.getByRole("link", { name: /abrir/i });
    expect(openLink).toHaveAttribute("href", "blob:http://localhost/fake-file");
  });
});
