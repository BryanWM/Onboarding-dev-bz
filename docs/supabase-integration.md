# Guia de Integracao Supabase - Ecossistema WRMax

Data: 26/09/2026  
Versao: 1.0.0  
Embasamento Bibliografico:
- Neil Madden (*API Security in Action*, Capitulo 3: Fine-Grained Access Control)
- Adam Shostack (*Threat Modeling: Designing for Security*)
- Martin Fowler (*Refactoring: Improving the Design of Existing Code*)

---

## 1. Visao Geral da Arquitetura de Dados

O banco de dados e hospedado no Supabase (PostgreSQL 15+) e atende simultaneamente aos dois sistemas:
1. **Dashboard Admin (`dashboard-admin`, porta 8081):** Painel interno restrito a gestores autenticados.
2. **Central do Cliente (`central-cliente`, porta 8080):** Portal efemero acessado exclusivamente via link com token `/c/:token`.

### Tabelas Centrais

| Tabela | Finalidade | Responsavel pela Gravacao |
|---|---|---|
| `clientes_onboarding` | Cadastro mestre do cliente e status do ciclo de vida | Admin |
| `links_temporarios` | Tokens de acesso com validade de 5h e kill-switch manual | Admin |
| `dados_cadastrais_cliente` | Informacoes cadastrais e fiscais (CNPJ, endereco, representante) | Cliente via RPC |
| `modelos_contrato` | Catalogo de minutas DOCX com tags de substituicao | Admin |
| `contratos` | Minuta contratual com valores e vencimento definidos pelo Admin | Admin |

---

## 2. Seguranca e Controle de Acesso (RLS e RPC)

Seguindo o principio de **Fail-Closed** (*API Security in Action*):

### Politicas RLS (Row Level Security)
- Todas as tabelas possuem `ENABLE ROW LEVEL SECURITY`.
- Administradores autenticados (`authenticated`) possuem permissao total (`ALL`) em todas as entidades e nos buckets de Storage.
- Acessos anonimos (`anon`) possuem leitura bloqueada por padrao em tabelas cruciais (`clientes_onboarding`, `links_temporarios`, `dados_cadastrais_cliente`).

### Funcoes de Seguranca com Elevacao Controlada (SECURITY DEFINER)
Para permitir que o cliente anônimo opere de forma segura sem expor a base:
1. `validar_link_token(p_token TEXT)`:
   - Verifica existencia do token.
   - Valida se `bloqueado_manualmente = false`.
   - Valida se `expira_em > now()`.
   - Incrementa atomicamente o contador `acessos_count` e registra `ultimo_acesso_em`.
   - Retorna os dados sanitizados do cliente, status do cadastro e minuta liberada.
2. `submeter_cadastro_cliente(p_token TEXT, p_dados JSONB)`:
   - Valida a vigencia do link do cliente antes de gravar.
   - Insere ou atualiza os dados em `dados_cadastrais_cliente`.
   - Atualiza o status do cliente para `cadastro_recebido`.
3. `prorrogar_link(p_link_id UUID, p_minutos INTEGER)`:
   - Exclusivo do Admin: estende a validade do link e desbloqueia caso esteja bloqueado.
4. `bloquear_link(p_link_id UUID, p_motivo TEXT)`:
   - Exclusivo do Admin: kill-switch imediato revogando o token antes do tempo.

---

## 3. Buckets de Armazenamento (Storage)

| Bucket | Permissao | Tipos Permitidos | Limite |
|---|---|---|---|
| `apresentacoes-pdf` | Privado | `application/pdf` | 25 MB |
| `contratos-docx` | Privado | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf` | 25 MB |
| `modelos-contrato` | Privado | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 10 MB |

---

## 4. Passo a Passo para Aplicar no Supabase

1. Acesse o console do projeto no [Supabase](https://supabase.com/dashboard).
2. Abra a aba **SQL Editor**.
3. Copie o conteudo do arquivo `RELATORIOS/supabase_schema.sql` (ou `supabase/migrations/20260926_init_wrmax_schema.sql`).
4. Execute o script (`Run`).
5. Copie as chaves em **Project Settings > API**:
   - `Project URL`
   - `anon public` key
6. Crie o arquivo `.env.local` na raiz de `dashboard-admin` e `central-cliente`:
   ```bash
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```
7. No Supabase Dashboard, crie o primeiro usuario gestor em **Authentication > Users** (ex: `admin@wrmax.com.br`) para acessar o painel em `localhost:8081/login`.
