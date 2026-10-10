import { describe, it, expect, vi, afterEach } from "vitest";

// Simula ambiente de producao: Supabase configurado, sem modo demo.
vi.mock("../supabase-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("../supabase-client")>();
  return { ...original, isSupabaseConfigured: true, isModoDemo: false };
});

vi.mock("../arquivos-cliente", () => ({
  prepararUploadCliente: vi.fn().mockResolvedValue({
    bucket: "comprovantes-pix",
    caminho: "cli-uuid/comprovante_pix_1_abc.pdf",
    tokenUpload: "token-upload",
  }),
  obterArquivosCliente: vi.fn(),
}));

import {
  supabase,
  isSupabaseConfigured,
  validarLinkToken,
  submeterCadastroCliente,
  enviarComprovantePix,
  emitirEEnviarContrato,
  atualizarStatusPix,
  MOTIVO_FALHA_CONEXAO,
} from "../supabase";
import { prepararUploadCliente } from "../arquivos-cliente";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Supabase - cliente (link /c/:token)", () => {
  it("cliente Supabase expoe rpc e from", () => {
    expect(isSupabaseConfigured).toBe(true);
    expect(typeof supabase.from).toBe("function");
    expect(typeof supabase.rpc).toBe("function");
  });

  it("valida o token pela RPC e devolve o payload", async () => {
    const payload = {
      valido: true,
      link: { id: "link-1", expira_em: "2026-09-27T00:00:00Z", segundos_restantes: 18000 },
      cliente: { id: "cli-1", nome_completo: "Cliente Teste", email: null, whatsapp: null, status: "link_ativo", apresentacao_pdf_url: null, apresentacao_pdf_nome: null, pix_pago: false },
      cadastro_preenchido: false,
    };
    const spy = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: payload, error: null } as any);

    const res = await validarLinkToken("token-valido-123");
    expect(spy).toHaveBeenCalledWith("validar_link_token", { p_token: "token-valido-123" });
    expect(res.valido).toBe(true);
    expect(res.cliente?.nome_completo).toBe("Cliente Teste");
  });

  it("erro de rede vira FALHA_DE_CONEXAO (nao derruba o cliente no polling)", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: null, error: { message: "Conexao recusada" } } as any);
    const res = await validarLinkToken("token-qualquer");
    expect(res.valido).toBe(false);
    expect(res.motivo).toBe(MOTIVO_FALHA_CONEXAO);
  });

  it("link expirado/bloqueado no banco NAO cai em fallback mock ou localStorage", async () => {
    // cliente local antigo com o mesmo token salvo no navegador
    localStorage.setItem(
      "wrmax_clientes_locais",
      JSON.stringify([{ id: "cli-x", nome_completo: "Local", status: "link_ativo", links_temporarios: [{ id: "l", token: "tok_padrao" }] }])
    );
    for (const token of ["tok_padrao", "mock-123", "tok_loja_exemplo_123"]) {
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: { valido: false, motivo: "EXPIRED" }, error: null } as any);
      const res = await validarLinkToken(token);
      expect(res.valido).toBe(false);
      expect(res.motivo).toBe("EXPIRED");
    }
  });

  it("envia cadastro pela RPC submeter_cadastro_cliente", async () => {
    const spy = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: { sucesso: true, cadastro_id: "cad-123" },
      error: null,
    } as any);
    const dados = { razao_social: "Empresa XPTO Ltda", cnpj: "12.345.678/0001-90" };

    const res = await submeterCadastroCliente("token-valido-123", dados);
    expect(spy).toHaveBeenCalledWith("submeter_cadastro_cliente", { p_token: "token-valido-123", p_dados: dados });
    expect(res).toEqual({ sucesso: true, cadastro_id: "cad-123" });
    // nada fica gravado no navegador em producao
    expect(localStorage.getItem("wrmax_cadastro_token-valido-123")).toBeNull();
  });

  it("cadastro recusado pelo banco gera erro em vez de fingir sucesso", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: { sucesso: false, erro: "LINK_INVALIDO_OU_EXPIRADO" },
      error: null,
    } as any);
    await expect(submeterCadastroCliente("tok", { razao_social: "x" })).rejects.toThrow(/expirou ou foi bloqueado/);
  });

  it("comprovante PIX sobe por URL assinada e e registrado pela RPC com o token", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.spyOn(supabase.storage, "from").mockReturnValue({ uploadToSignedUrl: upload } as any);
    const rpc = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: { sucesso: true }, error: null } as any);
    const file = new File(["%PDF"], "pix.pdf", { type: "application/pdf" });

    await enviarComprovantePix("token-valido", file);

    expect(prepararUploadCliente).toHaveBeenCalledWith({
      data: { token: "token-valido", tipo: "comprovante_pix", nomeArquivo: "pix.pdf", tamanho: file.size },
    });
    expect(supabase.storage.from).toHaveBeenCalledWith("comprovantes-pix");
    expect(upload).toHaveBeenCalledWith("cli-uuid/comprovante_pix_1_abc.pdf", "token-upload", file, { contentType: "application/pdf" });
    expect(rpc).toHaveBeenCalledWith("registrar_comprovante_pix", {
      p_token: "token-valido",
      p_path: "cli-uuid/comprovante_pix_1_abc.pdf",
      p_nome: "pix.pdf",
    });
  });
});

describe("Supabase - gestor", () => {
  it("listarClientes entrega dados cadastrais como lista (PostgREST devolve objeto 1:1)", async () => {
    const linhas = [
      { id: "c1", nome_completo: "Com cadastro", dados_cadastrais_cliente: { razao_social: "Empresa X", cnpj: "1" }, contratos: [], links_temporarios: [] },
      { id: "c2", nome_completo: "Sem cadastro", dados_cadastrais_cliente: null, contratos: [], links_temporarios: [] },
    ];
    const builder: any = {
      select: () => builder,
      order: () => builder,
      then: (resolve: (v: unknown) => void) => resolve({ data: linhas, error: null }),
    };
    vi.spyOn(supabase, "from").mockReturnValue(builder);
    const { listarClientes } = await import("../supabase");

    const res = await listarClientes();
    expect(res[0]!.dados_cadastrais_cliente?.[0]?.razao_social).toBe("Empresa X");
    expect(res[1]!.dados_cadastrais_cliente).toEqual([]);
  });

  it("emissao de contrato nao envia URL do navegador (caminho vem do banco)", async () => {
    const spy = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: { sucesso: true, contrato: { id: "c1", docx_storage_path: "/modelo.docx" } },
      error: null,
    } as any);
    await emitirEEnviarContrato("cli-1", null, 1500, 10);
    expect(spy).toHaveBeenCalledWith("emitir_e_enviar_contrato", {
      p_cliente_id: "cli-1",
      p_modelo_id: null,
      p_valor_mensal: 1500,
      p_dia_vencimento: 10,
    });
  });

  it("emissao recusada (nao-gestor) gera erro em vez de contrato local falso", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: null, error: { message: "ACESSO_NEGADO" } } as any);
    await expect(emitirEEnviarContrato("cli-1", null, 1500, 10)).rejects.toThrow(/permissão de gestor/);
    expect(localStorage.getItem("wrmax_contrato_cli-1")).toBeNull();
  });

  it("marcar PIX recusado pelo banco gera erro", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: null, error: { message: "ACESSO_NEGADO" } } as any);
    await expect(atualizarStatusPix("cli-1", true)).rejects.toThrow(/permissão de gestor/);
    expect(localStorage.getItem("wrmax_clientes_editados")).toBeNull();
  });
});
