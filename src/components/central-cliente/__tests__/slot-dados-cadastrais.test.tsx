import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SlotDadosCadastrais } from "../slot-dados-cadastrais";
import * as supabaseLib from "@/lib/supabase";

afterEach(() => vi.restoreAllMocks());

function preencher(rotulo: RegExp, valor: string) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

describe("SlotDadosCadastrais Component", () => {
  it("formulario unico: CPF obrigatorio, empresa e CNPJ opcionais, sem abas PF/PJ", () => {
    render(<SlotDadosCadastrais token="token-teste" cadastroPreenchidoInicial={false} />);
    expect(screen.getByRole("heading", { name: "Dados Cadastrais" })).toBeInTheDocument();
    expect(screen.getByLabelText("CPF *")).toBeInTheDocument();
    // empresa fica escondida ate o cliente pedir
    expect(screen.queryByLabelText("CNPJ (opcional)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Contratar por uma empresa/ }));
    expect(screen.getByLabelText("CNPJ (opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Razão social (opcional)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Empresa \(PJ\)/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Pessoa Física/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i })).toBeInTheDocument();
  });

  it("aplica mascara e recusa CPF invalido", async () => {
    const spy = vi.spyOn(supabaseLib, "submeterCadastroCliente").mockResolvedValue({ sucesso: true } as any);
    render(<SlotDadosCadastrais token="tok" />);
    preencher(/Nome completo/, "Maria Silva");
    preencher(/^CPF/, "11111111111");
    preencher(/E-mail/, "maria@teste.com");
    expect(screen.getByLabelText("CPF *")).toHaveValue("111.111.111-11");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CPF inválido");
    expect(spy).not.toHaveBeenCalled();
  });

  it("envia so com CPF (sem empresa): contratante e a propria pessoa", async () => {
    const spy = vi.spyOn(supabaseLib, "submeterCadastroCliente").mockResolvedValue({ sucesso: true } as any);
    render(<SlotDadosCadastrais token="tok" />);
    preencher(/Nome completo/, "Maria Silva");
    preencher(/^CPF/, "52998224725");
    preencher(/E-mail/, "maria@teste.com");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    await waitFor(() => expect(screen.getByText("Dados cadastrais enviados com sucesso!")).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({
        representante_nome: "Maria Silva",
        representante_cpf: "529.982.247-25",
        razao_social: "Maria Silva",
        cnpj: null,
      }),
    );
  });

  it("CNPJ informado precisa ser valido", async () => {
    const spy = vi.spyOn(supabaseLib, "submeterCadastroCliente").mockResolvedValue({ sucesso: true } as any);
    render(<SlotDadosCadastrais token="tok" />);
    preencher(/Nome completo/, "Maria Silva");
    preencher(/^CPF/, "52998224725");
    preencher(/E-mail/, "maria@teste.com");
    fireEvent.click(screen.getByRole("button", { name: /Contratar por uma empresa/ }));
    preencher(/^CNPJ/, "12345678000100");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CNPJ inválido");
    expect(spy).not.toHaveBeenCalled();
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
          representante_cpf: "529.982.247-25",
          email_financeiro: "financeiro@xpto.com",
        }}
      />
    );
    expect(screen.getByText("Dados cadastrais enviados com sucesso!")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("529.982.247-25")).toBeInTheDocument();
    expect(screen.getByText("Empresa XPTO Ltda · 12.345.678/0001-99")).toBeInTheDocument();
  });
});
