-- ==============================================================================
-- SCHEMA SUPABASE WRMAX - ONBOARDING E GESTAO OPERACIONAL
-- Data: 26/09/2026
-- Versao: 1.0.0
-- Autores: Quinta-feira, Arquiteto & Engenheiro
-- Embasamento: API Security in Action (Neil Madden) & Threat Modeling (Adam Shostack)
-- ==============================================================================

-- 1. EXTENSOES NECESSARIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNCAO UTILITARIA PARA ATUALIZACAO AUTOMATICA DE TIMESTAMP
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. TABELA: CLIENTES_ONBOARDING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  status TEXT NOT NULL DEFAULT 'pendente_link' CHECK (
    status IN (
      'pendente_link',
      'link_ativo',
      'aguardando_cadastro',
      'cadastro_recebido',
      'contrato_gerado',
      'contrato_enviado',
      'assinado',
      'concluido',
      'expirado',
      'bloqueado'
    )
  ),
  apresentacao_pdf_url TEXT,
  apresentacao_pdf_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_clientes_onboarding_updated_at
  BEFORE UPDATE ON public.clientes_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. TABELA: LINKS_TEMPORARIOS (COM KILL-SWITCH E EXTENSAO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.links_temporarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes_onboarding(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 hours'),
  bloqueado_manualmente BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueado_em TIMESTAMPTZ,
  motivo_bloqueio TEXT,
  acessos_count INTEGER NOT NULL DEFAULT 0,
  ultimo_acesso_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_temporarios_token ON public.links_temporarios(token);
CREATE INDEX IF NOT EXISTS idx_links_temporarios_cliente ON public.links_temporarios(cliente_id);

CREATE TRIGGER trg_links_temporarios_updated_at
  BEFORE UPDATE ON public.links_temporarios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. TABELA: DADOS_CADASTRAIS_CLIENTE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dados_cadastrais_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL UNIQUE REFERENCES public.clientes_onboarding(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  cep TEXT NOT NULL,
  logradouro TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf VARCHAR(2) NOT NULL,
  representante_nome TEXT NOT NULL,
  representante_cpf TEXT NOT NULL,
  representante_rg TEXT,
  representante_profissao TEXT,
  representante_estado_civil TEXT,
  email_financeiro TEXT NOT NULL,
  telefone_financeiro TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_dados_cadastrais_updated_at
  BEFORE UPDATE ON public.dados_cadastrais_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. TABELA: MODELOS_CONTRATO (CATALOGO DOCX COM TAGS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modelos_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  template_storage_path TEXT NOT NULL,
  variaveis_tags JSONB NOT NULL DEFAULT '["{{RAZAO_SOCIAL}}", "{{CNPJ}}", "{{REPRESENTANTE_NOME}}", "{{REPRESENTANTE_CPF}}", "{{VALOR_MENSAL}}", "{{DIA_VENCIMENTO}}", "{{CIDADE}}", "{{UF}}"]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_modelos_contrato_updated_at
  BEFORE UPDATE ON public.modelos_contrato
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. TABELA: CONTRATOS (EMISSAO EXCLUSIVA DO ADMIN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes_onboarding(id) ON DELETE CASCADE,
  modelo_id UUID REFERENCES public.modelos_contrato(id) ON DELETE SET NULL,
  valor_mensal NUMERIC(12, 2) NOT NULL CHECK (valor_mensal >= 0),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  status_envio TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status_envio IN ('rascunho', 'gerado', 'enviado_ao_cliente', 'assinado')
  ),
  liberado_para_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  docx_storage_path TEXT,
  docx_assinado_storage_path TEXT,
  enviado_ao_cliente_em TIMESTAMPTZ,
  assinado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON public.contratos(cliente_id);

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. FUNCOES SEGURAS (RPC SECURITY DEFINER)
-- Embasamento: API Security in Action (Capitulo 3: Fine-Grained Access Control)
-- ------------------------------------------------------------------------------

-- 8.1 Validacao e telemetria de link por token (Fail Closed)
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

  -- Se nao existir, retorna invalido
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

  -- Se expirou o prazo (5 horas padrao ou extensao)
  IF NOW() > v_link.expira_em THEN
    RETURN jsonb_build_object(
      'valido', FALSE,
      'motivo', 'EXPIRED'
    );
  END IF;

  -- Incrementa contagem de acessos e registra ultimo acesso
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

  -- Carrega dados cadastrais se ja foram preenchidos
  SELECT id, razao_social, nome_fantasia, cnpj, cidade, uf
  INTO v_dados_cadastrais
  FROM public.dados_cadastrais_cliente
  WHERE cliente_id = v_link.cliente_id;

  -- Carrega contrato se ja foi liberado pelo Admin
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

-- 8.2 Submissao de cadastro pelo cliente com validacao de token
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
  v_cliente_id UUID;
  v_cadastro_id UUID;
BEGIN
  -- Valida link
  SELECT * INTO v_link
  FROM public.links_temporarios
  WHERE token = p_token
    AND NOT bloqueado_manualmente
    AND expira_em > NOW();

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'LINK_INVALIDO_OU_EXPIRADO');
  END IF;

  v_cliente_id := v_link.cliente_id;

  -- Insere ou atualiza dados cadastrais
  INSERT INTO public.dados_cadastrais_cliente (
    cliente_id,
    razao_social,
    nome_fantasia,
    cnpj,
    inscricao_estadual,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    representante_nome,
    representante_cpf,
    representante_rg,
    representante_profissao,
    representante_estado_civil,
    email_financeiro,
    telefone_financeiro
  )
  VALUES (
    v_cliente_id,
    p_dados->>'razao_social',
    p_dados->>'nome_fantasia',
    p_dados->>'cnpj',
    p_dados->>'inscricao_estadual',
    p_dados->>'cep',
    p_dados->>'logradouro',
    p_dados->>'numero',
    p_dados->>'complemento',
    p_dados->>'bairro',
    p_dados->>'cidade',
    p_dados->>'uf',
    p_dados->>'representante_nome',
    p_dados->>'representante_cpf',
    p_dados->>'representante_rg',
    p_dados->>'representante_profissao',
    p_dados->>'representante_estado_civil',
    p_dados->>'email_financeiro',
    p_dados->>'telefone_financeiro'
  )
  ON CONFLICT (cliente_id) DO UPDATE
  SET
    razao_social = EXCLUDED.razao_social,
    nome_fantasia = EXCLUDED.nome_fantasia,
    cnpj = EXCLUDED.cnpj,
    inscricao_estadual = EXCLUDED.inscricao_estadual,
    cep = EXCLUDED.cep,
    logradouro = EXCLUDED.logradouro,
    numero = EXCLUDED.numero,
    complemento = EXCLUDED.complemento,
    bairro = EXCLUDED.bairro,
    cidade = EXCLUDED.cidade,
    uf = EXCLUDED.uf,
    representante_nome = EXCLUDED.representante_nome,
    representante_cpf = EXCLUDED.representante_cpf,
    representante_rg = EXCLUDED.representante_rg,
    representante_profissao = EXCLUDED.representante_profissao,
    representante_estado_civil = EXCLUDED.representante_estado_civil,
    email_financeiro = EXCLUDED.email_financeiro,
    telefone_financeiro = EXCLUDED.telefone_financeiro,
    updated_at = NOW()
  RETURNING id INTO v_cadastro_id;

  -- Atualiza status do cliente
  UPDATE public.clientes_onboarding
  SET status = 'cadastro_recebido'
  WHERE id = v_cliente_id;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'cadastro_id', v_cadastro_id
  );
END;
$$;

-- 8.3 Prorrogar link temporario (Uso exclusivo do Admin)
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
  UPDATE public.links_temporarios
  SET
    expira_em = GREATEST(expira_em, NOW()) + (p_minutos || ' minutes')::INTERVAL,
    bloqueado_manualmente = FALSE,
    bloqueado_em = NULL
  WHERE id = p_link_id
  RETURNING expira_em INTO v_nova_expiracao;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'nova_expiracao', v_nova_expiracao
  );
END;
$$;

-- 8.4 Bloquear link temporario imediatamente (Kill-switch do Admin)
CREATE OR REPLACE FUNCTION public.bloquear_link(
  p_link_id UUID,
  p_motivo TEXT DEFAULT 'Bloqueado pelo administrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.links_temporarios
  SET
    bloqueado_manualmente = TRUE,
    bloqueado_em = NOW(),
    motivo_bloqueio = p_motivo
  WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'bloqueado_em', NOW()
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. POLITICAS DE SEGURANCA EM NIVEL DE LINHA (ROW LEVEL SECURITY - RLS)
-- Embasamento: Threat Modeling (Adam Shostack) & Writing Secure Code
-- ------------------------------------------------------------------------------

ALTER TABLE public.clientes_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_temporarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_cadastrais_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- 9.1 Politicas para Administradores Autenticados (Role authenticated)
CREATE POLICY "Admin tem acesso total em clientes_onboarding"
  ON public.clientes_onboarding
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Admin tem acesso total em links_temporarios"
  ON public.links_temporarios
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Admin tem acesso total em dados_cadastrais_cliente"
  ON public.dados_cadastrais_cliente
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Admin tem acesso total em modelos_contrato"
  ON public.modelos_contrato
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Admin tem acesso total em contratos"
  ON public.contratos
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 9.2 Politicas para Clientes Anonimos (Role anon)
-- O cliente anonimo so opera atraves das funcoes RPC SECURITY DEFINER (validar_link_token e submeter_cadastro_cliente)
-- Bloqueando leituras diretas abertas na tabela para garantir fail-closed
CREATE POLICY "Anonimo nao le clientes_onboarding diretamente"
  ON public.clientes_onboarding
  FOR SELECT
  TO anon
  USING (FALSE);

CREATE POLICY "Anonimo nao le links_temporarios diretamente"
  ON public.links_temporarios
  FOR SELECT
  TO anon
  USING (FALSE);

-- ------------------------------------------------------------------------------
-- 10. BUCKETS DE STORAGE E POLITICAS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('apresentacoes-pdf', 'apresentacoes-pdf', FALSE, 26214400, ARRAY['application/pdf']),
  ('contratos-docx', 'contratos-docx', FALSE, 26214400, ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf']),
  ('modelos-contrato', 'modelos-contrato', FALSE, 10485760, ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Politica de Storage: Administradores possuem controle total dos buckets
CREATE POLICY "Admin gerencia apresentacoes-pdf"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'apresentacoes-pdf')
  WITH CHECK (bucket_id = 'apresentacoes-pdf');

CREATE POLICY "Admin gerencia contratos-docx"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'contratos-docx')
  WITH CHECK (bucket_id = 'contratos-docx');

CREATE POLICY "Admin gerencia modelos-contrato"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'modelos-contrato')
  WITH CHECK (bucket_id = 'modelos-contrato');
