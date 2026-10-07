import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stages, stageItems } from "./stages-data";

export function MobileHeader({ progress, onMenu }: { progress: number; onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur lg:hidden">
      <Logo />
      <span className="font-mono text-xs text-primary">{progress}%</span>
      <Button size="icon" variant="ghost" aria-label="Abrir menu" onClick={onMenu}>
        <Menu />
      </Button>
    </header>
  );
}

export function Logo() {
  return (
    <div>
      <div className="metal-text text-2xl font-black tracking-wide">WRMAX</div>
      <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
        Onboarding · Alta performance
      </div>
    </div>
  );
}

export function Sidebar({
  active,
  progress,
  done,
  total,
  go,
  open,
  close,
  userEmail,
  onLogout,
}: {
  active: number;
  progress: number;
  done: number;
  total: number;
  go: (i: number) => void;
  open: boolean;
  close: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
}) {
  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-overlay backdrop-blur-sm lg:hidden", open ? "block" : "hidden")}
        onClick={close}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar p-5 transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-start justify-between">
          <Logo />
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={close} aria-label="Fechar menu">
            <X />
          </Button>
        </div>
        <div className="my-7 flex items-center gap-3 border-y border-border py-4">
          <div className="relative grid size-12 place-items-center rounded-full border border-primary/35 font-mono text-xs text-primary">
            <span>{progress}%</span>
            <span className="absolute inset-1 rounded-full border border-border" />
          </div>
          <div>
            <p className="text-sm font-semibold">Novo cliente</p>
            <p className="text-xs text-muted-foreground">
              {done} de {total} itens
            </p>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {stages.map((stage, i) => (
            <button
              key={stage.short}
              onClick={() => go(i)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all",
                active === i
                  ? "metal-button text-primary-foreground shadow-metal"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[9px]",
                  active === i ? "border-primary-foreground/30" : "border-border group-hover:border-primary/40"
                )}
              >
                {String(i).padStart(2, "0")}
              </span>
              <span className="truncate">{stage.short}</span>
              {active === i && <ChevronRight className="ml-auto size-3.5" />}
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="truncate text-muted-foreground font-mono text-[10px] max-w-[170px]">
              {userEmail || "Admin WRMax"}
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1 transition-colors cursor-pointer"
                title="Sair do painel"
              >
                <LogOut className="size-3" />
                Sair
              </button>
            )}
          </div>
          <div className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">
            Metodo WRMax · v2.0
          </div>
        </div>
      </aside>
    </>
  );
}

export function TopProgress({ active, progress }: { active: number; progress: number }) {
  return (
    <div className="sticky top-0 z-30 hidden h-10 items-center border-b border-border bg-background/90 px-12 backdrop-blur lg:flex">
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        Etapa <b className="text-primary">{String(active + 1).padStart(2, "0")}</b> / 13
      </span>
      <div className="mx-auto h-1 w-56 overflow-hidden rounded-full bg-muted">
        <div
          className="metal-fill h-full transition-all duration-700"
          style={{ width: `${((active + 1) / 13) * 100}%` }}
        />
      </div>
      <span className="font-mono text-[9px] text-primary">{progress}%</span>
    </div>
  );
}

export function StageHeader({ active }: { active: number }) {
  const stage = stages[active] ?? stages[0];
  if (!stage) return null;
  return (
    <header className="max-w-4xl">
      <div className="mb-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
        <span className="h-px w-9 bg-primary" />
        Etapa {String(active).padStart(2, "0")}
      </div>
      <h1 className="max-w-4xl text-4xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">{stage.title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">{stage.description}</p>
    </header>
  );
}

export { Timeline, Roles, NextSteps } from "./stage-views";

export function FooterNav({ active, go }: { active: number; go: (i: number) => void }) {
  const previous = stages[active - 1]?.short ?? "Voltar";
  const next = stages[active + 1]?.short ?? "Concluído";
  return (
    <footer className="mt-14 flex items-center justify-between border-t border-border pt-6">
      <Button variant="outline" disabled={active === 0} onClick={() => go(active - 1)}>
        <ArrowLeft />
        {previous}
      </Button>
      <span className="hidden items-center gap-2 text-[9px] text-muted-foreground sm:flex">
        <Clock3 className="size-3" />
        Use ← → do teclado
      </span>
      <Button disabled={active === 12} onClick={() => go(active + 1)}>
        {active < 12 ? `Continuar: ${next}` : "Concluído"}
        <ArrowRight />
      </Button>
    </footer>
  );
}
