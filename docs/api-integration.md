# Documentacao Tecnica: Integracao Supabase API e Seguranca

Data: 26/09/2026  
Versao: 1.1.0  
Autores: Quinta-feira, Arquiteto & Engenheiro  
Embasamento: API Security in Action (Neil Madden) e Threat Modeling (Adam Shostack)

---

## 1. Visao Geral da Arquitetura de Integracao

A integracao com o Supabase foi projetada seguindo o principio de Menor Privilegio (Zero Trust) e Degradação Segura (Fail Closed).

```
+-------------------------------------------------------------------------+
|                        ECOSSISTEMA WRMAX                                |
+-------------------------------------------------------------------------+
       |                                                 |
       v                                                 v
[Portal do Cliente]                               [Painel do Gestor]
Rota: /c/:token (Anonimo)                         Rota: /admin (Autenticado)
       |                                                 |
       v                                                 v
RPCs SECURITY DEFINER                             Supabase Auth (JWT)
- validar_link_token                                     |
- submeter_cadastro_cliente                              v
       |                                   RLS Policies (authenticated)
       +-----------------------+-------------------------+
                               |
                               v
                     PostgreSQL / Supabase
        +-----------------------------------------------+
        | - clientes_onboarding   - dados_cadastrais   |
        | - links_temporarios     - modelos_contrato   |
        | - contratos             - Storage Buckets    |
        +-----------------------------------------------+
```

---

## 2. Funcoes RPC Seguras (Elevacao Controlada)

As funcoes RPC utilizam `SECURITY DEFINER` e `SET search_path = public`, executando com privilegios de sistema para isolar tabelas do acesso direto do cliente publico.

### 2.1 `validar_link_token(p_token TEXT)`
- **Objetivo:** Validar o link efemero do cliente, registrar telemetria de acessos e carregar a jornada.
- **Parametro de Entrada:** `p_token` (string de 48 caracteres hexadecimais).
- **Retorno JSONB:**
  ```json
  {
    "valido": true,
    "link": {
      "id": "uuid",
      "expira_em": "timestamp",
      "segundos_restantes": 17800
    },
    "cliente": {
      "id": "uuid",
      "nome_completo": "Nome",
      "status": "link_ativo",
      "apresentacao_pdf_url": "https://..."
    },
    "cadastro_preenchido": false,
    "dados_cadastrais": null,
    "contrato_liberado": false,
    "contrato": null
  }
  ```
- **Condicoes de Invalidez (Fail Closed):**
  - `TOKEN_NOT_FOUND`: Token inexistente no banco.
  - `MANUALLY_BLOCKED`: Bloqueado antecipadamente pelo gestor (kill-switch).
  - `EXPIRED`: Tempo limite de 5 horas ultrapassado.
  - Em todos os casos invalidos, a aplicacao renderiza a Tela Institucional sem vazar dados.

### 2.2 `submeter_cadastro_cliente(p_token TEXT, p_dados JSONB)`
- **Objetivo:** Gravacao atomica dos dados cadastrais e fiscais submetidos pelo cliente (Slot 03).
- **Parametros:**
  - `p_token`: Token efemero valido.
  - `p_dados`: Objeto com `razao_social`, `cnpj`, `representante_nome`, `representante_cpf`, `email_financeiro`, etc.
- **Comportamento:**
  - Executa `INSERT ... ON CONFLICT (cliente_id) DO UPDATE`.
  - Atualiza o status do cliente para `cadastro_recebido`.
  - Retorna `{ "sucesso": true, "cadastro_id": "uuid" }`.

### 2.3 `prorrogar_link(p_link_id UUID, p_minutos INTEGER)`
- **Uso:** Exclusivo do gestor autenticado no `/admin`.
- **Comportamento:** Soma `p_minutos` ao maior valor entre a expiracao atual e `NOW()`. Desbloqueia automaticamente caso estivesse bloqueado.

### 2.4 `bloquear_link(p_link_id UUID, p_motivo TEXT)`
- **Uso:** Kill-switch imediato do gestor.
- **Comportamento:** Marca `bloqueado_manualmente = TRUE` e registra timestamp e motivo. O cliente perde acesso instantaneamente na proxima requisicao.

---

## 3. Storage Buckets e Acesso a Documentos

| Bucket | Finalidade | Tamanho Maximo | Tipo MIME | Acesso Leitura | Acesso Escrita |
|---|---|---|---|---|---|
| `apresentacoes-pdf` | Proposta comercial do projeto | 25 MB | `application/pdf` | Publico (Download) | Authenticated (Admin) |
| `contratos-docx` | Minutas e contratos assinados | 25 MB | `.docx`, `.pdf` | Publico (Download) | Authenticated (Admin) |
| `modelos-contrato` | Modelos padrao com tags | 10 MB | `.docx` | Publico (Download) | Authenticated (Admin) |

---

## 4. Guia de Diagnostico e Solucao de Problemas (Troubleshooting)

### Erro 42501 (Permission Denied)
- **Causa:** Tentativa de acesso direto a tabela sem `GRANT` no PostgreSQL.
- **Solucao:** Executar o script complementar `supabase/migrations/20260927_fix_permissions_and_storage.sql` no SQL Editor do Supabase para conceder `USAGE` e permissoes a role `authenticated`.

### Erro 22P02 (Invalid UUID Syntax)
- **Causa:** Envio de string vazia `""` ou mock ID para colunas do tipo `UUID` (como `modelo_id`).
- **Solucao:** A funcao `emitirEEnviarContrato` em `src/lib/supabase.ts` valida a expressao regular do UUID e converte valores vazios ou invalidos em `null`.

### Erro 23502 (Violacao de Not-Null em Endereco)
- **Causa:** Tentativa de gravar cadastro quando colunas como `cep`, `numero` ou `bairro` estao vazias.
- **Solucao:** O patch `20260927_fix_permissions_and_storage.sql` flexibilizou as colunas secundarias com `DROP NOT NULL`, permitindo preenchimento simplificado.
