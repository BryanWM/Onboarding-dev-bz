import { describe, it, expect } from "vitest";
import { cpfValido, cnpjValido, mascararCpf, mascararCnpj } from "../documentos";
import { setorDoCliente } from "../fase-projeto";

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

describe("setorDoCliente", () => {
  it("vai para a Producao so depois do contrato assinado", () => {
    expect(setorDoCliente({ id: "1", nome_completo: "A", status: "contrato_enviado" })).toBe("comercial");
    expect(setorDoCliente({ id: "1", nome_completo: "A", status: "assinado" })).toBe("producao");
    expect(
      setorDoCliente({
        id: "1",
        nome_completo: "A",
        status: "contrato_enviado",
        contratos: [{ id: "c", valor_mensal: null, dia_vencimento: null, docx_assinado_storage_path: "contratos-assinados/x.pdf" }],
      }),
    ).toBe("producao");
  });
});
