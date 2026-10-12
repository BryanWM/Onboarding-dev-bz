-- ==============================================================================
-- MIGRATION: 20261012_cep_cadastro.sql
-- DESCRICAO: CEP obrigatorio nos dados cadastrais (pessoa fisica e juridica),
--   para preencher a tag {{CEP}} do contrato.
--   - submeter_cadastro_cliente passa a gravar o CEP (formato 00000-000) e
--     recusa CEP sem 8 numeros (CEP_INVALIDO). Esta e a versao valida a partir daqui.
--   - A coluna dados_cadastrais_cliente.cep ja existe (nullable desde 20260927):
--     cadastros antigos continuam validos sem CEP.
-- Requer 20261009_fluxo_comercial_producao.sql. Pode ser reaplicada.
-- ==============================================================================

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
  v_cep TEXT := regexp_replace(COALESCE(p_dados->>'cep', ''), '\D', '', 'g');
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

  IF length(v_cep) <> 8 THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'CEP_INVALIDO');
  END IF;

  INSERT INTO public.dados_cadastrais_cliente (
    cliente_id, razao_social, nome_fantasia, cnpj, logradouro, cep,
    representante_nome, representante_cpf, email_financeiro, telefone_financeiro
  )
  VALUES (
    v_link.cliente_id,
    -- Sem empresa, o contratante e a propria pessoa
    COALESCE(NULLIF(btrim(p_dados->>'razao_social'), ''), v_nome),
    NULLIF(btrim(p_dados->>'nome_fantasia'), ''),
    NULLIF(btrim(p_dados->>'cnpj'), ''),
    NULLIF(btrim(p_dados->>'logradouro'), ''),
    substr(v_cep, 1, 5) || '-' || substr(v_cep, 6, 3),
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
    cep = EXCLUDED.cep,
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

REVOKE ALL ON FUNCTION public.submeter_cadastro_cliente(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submeter_cadastro_cliente(TEXT, JSONB) TO anon, authenticated;
