import { supabase, isSupabaseConfigured, isModoDemo } from "./supabase-client";
import { MOCK_MODELOS } from "./mock-data";
import { montarRefStorage, extensaoSegura } from "./storage-refs";
import { mensagemDeErro } from "./erros";

export interface ContratoEmitido {
  id: string;
  cliente_id: string;
  modelo_id?: string | null;
  origem?: "automatico" | "manual";
  valor_mensal: number | null;
  dia_vencimento: number | null;
  status_envio: string;
  liberado_para_cliente: boolean;
  docx_storage_path: string;
  docx_nome?: string | null;
  docx_assinado_storage_path?: string | null;
  enviado_ao_cliente_em?: string;
  created_at?: string;
}

const MODELO_PADRAO_ESTATICO = "/modelo_de_contratos/predefinidos/Contrato_WRMAX_Modelo_Parametrizado.docx";

function exigirSupabaseOuDemo(): boolean {
  if (isSupabaseConfigured) return true;
  if (isModoDemo) return false;
  throw new Error("SUPABASE_NAO_CONFIGURADO");
}

export async function emitirEEnviarContrato(
  clienteId: string,
  modeloId: string | null,
  valorMensal: number,
  diaVencimento: number
) {
  const isUuid = Boolean(
    modeloId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(modeloId)
  );
  const cleanModeloId = isUuid ? modeloId : null;

  if (exigirSupabaseOuDemo()) {
    // O caminho do modelo e resolvido no banco a partir de p_modelo_id.
    const { data, error } = await supabase.rpc("emitir_e_enviar_contrato", {
      p_cliente_id: clienteId,
      p_modelo_id: cleanModeloId,
      p_valor_mensal: valorMensal,
      p_dia_vencimento: diaVencimento,
    });
    const contrato = (data as { contrato?: ContratoEmitido } | null)?.contrato;
    if (error || !contrato) throw new Error(mensagemDeErro(error, "Não foi possível emitir o contrato."));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wrmax:contrato_emitido", { detail: contrato }));
    }
    return { sucesso: true, contrato };
  }

  const contratoDemo: ContratoEmitido = {
    id: `contrato-${Date.now()}`,
    cliente_id: clienteId,
    modelo_id: cleanModeloId,
    valor_mensal: valorMensal,
    dia_vencimento: diaVencimento,
    status_envio: "enviado_ao_cliente",
    liberado_para_cliente: true,
    docx_storage_path: MODELO_PADRAO_ESTATICO,
    enviado_ao_cliente_em: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wrmax_contrato_${clienteId}`, JSON.stringify(contratoDemo));
      window.dispatchEvent(new CustomEvent("wrmax:contrato_emitido", { detail: contratoDemo }));
    } catch {}
  }
  return { sucesso: true, contrato: contratoDemo };
}

// Contrato editado fora do fluxo padrao: o gestor anexa o arquivo pronto e ele
// fica oculto para o cliente ate liberarContratoCliente.
export async function anexarContratoManual(
  clienteId: string,
  file: File,
  valorMensal: number | null = null,
  diaVencimento: number | null = null
) {
  const ext = extensaoSegura(file.name, ["pdf", "docx"]);
  if (!ext) throw new Error("Envie o contrato em PDF ou DOCX.");
  if (file.size > 25 * 1024 * 1024) throw new Error("O arquivo excede o limite de 25MB.");

  if (exigirSupabaseOuDemo()) {
    const caminho = `${clienteId}/contrato_manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("contratos-docx")
      .upload(caminho, file, file.type ? { contentType: file.type } : {});
    if (upErr) throw new Error(mensagemDeErro(upErr, "Falha no envio do contrato."));

    const { data, error } = await supabase.rpc("anexar_contrato_manual", {
      p_cliente_id: clienteId,
      p_path: caminho,
      p_nome: file.name,
      p_valor_mensal: valorMensal,
      p_dia_vencimento: diaVencimento,
    });
    const contrato = (data as { contrato?: ContratoEmitido } | null)?.contrato;
    if (error || !contrato) throw new Error(mensagemDeErro(error, "Não foi possível anexar o contrato."));
    return { sucesso: true, contrato };
  }

  const contratoDemo: ContratoEmitido = {
    id: `contrato-manual-${Date.now()}`,
    cliente_id: clienteId,
    origem: "manual",
    valor_mensal: valorMensal,
    dia_vencimento: diaVencimento,
    status_envio: "gerado",
    liberado_para_cliente: false,
    docx_storage_path: URL.createObjectURL(file),
    docx_nome: file.name,
    created_at: new Date().toISOString(),
  };
  return { sucesso: true, contrato: contratoDemo };
}

export async function liberarContratoCliente(contratoId: string) {
  if (exigirSupabaseOuDemo()) {
    const { data, error } = await supabase.rpc("liberar_contrato_cliente", { p_contrato_id: contratoId });
    const contrato = (data as { contrato?: ContratoEmitido } | null)?.contrato;
    if (error || !contrato) throw new Error(mensagemDeErro(error, "Não foi possível liberar o contrato."));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wrmax:contrato_emitido", { detail: contrato }));
    }
    return { sucesso: true, contrato };
  }
  return { sucesso: true };
}

export async function listarModelosContrato() {
  if (!exigirSupabaseOuDemo()) return MOCK_MODELOS;
  const { data, error } = await supabase
    .from("modelos_contrato")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(mensagemDeErro(error, "Não foi possível carregar os modelos de contrato."));
  return data || [];
}

export async function criarModeloContrato(titulo: string, descricao: string, file: File) {
  if (exigirSupabaseOuDemo()) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("modelos-contrato")
      .upload(fileName, file);
    if (uploadError) throw new Error(mensagemDeErro(uploadError, "Falha no envio do modelo."));

    const { data, error } = await supabase
      .from("modelos_contrato")
      .insert({
        titulo,
        descricao,
        template_storage_path: montarRefStorage("modelos-contrato", fileName),
      })
      .select()
      .single();
    if (error) throw new Error(mensagemDeErro(error, "Falha ao cadastrar o modelo."));
    return data;
  }

  return {
    id: `mock-modelo-${Date.now()}`,
    titulo,
    descricao,
    template_storage_path: `modelos-contrato/${file.name}`,
    variaveis_tags: [
      "{{RAZAO_SOCIAL}}",
      "{{CNPJ}}",
      "{{REPRESENTANTE_NOME}}",
      "{{VALOR_MENSAL}}",
      "{{DIA_VENCIMENTO}}",
    ],
    ativo: true,
    created_at: new Date().toISOString(),
  };
}
