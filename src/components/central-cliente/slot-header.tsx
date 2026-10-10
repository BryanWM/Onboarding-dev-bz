import type React from "react";

interface SlotHeaderProps {
  index: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export function SlotHeader({ index, icon, title, subtitle }: SlotHeaderProps) {
  const numero = String(Number(index) || index);
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/35 bg-primary/10 font-mono text-base text-primary">
        {numero}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-primary/90 [&_svg]:size-3.5">
          {icon}
          <span>Etapa {numero}</span>
        </div>
        <h2 className="mt-0.5 text-lg sm:text-xl font-bold text-foreground tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}
