import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import {
  escapeXml,
  converterReaisPorExtenso,
  formatarValorPorExtenso,
  compilarVariaveisContrato,
  gerarContratoDocx,
  gerarLinkWhatsappContrato,
  DadosContratoForm,
} from "../contrato-generator";

describe("contrato-generator module", () => {
  it("should escape XML special characters properly", () => {
    expect(escapeXml('A & B < C > "D" \'E\'')).toBe(
      "A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;",
    );
  });

  it("should convert numeric amounts to Brazilian Reais in words", () => {
    expect(converterReaisPorExtenso(1500)).toBe("um mil e quinhentos reais");
    expect(converterReaisPorExtenso(1000)).toBe("um mil reais");
    expect(converterReaisPorExtenso(2000)).toBe("dois mil reais");
    expect(converterReaisPorExtenso(2750)).toBe(
      "dois mil e setecentos e cinquenta reais",
    );
    expect(converterReaisPorExtenso(1)).toBe("um real");
  });

  it("should format string currency values to words with fallback", () => {
    expect(formatarValorPorExtenso("1.500,00")).toBe("um mil e quinhentos reais");
    expect(formatarValorPorExtenso("2.000,00")).toBe("dois mil reais");
    expect(formatarValorPorExtenso("")).toBe("um mil e quinhentos reais");
  });

  it("should compile all 20 contract placeholders with proper calculations", () => {
    const dados: DadosContratoForm = {
      nome: "Dra. Mariana Costa",
      documento: "123.456.789-00",
      profissao: "Dermatologista",
      estadoCivil: "casada",
      nacionalidade: "brasileira",
      endereco: "Av. Frei Serafim, 1234, Centro, Teresina - PI",
      cep: "64000-020",
      email: "mariana.costa@clinica.com.br",
      telefone: "86999998888",
      valorMensal: "1.500,00",
      diaVencimento: "10",
    };

    const dataFixa = new Date(2026, 8, 25); // 25 de setembro de 2026
    const mapa = compilarVariaveisContrato(dados, dataFixa);

    expect(mapa["{{NOME_COMPLETO_OU_RAZAO_SOCIAL}}"]).toBe("Dra. Mariana Costa");
    expect(mapa["{{CPF_OU_CNPJ}}"]).toBe("123.456.789-00");
    expect(mapa["{{PROFISSAO}}"]).toBe("Dermatologista");
    expect(mapa["{{ESTADO_CIVIL}}"]).toBe("casada");
    expect(mapa["{{NACIONALIDADE}}"]).toBe("brasileira");
    expect(mapa["{{ENDERECO_COMPLETO}}"]).toBe("Av. Frei Serafim, 1234, Centro, Teresina - PI");
    expect(mapa["{{CEP}}"]).toBe("64000-020");
    expect(mapa["{{EMAIL_CLIENTE}}"]).toBe("mariana.costa@clinica.com.br");
    expect(mapa["{{PRAZO_VIGENCIA_DIAS}}"]).toBe("90");
    expect(mapa["{{PRAZO_VIGENCIA_EXTENSO}}"]).toBe("noventa");
    expect(mapa["{{DATA_INICIO_VIGENCIA}}"]).toBe("25/09/2026");
    expect(mapa["{{DATA_TERMINO_VIGENCIA}}"]).toBe("24/12/2026");
    expect(mapa["{{VALOR_MENSAL}}"]).toBe("1.500,00");
    expect(mapa["{{VALOR_MENSAL_EXTENSO}}"]).toBe("um mil e quinhentos reais");
    expect(mapa["{{DURACAO_MESES}}"]).toBe("3");
    expect(mapa["{{DURACAO_MESES_EXTENSO}}"]).toBe("três");
    expect(mapa["{{DIA_VENCIMENTO}}"]).toBe("10");
    expect(mapa["{{DIA_ASSINATURA}}"]).toBe("25");
    expect(mapa["{{MES_ASSINATURA_EXTENSO}}"]).toBe("setembro");
    expect(mapa["{{ANO_ASSINATURA}}"]).toBe("2026");
  });

  it("sem valor/vencimento informados as tags ficam no texto (nao inventa 1.500 / dia 10)", () => {
    const mapa = compilarVariaveisContrato({ nome: "X", documento: "1", endereco: "E", cep: "C", email: "e@x" });
    expect(mapa["{{VALOR_MENSAL}}"]).toBe("{{VALOR_MENSAL}}");
    expect(mapa["{{DIA_VENCIMENTO}}"]).toBe("{{DIA_VENCIMENTO}}");
  });

  it("should generate a valid DOCX blob and replace all placeholders in the real template", async () => {
    const templatePath = path.resolve(
      process.cwd(),
      "public/contratos/Contrato_WRMAX_Modelo_Parametrizado.docx",
    );
    const templateBuffer = fs.readFileSync(templatePath).buffer;

    const dados: DadosContratoForm = {
      nome: "Lucas Clímaco Teste",
      documento: "999.888.777-66",
      profissao: "Cirurgião Dentista",
      endereco: "Rua Teste, 100",
      cep: "64000-000",
      email: "lucas@teste.com",
      valorMensal: "2.800,00",
      diaVencimento: "15",
    };

    const { blob, fileName } = await gerarContratoDocx(dados, templateBuffer);
    expect(fileName).toBe("Contrato_WRMAX_Lucas_Climaco_Teste.docx");
    expect(blob.size).toBeGreaterThan(1000);

    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const xml = await zip.file("word/document.xml")!.async("string");

    expect(xml).toContain("Lucas Clímaco Teste");
    expect(xml).toContain("999.888.777-66");
    expect(xml).toContain("Cirurgião Dentista");
    expect(xml).toContain("lucas@teste.com");
    // valor e vencimento informados pelo gestor, nunca o padrao 1.500/10
    expect(xml).toContain("2.800,00");
    expect(xml).not.toContain("1.500,00");
    // Verify no {{PLACEHOLDER}} remain
    const remainingPlaceholders = xml.match(/\{\{[A-Z_]+\}\}/g);
    expect(remainingPlaceholders).toBeNull();
  });

  it("should generate WhatsApp contact link with sanitized target number and pre-filled message", () => {
    const dados: DadosContratoForm = {
      nome: "Cliente Teste",
      documento: "111.222.333-44",
      email: "cliente@teste.com",
      endereco: "Rua 1",
      cep: "64000-000",
    };

    const link = gerarLinkWhatsappContrato(dados, "5586999216675");
    expect(link).toContain("https://wa.me/5586999216675");
    expect(link).toContain(encodeURIComponent("Cliente Teste"));
  });
});
