-- ==============================================================================
-- MIGRATION: 20261007_seguranca_rls_storage.sql
-- DESCRICAO: Fecha o banco para o papel anon e restringe o painel a gestores.
--
--   1. Tabela public.gestores + funcao is_gestor(): so quem esta na tabela e gestor.
--   2. Politicas RLS: todas as permissivas sao removidas; tabelas so para gestor.
--   3. RPCs de gestor checam is_gestor(); emitir_e_enviar_contrato nao aceita
--      mais URL do navegador (o caminho do modelo vem do banco).
--   4. RPCs do cliente (anon) sempre validam o token: validar_link_token,
--      submeter_cadastro_cliente, registrar_comprovante_pix, registrar_contrato_assinado.
--   5. Storage: todos os buckets privados; gestor gerencia, cliente usa URL
--      assinada gerada no servidor (src/lib/arquivos-cliente.ts).
--   6. Permissoes: anon so executa as 4 RPCs do cliente.
--
-- ANTES DE RODAR EM PRODUCAO: revise a secao 1 (quem vira gestor).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. GESTORES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gestores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gestores ENABLE ROW LEVEL SECURITY;

-- Todos os usuarios ja cadastrados no Supabase Auth viram gestores.
-- Confira a lista depois de rodar:  SELECT * FROM public.gestores;
-- e remova quem nao deveria estar:   DELETE FROM public.gestores WHERE email = '...';
-- Para adicionar um gestor novo:     INSERT INTO public.gestores (user_id, email)
--                                    SELECT id, email FROM auth.users WHERE email = '...';
INSERT INTO public.gestores (user_id, email)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.gestores WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.exigir_gestor()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_gestor() THEN
    RAISE EXCEPTION 'ACESSO_NEGADO' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. COLUNAS NOVAS
-- ------------------------------------------------------------------------------
ALTER TABLE public.clientes_onboarding
  ADD COLUMN IF NOT EXISTS link_onboarding_form TEXT,
  ADD COLUMN IF NOT EXISTS pix_pago BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS comprovante_pix_path TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_pix_nome TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_pix_enviado_em TIMESTAMPTZ,
  -- antes ficava so no localStorage do navegador do gestor
  ADD COLUMN IF NOT EXISTS data_programacao TEXT;

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS docx_assinado_nome TEXT;

-- ------------------------------------------------------------------------------
-- 3. URLS PUBLICAS ANTIGAS -> REFERENCIA "bucket/caminho"
-- Com os buckets privados, a URL publica deixa de funcionar. O app passa a
-- guardar "bucket/caminho" e gerar URL assinada na hora de abrir.
-- ------------------------------------------------------------------------------
UPDATE public.clientes_onboarding
SET apresentacao_pdf_url = regexp_replace(apresentacao_pdf_url, '^https?://[^/]+/storage/v1/object/public/', '')
WHERE apresentacao_pdf_url ~ '^https?://[^/]+/storage/v1/object/public/';

UPDATE public.contratos
SET docx_storage_path = regexp_replace(docx_storage_path, '^https?://[^/]+/storage/v1/object/public/', '')
WHERE docx_storage_path ~ '^https?://[^/]+/storage/v1/object/public/';

UPDATE public.contratos
SET docx_assinado_storage_path = regexp_replace(docx_assinado_storage_path, '^https?://[^/]+/storage/v1/object/public/', '')
WHERE docx_assinado_storage_path ~ '^https?://[^/]+/storage/v1/object/public/';

-- ------------------------------------------------------------------------------
-- 4. RLS: REMOVE TODAS AS POLITICAS ANTIGAS E DEIXA SO O GESTOR
-- Politicas permissivas se combinam com OU: enquanto existir uma "USING (TRUE)"
-- para anon, nenhuma outra protege. Por isso todas sao removidas.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'clientes_onboarding', 'links_temporarios', 'dados_cadastrais_cliente',
        'modelos_contrato', 'contratos', 'gestores'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.clientes_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_temporarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_cadastrais_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor acesso total" ON public.clientes_onboarding
  FOR ALL TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());

CREATE POLICY "Gestor acesso total" ON public.links_temporarios
  FOR ALL TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());

CREATE POLICY "Gestor acesso total" ON public.dados_cadastrais_cliente
  FOR ALL TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());

CREATE POLICY "Gestor acesso total" ON public.modelos_contrato
  FOR ALL TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());

CREATE POLICY "Gestor acesso total" ON public.contratos
  FOR ALL TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());

-- public.gestores fica sem politica: so o SQL editor (postgres) e is_gestor() leem.

-- ------------------------------------------------------------------------------
-- 5. RPCS DO GESTOR (todas exigem is_gestor)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prorrogar_link(
  p_link_id UUID,
  p_minutos INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nova_expiracao TIMESTAMPTZ;
BEGIN
  PERFORM public.exigir_gestor();

  IF p_minutos IS NULL OR p_minutos <= 0 OR p_minutos > 43200 THEN
    RAISE EXCEPTION 'PRAZO_INVALIDO' USING ERRCODE = '22023';
  END IF;

  UPDATE public.links_temporarios
  SET
    expira_em = GREATEST(expira_em, NOW()) + (p_minutos || ' minutes')::INTERVAL,
    bloqueado_manualmente = FALSE,
    bloqueado_em = NULL
  WHERE id = p_link_id
  RETURNING expira_em INTO v_nova_expiracao;

  RETURN jsonb_build_object(
    'sucesso', v_nova_expiracao IS NOT NULL,
    'nova_expiracao', v_nova_expiracao
  );
END;
$$;

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
  PERFORM public.exigir_gestor();

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
    'sucesso', v_cliente_id IS NOT NULL,
    'bloqueado_em', NOW()
  );
END;
$$;

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
  PERFORM public.exigir_gestor();

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
    'sucesso', v_cliente_id IS NOT NULL,
    'desbloqueado_em', NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.excluir_link_temporario(
  p_link_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.exigir_gestor();

  DELETE FROM public.links_temporarios
  WHERE id = p_link_id;

  RETURN jsonb_build_object('sucesso', FOUND);
END;
$$;

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
  PERFORM public.exigir_gestor();

  UPDATE public.clientes_onboarding
  SET pix_pago = COALESCE(p_pago, FALSE),
      updated_at = NOW()
  WHERE id = p_cliente_id;

  RETURN jsonb_build_object(
    'sucesso', FOUND,
    'pix_pago', COALESCE(p_pago, FALSE)
  );
END;
$$;

-- A versao antiga recebia p_docx_url do navegador; agora o caminho do modelo
-- vem de modelos_contrato (ou do modelo padrao estatico do app).
DROP FUNCTION IF EXISTS public.emitir_e_enviar_contrato(UUID, UUID, NUMERIC, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.emitir_e_enviar_contrato(
  p_cliente_id UUID,
  p_modelo_id UUID,
  p_valor_mensal NUMERIC,
  p_dia_vencimento INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_docx_path TEXT;
  v_contrato RECORD;
BEGIN
  PERFORM public.exigir_gestor();

  IF p_valor_mensal IS NULL OR p_valor_mensal <= 0 THEN
    RAISE EXCEPTION 'VALOR_MENSAL_INVALIDO' USING ERRCODE = '22023';
  END IF;

  IF p_dia_vencimento IS NULL OR p_dia_vencimento NOT BETWEEN 1 AND 31 THEN
    RAISE EXCEPTION 'DIA_VENCIMENTO_INVALIDO' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clientes_onboarding WHERE id = p_cliente_id) THEN
    RAISE EXCEPTION 'CLIENTE_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF p_modelo_id IS NULL THEN
    v_docx_path := '/modelo_de_contratos/predefinidos/Contrato_WRMAX_Modelo_Parametrizado.docx';
  ELSE
    SELECT template_storage_path INTO v_docx_path
    FROM public.modelos_contrato
    WHERE id = p_modelo_id AND ativo;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'MODELO_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
    END IF;
  END IF;

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
    v_docx_path,
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

-- ------------------------------------------------------------------------------
-- 6. RPCS DO CLIENTE (anon) - sempre validam o token
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
    comprovante_pix_nome, comprovante_pix_enviado_em
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
      'segundos_restantes', GREATEST(0, EXTRACT(EPOCH FROM (v_link.expira_em - NOW()))::INTEGER)
    ),
    'cliente', row_to_json(v_cliente),
    'cadastro_preenchido', (v_dados_cadastrais.id IS NOT NULL),
    'dados_cadastrais', CASE WHEN v_dados_cadastrais.id IS NULL THEN NULL ELSE row_to_json(v_dados_cadastrais) END,
    'contrato_liberado', (v_contrato.id IS NOT NULL),
    'contrato', CASE WHEN v_contrato.id IS NULL THEN NULL ELSE row_to_json(v_contrato) END
  );
END;
$$;

-- O arquivo ja foi enviado ao bucket por URL de upload assinada (gerada no
-- servidor depois de validar o token). Aqui so registramos, conferindo que o
-- caminho pertence ao cliente do token e que o objeto existe.
CREATE OR REPLACE FUNCTION public.registrar_comprovante_pix(
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
BEGIN
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token
    AND NOT bloqueado_manualmente
    AND expira_em > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'LINK_INVALIDO_OU_EXPIRADO');
  END IF;

  IF p_path IS NULL
     OR left(p_path, 37) <> v_link.cliente_id::TEXT || '/'
     OR position('..' IN p_path) > 0 THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'ARQUIVO_INVALIDO');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'comprovantes-pix' AND name = p_path
  ) THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'ARQUIVO_NAO_ENCONTRADO');
  END IF;

  UPDATE public.clientes_onboarding
  SET comprovante_pix_path = 'comprovantes-pix/' || p_path,
      comprovante_pix_nome = left(COALESCE(NULLIF(p_nome, ''), 'comprovante'), 200),
      comprovante_pix_enviado_em = NOW()
  WHERE id = v_link.cliente_id;

  RETURN jsonb_build_object('sucesso', TRUE);
END;
$$;

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
  v_contrato_id UUID;
BEGIN
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token
    AND NOT bloqueado_manualmente
    AND expira_em > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'LINK_INVALIDO_OU_EXPIRADO');
  END IF;

  SELECT id INTO v_contrato_id
  FROM public.contratos
  WHERE cliente_id = v_link.cliente_id AND liberado_para_cliente = TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_contrato_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'CONTRATO_NAO_LIBERADO');
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
  WHERE id = v_contrato_id;

  UPDATE public.clientes_onboarding
  SET status = 'assinado'
  WHERE id = v_link.cliente_id;

  RETURN jsonb_build_object('sucesso', TRUE);
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. STORAGE: BUCKETS PRIVADOS, SO GESTOR ACESSA DIRETO
-- O cliente nunca acessa o storage com a chave anon: o servidor valida o token
-- e devolve URL assinada (download) ou URL de upload assinada.
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprovantes-pix',
  'comprovantes-pix',
  FALSE,
  15728640,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contratos-assinados',
  'contratos-assinados',
  FALSE,
  26214400,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = FALSE
WHERE id IN ('apresentacoes-pdf', 'contratos-docx', 'modelos-contrato');

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, ''))
          ~ '(apresentacoes-pdf|contratos-docx|modelos-contrato|contratos-assinados|comprovantes-pix)'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Gestor gerencia arquivos WRMax" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id IN ('apresentacoes-pdf', 'contratos-docx', 'modelos-contrato', 'contratos-assinados', 'comprovantes-pix')
    AND public.is_gestor()
  )
  WITH CHECK (
    bucket_id IN ('apresentacoes-pdf', 'contratos-docx', 'modelos-contrato', 'contratos-assinados', 'comprovantes-pix')
    AND public.is_gestor()
  );

-- ------------------------------------------------------------------------------
-- 8. PERMISSOES
-- Desfaz o GRANT ALL ... TO anon de 20260928_contrato_rpc_and_grants.sql.
-- Funcoes no Postgres sao executaveis por PUBLIC por padrao, por isso o
-- REVOKE tambem de PUBLIC; depois cada funcao e liberada explicitamente.
-- ------------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.gestores FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC;

-- Cliente (anon) - so as RPCs validadas por token
GRANT EXECUTE ON FUNCTION public.validar_link_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submeter_cadastro_cliente(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_comprovante_pix(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_contrato_assinado(TEXT, TEXT, TEXT) TO anon, authenticated;

-- Gestor (authenticated) - as funcoes checam is_gestor() por dentro
GRANT EXECUTE ON FUNCTION public.is_gestor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prorrogar_link(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bloquear_link(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desbloquear_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_link_temporario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_pix(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emitir_e_enviar_contrato(UUID, UUID, NUMERIC, INTEGER) TO authenticated;

-- O token do link e gerado por DEFAULT encode(gen_random_bytes(24), 'hex').
-- No Supabase o pgcrypto fica no schema extensions; se estiver em public,
-- o gestor precisa continuar podendo executa-lo ao criar links.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'gen_random_bytes'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.gen_random_bytes(INTEGER) TO authenticated';
  END IF;
END $$;
