import type { ClienteOnboarding } from "./mock-data";

// Comercial cuida das etapas 0-5 (ate o contrato). O projeto passa para a
// Producao quando o cliente envia a via assinada do contrato.
export type Setor = "comercial" | "producao";

export function contratoAssinado(cliente: ClienteOnboarding) {
  if (cliente.status === "assinado" || cliente.status === "concluido") return true;
  return (cliente.contratos || []).some((c) => Boolean(c.docx_assinado_storage_path) || c.status_envio === "assinado");
}

export function setorDoCliente(cliente: ClienteOnboarding): Setor {
  return contratoAssinado(cliente) ? "producao" : "comercial";
}
