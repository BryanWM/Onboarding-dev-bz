import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SlotContratoCliente } from "../slot-contrato-cliente";
import * as contratoGen from "@/lib/contrato-generator";

describe("SlotContratoCliente Component", () => {
  it("should render waiting state when contract is not released yet", () => {
    render(<SlotContratoCliente contratoLiberado={false} contrato={null} />);
    expect(screen.getByText("Contrato de Prestação de Serviços")).toBeInTheDocument();
    expect(screen.getByText("Contrato em elaboração pelo gestor")).toBeInTheDocument();
  });

  it("should render commercial terms and compile docx when download button is clicked", async () => {
    const fakeBlob = new Blob(["mock docx"], { type: "application/vnd.openxmlformats" });
    const spyGerar = vi.spyOn(contratoGen, "gerarContratoDocx").mockResolvedValue({
      blob: fakeBlob,
      fileName: "Contrato_WRMAX_Cliente_Teste.docx",
    });
    const spyBaixar = vi.spyOn(contratoGen, "baixarBlobNoNavegador").mockImplementation(() => {});

    render(
      <SlotContratoCliente
        contratoLiberado={true}
        contrato={{
          id: "cont-1",
          valor_mensal: 2500,
          dia_vencimento: 10,
          status_envio: "enviado_ao_cliente",
          docx_storage_path: "modelos-contrato/modelo.docx",
          docx_assinado_storage_path: null,
        }}
        modeloUrl="https://example.com/modelo-assinado.docx"
        dadosCadastrais={{
          razao_social: "Cliente Teste Ltda",
          cnpj: "12.345.678/0001-90",
          logradouro: "Rua das Flores, 123",
          email_financeiro: "financeiro@teste.com",
        }}
        clienteNome="Cliente Teste"
      />
    );

    expect(screen.getByText("R$ 2.500,00")).toBeInTheDocument();
    expect(screen.getByText("Todo dia 10")).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /Baixar contrato/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    await waitFor(() => {
      expect(spyGerar).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: "Cliente Teste Ltda",
          documento: "12.345.678/0001-90",
          endereco: "Rua das Flores, 123",
          email: "financeiro@teste.com",
          valorMensal: "2.500,00",
          diaVencimento: "10",
        }),
        undefined,
        // usa a URL assinada, nunca a referencia crua do bucket privado
        "https://example.com/modelo-assinado.docx",
      );
    });

    expect(spyBaixar).toHaveBeenCalledWith(fakeBlob, "Contrato_WRMAX_Cliente_Teste.docx");
  });
});
