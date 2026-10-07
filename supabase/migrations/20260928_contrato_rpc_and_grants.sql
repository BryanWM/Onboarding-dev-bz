-- ==============================================================================
-- MIGRATION: 20260928_contrato_rpc_and_grants.sql
-- DESCRICAO: RPC emitir_e_enviar_contrato com SECURITY DEFINER, concessao de
-- permissoes no schema public e prevencao de erros 42501 (permissao negada).
-- ==============================================================================

-- 1. GARANTIR COLUNA pix_pago EM clientes_onboarding
ALTER TABLE IF EXISTS public.clientes_onboarding
  ADD COLUMN IF NOT EXISTS pix_pago BOOLEAN DEFAULT FALSE;

-- 2. GARANTIR PRIVILEGIOS DE ACESSO AO SCHEMA public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. POLITICAS RLS PERMISSIVAS PARA contratos E links_temporarios
ALTER TABLE IF EXISTS public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clientes_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.links_temporarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso irrestrito a contratos" ON public.contratos;
CREATE POLICY "Acesso irrestrito a contratos"
  ON public.contratos
  FOR ALL
  TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Acesso irrestrito a clientes_onboarding" ON public.clientes_onboarding;
CREATE POLICY "Acesso irrestrito a clientes_onboarding"
  ON public.clientes_onboarding
  FOR ALL
  TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Acesso irrestrito a links_temporarios" ON public.links_temporarios;
CREATE POLICY "Acesso irrestrito a links_temporarios"
  ON public.links_temporarios
  FOR ALL
  TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 4. RPC PARA EMISSAO E LIBERACAO DE CONTRATO (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.emitir_e_enviar_contrato(
  p_cliente_id UUID,
  p_modelo_id UUID,
  p_valor_mensal NUMERIC,
  p_dia_vencimento INTEGER,
  p_docx_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato RECORD;
BEGIN
  INSERT INTO public.contratos (
    cliente_id,
    modelo_id,
    valor_mensal,
    dia_vencimento,
    status_envio,
    liberado_para_cliente,
    docx_storage_path,
    enviado_ao_cliente_em
  )
  VALUES (
    p_cliente_id,
    p_modelo_id,
    p_valor_mensal,
    p_dia_vencimento,
    'enviado_ao_cliente',
    TRUE,
    p_docx_url,
    NOW()
  )
  RETURNING * INTO v_contrato;

  UPDATE public.clientes_onboarding
  SET status = 'contrato_enviado'
  WHERE id = p_cliente_id;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'contrato', row_to_json(v_contrato)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.emitir_e_enviar_contrato(UUID, UUID, NUMERIC, INTEGER, TEXT) TO anon, authenticated, service_role;

-- 5. ATUALIZACAO DA RPC validar_link_token PARA CARREGAR CONTRATO EMITIDO
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

  SELECT id, nome_completo, email, whatsapp, status, apresentacao_pdf_url, apresentacao_pdf_nome, pix_pago
  INTO v_cliente
  FROM public.clientes_onboarding
  WHERE id = v_link.cliente_id;

  SELECT *
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

GRANT EXECUTE ON FUNCTION public.validar_link_token(TEXT) TO anon, authenticated, service_role;
