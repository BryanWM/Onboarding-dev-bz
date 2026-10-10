import { useState, useEffect } from "react";

const CHECKLIST_ITEMS = [
  { id: "contato", label: "Boas-vindas e primeiro contato" },
  { id: "apresentacao", label: "Apresentação estratégica enviada" },
  { id: "pix", label: "Pagamento do PIX confirmado" },
  { id: "cadastro", label: "Dados cadastrais conferidos" },
  { id: "contrato", label: "Contrato estruturado e liberado" },
  { id: "reuniao", label: "Reunião de onboarding realizada" },
  { id: "mapeamento", label: "Mapeamento estratégico concluído" },
  { id: "producao", label: "Primeira produção de conteúdo" },
  { id: "liberacao", label: "Checklist final de liberação" },
];

interface WorkspaceChecklistProps {
  clienteId: string;
  clienteNome: string;
}

export function WorkspaceChecklist({ clienteId, clienteNome }: WorkspaceChecklistProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`wrmax_checklist_${clienteId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCheck = (id: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`wrmax_checklist_${clienteId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const total = CHECKLIST_ITEMS.length;
  const concluidos = Object.values(checklist).filter(Boolean).length;
  const porcentagem = Math.round((concluidos / total) * 100);

  return (
    <section className="metal-panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h3 className="font-bold text-sm text-foreground">
            Checklist de Implantação e Operação
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Progresso individualizado para {clienteNome}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-primary">
            {concluidos}/{total} ({porcentagem}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {CHECKLIST_ITEMS.map(({ id, label }) => (
          <label
            key={id}
            onClick={() => toggleCheck(id)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              checklist[id]
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-secondary/20 border-border/70 text-muted-foreground hover:border-border"
            }`}
          >
            <input
              type="checkbox"
              checked={Boolean(checklist[id])}
              onChange={() => {}}
              className="size-3.5 rounded border-border text-primary accent-primary pointer-events-none"
            />
            <span className="truncate">{label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
