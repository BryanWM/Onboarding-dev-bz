import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalScreen } from "@/components/central-cliente";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WRMax - Marketing & IA" },
      {
        name: "description",
        content: "Deseja contratar os nossos serviços? Entre em contato com a equipe WRMax.",
      },
      { property: "og:title", content: "WRMax - Marketing & IA" },
      {
        property: "og:description",
        content: "Deseja contratar os nossos serviços? Entre em contato com a equipe WRMax.",
      },
    ],
  }),
  component: InstitucionalScreen,
});
