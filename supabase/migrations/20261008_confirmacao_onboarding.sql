-- ==============================================================================
-- MIGRATION: 20261008_confirmacao_onboarding.sql
-- DESCRICAO: Confirmacao do cliente de que preencheu o Google Forms (slot 03).
--   - Colunas clientes_onboarding.onboarding_confirmado_em / _por.
--   - RPC confirmar_onboarding_form(p_token): so libera 5 minutos depois da
--     criacao do link (regra aplicada no banco, nao so na tela).
--   - O gestor tambem pode marcar/desmarcar pela aba "3. Onboard" do painel
--     (update direto na tabela, permitido pela politica de gestor).
--   - validar_link_token devolve quanto falta para liberar e a confirmacao.
-- ==============================================================================

ALTER TABLE public.clientes_onboarding
  ADD COLUMN IF NOT EXISTS onboarding_confirmado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_confirmado_por TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_onboarding_onboarding_confirmado_por_check'
  ) THEN
    ALTER TABLE public.clientes_onboarding
      ADD CONSTRAINT clientes_onboarding_onboarding_confirmado_por_check
      CHECK (onboarding_confirmado_por IS NULL OR onboarding_confirmado_por IN ('cliente', 'gestor'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.confirmar_onboarding_form(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
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

  IF NOW() < v_link.created_at + INTERVAL '5 minutes' THEN
    RETURN jsonb_build_object(
      'sucesso', FALSE,
      'erro', 'CONFIRMACAO_AINDA_NAO_LIBERADA',
      'segundos_restantes', CEIL(EXTRACT(EPOCH FROM (v_link.created_at + INTERVAL '5 minutes' - NOW())))::INTEGER
    );
  END IF;

  -- Confirmar de novo nao muda a data (nem o autor) da primeira confirmacao.
  UPDATE public.clientes_onboarding
  SET onboarding_confirmado_por = CASE WHEN onboarding_confirmado_em IS NULL THEN 'cliente' ELSE onboarding_confirmado_por END,
      onboarding_confirmado_em = COALESCE(onboarding_confirmado_em, NOW())
  WHERE id = v_link.cliente_id
  RETURNING onboarding_confirmado_em INTO v_confirmado_em;

  RETURN jsonb_build_object('sucesso', TRUE, 'confirmado_em', v_confirmado_em);
END;
$$;

-- Mesma versao de 20261007_seguranca_rls_storage.sql, com:
--   link.segundos_para_confirmar_onboarding e cliente.onboarding_confirmado_em
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
    comprovante_pix_nome, comprovante_pix_enviado_em, onboarding_confirmado_em
  INTO v_cliente
  FROM public.clientes_onboarding
  WHERE id = v_link.cliente_id;

  SELECT *
  INTO v_dados_cadastrais
  FROM public.dados_cadastrais_cliente
  WHERE cliente_id = v_link.cliente_id;

  SELECT
    id, valor_mensal, dia_vencimento, status_envio, docx_storage_path,
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
      'segundos_para_confirmar_onboarding',
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_link.created_at + INTERVAL '5 minutes' - NOW())))::INTEGER)
    ),
    'cliente', row_to_json(v_cliente),
    'cadastro_preenchido', (v_dados_cadastrais.id IS NOT NULL),
    'dados_cadastrais', CASE WHEN v_dados_cadastrais.id IS NULL THEN NULL ELSE row_to_json(v_dados_cadastrais) END,
    'contrato_liberado', (v_contrato.id IS NOT NULL),
    'contrato', CASE WHEN v_contrato.id IS NULL THEN NULL ELSE row_to_json(v_contrato) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_onboarding_form(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_onboarding_form(TEXT) TO anon, authenticated;

-- CREATE OR REPLACE mantem as permissoes, mas reforca o que se espera:
REVOKE ALL ON FUNCTION public.validar_link_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_link_token(TEXT) TO anon, authenticated;
