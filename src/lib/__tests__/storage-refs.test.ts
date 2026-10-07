import { describe, it, expect } from "vitest";
import { parseRefStorage, montarRefStorage, extensaoSegura } from "../storage-refs";

describe("storage-refs", () => {
  it("reconhece referencia bucket/caminho", () => {
    expect(parseRefStorage("apresentacoes-pdf/cli-1/proposta.pdf")).toEqual({
      bucket: "apresentacoes-pdf",
      caminho: "cli-1/proposta.pdf",
    });
    expect(montarRefStorage("comprovantes-pix", "a/b.png")).toBe("comprovantes-pix/a/b.png");
  });

  it("converte URL publica antiga do Supabase", () => {
    expect(
      parseRefStorage("https://abc.supabase.co/storage/v1/object/public/contratos-assinados/x_1.pdf")
    ).toEqual({ bucket: "contratos-assinados", caminho: "x_1.pdf" });
  });

  it("ignora o que nao e do storage privado", () => {
    expect(parseRefStorage("/modelo_de_contratos/predefinidos/Contrato.docx")).toBeNull();
    expect(parseRefStorage("https://example.com/arquivo.pdf")).toBeNull();
    expect(parseRefStorage("data:application/pdf;base64,AAAA")).toBeNull();
    expect(parseRefStorage("blob:http://localhost/123")).toBeNull();
    expect(parseRefStorage("bucket-desconhecido/arquivo.pdf")).toBeNull();
    expect(parseRefStorage("apresentacoes-pdf/")).toBeNull();
    expect(parseRefStorage(null)).toBeNull();
  });

  it("aceita so extensoes permitidas", () => {
    expect(extensaoSegura("Comprovante.PDF", ["pdf", "png"])).toBe("pdf");
    expect(extensaoSegura("script.html", ["pdf", "png"])).toBeNull();
    expect(extensaoSegura("semextensao", ["pdf"])).toBeNull();
  });
});
