import { describe, it, expect } from "vitest";
import { cpfValido, cnpjValido, mascararCpf, mascararCnpj } from "../documentos";
import { clienteNoSetor, contratoFechado, viaAguardandoValidacao } from "../fase-projeto";

describe("documentos", () => {
  it("mascara CPF e CNPJ enquanto digita", () => {
    expect(mascararCpf("52998224725")).toBe("529.982.247-25");
    expect(mascararCpf("5299")).toBe("529.9");
    expect(mascararCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("valida digitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-80")).toBe(false);
  });
});

describe("fase do projeto", () => {
  const base = { id: "1", nome_completo: "A" };
  const via = { id: "c", valor_mensal: null, dia_vencimento: null, docx_assinado_storage_path: "contratos-assinados/x.pdf" };

  it("via enviada ainda nao fecha o contrato: fica no Comercial aguardando validacao", () => {
    const cli = { ...base, status: "assinado", contratos: [via] };
    expect(contratoFechado(cli)).toBe(false);
    expect(viaAguardandoValidacao(cli)).toBe(true);
    expect(clienteNoSetor(cli, "producao")).toBe(false);
    expect(clienteNoSetor(cli, "comercial")).toBe(true);
  });

  it("contrato validado aparece na Producao e continua no Comercial", () => {
    const cli = { ...base, status: "concluido", contratos: [{ ...via, validado_em: "2026-10-11T12:00:00Z" }] };
    expect(contratoFechado(cli)).toBe(true);
    expect(viaAguardandoValidacao(cli)).toBe(false);
    expect(clienteNoSetor(cli, "producao")).toBe(true);
    expect(clienteNoSetor(cli, "comercial")).toBe(true);
  });
});