import type { ClienteOnboarding } from "./mock-data";

// Comercial cuida de todos os projetos (etapas 0-5) e continua vendo os fechados.
// A Producao recebe o projeto quando o contrato fecha: o cliente envia a via
// assinada e o gestor a valida na aba Contrato.
export type Setor = "comercial" | "producao";

export function contratoFechado(cliente: ClienteOnboarding) {
  if (cliente.status === "concluido") return true;
  return (cliente.contratos || []).some((c) => Boolean(c.validado_em));
}

// Via enviada pelo cliente, ainda nao validada pelo gestor
export function viaAguardandoValidacao(cliente: ClienteOnboarding) {
  const c = cliente.contratos?.[0];
  return Boolean(c?.docx_assinado_storage_path) && !c?.validado_em && !contratoFechado(cliente);
}

// O cliente aparece nesta secao?
export function clienteNoSetor(cliente: ClienteOnboarding, setor: Setor) {
  return setor === "comercial" ? true : contratoFechado(cliente);
}
