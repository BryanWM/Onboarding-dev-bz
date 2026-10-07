import { Check, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type Project = { id: string; name: string; date: string };
const PROJECTS_KEY = "wrmax-project-entries";
const LEGACY_KEY = "wrmax-client-entries";
const todayISO = () => new Date().toISOString().slice(0, 10);
const formatBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export const MOCK_PROJECTS_DEFAULT: Project[] = [
  { id: "mock-1", name: "Studio Alpha Saúde - Onboarding e Tráfego Pago", date: "2026-09-24" },
  { id: "mock-2", name: "Clínica Médica Santa Helena - Estruturação Digital", date: "2026-09-22" },
  { id: "mock-3", name: "Grupo Vanguarda Varejo - Implantação WRMax", date: "2026-09-18" },
];

export function ProjectEntries() {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO);
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === "undefined") return MOCK_PROJECTS_DEFAULT;
    try {
      const raw = window.localStorage.getItem(PROJECTS_KEY);
      if (raw) return JSON.parse(raw) as Project[];
      const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as { name: string; at?: string }[];
        if (legacy.length > 0) {
          return legacy.map((e, i) => ({
            id: `migrado-${i}`,
            name: e.name,
            date: (e.at ?? "").slice(0, 10) || todayISO(),
          }));
        }
      }
      return MOCK_PROJECTS_DEFAULT;
    } catch {
      return MOCK_PROJECTS_DEFAULT;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch {
      /* ignore */
    }
  }, [projects]);

  const save = () => {
    const clean = name.trim();
    if (!clean) return;
    setProjects((old) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: clean, date: date || todayISO() },
      ...old,
    ].slice(0, 200));
    setName("");
    setDate(todayISO());
  };

  const remove = (id: string) => setProjects((old) => old.filter((p) => p.id !== id));
  const ordered = [...projects].sort((a, b) => b.date.localeCompare(a.date));
  const thisMonth = projects.filter((p) => p.date.startsWith(todayISO().slice(0, 7))).length;

  return (
    <section className="metal-panel p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-primary" />
          <h2 className="metal-text text-lg font-bold">Novos projetos</h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="rounded-full border border-primary/30 px-2.5 py-1 text-primary">
            {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1">{thisMonth} no mês</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto] sm:items-end">
        <label className="block">
          <span className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Nome do projeto *
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            placeholder="Nome do cliente ou projeto"
            className="h-11 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <Button onClick={save} disabled={!name.trim()} className="h-11 shrink-0">
          <Check />
          Salvar projeto
        </Button>
      </div>
      {projects.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum projeto registrado ainda.
        </p>
      ) : (
        <ul className="mt-5">
          {ordered.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 border-t border-border/60 py-2.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(ordered.length - i).padStart(2, "0")}
                </span>
                <span className="truncate font-medium">{p.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-primary">{formatBR(p.date)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover ${p.name}`}
                  onClick={() => remove(p.id)}
                >
                  <X className="size-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
