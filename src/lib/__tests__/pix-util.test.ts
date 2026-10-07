import { describe, it, expect } from "vitest";
import { calcularCrc16, gerarPixCopiaECola, WRMAX_PIX_BR_CODE_DEFAULT } from "../pix-util";

describe("pix-util", () => {
  it("should calculate correct CRC16 checksum according to CCITT standard", () => {
    // Teste com payload padrao da WRMax sem o CRC final (9FE3)
    const payloadSemCrc = "00020126540014br.gov.bcb.pix0132financeiro@wrmaxmarketing.com.br5204000053039865802BR5901N6001C62140510KFGMoreira6304";
    const crc = calcularCrc16(payloadSemCrc);
    expect(crc).toBe("9FE3");
  });

  it("should return the tested WRMAX BR Code by default for standard key", () => {
    const brCode = gerarPixCopiaECola({
      chavePix: "financeiro@wrmaxmarketing.com.br",
    });
    expect(brCode).toBe(WRMAX_PIX_BR_CODE_DEFAULT);
    expect(brCode).toContain("br.gov.bcb.pix");
    expect(brCode).toContain("financeiro@wrmaxmarketing.com.br");
    expect(brCode.endsWith("9FE3")).toBe(true);
  });

  it("should generate valid dynamic BR Code payload for custom key and amount", () => {
    const brCode = gerarPixCopiaECola({
      chavePix: "contato@empresa.com",
      nomeRecebedor: "EMPRESA LTDA",
      cidadeRecebedor: "TERESINA",
      valor: 1500.5,
      txid: "FATURA123",
    });
    expect(brCode.startsWith("000201")).toBe(true);
    expect(brCode).toContain("contato@empresa.com");
    expect(brCode).toContain("1500.50");
    expect(brCode).toContain("FATURA123");
    expect(brCode.length).toBeGreaterThan(50);
  });
});
