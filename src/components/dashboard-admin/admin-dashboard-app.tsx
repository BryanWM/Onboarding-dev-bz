import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, Component, type ErrorInfo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { listarClientes } from "@/lib/supabase";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { ClientSelectorView } from "./client-selector-view";
import { ClientFocusedView } from "./client-focused-view";
import { ContractModelsPanel } from "./contract-models-panel";
import { LogOut, ShieldCheck, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado no AdminErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="metal-panel p-8 text-center space-y-4 max-w-lg mx-auto my-12 border-destructive/40 shadow-xl">
          <div className="size-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">
            Instabilidade temporária no carregamento deste cliente
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {this.state.error?.message || "Ocorreu uma falha ao renderizar os dados do projeto."}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset();
              }}
              className="metal-button px-4 py-2 rounded-lg text-xs font-bold text-primary-foreground inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RefreshCw className="size-3.5" />
              <span>Voltar para Lista de Clientes</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AdminDashboardApp() {
  const { user, loading: authLoading, modoDemo, isGestor, logout } = useAuth();
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<ClienteOnboarding[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [erroClientes, setErroClientes] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wrmax_selected_cliente_id") || null;
    }
    return null;
  });
  const [viewMode, setViewMode] = useState<"clientes" | "modelos">("clientes");

  // Fora do modo demo (dev local sem .env), o painel exige sessao real.
  const precisaLogin = !modoDemo && !user;

  useEffect(() => {
    if (!authLoading && precisaLogin) {
      navigate({ to: "/login" });
    }
  }, [authLoading, precisaLogin, navigate]);

  const carregarClientes = useCallback(async () => {
    setLoadingClientes(true);
    setErroClientes(null);
    try {
      const data = await listarClientes();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao listar clientes:", err);
      setClientes([]);
      setErroClientes(err instanceof Error ? err.message : "Não foi possível carregar os clientes.");
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const podeCarregar = modoDemo || isGestor === true;

  useEffect(() => {
    if (podeCarregar) carregarClientes();
  }, [carregarClientes, podeCarregar]);

  const handleSelectCliente = (cliente: ClienteOnboarding) => {
    if (!cliente) return;
    setSelectedClienteId(cliente.id);
    if (typeof window !== "undefined") {
      localStorage.setItem("wrmax_selected_cliente_id", cliente.id);
    }
  };

  const handleVoltarParaLista = () => {
    setSelectedClienteId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("wrmax_selected_cliente_id");
    }
  };

  const selectedCliente = Array.isArray(clientes)
    ? clientes.find((c) => c && c.id === selectedClienteId) || null
    : null;

  if (authLoading || (!precisaLogin && !podeCarregar && isGestor === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Acessando painel seguro...
          </span>
        </div>
      </div>
    );
  }

  if (precisaLogin) {
    return null;
  }

  if (!modoDemo && isGestor === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-5">
        <div className="metal-panel p-8 text-center space-y-4 max-w-md border-destructive/40">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <h1 className="text-base font-bold">Acesso restrito a gestores</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O usuário {user?.email} está autenticado, mas não está cadastrado como gestor.
            Peça a um administrador para incluí-lo na tabela <code>gestores</code> do Supabase.
          </p>
          <button
            type="button"
            onClick={logout}
            className="metal-button px-4 py-2 rounded-lg text-xs font-bold text-primary-foreground inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Topbar Global do Admin */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-md px-5 py-4 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="metal-text text-2xl font-black font-mono tracking-wide">WRMAX</div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-primary font-mono text-[10px] uppercase">
              <ShieldCheck className="size-3" />
              Painel Administrativo
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user?.email && (
              <span className="text-xs font-mono text-muted-foreground hidden md:inline">
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/30 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteudo Principal com Error Boundary */}
      <main className="mx-auto max-w-6xl px-5 py-8">
        {erroClientes && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{erroClientes}</span>
          </div>
        )}
        <AdminErrorBoundary onReset={handleVoltarParaLista}>
          {viewMode === "modelos" ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setViewMode("clientes")}
                className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Voltar para Clientes</span>
              </button>
              <ContractModelsPanel />
            </div>
          ) : selectedCliente ? (
            <ClientFocusedView
              cliente={selectedCliente}
              onVoltar={handleVoltarParaLista}
              onClienteAtualizado={carregarClientes}
            />
          ) : (
            <ClientSelectorView
              clientes={clientes}
              loading={loadingClientes}
              onRefresh={carregarClientes}
              onSelectCliente={handleSelectCliente}
              onOpenModelos={() => setViewMode("modelos")}
            />
          )}
        </AdminErrorBoundary>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        WRMax Marketing &amp; Performance - Gestão Operacional de Onboarding
      </footer>
    </div>
  );
}

export default AdminDashboardApp;
