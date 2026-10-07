import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase-client";

// Todos os buckets sao privados (migration 20261007_seguranca_rls_storage.sql).
// No banco guardamos "bucket/caminho"; a URL de acesso e assinada na hora.
export const BUCKETS_PRIVADOS = [
  "apresentacoes-pdf",
  "contratos-docx",
  "modelos-contrato",
  "contratos-assinados",
  "comprovantes-pix",
] as const;

export type BucketPrivado = (typeof BUCKETS_PRIVADOS)[number];

export const VALIDADE_URL_ASSINADA_SEGUNDOS = 60 * 60;

const PREFIXO_URL_PUBLICA = /^https?:\/\/[^/]+\/storage\/v1\/object\/public\//;

export function montarRefStorage(bucket: BucketPrivado, caminho: string): string {
  return `${bucket}/${caminho}`;
}

// Aceita "bucket/caminho" e tambem URLs publicas antigas do Supabase.
// Qualquer outra coisa (arquivo estatico do app, data:, blob:, URL externa)
// nao e do storage privado e devolve null.
export function parseRefStorage(
  valor: string | null | undefined
): { bucket: BucketPrivado; caminho: string } | null {
  if (!valor) return null;
  const semPrefixo = valor.replace(PREFIXO_URL_PUBLICA, "");
  if (/^(https?:|data:|blob:|\/)/.test(semPrefixo)) return null;
  const barra = semPrefixo.indexOf("/");
  if (barra <= 0) return null;
  const bucket = semPrefixo.slice(0, barra);
  const caminho = semPrefixo.slice(barra + 1);
  if (!caminho || !(BUCKETS_PRIVADOS as readonly string[]).includes(bucket)) return null;
  return { bucket: bucket as BucketPrivado, caminho };
}

// Uso do gestor (sessao autenticada): a politica de storage so libera gestores.
export async function obterUrlArquivoGestor(valor: string | null | undefined): Promise<string | null> {
  if (!valor) return null;
  const ref = parseRefStorage(valor);
  if (!ref) return valor;
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.caminho, VALIDADE_URL_ASSINADA_SEGUNDOS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function useUrlArquivoGestor(valor: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (parseRefStorage(valor) ? null : valor || null));

  useEffect(() => {
    let ativo = true;
    if (!parseRefStorage(valor)) {
      setUrl(valor || null);
      return;
    }
    setUrl(null);
    obterUrlArquivoGestor(valor).then((u) => {
      if (ativo) setUrl(u);
    });
    return () => {
      ativo = false;
    };
  }, [valor]);

  return url;
}

export function extensaoSegura(nomeArquivo: string, permitidas: string[]): string | null {
  const ext = nomeArquivo.split(".").pop()?.toLowerCase() || "";
  return permitidas.includes(ext) ? ext : null;
}
