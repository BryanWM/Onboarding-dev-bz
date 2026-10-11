import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, Component, type ErrorInfo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { listarClientes } from "@/lib/supabase";
import type { ClienteOnboarding } from "@/lib/mock-data";
import { ClientSelectorView } from "./client-selector-view";
import { ClientFocusedView } from "./client-focused-view";
import { ContractModelsPanel } from "./contract-models-panel";
import { LogOut, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { clienteNoSetor, type Setor } from "@/lib/fase-projeto";
import { AmbientBackground } from "@/components/ambient-background";
import { NavbarSetores } from "./navbar-setores";

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
      return typeof window !== "undefined" && localStorage.getItem("wrmax_setor") === "producao"
        ? "producao"
        : "comercial";
    } catch {
      return "comercial";
    }
  });

  // lado de onde o conteudo entra ao trocar de secao (null = primeira carga, sem animacao)
  const [direcaoEntrada, setDirecaoEntrada] = useState<"direita" | "esquerda" | null>(null);

  const trocarSetor = (novo: Setor) => {
    if (novo === setor) return;
    setDirecaoEntrada(novo === "producao" ? "direita" : "esquerda");
    setSetorState(novo);
    setViewMode("clientes");
    // Cliente aberto que nao pertence a nova secao volta para a lista
    if (selectedCliente && !clienteNoSetor(selectedCliente, novo)) handleVoltarParaLista();
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
        setErroClientes(
          err instanceof Error ? err.message : "Não foi possível carregar os clientes.",
        );
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
  const telaLista = viewMode === "clientes" && !selectedCliente;

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
            O usuário {user?.email} está autenticado, mas não está cadastrado como gestor. Peça a um
            administrador para incluí-lo na tabela <code>gestores</code> do Supabase.
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
    // Lista de clientes cabe em uma tela (h-dvh, sem rolagem); cliente aberto e modelos rolam normalmente
    <div
      className={`relative text-foreground selection:bg-primary/20 ${
        telaLista ? "h-dvh overflow-hidden flex flex-col" : "min-h-screen"
      }`}
    >
      <AmbientBackground />

      {/* Navbar: Comercial · logo · Producao */}
      <div className="sticky top-0 z-30 px-4 sm:px-6 pt-4 shrink-0">
        <NavbarSetores setor={setor} onTrocar={trocarSetor} email={user?.email} onSair={logout} />
      </div>

      {/* Conteudo Principal com Error Boundary */}
      <main
        className={`mx-auto max-w-6xl w-full px-4 sm:px-6 ${
          telaLista ? "flex-1 min-h-0 flex flex-col pt-5 pb-4" : "py-6 sm:py-8"
        }`}
      >
        {erroClientes && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{erroClientes}</span>
          </div>
        )}
        {/* Ao trocar de secao, o conteudo entra deslizando do lado escolhido */}
        <div
          key={setor}
          className={`${
            direcaoEntrada === "direita"
              ? "entrada-setor-direita"
              : direcaoEntrada === "esquerda"
                ? "entrada-setor-esquerda"
                : ""
          } ${telaLista ? "flex-1 min-h-0 flex flex-col" : ""}`}
        >
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
        </div>
      </main>

      <footer
        className={`px-5 py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80 ${telaLista ? "hidden" : ""}`}
      >
        WRMax Marketing &amp; Performance - Gestão Operacional de Onboarding
      </footer>
    </div>
  );
}

export default AdminDashboardApp;
