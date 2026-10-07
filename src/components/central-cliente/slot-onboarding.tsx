import { ArrowUpRight, FolderOpen } from "lucide-react";
import { SlotHeader } from "./slot-header";

interface SlotOnboardingProps {
  formUrl?: string;
}

export const FORM_ONBOARDING_DEFAULT =
  "https://docs.google.com/forms/d/e/1FAIpQLSdyJjJicNhDIqPgkUSgEHwovvbywPsazFhWcPV3mJCVkobErg/viewform";

export function SlotOnboarding({ formUrl = FORM_ONBOARDING_DEFAULT }: SlotOnboardingProps) {
  return (
    <section className="metal-panel p-6">
      <SlotHeader
        index="03"
        icon={<FolderOpen className="size-4" />}
        title="Onboarding do cliente"
        subtitle="Preencha o formulário com os dados da sua empresa para iniciarmos a operação."
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={formUrl}
          target="_blank"
          rel="noreferrer"
          className="metal-button inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold text-primary-foreground"
        >
          Abrir formulário de onboarding <ArrowUpRight className="size-4" />
        </a>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Leva cerca de 10 minutos. Você pode salvar e continuar depois.
      </p>
    </section>
  );
}
