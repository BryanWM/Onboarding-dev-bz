import { supabase, isSupabaseConfigured, isModoDemo } from "./supabase-client";
import { prepararUploadCliente, type TipoUploadCliente } from "./arquivos-cliente";
import { extensaoSegura, montarRefStorage } from "./storage-refs";
import { mensagemDeErro } from "./erros";

export { mensagemDeErro } from "./erros";
export { isSupabaseConfigured, isModoDemo, supabase } from "./supabase-client";
export {
  emitirEEnviarContrato,
  listarModelosContrato,
  criarModeloContrato,
  anexarContratoManual,
  liberarContratoCliente,
} from "./contract-service";
export {
  validarLinkToken,
  MOTIVO_FALHA_CONEXAO,
  type ValidacaoTokenResultado,
} from "./token-validation-service";
export {
  listarClientes,
  criarClienteComLink,
  atualizarProjeto,
  excluirProjeto,
} from "./project-service";

// Sem Supabase so o modo demo (dev local) segue em frente; em producao falha.
function exigirSupabaseOuDemo(): boolean {
  if (isSupabaseConfigured) return true;
  if (isModoDemo) return false;
  throw new Error("SUPABASE_NAO_CONFIGURADO");
}

function emitirEvento(nome: string, detail: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(nome, { detail }));
  } catch {}
}

function lerJsonLocal<T>(chave: string, padrao: T): T {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(chave) : null;
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravarJsonLocal(chave: string, valor: unknown) {
  try {
    if (typeof window !== "undefined") localStorage.setItem(chave, JSON.stringify(valor));
  } catch {}
}

// ------------------------------------------------------------------------------
// Cliente (link /c/:token) - tudo validado pelo token no banco/servidor
// ------------------------------------------------------------------------------

export async function submeterCadastroCliente(token: string, dados: Record<string, any>) {
  if (exigirSupabaseOuDemo()) {
    const { data, error } = await supabase.rpc("submeter_cadastro_cliente", {
      p_token: token,
      p_dados: dados,
    });
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível enviar o cadastro. Tente novamente."));
    const res = data as { sucesso?: boolean; erro?: string } | null;
    if (!res?.sucesso) throw new Error(mensagemDeErro(res?.erro, "Não foi possível enviar o cadastro. Tente novamente."));
    emitirEvento("wrmax:cadastro_submetido", { token, dados });
    return res;
  }

  gravarJsonLocal(`wrmax_cadastro_${token}`, dados);
  emitirEvento("wrmax:cadastro_submetido", { token, dados });
  return { sucesso: true, dados };
}

// Cliente abriu o Google Forms (modal ou nova aba). So a primeira abertura conta:
// a confirmacao libera 5 minutos depois dela.
export async function registrarAberturaOnboarding(token: string) {
  if (exigirSupabaseOuDemo()) {
    const { data, error } = await supabase.rpc("registrar_abertura_onboarding", { p_token: token });
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível registrar a abertura do formulário."));
    const res = data as { sucesso?: boolean; erro?: string; segundos_para_confirmar?: number } | null;
    if (!res?.sucesso) throw new Error(mensagemDeErro(res?.erro, "Não foi possível registrar a abertura do formulário."));
    return { segundosParaConfirmar: res.segundos_para_confirmar ?? 300 };
  }

  const chave = `wrmax_onboarding_aberto_${token}`;
  const abertoEm = lerJsonLocal<string | null>(chave, null) || new Date().toISOString();
  gravarJsonLocal(chave, abertoEm);
  const restantes = Math.ceil((new Date(abertoEm).getTime() + 5 * 60 * 1000 - Date.now()) / 1000);
  return { segundosParaConfirmar: Math.max(0, restantes) };
}

// Cliente confirma que preencheu o Google Forms. O banco so aceita 5 minutos
// depois da primeira abertura do formulario e guarda a data da primeira confirmacao.
export async function confirmarOnboardingForm(token: string) {
  if (exigirSupabaseOuDemo()) {
    const { data, error } = await supabase.rpc("confirmar_onboarding_form", { p_token: token });
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível registrar a confirmação. Tente novamente."));
    const res = data as { sucesso?: boolean; erro?: string; confirmado_em?: string } | null;
    if (!res?.sucesso) throw new Error(mensagemDeErro(res?.erro, "Não foi possível registrar a confirmação. Tente novamente."));
    emitirEvento("wrmax:onboarding_confirmado", { token, confirmadoEm: res.confirmado_em });
    return { sucesso: true, confirmadoEm: res.confirmado_em || new Date().toISOString() };
  }

  const confirmadoEm = new Date().toISOString();
  gravarJsonLocal(`wrmax_onboarding_confirmado_${token}`, confirmadoEm);
  emitirEvento("wrmax:onboarding_confirmado", { token, confirmadoEm });
  return { sucesso: true, confirmadoEm };
}

async function enviarArquivoCliente(token: string, tipo: TipoUploadCliente, file: File) {
  const prep = await prepararUploadCliente({
    data: { token, tipo, nomeArquivo: file.name, tamanho: file.size },
  });
  const { error } = await supabase.storage
    .from(prep.bucket)
    .uploadToSignedUrl(prep.caminho, prep.tokenUpload, file, file.type ? { contentType: file.type } : {});
  if (error) throw new Error("Falha no envio do arquivo. Tente novamente.");
  return prep.caminho;
}

export async function enviarComprovantePix(token: string, file: File, clienteIdDemo?: string) {
  const info = { nome: file.name, data: new Date().toISOString(), tamanho: file.size };

  if (exigirSupabaseOuDemo()) {
    try {
      const caminho = await enviarArquivoCliente(token, "comprovante_pix", file);
      const { data, error } = await supabase.rpc("registrar_comprovante_pix", {
        p_token: token,
        p_path: caminho,
        p_nome: file.name,
      });
      const res = data as { sucesso?: boolean; erro?: string } | null;
      if (error || !res?.sucesso) throw new Error(res?.erro || error?.message || "");
    } catch (err) {
      throw new Error(mensagemDeErro(err, "Não foi possível enviar o comprovante. Tente novamente."));
    }
    emitirEvento("wrmax:comprovante_pix_enviado", { identificador: token, info });
    return { sucesso: true, info };
  }

  const id = clienteIdDemo || token;
  const infoDemo = { ...info, url: URL.createObjectURL(file) };
  gravarJsonLocal(`wrmax_comprovante_pix_${id}`, infoDemo);
  emitirEvento("wrmax:comprovante_pix_enviado", { identificador: id, info: infoDemo });
  return { sucesso: true, info: infoDemo };
}

export async function enviarContratoAssinado(
  token: string,
  file: File,
  idsDemo?: { clienteId?: string | undefined; contratoId?: string | undefined }
) {
  const info = { nome: file.name, data: new Date().toISOString(), tamanho: file.size };

  if (exigirSupabaseOuDemo()) {
    try {
      const caminho = await enviarArquivoCliente(token, "contrato_assinado", file);
      const { data, error } = await supabase.rpc("registrar_contrato_assinado", {
        p_token: token,
        p_path: caminho,
        p_nome: file.name,
      });
      const res = data as { sucesso?: boolean; erro?: string } | null;
      if (error || !res?.sucesso) throw new Error(res?.erro || error?.message || "");
    } catch (err) {
      throw new Error(mensagemDeErro(err, "Não foi possível enviar o contrato assinado. Tente novamente."));
    }
    emitirEvento("wrmax:contrato_assinado_enviado", { identificador: token, clienteId: idsDemo?.clienteId, info });
    return { sucesso: true, info };
  }

  const infoDemo = { ...info, url: URL.createObjectURL(file) };
  const ids = Array.from(new Set([token, idsDemo?.clienteId, idsDemo?.contratoId].filter(Boolean))) as string[];
  ids.forEach((id) => gravarJsonLocal(`wrmax_contrato_assinado_${id}`, infoDemo));
  if (idsDemo?.clienteId) {
    const editados = lerJsonLocal<Record<string, any>>("wrmax_clientes_editados", {});
    editados[idsDemo.clienteId] = { ...(editados[idsDemo.clienteId] || {}), status: "assinado", contrato_assinado: infoDemo };
    gravarJsonLocal("wrmax_clientes_editados", editados);
  }
  emitirEvento("wrmax:contrato_assinado_enviado", { identificador: token, clienteId: idsDemo?.clienteId, info: infoDemo });
  return { sucesso: true, info: infoDemo };
}

// Leitura do localStorage: so tem efeito no modo demo.
export function obterComprovantePix(identificador?: string | null) {
  if (!isModoDemo || !identificador) return null;
  return lerJsonLocal<any>(`wrmax_comprovante_pix_${identificador}`, null);
}

export function obterContratoAssinado(identificador?: string | null) {
  if (!isModoDemo || !identificador) return null;
  const item = lerJsonLocal<any>(`wrmax_contrato_assinado_${identificador}`, null);
  if (item) return item;
  const editados = lerJsonLocal<Record<string, any>>("wrmax_clientes_editados", {});
  return editados[identificador]?.contrato_assinado || null;
}

// ------------------------------------------------------------------------------
// Gestor (sessao autenticada) - o banco confere is_gestor() em tudo
// ------------------------------------------------------------------------------

export async function prorrogarLink(linkId: string, minutos: number) {
  if (!exigirSupabaseOuDemo()) return { sucesso: true };
  const { data, error } = await supabase.rpc("prorrogar_link", {
    p_link_id: linkId,
    p_minutos: minutos,
  });
  if (error) throw new Error(mensagemDeErro(error, "Não foi possível prorrogar o link."));
  return data;
}

export async function bloquearLink(linkId: string, motivo = "Bloqueado pelo gestor") {
  if (!exigirSupabaseOuDemo()) return { sucesso: true };
  const { data, error } = await supabase.rpc("bloquear_link", {
    p_link_id: linkId,
    p_motivo: motivo,
  });
  if (error) throw new Error(mensagemDeErro(error, "Não foi possível bloquear o link."));
  return data;
}

export async function desbloquearLink(linkId: string) {
  if (!exigirSupabaseOuDemo()) return { sucesso: true };
  const { data, error } = await supabase.rpc("desbloquear_link", {
    p_link_id: linkId,
  });
  if (error) throw new Error(mensagemDeErro(error, "Não foi possível desbloquear o link."));
  return data;
}

export async function excluirLinkTemporario(linkId: string) {
  if (!exigirSupabaseOuDemo()) return { sucesso: true };
  const { data, error } = await supabase.rpc("excluir_link_temporario", {
    p_link_id: linkId,
  });
  if (error) throw new Error(mensagemDeErro(error, "Não foi possível excluir o link."));
  return data;
}

export async function atualizarStatusPix(clienteId: string, pago: boolean) {
  if (exigirSupabaseOuDemo()) {
    const { data, error } = await supabase.rpc("atualizar_status_pix", {
      p_cliente_id: clienteId,
      p_pago: pago,
    });
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível atualizar o status do PIX."));
    emitirEvento("wrmax:pix_status_atualizado", { clienteId, pago });
    return data;
  }

  const editados = lerJsonLocal<Record<string, any>>("wrmax_clientes_editados", {});
  editados[clienteId] = { ...(editados[clienteId] || {}), pix_pago: pago };
  gravarJsonLocal("wrmax_clientes_editados", editados);
  const locais = lerJsonLocal<any[]>("wrmax_clientes_locais", []);
  const idx = locais.findIndex((c) => c.id === clienteId);
  if (idx >= 0) {
    locais[idx].pix_pago = pago;
    gravarJsonLocal("wrmax_clientes_locais", locais);
  }
  emitirEvento("wrmax:pix_status_atualizado", { clienteId, pago });
  emitirEvento("wrmax:projeto_atualizado", { clienteId, dados: { pix_pago: pago } });
  return { sucesso: true, pix_pago: pago };
}

// Gestor marca (ou desmarca) que o cliente preencheu o Google Forms, por exemplo
// depois de conferir as respostas do formulario.
export async function marcarOnboardingGestor(clienteId: string, preenchido: boolean) {
  const campos = preenchido
    ? { onboarding_confirmado_em: new Date().toISOString(), onboarding_confirmado_por: "gestor" as const }
    : { onboarding_confirmado_em: null, onboarding_confirmado_por: null };

  if (exigirSupabaseOuDemo()) {
    const { error } = await supabase.from("clientes_onboarding").update(campos).eq("id", clienteId);
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível atualizar o status do onboarding."));
  } else {
    const editados = lerJsonLocal<Record<string, any>>("wrmax_clientes_editados", {});
    editados[clienteId] = { ...(editados[clienteId] || {}), ...campos };
    gravarJsonLocal("wrmax_clientes_editados", editados);
  }
  emitirEvento("wrmax:projeto_atualizado", { clienteId, dados: campos });
  return { sucesso: true, ...campos };
}

// Comprovante recebido por WhatsApp/e-mail e anexado pelo gestor.
export async function anexarComprovantePixGestor(clienteId: string, file: File) {
  const info = { nome: file.name, data: new Date().toISOString(), tamanho: file.size };

  if (exigirSupabaseOuDemo()) {
    const ext = extensaoSegura(file.name, ["pdf", "png", "jpg", "jpeg", "webp"]);
    if (!ext) throw new Error("Formato de arquivo não permitido.");
    const caminho = `${clienteId}/comprovante_pix_gestor_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("comprovantes-pix")
      .upload(caminho, file, file.type ? { contentType: file.type } : {});
    if (upErr) throw new Error(mensagemDeErro(upErr, "Falha no envio do comprovante."));
    const { error } = await supabase
      .from("clientes_onboarding")
      .update({
        comprovante_pix_path: montarRefStorage("comprovantes-pix", caminho),
        comprovante_pix_nome: file.name,
        comprovante_pix_enviado_em: info.data,
      })
      .eq("id", clienteId);
    if (error) throw new Error(mensagemDeErro(error, "Falha ao registrar o comprovante."));
    emitirEvento("wrmax:comprovante_pix_enviado", { identificador: clienteId, info });
    return { sucesso: true, info };
  }

  const infoDemo = { ...info, url: URL.createObjectURL(file) };
  gravarJsonLocal(`wrmax_comprovante_pix_${clienteId}`, infoDemo);
  emitirEvento("wrmax:comprovante_pix_enviado", { identificador: clienteId, info: infoDemo });
  return { sucesso: true, info: infoDemo };
}

export async function atualizarApresentacaoCliente(clienteId: string, file: File) {
  const nome = file.name;

  if (exigirSupabaseOuDemo()) {
    const caminho = `${clienteId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("apresentacoes-pdf")
      .upload(caminho, file, { contentType: "application/pdf" });
    if (uploadError) throw new Error(mensagemDeErro(uploadError, "Falha no envio da apresentação."));

    const ref = montarRefStorage("apresentacoes-pdf", caminho);
    const { error: dbError } = await supabase
      .from("clientes_onboarding")
      .update({ apresentacao_pdf_url: ref, apresentacao_pdf_nome: nome })
      .eq("id", clienteId);
    if (dbError) throw new Error(mensagemDeErro(dbError, "Falha ao vincular a apresentação ao cliente."));
    return { sucesso: true, url: ref, nome };
  }

  const url = URL.createObjectURL(file);
  const editados = lerJsonLocal<Record<string, any>>("wrmax_clientes_editados", {});
  editados[clienteId] = { ...(editados[clienteId] || {}), apresentacao_pdf_url: url, apresentacao_pdf_nome: nome };
  gravarJsonLocal("wrmax_clientes_editados", editados);
  return { sucesso: true, url, nome };
}

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAdminSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
