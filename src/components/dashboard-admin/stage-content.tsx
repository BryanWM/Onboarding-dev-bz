import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stages, stageItems } from "./stages-data";
import { PixPanel, FileImporter } from "./panels";
import { Timeline, Roles } from "./stage-views";

export function StageContent({
  index,
  checked,
  setChecked,
}: {
  index: number;
  checked: Record<string, boolean>;
  setChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const stage = stages[index] ?? stages[0];
  const items = stageItems(index);
  const done = items.filter((_, i) => checked[`${index}-${i}`]).length;
  if (!stage) return null;

  const toggle = (i: number) =>
    setChecked((old) => ({ ...old, [`${index}-${i}`]: !old[`${index}-${i}`] }));
  const all = done === items.length && items.length > 0;
  const markAll = () =>
    setChecked((old) => {
      const next = { ...old };
      items.forEach((_, i) => (next[`${index}-${i}`] = !all));
      return next;
    });

  if (index === 9) return <Timeline />;
  if (index === 10) return <Roles />;
  let offset = 0;

  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <div className="metal-panel flex items-center gap-4 p-4">
          <div className="font-mono text-3xl font-bold">
            <span className="metal-text">{done}</span>
            <span className="text-muted-foreground">/{items.length}</span>
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="metal-fill h-full transition-all duration-500"
              style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={markAll}>
            {all ? <X /> : <Check />}
            {all ? "Desmarcar" : "Marcar tudo"}
          </Button>
        </div>
      )}
      {index === 7 && <PixPanel />}
      {index === 8 && (
        <FileImporter
          title="Documento da apresentação"
          hint="PDF, PPT, PPTX, DOC ou DOCX · até 20 MB"
          accept=".pdf,.ppt,.pptx,.doc,.docx"
        />
      )}
      <div className={cn("grid gap-4", (stage.groups?.length ?? 0) > 1 && "md:grid-cols-2")}>
        {stage.groups?.map((group) => {
          const start = offset;
          offset += group.items.length;
          const count = group.items.filter((_, i) => checked[`${index}-${start + i}`]).length;
          return (
            <section key={group.title} className="metal-panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  {group.title}
                </h2>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {count}/{group.items.length}
                </span>
              </div>
              <div>
                {group.items.map((item, i) => (
                  <button
                    key={item}
                    onClick={() => toggle(start + i)}
                    className="group flex w-full items-start gap-3 border-t border-border/60 py-3 text-left text-sm transition first:border-0 cursor-pointer"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition",
                        checked[`${index}-${start + i}`]
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border group-hover:border-primary"
                      )}
                    >
                      <Check
                        className={cn(
                          "size-3 transition",
                          checked[`${index}-${start + i}`] ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        "leading-5",
                        checked[`${index}-${start + i}`] && "text-muted-foreground line-through"
                      )}
                    >
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
