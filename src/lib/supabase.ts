import { supabase, isSupabaseConfigured } from "./supabase-client";

export { isSupabaseConfigured, supabase } from "./supabase-client";
export { emitirEEnviarContrato, listarModelosContrato, criarModeloContrato } from "./contract-service";
export {
  validarLinkToken,
  type ValidacaoTokenResultado,
} from "./token-validation-service";
export {
  listarClientes,
  criarClienteComLink,
  atualizarProjeto,
  excluirProjeto,
} from "./project-service";

export async function submeterCadastroCliente(token: string, dados: Record<string, any>) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wrmax_cadastro_${token}`, JSON.stringify(dados));
      window.dispatchEvent(
        new CustomEvent("wrmax:cadastro_submetido", { detail: { token, dados } })
      );
    } catch {}
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc("submeter_cadastro_cliente", {
        p_token: token,
        p_dados: dados,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn("RPC submeter_cadastro_cliente com fallback defensivo:", err);
    }
  }

  return { sucesso: true, dados };
}

export async function enviarComprovantePix(identificador: string, file: File) {
  const info = {
    nome: file.name,
    data: new Date().toISOString(),
    tamanho: file.size,
    url: URL.createObjectURL(file),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wrmax_comprovante_pix_${identificador}`, JSON.stringify(info));
      window.dispatchEvent(
        new CustomEvent("wrmax:comprovante_pix_enviado", { detail: { identificador, info } })
      );
    } catch {}
  }

  return { sucesso: true, info };
}

export function obterComprovantePix(identificador?: string | null) {
  if (typeof window === "undefined" || !identificador) return null;
  try {
    const item = localStorage.getItem(`wrmax_comprovante_pix_${identificador}`);
    if (item) return JSON.parse(item);
  } catch {}
  return null;
}

export async function enviarContratoAssinado(
  identificador: string,
  file: File,
  ids?: { clienteId?: string; contratoId?: string; token?: string }
) {
  let fileUrl = "";
  try {
    fileUrl = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(URL.createObjectURL(file));
      r.readAsDataURL(file);
    });
  } catch {
    fileUrl = URL.createObjectURL(file);
  }

  const cliId = ids?.clienteId || (identificador.startsWith("cli-") ? identificador : null);

  if (isSupabaseConfigured) {
    try {
      const ext = file.name.split(".").pop();
      const fileName = `contrato_assinado_${cliId || identificador}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contratos-assinados").upload(fileName, file, { upsert: true });
      if (!upErr) {
        const { data: pubData } = supabase.storage.from("contratos-assinados").getPublicUrl(fileName);
        if (pubData?.publicUrl) fileUrl = pubData.publicUrl;
      }
      if (cliId) {
        await supabase.from("contratos").update({ docx_assinado_storage_path: fileUrl, status_envio: "assinado", assinado_em: new Date().toISOString() }).eq("cliente_id", cliId);
        await supabase.from("clientes_onboarding").update({ status: "assinado" }).eq("id", cliId);
      }
    } catch (err) {
      console.warn("Supabase upload/update de contrato assinado:", err);
    }
  }

  const info = { nome: file.name, data: new Date().toISOString(), tamanho: file.size, url: fileUrl };

  if (typeof window !== "undefined") {
    try {
      const allIds = Array.from(new Set([identificador, ids?.clienteId, ids?.contratoId, ids?.token].filter(Boolean))) as string[];
      allIds.forEach((id) => localStorage.setItem(`wrmax_contrato_assinado_${id}`, JSON.stringify(info)));
      if (cliId) {
        const editadosRaw = localStorage.getItem("wrmax_clientes_editados");
        const editados = editadosRaw ? JSON.parse(editadosRaw) : {};
        editados[cliId] = { ...(editados[cliId] || {}), status: "assinado", contrato_assinado: info };
        localStorage.setItem("wrmax_clientes_editados", JSON.stringify(editados));
      }
      window.dispatchEvent(new CustomEvent("wrmax:contrato_assinado_enviado", { detail: { identificador, clienteId: ids?.clienteId, info } }));
    } catch {}
  }
  return { sucesso: true, info };
}

export function obterContratoAssinado(identificador?: string | null) {
  if (typeof window === "undefined" || !identificador) return null;
  try {
    const item = localStorage.getItem(`wrmax_contrato_assinado_${identificador}`);
    if (item) return JSON.parse(item);
    const editadosRaw = localStorage.getItem("wrmax_clientes_editados");
    if (editadosRaw) {
      const editados = JSON.parse(editadosRaw);
      if (editados[identificador]?.contrato_assinado) return editados[identificador].contrato_assinado;
    }
  } catch {}
  return null;
}

export async function prorrogarLink(linkId: string, minutos: number) {
  if (!isSupabaseConfigured) return { sucesso: true };
  const { data, error } = await supabase.rpc("prorrogar_link", {
    p_link_id: linkId,
    p_minutos: minutos,
  });
  if (error) throw error;
  return data;
}

export async function bloquearLink(linkId: string, motivo = "Bloqueado pelo gestor") {
  if (!isSupabaseConfigured) return { sucesso: true };
  const { data, error } = await supabase.rpc("bloquear_link", {
    p_link_id: linkId,
    p_motivo: motivo,
  });
  if (error) throw error;
  return data;
}

export async function desbloquearLink(linkId: string) {
  if (!isSupabaseConfigured) return { sucesso: true };
  const { data, error } = await supabase.rpc("desbloquear_link", {
    p_link_id: linkId,
  });
  if (error) throw error;
  return data;
}

export async function excluirLinkTemporario(linkId: string) {
  if (!isSupabaseConfigured) return { sucesso: true };
  const { data, error } = await supabase.rpc("excluir_link_temporario", {
    p_link_id: linkId,
  });
  if (error) throw error;
  return data;
}

export async function atualizarStatusPix(clienteId: string, pago: boolean) {
  if (typeof window !== "undefined") {
    try {
      const editadosRaw = localStorage.getItem("wrmax_clientes_editados");
      const editados: Record<string, any> = editadosRaw ? JSON.parse(editadosRaw) : {};
      editados[clienteId] = { ...(editados[clienteId] || {}), pix_pago: pago };
      localStorage.setItem("wrmax_clientes_editados", JSON.stringify(editados));

      const locaisRaw = localStorage.getItem("wrmax_clientes_locais");
      if (locaisRaw) {
        const locais = JSON.parse(locaisRaw);
        const idx = locais.findIndex((c: any) => c.id === clienteId);
        if (idx >= 0) {
          locais[idx].pix_pago = pago;
          localStorage.setItem("wrmax_clientes_locais", JSON.stringify(locais));
        }
      }

      window.dispatchEvent(
        new CustomEvent("wrmax:pix_status_atualizado", { detail: { clienteId, pago } })
      );
      window.dispatchEvent(
        new CustomEvent("wrmax:projeto_atualizado", { detail: { clienteId, dados: { pix_pago: pago } } })
      );
    } catch {}
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc("atualizar_status_pix", {
        p_cliente_id: clienteId,
        p_pago: pago,
      });
      if (error) {
        console.warn("RPC atualizar_status_pix aviso defensivo:", error);
      }
      return data || { sucesso: true, pix_pago: pago };
    } catch (err) {
      console.warn("atualizarStatusPix erro capturado:", err);
    }
  }

  return { sucesso: true, pix_pago: pago };
}

export async function atualizarApresentacaoCliente(clienteId: string, file: File) {
  let url = "";
  const nome = file.name;

  if (isSupabaseConfigured) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("apresentacoes-pdf")
      .upload(fileName, file, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Erro no upload para apresentacoes-pdf:", uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from("apresentacoes-pdf")
      .getPublicUrl(fileName);

    url = publicUrlData.publicUrl;

    const { error: dbError } = await supabase
      .from("clientes_onboarding")
      .update({ apresentacao_pdf_url: url, apresentacao_pdf_nome: nome })
      .eq("id", clienteId);

    if (dbError) console.warn("Erro ao atualizar banco com apresentacao:", dbError);
  } else {
    url = URL.createObjectURL(file);
  }

  if (typeof window !== "undefined") {
    try {
      const editadosRaw = localStorage.getItem("wrmax_clientes_editados");
      const editados = editadosRaw ? JSON.parse(editadosRaw) : {};
      editados[clienteId] = { ...(editados[clienteId] || {}), apresentacao_pdf_url: url, apresentacao_pdf_nome: nome };
      localStorage.setItem("wrmax_clientes_editados", JSON.stringify(editados));
    } catch {}
  }

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
