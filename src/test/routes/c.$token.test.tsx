import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ClienteTokenScreen } from "@/components/central-cliente";

vi.mock("@/lib/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");
  return {
    ...actual,
    isSupabaseConfigured: true,
    validarLinkToken: vi.fn().mockResolvedValue({
      valido: true,
      link: {
        id: "mock-link-id",
        expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
        segundos_restantes: 18000,
      },
      cliente: {
        id: "mock-cliente-id",
        nome_completo: "Cliente Parceiro WRMax",
        email: "contato@empresa.com",
        whatsapp: "86999999999",
        status: "link_ativo",
        apresentacao_pdf_url: null,
        apresentacao_pdf_nome: null,
      },
      cadastro_preenchido: false,
      contrato_liberado: false,
    }),
  };
});

describe("Route /c/$token (Jornada do Cliente com Token Efêmero)", () => {
  it("should render client personalized workspace with welcome and all slots", async () => {
    render(<ClienteTokenScreen tokenProp="mock-token-123" />);

    await waitFor(() => {
      expect(screen.getByText("WRMAX")).toBeInTheDocument();
      expect(screen.getByText(/Ambiente Criptografado/i)).toBeInTheDocument();
      expect(screen.getByText(/Jornada de Implantação/i)).toBeInTheDocument();
    });

    // 4 Slots
    expect(screen.getByText("Apresentação do Projeto")).toBeInTheDocument();
    expect(screen.getByText("Pagamento via PIX")).toBeInTheDocument();
    expect(screen.getByText("Dados Cadastrais da Empresa")).toBeInTheDocument();
    expect(screen.getByText("Contrato de Prestação de Serviços")).toBeInTheDocument();
  });
});
