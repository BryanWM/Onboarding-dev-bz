import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, Component, type ErrorInfo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { listarClientes } from "@/lib/supabase";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { ClientSelectorView } from "./client-selector-view";
import { ClientFocusedView } from "./client-focused-view";
import { ContractModelsPanel } from "./contract-models-panel";
import { LogOut, ArrowLeft, AlertCircle, RefreshCw, Briefcase, Rocket } from "lucide-react";
import { setorDoCliente, type Setor } from "@/lib/fase-projeto";
import { AmbientBackground } from "@/components/ambient-background";
import { LogoWrmax } from "@/components/logo-wrmax";

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
              className="metal-button px-4 py-2 rounded-lg text-xs font-semibold text-primary-foreground inline-flex items-center gap-1.5 cursor-pointer shadow-md"
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
  // Mesmo acesso, duas secoes: Comercial (etapas 0-5) e Producao (Boas-vindas em diante)
  const [setor, setSetorState] = useState<Setor>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("wrmax_setor") === "producao" ? "producao" : "comercial";
    } catch {
      return "comercial";
    }
  });

  const trocarSetor = (novo: Setor) => {
    setSetorState(novo);
    setViewMode("clientes");
    // Cliente aberto que nao pertence a nova secao volta para a lista
    if (selectedCliente && setorDoCliente(selectedCliente) !== novo) handleVoltarParaLista();
    try {
      localStorage.setItem("wrmax_setor", novo);
    } catch {}
  };

  // Fora do modo demo (dev local sem .env), o painel exige sessao real.
  const precisaLogin = !modoDemo && !user;

  useEffect(() => {
    if (!authLoading && precisaLogin) {
      navigate({ to: "/login" });
    }
  }, [authLoading, precisaLogin, navigate]);

  // silencioso: atualizacao em segundo plano, sem spinner e sem apagar a lista se falhar
  const carregarClientes = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setLoadingClientes(true);
      setErroClientes(null);
    }
    try {
      const data = await listarClientes();
      setClientes(Array.isArray(data) ? data : []);
      setErroClientes(null);
    } catch (err) {
      console.error("Erro ao listar clientes:", err);
      if (!silencioso) {
        setClientes([]);
        setErroClientes(err instanceof Error ? err.message : "Não foi possível carregar os clientes.");
      }
    } finally {
      if (!silencioso) setLoadingClientes(false);
    }
  }, []);

  const recarregarClientes = useCallback(() => carregarClientes(), [carregarClientes]);

  const podeCarregar = modoDemo || isGestor === true;

  useEffect(() => {
    if (podeCarregar) carregarClientes();
  }, [carregarClientes, podeCarregar]);

  // Com um cliente aberto, busca de novo a cada 15s: cadastro, comprovante,
  // confirmacao do onboarding e contrato assinado aparecem sem recarregar.
  useEffect(() => {
    if (!podeCarregar || !selectedClienteId) return;
    const intervalo = setInterval(() => carregarClientes(true), 15000);
    return () => clearInterval(intervalo);
  }, [carregarClientes, podeCarregar, selectedClienteId]);

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
      <div className="relative min-h-screen flex items-center justify-center text-foreground">
        <AmbientBackground />
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
      <div className="relative min-h-screen flex items-center justify-center text-foreground px-5">
        <AmbientBackground />
        <div className="metal-panel p-8 text-center space-y-4 max-w-md border-destructive/40">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <h1 className="text-base font-extrabold">Acesso restrito a gestores</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O usuário {user?.email} está autenticado, mas não está cadastrado como gestor.
            Peça a um administrador para incluí-lo na tabela <code>gestores</code> do Supabase.
          </p>
          <button
            type="button"
            onClick={logout}
            className="metal-button px-4 py-2 rounded-lg text-xs font-semibold text-primary-foreground inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-foreground selection:bg-primary/20">
      <AmbientBackground />

      {/* Topbar de vidro */}
      <div className="sticky top-0 z-30 px-4 sm:px-6 pt-4">
        <header className="metal-panel !rounded-[14px] !bg-[rgba(10,9,7,0.7)] mx-auto max-w-6xl pl-5 pr-3 sm:pr-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoWrmax className="h-7" />
            <nav aria-label="Seções do painel" className="flex items-center gap-1 p-1 rounded-[10px] bg-[var(--campo)] border border-[var(--linha)]">
              {(
                [
                  { id: "comercial", rotulo: "Comercial", icone: <Briefcase className="size-3.5" /> },
                  { id: "producao", rotulo: "Produção", icone: <Rocket className="size-3.5" /> },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={setor === s.id}
                  onClick={() => trocarSetor(s.id)}
                  className={`h-8 px-3 rounded-[7px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    setor === s.id ? "chip-ouro" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.icone}
                  <span>{s.rotulo}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-xs font-mono text-muted-foreground hidden md:inline">
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="glass-button inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </header>
      </div>

      {/* Conteudo Principal com Error Boundary */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
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
              key={`${selectedCliente.id}-${setor}`}
              cliente={selectedCliente}
              setor={setor}
              onVoltar={handleVoltarParaLista}
              onClienteAtualizado={recarregarClientes}
              onIrParaSetor={trocarSetor}
            />
          ) : (
            <ClientSelectorView
              clientes={clientes}
              setor={setor}
              loading={loadingClientes}
              onRefresh={recarregarClientes}
              onSelectCliente={handleSelectCliente}
              onOpenModelos={() => setViewMode("modelos")}
            />
          )}
        </AdminErrorBoundary>
      </main>

      <footer className="px-5 py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
        WRMax Marketing &amp; Performance - Gestão Operacional de Onboarding
      </footer>
    </div>
  );
}

export default AdminDashboardApp;
