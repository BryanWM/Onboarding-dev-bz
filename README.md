# WRMax - Central do Cliente & Painel Unificado

Portal unificado de onboarding, emissao de contratos e gestao operacional da **WRMax Marketing**.

---

## 1. Visao Geral da Aplicacao

Este projeto atende simultaneamente ao portal do cliente e ao painel de controle do gestor sob o mesmo dominio (ex: `onboarding.wrmaxmarketing.com.br`), facilitando a hospedagem direta na Vercel sem necessidade de portas extras ou subdominios independentes.

### Rotas e Modulos do Sistema

| Rota            | Destino                          | Acesso     | Descricao                                                                                                                                            |
| --------------- | -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`/`**         | **Tela Institucional Comercial** | Publico    | Captura comercial direta com chamada e botao para o WhatsApp oficial da WRMax (`5586999216675`). Atua como fallback global silencioso (fail closed). |
| **`/c/:token`** | **Jornada Efemera do Cliente**   | Token (5h) | Acesso protegido por token temporario com contagem regressiva e 4 slots operacionais.                                                                |
| **`/admin`**    | **Painel Administrativo**        | Gestor     | Controle de clientes, geracao de links temporarios, kill-switch imediato, emissao de contratos e catalogo de modelos DOCX.                           |
| **`/login`**    | **Autenticacao do Gestor**       | Gestor     | Login seguro via Supabase Auth com persistencia de sessao e redirecionamento automatico para `/admin`.                                               |

---

## 2. A Jornada do Cliente (4 Slots Reformulados)

1. **Slot 01 - Apresentacao do Projeto:**
   - Visualizacao e download do documento PDF da proposta comercial personalizada, enviada previamente pelo gestor no painel administrativo.
2. **Slot 02 - Pagamento via PIX:**
   - Chave PIX oficial com copia rapida em 1 clique (`financeiro@wrmaxmarketing.com.br`) e QR Code escaneavel.
3. **Slot 03 - Envio de Dados Cadastrais:**
   - Formulario onde o cliente submete seus dados empresariais e fiscais (Razao Social, CNPJ, Representante Legal, E-mail Financeiro). Gravacao atomica no Postgres via RPC `submeter_cadastro_cliente`.
4. **Slot 04 - Contrato e Assinatura:**
   - O cliente nao gera valores contratuais. O contrato oficial e estruturado pelo gestor (mensalidade e vencimento) e liberado aqui para download da minuta e upload da via assinada.

---

## 3. Seguranca e Ciclo de Vida do Link Temporario

- **Validade:** 5 horas a partir da criacao.
- **Prorrogacao:** O gestor pode adicionar tempo operacional (`+30m`, `+1h`) no painel.
- **Kill-Switch Imediato:** O gestor pode revogar o link a qualquer momento com o botao "Bloquear".
- **Degradacao Segura (Fail Closed):** Links expirados, bloqueados ou acessos sem token degradam imediatamente para a Tela Institucional sem mensagens de erro tecnicas.

---

## 4. Stack Tecnologica

- **Framework:** [TanStack Start](https://tanstack.com/start) (Fullstack SSR com Vite e Nitro)
- **Roteamento:** [TanStack Router](https://tanstack.com/router)
- **Banco e Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Storage e Supabase Auth)
- **Linguagem:** TypeScript 5.8
- **UI & Estilo:** React 19, Tailwind CSS v4, Radix UI Primitives, Lucide React
- **Testes:** [Vitest](https://vitest.dev/) com React Testing Library e JSDOM

---

## 5. Como Executar

### Configuracao do `.env`

Crie o arquivo `.env` na raiz de `central-cliente`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### Inicializacao

```bash
# Instalar dependencias
npm install

# Iniciar servidor local na porta 8080
npm run dev

# Executar testes automatizados (22 suites / 47 testes)
npm test

# Build de producao
npm run build
```

---

## 6. Documentacao Tecnica

- [Manual de Integracao da API Supabase](docs/api-integration.md)
- [Arquitetura de Dominio Unico e Contratos](docs/architecture.md)
