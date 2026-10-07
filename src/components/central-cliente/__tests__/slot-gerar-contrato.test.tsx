import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SlotGerarContrato, CAMPOS_CONTRATO } from "../slot-gerar-contrato";
import * as contratoGen from "@/lib/contrato-generator";

describe("SlotGerarContrato component", () => {
  it("should render form fields and keep submit button disabled initially", () => {
    render(<SlotGerarContrato />);

    expect(screen.getByText("Criar contrato de prestação de serviço")).toBeInTheDocument();

    const requiredFields = CAMPOS_CONTRATO.filter((c) => c.required);
    for (const campo of requiredFields) {
      const labelPrefix = campo.label.split("(")[0].trim();
      expect(
        screen.getByText((content) => content.includes(labelPrefix)),
      ).toBeInTheDocument();
    }

    const submitBtn = screen.getByRole("button", { name: /gerar e baixar contrato/i });
    expect(submitBtn).toBeDisabled();
  });

  it("should enable submit button once required fields are filled, call generator, and show success panel", async () => {
    const onContratoGeradoMock = vi.fn();
    const fakeBlob = new Blob(["mock docx content"], { type: "application/vnd.openxmlformats" });

    vi.spyOn(contratoGen, "gerarContratoDocx").mockResolvedValue({
      blob: fakeBlob,
      fileName: "Contrato_WRMAX_Empresa_XPTO.docx",
    });
    vi.spyOn(contratoGen, "baixarBlobNoNavegador").mockImplementation(() => {});

    render(<SlotGerarContrato onContratoGerado={onContratoGeradoMock} />);

    const submitBtn = screen.getByRole("button", { name: /gerar e baixar contrato/i });
    expect(submitBtn).toBeDisabled();

    // Fill all required fields
    fireEvent.change(screen.getByRole("textbox", { name: /nome completo/i }), {
      target: { value: "Empresa XPTO Ltda" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /cpf ou cnpj/i }), {
      target: { value: "12.345.678/0001-90" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /e-mail de contato/i }), {
      target: { value: "contato@xpto.com" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /whatsapp \/ telefone/i }), {
      target: { value: "86999216675" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /endereço completo/i }), {
      target: { value: "Av. Universitária, 750" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /cep/i }), {
      target: { value: "64049-494" },
    });

    expect(submitBtn).not.toBeDisabled();

    // Submit form
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(contratoGen.gerarContratoDocx).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Contrato gerado com sucesso!")).toBeInTheDocument();
    });

    expect(screen.getByText("Contrato_WRMAX_Empresa_XPTO.docx")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /baixar contrato \(\.docx\) novamente/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /enviar contrato no whatsapp/i }),
    ).toHaveAttribute("href", expect.stringContaining("https://wa.me/5586999216675"));
  });
});
