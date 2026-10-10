import { createFileRoute } from "@tanstack/react-router";
import { ClienteTokenScreen } from "@/components/central-cliente";

export const Route = createFileRoute("/c/$token")({
  head: () => ({
    meta: [
      { title: "WRMax - Marketing & IA" },
      { name: "description", content: "Portal exclusivo de onboarding do cliente WRMax." },
    ],
  }),
  component: ClienteTokenScreen,
});

