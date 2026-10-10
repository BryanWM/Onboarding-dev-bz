import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { stages } from "./stages-data";

interface WorkspaceStageTabProps {
  stageIndex: number;
  clienteId: string;
  clienteNome: string;
}

export function WorkspaceStageTab({ stageIndex, clienteId, clienteNome }: WorkspaceStageTabProps) {
  const stage = stages[stageIndex];
  const storageKey = `wrmax_stage_${clienteId}_${stageIndex}`;

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleItem = (item: string) => {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  if (!stage) return null;

  return (
    <div className="space-y-6">
      <div className="metal-panel p-6">
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary block mb-1">
          Etapa Operacional · {clienteNome}
        </span>
        <h2 className="text-xl font-bold text-foreground">{stage.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {stage.description}
        </p>
      </div>

      {stage.groups && stage.groups.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {stage.groups.map((group) => (
            <div key={group.title} className="metal-panel p-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-primary">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const isDone = Boolean(checked[item]);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        isDone
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-secondary/20 border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                      )}
                      <span className="leading-snug">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
