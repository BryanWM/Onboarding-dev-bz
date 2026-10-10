import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardApp } from "@/components/dashboard-admin/admin-dashboard-app";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "WRMax - Marketing & IA" },
      { name: "description", content: "Painel de onboarding de alta performance da WRMax." },
      { property: "og:title", content: "WRMax - Controle de Onboarding" },
      { property: "og:description", content: "Organize cada etapa da entrada de novos clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboardApp,
});

