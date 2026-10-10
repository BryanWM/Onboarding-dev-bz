-- ==============================================================================
-- MIGRATION: 20261009_fluxo_comercial_producao.sql
-- DESCRICAO: Decisoes da equipe (out/2026).
--   1. Dados cadastrais unificados: CPF obrigatorio, CNPJ opcional.
--   2. Onboarding: a confirmacao do cliente libera 5 minutos depois que ele
--      ABRE o formulario (antes contava da criacao do link). Sem contador na tela.
--   3. Contrato anexado manualmente pelo gestor (origem 'manual'): fica oculto
--      para o cliente ate o gestor liberar.
--   4. validar_link_token passa a devolver onboarding_aberto_em e os campos
--      novos do contrato (esta e a versao valida a partir daqui).
--   Comercial x Producao nao precisa de coluna: o projeto vai para a Producao
--   quando o contrato liberado recebe a via assinada (status_envio = 'assinado').
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DADOS CADASTRAIS: CPF obrigatorio, CNPJ opcional
-- ------------------------------------------------------------------------------
ALTER TABLE public.dados_cadastrais_cliente
  ALTER COLUMN cnpj DROP NOT NULL,
  ALTER COLUMN telefone_financeiro DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.submeter_cadastro_cliente(
  p_token TEXT,
  p_dados JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_cadastro_id UUID;
  v_nome TEXT := NULLIF(btrim(p_dados->>'representante_nome'), '');
  v_cpf TEXT := regexp_replace(COALESCE(p_dados->>'representante_cpf', ''), '\D', '', 'g');
  v_cnpj TEXT := regexp_replace(COALESCE(p_dados->>'cnpj', ''), '\D', '', 'g');
  v_email TEXT := NULLIF(btrim(p_dados->>'email_financeiro'), '');
BEGIN
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token
    AND NOT bloqueado_manualmente
    AND expira_em > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'LINK_INVALIDO_OU_EXPIRADO');
  END IF;

  IF v_nome IS NULL OR v_email IS NULL THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'CADASTRO_INCOMPLETO');
  END IF;

  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'CPF_INVALIDO');
  END IF;

  IF v_cnpj <> '' AND length(v_cnpj) <> 14 THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'CNPJ_INVALIDO');
  END IF;

  INSERT INTO public.dados_cadastrais_cliente (
    cliente_id, razao_social, nome_fantasia, cnpj, logradouro,
    representante_nome, representante_cpf, email_financeiro, telefone_financeiro
  )
  VALUES (
    v_link.cliente_id,
    -- Sem empresa, o contratante e a propria pessoa
    COALESCE(NULLIF(btrim(p_dados->>'razao_social'), ''), v_nome),
    NULLIF(btrim(p_dados->>'nome_fantasia'), ''),
    NULLIF(btrim(p_dados->>'cnpj'), ''),
    NULLIF(btrim(p_dados->>'logradouro'), ''),
    v_nome,
    btrim(p_dados->>'representante_cpf'),
    v_email,
    NULLIF(btrim(p_dados->>'telefone_financeiro'), '')
  )
  ON CONFLICT (cliente_id) DO UPDATE
  SET
    razao_social = EXCLUDED.razao_social,
    nome_fantasia = EXCLUDED.nome_fantasia,
    cnpj = EXCLUDED.cnpj,
    logradouro = EXCLUDED.logradouro,
    representante_nome = EXCLUDED.representante_nome,
    representante_cpf = EXCLUDED.representante_cpf,
    email_financeiro = EXCLUDED.email_financeiro,
    telefone_financeiro = EXCLUDED.telefone_financeiro,
    updated_at = NOW()
  RETURNING id INTO v_cadastro_id;

  UPDATE public.clientes_onboarding
  SET status = 'cadastro_recebido'
  WHERE id = v_link.cliente_id
    AND status IN ('pendente_link', 'link_ativo', 'aguardando_cadastro');

  RETURN jsonb_build_object('sucesso', TRUE, 'cadastro_id', v_cadastro_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. ONBOARDING: libera 5 minutos depois que o cliente abre o formulario
-- ------------------------------------------------------------------------------
ALTER TABLE public.clientes_onboarding
  ADD COLUMN IF NOT EXISTS onboarding_aberto_em TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.registrar_abertura_onboarding(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_aberto_em TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token
    AND NOT bloqueado_manualmente
    AND expira_em > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'LINK_INVALIDO_OU_EXPIRADO');
  END IF;

  -- So a primeira abertura conta
  UPDATE public.clientes_onboarding
  SET onboarding_aberto_em = COALESCE(onboarding_aberto_em, NOW())
  WHERE id = v_link.cliente_id
  RETURNING onboarding_aberto_em INTO v_aberto_em;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'aberto_em', v_aberto_em,
    'segundos_para_confirmar',
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_aberto_em + INTERVAL '5 minutes' - NOW())))::INTEGER)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_onboarding_form(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_aberto_em TIMESTAMPTZ;
  v_confirmado_em TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token
    AND NOT bloqueado_manualmente
    AND expira_em > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'LINK_INVALIDO_OU_EXPIRADO');
  END IF;

  SELECT onboarding_aberto_em INTO v_aberto_em
  FROM public.clientes_onboarding
  WHERE id = v_link.cliente_id;

  IF v_aberto_em IS NULL THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'FORMULARIO_NAO_ABERTO');
  END IF;

  IF NOW() < v_aberto_em + INTERVAL '5 minutes' THEN
    RETURN jsonb_build_object(
      'sucesso', FALSE,
      'erro', 'CONFIRMACAO_AINDA_NAO_LIBERADA',
      'segundos_restantes', CEIL(EXTRACT(EPOCH FROM (v_aberto_em + INTERVAL '5 minutes' - NOW())))::INTEGER
    );
  END IF;

  UPDATE public.clientes_onboarding
  SET onboarding_confirmado_por = CASE WHEN onboarding_confirmado_em IS NULL THEN 'cliente' ELSE onboarding_confirmado_por END,
      onboarding_confirmado_em = COALESCE(onboarding_confirmado_em, NOW())
  WHERE id = v_link.cliente_id
  RETURNING onboarding_confirmado_em INTO v_confirmado_em;

  RETURN jsonb_build_object('sucesso', TRUE, 'confirmado_em', v_confirmado_em);
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. CONTRATO MANUAL (anexado pelo gestor, liberado depois)
-- ------------------------------------------------------------------------------
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'automatico',
  ADD COLUMN IF NOT EXISTS docx_nome TEXT,
  ALTER COLUMN valor_mensal DROP NOT NULL,
  ALTER COLUMN dia_vencimento DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contratos_origem_check') THEN
    ALTER TABLE public.contratos
      ADD CONSTRAINT contratos_origem_check CHECK (origem IN ('automatico', 'manual'));
  END IF;
END $$;

-- O arquivo ja foi enviado pelo gestor para contratos-docx/<cliente_id>/...
CREATE OR REPLACE FUNCTION public.anexar_contrato_manual(
  p_cliente_id UUID,
  p_path TEXT,
  p_nome TEXT,
  p_valor_mensal NUMERIC DEFAULT NULL,
  p_dia_vencimento INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato RECORD;
BEGIN
  PERFORM public.exigir_gestor();

  IF NOT EXISTS (SELECT 1 FROM public.clientes_onboarding WHERE id = p_cliente_id) THEN
    RAISE EXCEPTION 'CLIENTE_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF p_path IS NULL
     OR left(p_path, 37) <> p_cliente_id::TEXT || '/'
     OR position('..' IN p_path) > 0 THEN
    RAISE EXCEPTION 'ARQUIVO_INVALIDO' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'contratos-docx' AND name = p_path
  ) THEN
    RAISE EXCEPTION 'ARQUIVO_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF p_valor_mensal IS NOT NULL AND p_valor_mensal <= 0 THEN
    RAISE EXCEPTION 'VALOR_MENSAL_INVALIDO' USING ERRCODE = '22023';
  END IF;

  IF p_dia_vencimento IS NOT NULL AND p_dia_vencimento NOT BETWEEN 1 AND 31 THEN
    RAISE EXCEPTION 'DIA_VENCIMENTO_INVALIDO' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.contratos (
    cliente_id, origem, valor_mensal, dia_vencimento, status_envio,
    liberado_para_cliente, docx_storage_path, docx_nome
  )
  VALUES (
    p_cliente_id, 'manual', p_valor_mensal, p_dia_vencimento, 'gerado',
    FALSE, 'contratos-docx/' || p_path, left(COALESCE(NULLIF(p_nome, ''), 'contrato'), 200)
  )
  RETURNING * INTO v_contrato;

  RETURN jsonb_build_object('sucesso', TRUE, 'contrato', row_to_json(v_contrato));
END;
$$;

CREATE OR REPLACE FUNCTION public.liberar_contrato_cliente(p_contrato_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato RECORD;
BEGIN
  PERFORM public.exigir_gestor();

  UPDATE public.contratos
  SET liberado_para_cliente = TRUE,
      status_envio = CASE WHEN status_envio = 'assinado' THEN status_envio ELSE 'enviado_ao_cliente' END,
      enviado_ao_cliente_em = COALESCE(enviado_ao_cliente_em, NOW())
  WHERE id = p_contrato_id
  RETURNING * INTO v_contrato;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRATO_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clientes_onboarding
  SET status = 'contrato_enviado'
  WHERE id = v_contrato.cliente_id
    AND status NOT IN ('assinado', 'concluido');

  RETURN jsonb_build_object('sucesso', TRUE, 'contrato', row_to_json(v_contrato));
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. validar_link_token (versao atual)
-- ------------------------------------------------------------------------------
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

  IF NOT FOUND THEN
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

  SELECT
    id, nome_completo, email, whatsapp, status,
    apresentacao_pdf_url, apresentacao_pdf_nome, pix_pago, link_onboarding_form,
    comprovante_pix_nome, comprovante_pix_enviado_em,
    onboarding_aberto_em, onboarding_confirmado_em
  INTO v_cliente
  FROM public.clientes_onboarding
  WHERE id = v_link.cliente_id;

  SELECT *
  INTO v_dados_cadastrais
  FROM public.dados_cadastrais_cliente
  WHERE cliente_id = v_link.cliente_id;

  SELECT
    id, origem, valor_mensal, dia_vencimento, status_envio, docx_storage_path, docx_nome,
    liberado_para_cliente, docx_assinado_storage_path, docx_assinado_nome
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
      'segundos_restantes', GREATEST(0, EXTRACT(EPOCH FROM (v_link.expira_em - NOW()))::INTEGER),
      -- NULL enquanto o cliente nao abrir o formulario
      'segundos_para_confirmar_onboarding',
        CASE WHEN v_cliente.onboarding_aberto_em IS NULL THEN NULL
        ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_cliente.onboarding_aberto_em + INTERVAL '5 minutes' - NOW())))::INTEGER)
        END
    ),
    'cliente', row_to_json(v_cliente),
    'cadastro_preenchido', (v_dados_cadastrais.id IS NOT NULL),
    'dados_cadastrais', CASE WHEN v_dados_cadastrais.id IS NULL THEN NULL ELSE row_to_json(v_dados_cadastrais) END,
    'contrato_liberado', (v_contrato.id IS NOT NULL),
    'contrato', CASE WHEN v_contrato.id IS NULL THEN NULL ELSE row_to_json(v_contrato) END
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. PERMISSOES
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.registrar_abertura_onboarding(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_abertura_onboarding(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.anexar_contrato_manual(UUID, TEXT, TEXT, NUMERIC, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anexar_contrato_manual(UUID, TEXT, TEXT, NUMERIC, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.liberar_contrato_cliente(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_contrato_cliente(UUID) TO authenticated;

-- CREATE OR REPLACE mantem as permissoes; reforca as do cliente:
REVOKE ALL ON FUNCTION public.validar_link_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_link_token(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.submeter_cadastro_cliente(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submeter_cadastro_cliente(TEXT, JSONB) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.confirmar_onboarding_form(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_onboarding_form(TEXT) TO anon, authenticated;
