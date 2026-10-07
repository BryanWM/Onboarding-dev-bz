import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminDashboardApp } from "@/components/dashboard-admin/admin-dashboard-app";
import { AuthProvider } from "@/lib/auth-context";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  // modo demo (dev local sem .env): painel abre sem login
  isModoDemo: true,
  getAdminSession: vi.fn().mockResolvedValue(null),
  supabase: {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
  listarClientes: vi.fn().mockResolvedValue([
    {
      id: "cli-1",
      nome_completo: "Loja Teste Alpha",
      email: "alpha@teste.com",
      status: "link_ativo",
      links_temporarios: [
        {
          id: "link-1",
          token: "tok_test_alpha_123",
          expira_em: new Date(Date.now() + 3600000).toISOString(),
          bloqueado_manualmente: false,
          acessos_count: 3,
        },
      ],
    },
  ]),
  prorrogarLink: vi.fn().mockResolvedValue({}),
  bloquearLink: vi.fn().mockResolvedValue({}),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    createFileRoute: () => () => ({ component: () => null }),
  };
});

describe("Route /admin (Painel de Controle Integrado do Gestor)", () => {
  it("should render client management panel and onboarding stage 0", async () => {
    render(
      <AuthProvider>
        <AdminDashboardApp />
      </AuthProvider>
    );

    expect(screen.getByText("Gestão Operacional de Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Novos Projetos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Projeto/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Loja Teste Alpha")).toBeInTheDocument();
    });
  });
});
