import { createFileRoute } from "@tanstack/react-router";
import { ClienteTokenScreen } from "@/components/central-cliente";

function ClienteTokenRouteComponent() {
  const { token } = Route.useParams();
  return <ClienteTokenScreen token={token} />;
}

export const Route = createFileRoute("/c/")({
  head: () => ({
    meta: [
      { title: "WRMax - Central do Cliente" },
      { name: "description", content: "Portal exclusivo de onboarding do cliente WRMax." },
    ],
  }),
  component: ClienteTokenRouteComponent,
});
