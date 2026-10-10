# CLAUDE.md — WRMax Onboarding (Central do Cliente + Painel Admin)

Contexto para quem (humano ou Claude) for continuar o desenvolvimento.

> Levantamento feito em 07/10/2026. Onde houver dúvida, confirme no código — este arquivo pode ficar desatualizado.

## Regras antes de qualquer coisa

- A `main` faz deploy automático na Vercel: mantenha-a sempre num estado que funciona e não reescreva histórico já enviado (force-push, rebase, amend).
- O projeto nasceu no Lovable e foi desvinculado dele em 07/10/2026; não reintroduza pacotes/arquivos `@lovable.dev/*`.
- **Este é o repositório oficial.** O repo `BryanWM/Dashboard-admin-panel` é uma cópia quase idêntica (mesma `src/lib`, mesmos componentes, mesmas migrations) com o admin na raiz `/`. Ele é legado: não desenvolva lá.
- Responda e escreva commits/comentários em **português**.
- Não rode migrations nem altere o banco de produção sem confirmação explícita do usuário.

## O que o app faz

Portal de entrada de novos clientes da WRMax Marketing. O gestor cadastra o cliente e gera um link temporário; o cliente usa o link para ver a proposta, pagar, enviar dados e assinar o contrato.

| Rota | Arquivo | Quem | O que é |
|---|---|---|---|
| `/` | `src/routes/index.tsx` | Público | Tela institucional (WhatsApp comercial). Também é o destino de qualquer acesso inválido (fail closed). |
| `/c/:token` | `src/routes/c.$token.tsx` | Cliente | Jornada de onboarding. Link vale 5h. |
| `/admin` | `src/routes/admin.tsx` | Gestor | Painel: clientes, links, PIX, contratos, playbook. |
| `/login` | `src/routes/login.tsx` | Gestor | Supabase Auth, redireciona para `/admin`. |

`src/routes/c..tsx` (rota `/c/`) tem nome estranho; funciona porque `ClienteTokenScreen` lê o token direto de `window.location.pathname`.

### Jornada do cliente (`src/components/central-cliente/cliente-token-screen.tsx`)

São **5 slots** (o README fala em 4 — está desatualizado):

1. `slot-apresentacao` — PDF da proposta enviado pelo gestor.
2. `slot-pix` — chave/QR estáticos (`financeiro@wrmaxmarketing.com.br`) + anexo de comprovante.
3. `slot-onboarding` — abre o Google Forms (`link_onboarding_form`) num modal (`onboarding-form-modal.tsx`, iframe `?embedded=true`) ou em nova aba. A primeira abertura é gravada (RPC `registrar_abertura_onboarding`) e o botão "Confirmo que preenchi" libera 5 min depois dela (regra no banco: `confirmar_onboarding_form`). **Sem contador na tela**: só a orientação "Reserve um tempo". O "checkpoint" é o rascunho automático do Google Forms (cliente logado na conta Google). Link `forms.gle` pode não abrir no iframe — usar o link completo.
4. `slot-dados-cadastrais` — formulário único (sem abas PF/PJ): nome e **CPF obrigatórios**, razão social e **CNPJ opcionais**, e-mail, telefone, endereço → RPC `submeter_cadastro_cliente` (valida CPF 11 dígitos / CNPJ 14 no banco; dígitos verificadores no front, `src/lib/documentos.ts`). Sem empresa, `razao_social` = nome.
5. `slot-contrato-cliente` — bloqueado até o gestor liberar; contrato automático = DOCX montado com os dados; contrato manual (`origem = 'manual'`) = baixa o arquivo anexado. Cliente envia a via assinada.

A tela faz polling a cada 3s (`validarLinkToken`) e escuta eventos `window` `wrmax:*`.

### Painel admin (`src/components/dashboard-admin/admin-dashboard-app.tsx`)

Um único acesso com duas seções no topo (`Setor`, `src/lib/fase-projeto.ts`, lembrada em `localStorage` `wrmax_setor`): **Comercial** (padrão; abas 0. Início → 5. Contrato, cria projetos) e **Produção** (abas 6. Boas-vindas → 9. Produção). O projeto passa para a Produção quando o cliente envia a via assinada (`status = 'assinado'` ou contrato com `docx_assinado_storage_path`) — não há coluna própria.

Fluxo em uso: `ClientSelectorView` (filtra pelo setor) → `ClientFocusedView` (mostra só as abas do setor; painéis `workspace-*`) e `ContractModelsPanel`.
- Criar cliente + link: `criarClienteComLink` (`src/lib/project-service.ts`).
- Prorrogar / bloquear / desbloquear / excluir link, marcar PIX pago: `src/lib/supabase.ts`.
- Aba 5. Contrato (`workspace-contract-panel.tsx`) tem dois modos: **Gerar automaticamente** (abaixo) e **Editar um modelo** (baixa o padrão ou um modelo do catálogo já preenchido com os dados do cliente → edita fora → **anexa** PDF/DOCX em `contratos-docx/<cliente_id>/` → RPC `anexar_contrato_manual`). Contrato manual fica oculto para o cliente até o gestor clicar em **Liberar para o cliente** (RPC `liberar_contrato_cliente`). Só gestor anexa/libera.
- Emitir contrato: o gestor define `valor_mensal` e `dia_vencimento`, escolhe um modelo DOCX; o DOCX é montado **no navegador** com `jszip` trocando tags `{{RAZAO_SOCIAL}}`, `{{CNPJ}}`, `{{VALOR_MENSAL}}`… (`src/lib/contrato-generator.ts`, `src/lib/contract-service.ts`), depois RPC `emitir_e_enviar_contrato`.
- Playbook interno de onboarding (13 etapas, checklist): `stages-data.ts`. O checklist é salvo só em `localStorage`.

Componentes **sem uso no app** (só referenciados por testes) — tratar como legado antes de mexer: `client-management-panel`, `client-workspace-view`, `contract-emission-panel`, `navigation`, `project-entries`, `stage-content`. Provavelmente também `slot-contrato` e `slot-gerar-contrato` (exportados no `index.ts`, mas a tela usa `slot-contrato-cliente`).

## Stack

- TanStack Start (React 19, SSR via Nitro, roteamento por arquivo em `src/routes/`; `routeTree.gen.ts` é gerado — não editar).
- Supabase: Postgres + Auth + Storage. Cliente em `src/lib/supabase-client.ts`, tipos em `src/types/database.types.ts`.
- Tailwind v4 + shadcn/Radix (`src/components/ui/`), Lucide.
- Visual = identidade da landing (rework-landing-page.vercel.app), em `src/styles.css`: fundo `#0a0907`, cartões sólidos com borda finíssima, texto creme quente; tipografia com pesos fixos (só esses são carregados em `__root.tsx`): **Sora** 800 no `h1`, 700 em `h2`/`h3` e números (`font-display`), 600 em `h4`–`h6`/nomes de serviço; **Inter** 400 texto, 500 apoio, 600 botões/abas/chips (nunca acima de 600); **JetBrains Mono** 400 em etiquetas e numerações (`rotulo`, `tag-ouro`), 600 só em título de rodapé. Valores em destaque (CPF, R$) usam Inter 600 `tabular-nums`, não mono. **Dourado equilibrado**: o gradiente cheio só em `metal-button` (ação principal, uma por tela), `tag-ouro` (etiqueta), `metal-text` (uma palavra de destaque), `metal-fill` (progresso); `--primary` é dourado champanhe suave (ícones, foco, estados ativos) e `chip-ouro` marca item ativo/selecionado (filtros, seção, etapa atual, avatares). Ação secundária/repetida = `glass-button`; status = selo neutro com ponto colorido. Na Central, só a `.etapa-atual` mantém o botão dourado (regra `.central-etapas` no CSS).
- Telas cheias renderizam `<AmbientBackground />` (brilho difuso + rede de pontos) e não usam `bg-background` no wrapper. Logo: `<LogoWrmax />` (`public/brand/wrmax-logo.png`); favicon/ícones = só o "W" da logo (`public/favicon.ico`, `favicon-32.png`, `icon-192.png`, `apple-touch-icon.png`). Título de todas as rotas: "WRMax - Marketing & IA".
- Vitest + Testing Library + JSDOM.
- `vite.config.ts` declara os plugins direto: Tailwind, tsconfig-paths, TanStack Start (entrada `src/server.ts`), Nitro (só no build, preset `vercel`) e React.

## Comandos

```bash
npm install
npm run dev      # http://localhost:8080
npm test         # vitest run
npm run build    # nitro preset vercel
npx tsc --noEmit # typecheck (ver "estado atual")
```

`.env` (ver `.env.example`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # só servidor, nunca com prefixo VITE_
```

Sem as variáveis `VITE_*`, o `npm run dev` entra em **modo demo** (`isModoDemo`): mocks, `localStorage` e login com qualquer credencial. Um build de produção sem elas fica **fechado** (login recusa, todo link é inválido). Sem `SUPABASE_SERVICE_ROLE_KEY`, o cliente não consegue abrir nem enviar arquivos.

## Banco (supabase/migrations)

Tabelas: `clientes_onboarding`, `links_temporarios` (token hex de 48 chars, `expira_em` = +5h), `dados_cadastrais_cliente`, `modelos_contrato`, `contratos`, `gestores` (quem pode usar o painel).

Modelo de acesso (desde `20261007_seguranca_rls_storage.sql`):
- **anon** (cliente do link) não acessa tabela nenhuma; só executa RPCs que recebem e validam o token: `validar_link_token`, `submeter_cadastro_cliente`, `registrar_comprovante_pix`, `registrar_contrato_assinado`, `registrar_abertura_onboarding`, `confirmar_onboarding_form`.
- `dados_cadastrais_cliente` é 1:1 com o cliente: no select embutido o PostgREST devolve **objeto**, não lista. `listarClientes` normaliza para lista.
- **authenticated** só vê/altera algo se estiver em `public.gestores` (`is_gestor()` nas políticas RLS). RPCs de gestor (`prorrogar_link`, `bloquear_link`, `desbloquear_link`, `excluir_link_temporario`, `atualizar_status_pix`, `emitir_e_enviar_contrato`, `anexar_contrato_manual`, `liberar_contrato_cliente`) checam `is_gestor()` por dentro.
- `emitir_e_enviar_contrato(cliente, modelo, valor, dia)` não recebe mais URL: o caminho do DOCX vem de `modelos_contrato`.
- Nova função/tabela precisa de `GRANT` explícito: a migration revoga execução de `PUBLIC`/`anon` por padrão.

Buckets — todos **privados**: `apresentacoes-pdf`, `contratos-docx`, `modelos-contrato`, `contratos-assinados`, `comprovantes-pix`. O banco guarda `bucket/caminho` (não URL). Gestor abre por URL assinada (`useUrlArquivoGestor`, `src/lib/storage-refs.ts`). O cliente usa as server functions de `src/lib/arquivos-cliente.ts` (service_role, validam o token): `obterArquivosCliente` (URLs assinadas de 1h) e `prepararUploadCliente` (URL de upload assinada em `<cliente_id>/...`; depois a RPC `registrar_*` confere caminho e objeto).

`validar_link_token` foi redefinida em várias migrations — a versão válida é a de `20261009_fluxo_comercial_producao.sql` (devolve `segundos_para_confirmar_onboarding = null` enquanto o cliente não abrir o formulário). Mesma coisa para `submeter_cadastro_cliente` e `confirmar_onboarding_form`.

Para dar acesso a um novo gestor (SQL editor do Supabase):
```sql
INSERT INTO public.gestores (user_id, email) SELECT id, email FROM auth.users WHERE email = 'fulano@...';
```

## Deploy (Vercel, time `marketingwrmax-9365's projects`)

| Projeto | Domínio | Observação |
|---|---|---|
| `formulario-onboarding` | onboarding.wrmaxmarketing.com.br | Alvo principal. |
| `dashboard-admin-wrmaxmarketing` | só `.vercel.app` | Versão separada do painel (legado). |
| `dashboard-admin-wrmaxmarketing-afbx` | só `.vercel.app` | Aparentemente duplicata criada por engano. |

Os três usam o mesmo Supabase. Último deploy de todos: 28/09/2026. Confirmar com a equipe qual URL usam para o painel antes de desligar qualquer um.

## Estado atual (08/10/2026)

- Build: passa.
- Testes: 87/87 passam. Migrations testadas em PGlite (scripts fora do repo).
- **Pendente no Supabase de teste e de produção:** aplicar `20261009_fluxo_comercial_producao.sql` (sem ela o modal do onboarding não registra a abertura, o CPF sem CNPJ é recusado e o anexo manual de contrato falha).
- Assinatura pelo gov.br (modal): adiada pela equipe.
- TypeScript: ~60 erros, quase todos por causa do `tsconfig` estrito (`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`). O build ignora. Bug real entre eles: `client-workspace-view.tsx` chama `LinkDeleteModal` sem a prop obrigatória `open`. `src/types/database.types.ts` agora segue o formato do supabase-js (antes tudo virava `never`).
- Histórico do Git: o repo tem um único commit ("up do projeto"); o histórico anterior não veio junto.

## Problemas conhecidos (por prioridade)

### 1. Segurança do Supabase — corrigido no código, falta aplicar em produção
Corrigido em `supabase/migrations/20261007_seguranca_rls_storage.sql` + front (anon fechado, `gestores`/`is_gestor()`, buckets privados com URL assinada, RPCs do cliente validadas por token, contrato sem URL do navegador). A migration foi testada em Postgres local (PGlite) com os papéis anon / logado comum / gestor. **Pendências manuais:**
- Rodar a migration no Supabase de produção e conferir `SELECT * FROM public.gestores` (ela inclui todos os usuários já existentes do Auth).
- Cadastrar `SUPABASE_SERVICE_ROLE_KEY` na Vercel (`formulario-onboarding`) **antes** do deploy.
- Desligar cadastro público no Supabase Auth (Authentication → Sign In / Providers → "Allow new users to sign up").
- Os projetos Vercel legados do dashboard separado usam a assinatura antiga de `emitir_e_enviar_contrato` e URLs públicas: param de funcionar para essas ações.

### 2. Estado guardado só no navegador
Em produção os dados de clientes, links, cadastro, contrato e comprovante vêm só do banco; os fallbacks em `localStorage` agora valem apenas no modo demo. Continuam só no navegador: checklist/etapas do playbook (`wrmax_checklist_*`, `wrmax_stage_*`) e `wrmax_selected_cliente_id`.

### 3. Dados mock em produção — corrigido
Mocks (`MOCK_CLIENTES`, `tok_padrao`, `mock-*`) só existem no modo demo (`isModoDemo`).

### 4. URL do link do cliente
O link é montado com `window.location.origin` (`client-row.tsx`, `workspace-link-panel.tsx`, `project-service.ts`), com um ajuste que troca a porta 8081 por 8080 só em localhost. Se o gestor usa o painel em outro domínio, o cliente recebe link desse domínio. Trocar por variável de ambiente (ex.: `VITE_PUBLIC_URL=https://onboarding.wrmaxmarketing.com.br`).

### 5. Limpeza
- README e docs desatualizados (4 slots, `mailto`, Cloudflare, Google Forms "estático").

## Ordem sugerida de trabalho

1. Aplicar a migration de segurança em produção + pendências manuais do item 1; testar o fluxo inteiro do cliente e do gestor.
2. Levar checklist/etapas do playbook para o banco.
3. `VITE_PUBLIC_URL` para os links.
4. Consolidar deploy num único projeto Vercel; aposentar o repo/projetos do dashboard separado.
5. Limpeza (código morto, docs) e zerar erros de TypeScript aos poucos.

Trabalhe em PRs pequenos, um tema por vez, rodando `npm test` e `npm run build` antes de cada push.
