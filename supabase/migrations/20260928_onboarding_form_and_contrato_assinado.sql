-- ==============================================================================
-- MIGRATION: 20260928_onboarding_form_and_contrato_assinado.sql
-- Adiciona suporte a link de onboarding customizavel (Google Forms) e storage de contratos assinados
-- ==============================================================================

-- 1. Coluna de Link Google Forms na tabela de clientes
ALTER TABLE public.clientes_onboarding
ADD COLUMN IF NOT EXISTS link_onboarding_form TEXT;

-- 2. Bucket para armazenamento de contratos assinados
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-assinados', 'contratos-assinados', true)
ON CONFLICT (id) DO NOTHING;

-- Politica publica de leitura e escrita no bucket contratos-assinados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Contratos Assinados' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public Access Contratos Assinados" ON storage.objects
      FOR ALL USING (bucket_id = 'contratos-assinados');
  END IF;
END $$;

-- 3. Atualizacao da funcao validar_link_token para retornar link_onboarding_form
CREATE OR REPLACE FUNCTION public.validar_link_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_cliente RECORD;
  v_contrato RECORD;
  v_dados_cadastrais RECORD;
BEGIN
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token;

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('valido', FALSE, 'motivo', 'TOKEN_NOT_FOUND');
  END IF;

  IF v_link.bloqueado_manualmente THEN
    RETURN jsonb_build_object('valido', FALSE, 'motivo', 'MANUALLY_BLOCKED');
  END IF;

  IF NOW() > v_link.expira_em THEN
    RETURN jsonb_build_object('valido', FALSE, 'motivo', 'EXPIRED');
  END IF;

  UPDATE public.links_temporarios
  SET
    acessos_count = acessos_count + 1,
    ultimo_acesso_em = NOW()
  WHERE id = v_link.id;

  SELECT id, nome_completo, email, whatsapp, status, apresentacao_pdf_url, apresentacao_pdf_nome, link_onboarding_form
  INTO v_cliente
  FROM public.clientes_onboarding
  WHERE id = v_link.cliente_id;

  SELECT id, razao_social, nome_fantasia, cnpj, cidade, uf
  INTO v_dados_cadastrais
  FROM public.dados_cadastrais_cliente
  WHERE cliente_id = v_link.cliente_id;

  SELECT id, valor_mensal, dia_vencimento, status_envio, docx_storage_path, liberado_para_cliente, docx_assinado_storage_path
  INTO v_contrato
  FROM public.contratos
  WHERE cliente_id = v_link.cliente_id AND liberado_para_cliente = TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'valido', TRUE,
    'link', jsonb_build_object(
      'id', v_link.id,
      'expira_em', v_link.expira_em,
      'segundos_restantes', GREATEST(0, EXTRACT(EPOCH FROM (v_link.expira_em - NOW()))::INTEGER)
    ),
    'cliente', row_to_json(v_cliente),
    'cadastro_preenchido', (v_dados_cadastrais IS NOT NULL),
    'dados_cadastrais', row_to_json(v_dados_cadastrais),
    'contrato_liberado', (v_contrato IS NOT NULL),
    'contrato', row_to_json(v_contrato)
  );
END;
$$;
