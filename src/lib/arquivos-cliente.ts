import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../types/database.types";
import {
  parseRefStorage,
  extensaoSegura,
  VALIDADE_URL_ASSINADA_SEGUNDOS,
  type BucketPrivado,
} from "./storage-refs";

// O cliente da jornada /c/:token nao tem login. Com os buckets privados, ele so
// acessa arquivos por estas server functions, que rodam no servidor com a
// service_role, validam o token e assinam apenas os arquivos daquele cliente.
// SUPABASE_SERVICE_ROLE_KEY e variavel de servidor: nunca use prefixo VITE_.

function clienteServidor() {
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  const chave = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !chave) {
    throw new Error("ARMAZENAMENTO_NAO_CONFIGURADO");
  }
  return createClient<Database>(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type ClienteServidor = ReturnType<typeof clienteServidor>;

async function carregarLinkValido(admin: ClienteServidor, token: string) {
  const { data: link, error } = await admin
    .from("links_temporarios")
    .select("cliente_id, expira_em, bloqueado_manualmente")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error("FALHA_AO_VALIDAR_LINK");
  if (!link || link.bloqueado_manualmente || new Date(link.expira_em).getTime() <= Date.now()) {
    return null;
  }
  return link;
}

async function contratoLiberado(admin: ClienteServidor, clienteId: string) {
  const { data } = await admin
    .from("contratos")
    .select("docx_storage_path, docx_assinado_storage_path")
    .eq("cliente_id", clienteId)
    .eq("liberado_para_cliente", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function assinar(admin: ClienteServidor, valor: string | null | undefined) {
  if (!valor) return null;
  const ref = parseRefStorage(valor);
  if (!ref) return valor;
  const { data, error } = await admin.storage
    .from(ref.bucket)
    .createSignedUrl(ref.caminho, VALIDADE_URL_ASSINADA_SEGUNDOS);
  return error ? null : data.signedUrl;
}

const tokenSchema = z.object({ token: z.string().min(1).max(200) });

export interface ArquivosCliente {
  valido: boolean;
  apresentacao: string | null;
  contratoModelo: string | null;
  contratoAssinado: string | null;
}

export const obterArquivosCliente = createServerFn({ method: "POST" })
  .inputValidator((dados: unknown) => tokenSchema.parse(dados))
  .handler(async ({ data }): Promise<ArquivosCliente> => {
    const admin = clienteServidor();
    const link = await carregarLinkValido(admin, data.token);
    if (!link) {
      return { valido: false, apresentacao: null, contratoModelo: null, contratoAssinado: null };
    }

    const { data: cliente } = await admin
      .from("clientes_onboarding")
      .select("apresentacao_pdf_url")
      .eq("id", link.cliente_id)
      .single();
    const contrato = await contratoLiberado(admin, link.cliente_id);

    const [apresentacao, contratoModelo, contratoAssinado] = await Promise.all([
      assinar(admin, cliente?.apresentacao_pdf_url),
      assinar(admin, contrato?.docx_storage_path),
      assinar(admin, contrato?.docx_assinado_storage_path),
    ]);

    return { valido: true, apresentacao, contratoModelo, contratoAssinado };
  });

const TIPOS_UPLOAD = {
  comprovante_pix: {
    bucket: "comprovantes-pix" as BucketPrivado,
    extensoes: ["pdf", "png", "jpg", "jpeg", "webp"],
    tamanhoMaximo: 15 * 1024 * 1024,
  },
  contrato_assinado: {
    bucket: "contratos-assinados" as BucketPrivado,
    extensoes: ["pdf", "docx"],
    tamanhoMaximo: 25 * 1024 * 1024,
  },
} as const;

export type TipoUploadCliente = keyof typeof TIPOS_UPLOAD;

const uploadSchema = z.object({
  token: z.string().min(1).max(200),
  tipo: z.enum(["comprovante_pix", "contrato_assinado"]),
  nomeArquivo: z.string().min(1).max(255),
  tamanho: z.number().int().positive(),
});

export const prepararUploadCliente = createServerFn({ method: "POST" })
  .inputValidator((dados: unknown) => uploadSchema.parse(dados))
  .handler(async ({ data }) => {
    const regra = TIPOS_UPLOAD[data.tipo];
    if (data.tamanho > regra.tamanhoMaximo) throw new Error("ARQUIVO_MUITO_GRANDE");
    const ext = extensaoSegura(data.nomeArquivo, [...regra.extensoes]);
    if (!ext) throw new Error("TIPO_DE_ARQUIVO_NAO_PERMITIDO");

    const admin = clienteServidor();
    const link = await carregarLinkValido(admin, data.token);
    if (!link) throw new Error("LINK_INVALIDO_OU_EXPIRADO");

    if (data.tipo === "contrato_assinado" && !(await contratoLiberado(admin, link.cliente_id))) {
      throw new Error("CONTRATO_NAO_LIBERADO");
    }

    const aleatorio = Math.random().toString(36).slice(2, 10);
    const caminho = `${link.cliente_id}/${data.tipo}_${Date.now()}_${aleatorio}.${ext}`;
    const { data: upload, error } = await admin.storage
      .from(regra.bucket)
      .createSignedUploadUrl(caminho);
    if (error || !upload) throw new Error("FALHA_AO_PREPARAR_UPLOAD");

    return { bucket: regra.bucket, caminho, tokenUpload: upload.token };
  });
