-- ==============================================================================
-- MIGRATION: 20260928_fix_apresentacoes_pdf_storage.sql
-- Garante bucket 'apresentacoes-pdf' publico e politicas completas de leitura/escrita
-- ==============================================================================

-- 1. Criar ou atualizar o bucket 'apresentacoes-pdf' como PUBLICO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'apresentacoes-pdf',
  'apresentacoes-pdf',
  TRUE,
  26214400,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. Politica de leitura publica (SELECT)
DROP POLICY IF EXISTS "Leitura publica de apresentacoes-pdf" ON storage.objects;
CREATE POLICY "Leitura publica de apresentacoes-pdf"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'apresentacoes-pdf');

-- 3. Politica de upload para apresentacoes-pdf (INSERT)
DROP POLICY IF EXISTS "Permitir upload de apresentacoes-pdf" ON storage.objects;
CREATE POLICY "Permitir upload de apresentacoes-pdf"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'apresentacoes-pdf');

-- 4. Politica de alteracao e remocao (UPDATE / DELETE)
DROP POLICY IF EXISTS "Permitir gestao de apresentacoes-pdf" ON storage.objects;
CREATE POLICY "Permitir gestao de apresentacoes-pdf"
  ON storage.objects FOR ALL
  USING (bucket_id = 'apresentacoes-pdf')
  WITH CHECK (bucket_id = 'apresentacoes-pdf');
