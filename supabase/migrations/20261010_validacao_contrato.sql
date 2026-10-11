-- ==============================================================================
-- MIGRATION: 20261010_validacao_contrato.sql
-- DESCRICAO: O contrato so fecha quando o gestor valida a via assinada.
--   - contratos.validado_em: data em que o gestor validou a via (contrato fechado).
--   - registrar_contrato_assinado: a via enviada fica "aguardando validacao"
--     (status do cliente 'assinado'); recusa novo envio se ja foi validado.
--   - validar_contrato_assinado(contrato): gestor fecha o contrato (status 'concluido').
--   - remover_via_assinada(contrato): gestor apaga a via para o cliente reenviar.
--   - validar_link_token devolve validado_em (versao valida a partir daqui).
--   Producao = clientes com contrato fechado (validado). O Comercial continua
--   vendo todos, inclusive os fechados.
-- Requer 20261009_fluxo_comercial_producao.sql (colunas origem/docx_nome).
-- ==============================================================================

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ;

-- Contratos ja assinados antes desta migration contam como fechados
-- (no fluxo antigo a via assinada ja mandava o projeto para a Producao).
UPDATE public.contratos
SET validado_em = COALESCE(assinado_em, NOW())
WHERE validado_em IS NULL AND docx_assinado_storage_path IS NOT NULL;

UPDATE public.clientes_onboarding c
SET status = 'concluido'
WHERE c.status = 'assinado'
  AND EXISTS (SELECT 1 FROM public.contratos ct WHERE ct.cliente_id = c.id AND ct.validado_em IS NOT NULL);

CREATE OR REPLACE FUNCTION public.registrar_contrato_assinado(
  p_token TEXT,
  p_path TEXT,
  p_nome TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_contrato RECORD;
BEGIN
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token
    AND NOT bloqueado_manualmente
    AND expira_em > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'LINK_INVALIDO_OU_EXPIRADO');
  END IF;

  SELECT id, validado_em INTO v_contrato
  FROM public.contratos
  WHERE cliente_id = v_link.cliente_id AND liberado_para_cliente = TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_contrato.id IS NULL THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'CONTRATO_NAO_LIBERADO');
  END IF;

  IF v_contrato.validado_em IS NOT NULL THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'CONTRATO_JA_VALIDADO');
  END IF;

  IF p_path IS NULL
     OR left(p_path, 37) <> v_link.cliente_id::TEXT || '/'
     OR position('..' IN p_path) > 0 THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'ARQUIVO_INVALIDO');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'contratos-assinados' AND name = p_path
  ) THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'ARQUIVO_NAO_ENCONTRADO');
  END IF;

  UPDATE public.contratos
  SET docx_assinado_storage_path = 'contratos-assinados/' || p_path,
      docx_assinado_nome = left(COALESCE(NULLIF(p_nome, ''), 'contrato_assinado'), 200),
      status_envio = 'assinado',
      assinado_em = NOW()
  WHERE id = v_contrato.id;

  -- Via enviada, aguardando o gestor validar
  UPDATE public.clientes_onboarding
  SET status = 'assinado'
  WHERE id = v_link.cliente_id;

  RETURN jsonb_build_object('sucesso', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_contrato_assinado(p_contrato_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato RECORD;
BEGIN
  PERFORM public.exigir_gestor();

  SELECT * INTO v_contrato FROM public.contratos WHERE id = p_contrato_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRATO_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;
  IF v_contrato.docx_assinado_storage_path IS NULL THEN
    RAISE EXCEPTION 'VIA_ASSINADA_AUSENTE' USING ERRCODE = '22023';
  END IF;

  UPDATE public.contratos
  SET validado_em = COALESCE(validado_em, NOW())
  WHERE id = p_contrato_id
  RETURNING * INTO v_contrato;

  UPDATE public.clientes_onboarding
  SET status = 'concluido'
  WHERE id = v_contrato.cliente_id;

  RETURN jsonb_build_object('sucesso', TRUE, 'contrato', row_to_json(v_contrato));
END;
$$;

-- O arquivo no bucket e apagado pelo painel (storage API, politica de gestor);
-- aqui so limpamos o registro e devolvemos o contrato para "aguardando assinatura".
CREATE OR REPLACE FUNCTION public.remover_via_assinada(p_contrato_id UUID)
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
  SET docx_assinado_storage_path = NULL,
      docx_assinado_nome = NULL,
      assinado_em = NULL,
      validado_em = NULL,
      status_envio = 'enviado_ao_cliente'
  WHERE id = p_contrato_id
  RETURNING * INTO v_contrato;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRATO_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clientes_onboarding
  SET status = 'contrato_enviado'
  WHERE id = v_contrato.cliente_id;

  RETURN jsonb_build_object('sucesso', TRUE);
END;
$$;

-- validar_link_token (versao atual): igual a 20261009 + contrato.validado_em
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
    liberado_para_cliente, docx_assinado_storage_path, docx_assinado_nome, validado_em
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

REVOKE ALL ON FUNCTION public.validar_contrato_assinado(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_contrato_assinado(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.remover_via_assinada(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remover_via_assinada(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.validar_link_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_link_token(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_contrato_assinado(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_contrato_assinado(TEXT, TEXT, TEXT) TO anon, authenticated;
