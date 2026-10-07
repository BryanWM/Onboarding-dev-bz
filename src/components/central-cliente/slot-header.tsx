import type React from "react";

interface SlotHeaderProps {
  index: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export function SlotHeader({ index, icon, title, subtitle }: SlotHeaderProps) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/35 font-mono text-[10px] text-primary">
        {index}
      </span>
      <div>
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
