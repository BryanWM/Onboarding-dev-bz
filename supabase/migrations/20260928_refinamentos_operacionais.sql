-- ==============================================================================
-- PATCH SUPABASE WRMAX - REFINAMENTOS OPERACIONAIS E GESTAO DE LINKS
-- Data: 28/09/2026
-- Versao: 1.2.0
-- Autores: Quinta-feira, Arquiteto & Engenheiro
-- Embasamento: API Security in Action (Neil Madden) & Clean Code
-- ==============================================================================

-- 1. ADICIONAR COLUNA pix_pago EM clientes_onboarding (SE NAO EXISTIR)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes_onboarding'
      AND column_name = 'pix_pago'
  ) THEN
    ALTER TABLE public.clientes_onboarding ADD COLUMN pix_pago BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 2. FUNCAO RPC: ATUALIZAR STATUS DO PIX PELO GESTOR
CREATE OR REPLACE FUNCTION public.atualizar_status_pix(
  p_cliente_id UUID,
  p_pago BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes_onboarding
  SET pix_pago = p_pago,
      updated_at = NOW()
  WHERE id = p_cliente_id;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'pix_pago', p_pago
  );
END;
$$;

-- 3. FUNCAO RPC: BLOQUEAR LINK COM ATUALIZACAO DO STATUS DO CLIENTE
CREATE OR REPLACE FUNCTION public.bloquear_link(
  p_link_id UUID,
  p_motivo TEXT DEFAULT 'Bloqueado manualmente pelo administrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
BEGIN
  UPDATE public.links_temporarios
  SET
    bloqueado_manualmente = TRUE,
    bloqueado_em = NOW(),
    motivo_bloqueio = p_motivo,
    updated_at = NOW()
  WHERE id = p_link_id
  RETURNING cliente_id INTO v_cliente_id;

  IF v_cliente_id IS NOT NULL THEN
    UPDATE public.clientes_onboarding
    SET status = 'bloqueado',
        updated_at = NOW()
    WHERE id = v_cliente_id;
  END IF;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'bloqueado_em', NOW()
  );
END;
$$;

-- 4. FUNCAO RPC: DESBLOQUEAR LINK TEMPORARIO
CREATE OR REPLACE FUNCTION public.desbloquear_link(
  p_link_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
BEGIN
  UPDATE public.links_temporarios
  SET
    bloqueado_manualmente = FALSE,
    bloqueado_em = NULL,
    motivo_bloqueio = NULL,
    expira_em = GREATEST(expira_em, NOW() + INTERVAL '1 hour'),
    updated_at = NOW()
  WHERE id = p_link_id
  RETURNING cliente_id INTO v_cliente_id;

  IF v_cliente_id IS NOT NULL THEN
    UPDATE public.clientes_onboarding
    SET status = 'link_ativo',
        updated_at = NOW()
    WHERE id = v_cliente_id;
  END IF;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'desbloqueado_em', NOW()
  );
END;
$$;

-- 5. FUNCAO RPC: EXCLUIR LINK TEMPORARIO
CREATE OR REPLACE FUNCTION public.excluir_link_temporario(
  p_link_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.links_temporarios
  WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'sucesso', TRUE
  );
END;
$$;

-- 6. ATUALIZACAO DA FUNCAO validar_link_token PARA RETORNAR pix_pago
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

-- 7. CONCESSAO DE PRIVILEGIOS
GRANT EXECUTE ON FUNCTION public.atualizar_status_pix(UUID, BOOLEAN) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bloquear_link(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.desbloquear_link(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.excluir_link_temporario(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.validar_link_token(TEXT) TO authenticated, anon;
