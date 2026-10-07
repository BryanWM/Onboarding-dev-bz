-- ==============================================================================
-- PATCH SUPABASE WRMAX - PERMISSOES, STORAGE E DADOS CADASTRAIS
-- Data: 26/09/2026
-- Versao: 1.1.0
-- Autores: Quinta-feira, Arquiteto & Engenheiro
-- Embasamento: API Security in Action & Threat Modeling (Adam Shostack)
-- ==============================================================================

-- 1. PERMISSOES DE SCHEMA E TABELAS
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Gestor autenticado possui acesso total as tabelas operacionais
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- Permissoes de execucao das funcoes RPC seguras
GRANT EXECUTE ON FUNCTION public.validar_link_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submeter_cadastro_cliente(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prorrogar_link(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bloquear_link(UUID, TEXT) TO authenticated;

-- 2. FLEXIBILIZACAO DAS COLUNAS DE ENDERECO EM DADOS_CADASTRAIS_CLIENTE
-- Garante que cadastros enviados pelo cliente sem campos secundarios de endereco sejam aceitos
ALTER TABLE public.dados_cadastrais_cliente
  ALTER COLUMN cep DROP NOT NULL,
  ALTER COLUMN logradouro DROP NOT NULL,
  ALTER COLUMN numero DROP NOT NULL,
  ALTER COLUMN bairro DROP NOT NULL,
  ALTER COLUMN cidade DROP NOT NULL,
  ALTER COLUMN uf DROP NOT NULL;

-- 3. ATUALIZACAO DA FUNCAO validar_link_token COM CARGA COMPLETA DOS CAMPOS
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
  -- Busca o link correspondente
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token;

  -- Se nao existir, retorna invalido imediatamente
  IF v_link IS NULL THEN
    RETURN jsonb_build_object(
      'valido', FALSE,
      'motivo', 'TOKEN_NOT_FOUND'
    );
  END IF;

  -- Se foi bloqueado manualmente pelo Admin
  IF v_link.bloqueado_manualmente THEN
    RETURN jsonb_build_object(
      'valido', FALSE,
      'motivo', 'MANUALLY_BLOCKED'
    );
  END IF;

  -- Se expirou o prazo de 5 horas
  IF NOW() > v_link.expira_em THEN
    RETURN jsonb_build_object(
      'valido', FALSE,
      'motivo', 'EXPIRED'
    );
  END IF;

  -- Incrementa telemetria de acessos
  UPDATE public.links_temporarios
  SET
    acessos_count = acessos_count + 1,
    ultimo_acesso_em = NOW()
  WHERE id = v_link.id;

  -- Carrega dados do cliente vinculado
  SELECT id, nome_completo, email, whatsapp, status, apresentacao_pdf_url, apresentacao_pdf_nome
  INTO v_cliente
  FROM public.clientes_onboarding
  WHERE id = v_link.cliente_id;

  -- Carrega todos os campos dos dados cadastrais (SELECT *)
  SELECT *
  INTO v_dados_cadastrais
  FROM public.dados_cadastrais_cliente
  WHERE cliente_id = v_link.cliente_id;

  -- Carrega contrato se ja liberado pelo Admin
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

-- 4. BUCKETS DE STORAGE: TORNAR PUBLICOS PARA LEITURA DIRETA DO CLIENTE
UPDATE storage.buckets
SET public = TRUE
WHERE id IN ('apresentacoes-pdf', 'contratos-docx', 'modelos-contrato');

DROP POLICY IF EXISTS "Leitura publica de apresentacoes-pdf" ON storage.objects;
CREATE POLICY "Leitura publica de apresentacoes-pdf"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'apresentacoes-pdf');

DROP POLICY IF EXISTS "Leitura publica de contratos-docx" ON storage.objects;
CREATE POLICY "Leitura publica de contratos-docx"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'contratos-docx');

DROP POLICY IF EXISTS "Leitura publica de modelos-contrato" ON storage.objects;
CREATE POLICY "Leitura publica de modelos-contrato"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'modelos-contrato');

-- 5. SEED INICIAL DE MODELOS DOCX
INSERT INTO public.modelos_contrato (id, titulo, descricao, template_storage_path, ativo)
VALUES
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Contrato de Prestacao de Servicos Digitais WRMax (Padrao)',
    'Modelo padrao com clausulas gerais de gestao de trafego, social media, suporte mensal e SLA.',
    'modelos-contrato/contrato_padrao_wrmax.docx',
    TRUE
  ),
  (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'Contrato de Consultoria e Assessoria Tecnologica WRMax',
    'Modelo especifico para projetos com horas pre-fixadas e suporte consultivo especializado.',
    'modelos-contrato/contrato_consultoria_wrmax.docx',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;
