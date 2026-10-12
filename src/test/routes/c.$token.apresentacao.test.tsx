import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClienteTokenScreen } from "@/components/central-cliente";

vi.mock("@/lib/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");
  return {
    ...actual,
    isSupabaseConfigured: true,
    validarLinkToken: vi.fn().mockResolvedValue({
      valido: true,
      link: { id: "l1", expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), segundos_restantes: 18000 },
      cliente: {
        id: "c1",
        nome_completo: "Cliente Novo",
        status: "link_ativo",
        // gestor ja enviou a apresentacao ao criar o link
        apresentacao_pdf_url: "apresentacoes-pdf/c1/proposta.pdf",
        apresentacao_pdf_nome: "proposta.pdf",
      },
      cadastro_preenchido: false,
      contrato_liberado: false,
    }),
  };
});

vi.mock("@/lib/arquivos-cliente", () => ({
  obterArquivosCliente: vi.fn().mockResolvedValue({
    valido: true,
    apresentacao: "https://arquivos.test/proposta.pdf",
    contratoModelo: null,
    contratoAssinado: null,
  }),
}));

describe("Central do cliente: apresentacao primeiro", () => {
  beforeEach(() => localStorage.clear());

  it("link novo abre na Apresentacao mesmo com o PDF enviado; ao abrir o PDF, segue para o PIX", async () => {
    render(<ClienteTokenScreen token="tok-novo" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Apresentação do Projeto" })).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Pagamento via PIX" })).toBeNull();

    fireEvent.click(await screen.findByRole("link", { name: "Visualizar Apresentação" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Pagamento via PIX" })).toBeInTheDocument());
    expect(localStorage.getItem("wrmax_apresentacao_vista_tok-novo")).toBe("1");
  });

  it("quem ja abriu a apresentacao volta direto no PIX", async () => {
    localStorage.setItem("wrmax_apresentacao_vista_tok-novo", "1");
    render(<ClienteTokenScreen token="tok-novo" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Pagamento via PIX" })).toBeInTheDocument());
  });
});
