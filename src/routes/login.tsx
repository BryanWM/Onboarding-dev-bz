import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "WRMax - Autenticacao Administrativa" },
      { name: "description", content: "Login seguro do painel operacional WRMax." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Preencha todos os campos obrigatorios.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await login(email, password);
      navigate({ to: "/admin" });
    } catch (err: any) {
      setErrorMsg(err?.message || "Credenciais invalidas. Verifique seu e-mail e senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Luz ambiente de fundo sutil */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-card border border-border/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Cabecalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
            WRMAX ADMIN
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesso operacional restrito aos gestores
          </p>
        </div>

        {/* Alerta de Modo de Desenvolvimento */}
        {!isConfigured && (
          <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold">Modo de Desenvolvimento Local</p>
              <p className="text-muted-foreground mt-0.5">
                Variaveis do Supabase nao configuradas. Voce pode entrar com qualquer credencial para testar a interface.
              </p>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              E-mail Administrativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gestor@wrmax.com.br"
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/30 border border-border/80 text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/80 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/30 border border-border/80 text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/80 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="metal-button w-full h-11 rounded-lg text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              "Acessar Painel"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-muted-foreground/70 font-mono">
          WRMAX Marketing &amp; Performance - 2026
        </div>
      </div>
    </div>
  );
}
