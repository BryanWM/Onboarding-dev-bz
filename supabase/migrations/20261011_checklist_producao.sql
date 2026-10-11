-- ==============================================================================
-- MIGRATION: 20261011_checklist_producao.sql
-- DESCRICAO: Checklist da Producao (abas 6-9 / quadro kanban) salvo no banco,
--   compartilhado pela equipe. Antes ficava so no localStorage de cada navegador.
--   - Uma linha por item entregue: marcar = inserir, desmarcar = apagar.
--   - etapa = indice da etapa no playbook (stages-data.ts): 3 Boas-vindas,
--     4 3 dias uteis, 5 Estrategia, 6 Producao.
--   - item = texto do item no playbook (se o texto mudar, a marca antiga some).
--   - So gestor le/escreve (RLS com is_gestor()); anon nao tem acesso.
-- Requer 20261007_seguranca_rls_storage.sql (is_gestor). Pode ser reaplicada.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_producao (
  cliente_id UUID NOT NULL REFERENCES public.clientes_onboarding(id) ON DELETE CASCADE,
  etapa SMALLINT NOT NULL CHECK (etapa BETWEEN 0 AND 50),
  item TEXT NOT NULL CHECK (length(item) BETWEEN 1 AND 300),
  feito_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feito_por UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (cliente_id, etapa, item)
);

ALTER TABLE public.checklist_producao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestor acesso total" ON public.checklist_producao;
CREATE POLICY "Gestor acesso total" ON public.checklist_producao
  FOR ALL TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());

REVOKE ALL ON public.checklist_producao FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_producao TO authenticated;
