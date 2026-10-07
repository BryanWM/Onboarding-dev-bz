import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SlotDadosCadastrais } from "../slot-dados-cadastrais";

describe("SlotDadosCadastrais Component", () => {
  it("should render form inputs when not initially completed", () => {
    render(
      <SlotDadosCadastrais
        token="token-teste"
        cadastroPreenchidoInicial={false}
      />
    );
    expect(screen.getByText("Dados Cadastrais da Empresa")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nome empresarial Ltda")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("00.000.000/0000-00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i })).toBeInTheDocument();
  });

  it("should render confirmed summary when initially completed", () => {
    render(
      <SlotDadosCadastrais
        token="token-teste"
        cadastroPreenchidoInicial={true}
        dadosIniciais={{
          razao_social: "Empresa XPTO Ltda",
          cnpj: "12.345.678/0001-99",
          representante_nome: "Maria Silva",
          email_financeiro: "financeiro@xpto.com",
        }}
      />
    );
    expect(screen.getByText("Dados cadastrais enviados com sucesso!")).toBeInTheDocument();
    expect(screen.getByText("Empresa XPTO Ltda")).toBeInTheDocument();
    expect(screen.getByText("12.345.678/0001-99")).toBeInTheDocument();
  });
});
