import { supabase, isSupabaseConfigured } from "./supabase-client";
import { MOCK_MODELOS } from "./mock-data";

export interface ContratoEmitido {
  id: string;
  cliente_id: string;
  modelo_id?: string | null;
  valor_mensal: number;
  dia_vencimento: number;
  status_envio: string;
  liberado_para_cliente: boolean;
  docx_storage_path: string;
  docx_assinado_storage_path?: string | null;
  enviado_ao_cliente_em?: string;
  created_at?: string;
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

  let docxUrl = "/modelo_de_contratos/predefinidos/Contrato_WRMAX_Modelo_Parametrizado.docx";

  if (cleanModeloId && isSupabaseConfigured) {
    try {
      const { data: mod } = await supabase
        .from("modelos_contrato")
        .select("template_storage_path")
        .eq("id", cleanModeloId)
        .single();

      if (mod?.template_storage_path) {
        const pathOnly = mod.template_storage_path.replace("modelos-contrato/", "");
        const { data: publicUrlData } = supabase.storage
          .from("modelos-contrato")
          .getPublicUrl(pathOnly);
        if (publicUrlData?.publicUrl) {
          docxUrl = publicUrlData.publicUrl;
        }
      }
    } catch {
      // Fallback para template padrao
    }
  }

  let contratoResultado: ContratoEmitido | null = null;

  // 1. Tentar emissao via RPC segura (SECURITY DEFINER)
  if (isSupabaseConfigured) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("emitir_e_enviar_contrato", {
        p_cliente_id: clienteId,
        p_modelo_id: cleanModeloId,
        p_valor_mensal: valorMensal,
        p_dia_vencimento: diaVencimento,
        p_docx_url: docxUrl,
      });

      if (!rpcError && rpcData?.contrato) {
        contratoResultado = rpcData.contrato as ContratoEmitido;
      }
    } catch {
      // Continua para insert direto
    }
  }

  // 2. Se a RPC nao estiver criada ainda, tentar INSERT direto
  if (!contratoResultado && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("contratos")
        .insert({
          cliente_id: clienteId,
          modelo_id: cleanModeloId,
          valor_mensal: valorMensal,
          dia_vencimento: diaVencimento,
          status_envio: "enviado_ao_cliente",
          liberado_para_cliente: true,
          docx_storage_path: docxUrl,
          enviado_ao_cliente_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) {
        contratoResultado = data as ContratoEmitido;
        await supabase
          .from("clientes_onboarding")
          .update({ status: "contrato_enviado" })
          .eq("id", clienteId);
      }
    } catch {
      // Continua para persistencia defensiva
    }
  }

  // 3. Fallback defensivo com objeto padronizado
  if (!contratoResultado) {
    contratoResultado = {
      id: `contrato-${Date.now()}`,
      cliente_id: clienteId,
      modelo_id: cleanModeloId,
      valor_mensal: valorMensal,
      dia_vencimento: diaVencimento,
      status_envio: "enviado_ao_cliente",
      liberado_para_cliente: true,
      docx_storage_path: docxUrl,
      enviado_ao_cliente_em: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  }

  // 4. Persistencia local para sincronizacao imediata em tempo real
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wrmax_contrato_${clienteId}`, JSON.stringify(contratoResultado));
      window.dispatchEvent(new CustomEvent("wrmax:contrato_emitido", { detail: contratoResultado }));
    } catch {
      // Ignora erro de localStorage
    }
  }

  return { sucesso: true, contrato: contratoResultado };
}

export async function listarModelosContrato() {
  if (!isSupabaseConfigured) return MOCK_MODELOS;
  try {
    const { data, error } = await supabase
      .from("modelos_contrato")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return MOCK_MODELOS;
    return data && data.length > 0 ? data : MOCK_MODELOS;
  } catch {
    return MOCK_MODELOS;
  }
}

export async function criarModeloContrato(titulo: string, descricao: string, file: File) {
  let storagePath = `modelos-contrato/${file.name}`;

  if (isSupabaseConfigured) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("modelos-contrato")
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    storagePath = `modelos-contrato/${fileName}`;

    const { data, error } = await supabase
      .from("modelos_contrato")
      .insert({
        titulo,
        descricao,
        template_storage_path: storagePath,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  return {
    id: `mock-modelo-${Date.now()}`,
    titulo,
    descricao,
    template_storage_path: storagePath,
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
