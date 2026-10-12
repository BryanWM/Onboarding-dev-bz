import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SlotDadosCadastrais } from "../slot-dados-cadastrais";
import * as supabaseLib from "@/lib/supabase";

afterEach(() => vi.restoreAllMocks());

function preencher(rotulo: RegExp, valor: string) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

function preencherPessoa() {
  preencher(/^Nome (completo|do responsável)/, "Maria Silva");
  preencher(/^CPF/, "52998224725");
  preencher(/^E-mail/, "maria@teste.com");
  preencher(/^CEP/, "64000020");
}

describe("SlotDadosCadastrais", () => {
  it("comeca como pessoa fisica: CPF obrigatorio e sem campos de empresa", () => {
    render(<SlotDadosCadastrais token="token-teste" />);
    expect(screen.getByRole("radio", { name: /Pessoa física/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("CPF *")).toBeInTheDocument();
    expect(screen.queryByLabelText("CNPJ *")).toBeNull();
    expect(screen.queryByLabelText("Nome da empresa *")).toBeNull();
  });

  it("pessoa fisica envia so com CPF (sem empresa nem CNPJ)", async () => {
    const spy = vi.spyOn(supabaseLib, "submeterCadastroCliente").mockResolvedValue({ sucesso: true } as any);
    render(<SlotDadosCadastrais token="tok" />);
    preencherPessoa();
    expect(screen.getByLabelText("CPF *")).toHaveValue("529.982.247-25");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    await waitFor(() => expect(screen.getByText("Dados cadastrais enviados com sucesso!")).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ representante_cpf: "529.982.247-25", razao_social: "Maria Silva", cnpj: null, cep: "64000-020" }),
    );
    expect(screen.getByText("Pessoa física")).toBeInTheDocument();
    expect(screen.getByText("64000-020")).toBeInTheDocument();
  });

  it("CEP e obrigatorio e precisa de 8 numeros", async () => {
    const spy = vi.spyOn(supabaseLib, "submeterCadastroCliente").mockResolvedValue({ sucesso: true } as any);
    render(<SlotDadosCadastrais token="tok" />);
    preencherPessoa();
    preencher(/^CEP/, "");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("o e-mail e o CEP");

    preencher(/^CEP/, "6400");
    expect(screen.getByLabelText("CEP *")).toHaveValue("6400");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CEP inválido");
    expect(spy).not.toHaveBeenCalled();
  });

  it("recusa CPF invalido", async () => {
    const spy = vi.spyOn(supabaseLib, "submeterCadastroCliente").mockResolvedValue({ sucesso: true } as any);
    render(<SlotDadosCadastrais token="tok" />);
    preencher(/^Nome completo/, "Maria Silva");
    preencher(/^CPF/, "11111111111");
    preencher(/^E-mail/, "maria@teste.com");
    preencher(/^CEP/, "64000020");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CPF inválido");
    expect(spy).not.toHaveBeenCalled();
  });

  it("pessoa juridica mostra nome da empresa e CNPJ, ambos obrigatorios, alem do CPF", async () => {
    const spy = vi.spyOn(supabaseLib, "submeterCadastroCliente").mockResolvedValue({ sucesso: true } as any);
    render(<SlotDadosCadastrais token="tok" />);
    fireEvent.click(screen.getByRole("radio", { name: /Pessoa jurídica/ }));
    expect(screen.getByLabelText("Nome da empresa *")).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ *")).toBeInTheDocument();
    expect(screen.getByLabelText("CPF *")).toBeInTheDocument();

    preencherPessoa();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("nome da empresa e o CNPJ");

    preencher(/^Nome da empresa/, "Empresa Teste Ltda");
    preencher(/^CNPJ/, "11222333000181");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar Dados Cadastrais/i }));
    await waitFor(() => expect(screen.getByText("Dados cadastrais enviados com sucesso!")).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({
        razao_social: "Empresa Teste Ltda",
        cnpj: "11.222.333/0001-81",
        representante_nome: "Maria Silva",
        representante_cpf: "529.982.247-25",
        cep: "64000-020",
      }),
    );
    // resumo mostra os dados da empresa
    expect(screen.getByText("Pessoa jurídica")).toBeInTheDocument();
    expect(screen.getByText("Empresa Teste Ltda")).toBeInTheDocument();
    expect(screen.getByText("11.222.333/0001-81")).toBeInTheDocument();
  });

  it("resumo de cadastro ja enviado (empresa) mostra empresa, CNPJ e CPF", () => {
    render(
      <SlotDadosCadastrais
        token="token-teste"
        cadastroPreenchidoInicial
        dadosIniciais={{
          razao_social: "Empresa XPTO Ltda",
          cnpj: "12.345.678/0001-99",
          representante_nome: "Maria Silva",
          representante_cpf: "529.982.247-25",
          email_financeiro: "financeiro@xpto.com",
        }}
      />,
    );
    expect(screen.getByText("Pessoa jurídica")).toBeInTheDocument();
    expect(screen.getByText("Empresa XPTO Ltda")).toBeInTheDocument();
    expect(screen.getByText("12.345.678/0001-99")).toBeInTheDocument();
    expect(screen.getByText("529.982.247-25")).toBeInTheDocument();
  });
});
