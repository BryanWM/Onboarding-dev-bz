import { ChevronRight, Presentation, ShieldCheck, Sparkles, Users } from "lucide-react";
import { roleGroups, stages, stageItems } from "./stages-data";

export function Timeline() {
  return (
    <div className="relative space-y-3 before:absolute before:bottom-8 before:left-6 before:top-8 before:w-px before:bg-primary/25">
      {[
        ["D0", "Fechamento", "Contrato, pagamento e confirmacao"],
        ["Dia 1", "Boas-vindas", "Primeiro contato, organizacao e coleta de informacoes"],
        ["Dia 2", "Mapeamento", "Diagnostico e levantamento estrategico"],
        ["Dia 3", "Estrategia", "Consolidacao do diagnostico e direcionamento"],
        ["Ate Dia 5", "Producao", "Primeiros conteudos e materiais"],
        ["Apos implantacao", "Operacao", "Execucao, acompanhamento e otimizacoes"],
      ].map(([day, title, text]) => (
        <div
          key={day}
          className="metal-panel relative ml-0 grid gap-3 p-5 pl-16 sm:grid-cols-[130px_1fr] sm:items-center"
        >
          <span className="absolute left-[18px] top-6 size-3 rounded-full border-2 border-background bg-primary shadow-metal" />
          <span className="font-mono text-xs text-primary">{day}</span>
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Roles() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {roleGroups.map(([role, ...items], i) => (
        <section key={role} className="metal-panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="metal-text text-lg font-bold">{role}</h2>
            {i === 0 ? (
              <ShieldCheck className="text-primary" />
            ) : i === 1 ? (
              <Users className="text-primary" />
            ) : i === 2 ? (
              <Sparkles className="text-primary" />
            ) : (
              <Presentation className="text-primary" />
            )}
          </div>
          {items.map((x) => (
            <p key={x} className="border-t border-border py-2.5 text-sm text-muted-foreground">
              - &nbsp;{x}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

export function NextSteps({
  go,
  checked,
}: {
  go: (i: number) => void;
  checked: Record<string, boolean>;
}) {
  return (
    <div className="space-y-3">
      {stages
        .slice(1, 12)
        .filter((_, i) => i !== 8 && i !== 9)
        .map((stage) => {
          const i = stages.indexOf(stage);
          const items = stageItems(i);
          const n = items.filter((_, k) => checked[`${i}-${k}`]).length;
          return (
            <button
              key={stage.title}
              onClick={() => go(i)}
              className="metal-panel group grid w-full gap-3 p-5 text-left sm:grid-cols-[42px_1fr_auto] sm:items-center cursor-pointer"
            >
              <span className="font-mono text-xs text-primary">{String(i).padStart(2, "0")}</span>
              <div>
                <h2 className="font-bold">{stage.title}</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {n === items.length
                    ? "Etapa concluida"
                    : `Pendente: ${items.slice(0, 3).join(" · ")}${items.length > 3 ? " ..." : ""}`}
                </p>
              </div>
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                {n}/{items.length}
                <ChevronRight className="size-4 transition group-hover:translate-x-1" />
              </span>
            </button>
          );
        })}
    </div>
  );
}
