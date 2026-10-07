import { describe, it, expect, vi } from "vitest";
import {
  supabase,
  isSupabaseConfigured,
  validarLinkToken,
  submeterCadastroCliente,
} from "../supabase";

describe("Supabase Client & RPC Operations (Central do Cliente)", () => {
  it("should initialize client instance with rpc and from methods", () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
    expect(typeof supabase.rpc).toBe("function");
  });

  it("should have isSupabaseConfigured boolean flag", () => {
    expect(typeof isSupabaseConfigured).toBe("boolean");
  });

  it("should validate link token via RPC returning payload", async () => {
    const mockPayload = {
      valido: true,
      link: { id: "link-1", expira_em: "2026-09-27T00:00:00Z", segundos_restantes: 18000 },
      cliente: { id: "cli-1", nome_completo: "Cliente Teste", email: "teste@empresa.com", whatsapp: "86999999999", status: "link_ativo", apresentacao_pdf_url: null, apresentacao_pdf_nome: null },
      cadastro_preenchido: false,
    };

    const spy = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: mockPayload,
      error: null,
    } as any);

    const res = await validarLinkToken("token-valido-123");
    expect(spy).toHaveBeenCalledWith("validar_link_token", {
      p_token: "token-valido-123",
    });
    expect(res.valido).toBe(true);
    expect(res.cliente?.nome_completo).toBe("Cliente Teste");
    spy.mockRestore();
  });

  it("should handle error gracefully on token validation", async () => {
    const spy = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: null,
      error: { message: "Conexao recusada" },
    } as any);

    const res = await validarLinkToken("token-invalido");
    expect(res.valido).toBe(false);
    expect(res.motivo).toBe("Conexao recusada");
    spy.mockRestore();
  });

  it("should call submeter_cadastro_cliente via RPC with token and dados", async () => {
    const spy = vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
      data: { sucesso: true, cadastro_id: "cad-123" },
      error: null,
    } as any);

    const dados = {
      razao_social: "Empresa XPTO Ltda",
      cnpj: "12.345.678/0001-90",
      email_financeiro: "fin@empresa.com",
    };

    const res = await submeterCadastroCliente("token-valido-123", dados);
    expect(spy).toHaveBeenCalledWith("submeter_cadastro_cliente", {
      p_token: "token-valido-123",
      p_dados: dados,
    });
    expect(res).toEqual({ sucesso: true, cadastro_id: "cad-123" });
    spy.mockRestore();
  });
});
