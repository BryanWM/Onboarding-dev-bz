import { useEffect, useRef, useState } from "react";
import { Briefcase, LogOut, Rocket } from "lucide-react";
import { LogoWrmax } from "@/components/logo-wrmax";
import type { Setor } from "@/lib/fase-projeto";

interface NavbarSetoresProps {
  setor: Setor;
  onTrocar: (setor: Setor) => void;
  email?: string | null | undefined;
  onSair: () => void;
}

function iniciais(email?: string | null) {
  return (email || "G").replace(/@.*/, "").slice(0, 2).toUpperCase();
}

// Navbar do painel: Comercial · logo · Produção. A pilula dourada desliza por tras
// da logo ate a secao ativa (curva do macOS) e "respira" no meio do caminho.
export function NavbarSetores({ setor, onTrocar, email, onSair }: NavbarSetoresProps) {
  const [pulso, setPulso] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const producao = setor === "producao";

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const trocar = (novo: Setor) => {
    if (novo === setor) return;
    setPulso(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPulso(false), 260);
    onTrocar(novo);
  };

  const aba = (id: Setor, rotulo: string, icone: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={setor === id}
      onClick={() => trocar(id)}
      className={`relative z-10 flex-1 sm:flex-none sm:w-[132px] h-10 rounded-[9px] inline-flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer transition-colors duration-500 ${
        setor === id ? "text-foreground" : "text-[#8c836f] hover:text-foreground"
      }`}
    >
      {icone}
      <span>{rotulo}</span>
    </button>
  );

  return (
    <header className="metal-panel !rounded-[18px] !bg-[rgba(16,14,10,0.72)] mx-auto max-w-6xl px-3 sm:px-4 py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
      {/* Gestor */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          aria-hidden="true"
          className="size-9 shrink-0 rounded-[10px] grid place-items-center chip-ouro font-display font-bold text-xs"
        >
          {iniciais(email)}
        </span>
        {email && <span className="hidden lg:inline text-xs font-mono text-muted-foreground truncate">{email}</span>}
      </div>

      {/* Logo sozinha no celular (no computador ela fica dentro da capsula) */}
      <LogoWrmax className="h-6 justify-self-center sm:hidden" />

      {/* Capsula: Comercial · logo · Producao */}
      <nav
        aria-label="Seções do painel"
        className="relative col-span-3 row-start-2 sm:col-span-1 sm:row-start-1 sm:col-start-2 flex items-center p-1 rounded-[13px] bg-[rgba(10,9,7,0.6)] border border-[var(--linha)]"
      >
        <span
          aria-hidden="true"
          className={`indicador-setor absolute top-1 left-1 h-10 w-[calc(50%-4px)] sm:w-[132px] rounded-[9px] ${
            producao ? "[--ind-x:100%] sm:[--ind-x:312px]" : "[--ind-x:0px]"
          } ${pulso ? "[--ind-s:1.16]" : "[--ind-s:1]"}`}
        />
        {aba("comercial", "Comercial", <Briefcase className="size-4" />)}
        <span className="hidden sm:grid w-[180px] h-10 place-items-center">
          <LogoWrmax className={`h-7 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${pulso ? "scale-[0.94]" : ""}`} />
        </span>
        {aba("producao", "Produção", <Rocket className="size-4" />)}
      </nav>

      {/* Sair */}
      <div className="flex justify-end col-start-3 row-start-1">
        <button
          type="button"
          onClick={onSair}
          aria-label="Sair"
          className="glass-button h-9 px-3 sm:px-3.5 rounded-[10px] inline-flex items-center gap-2 text-[13px] font-semibold cursor-pointer"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
