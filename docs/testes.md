# Documentacao Tecnica - Suite de Testes Automatizados

Projeto: WRMax - Central do Cliente
Framework: Vitest 5.0.2 + React Testing Library + JSDOM
Padrao Arquitetural: AAA (Arrange, Act, Assert) - Escola Classica (Detroit)

---

## 1. Fundamentacao Teorica

> **Livro:** *Unit Testing: Principles, Practices, and Patterns* - **Vladimir Khorikov** - **Capitulo:** 4 (Os 4 Pilares de um Bom Teste Unitario)  
> **Citacao/Base:** "Um teste unitario de alto valor deve proteger contra regressoes, resistir a refatoracoes focando no comportamento observavel e fornecer feedback rapido sem acoplamento a implementacoes internas."  
> **Acao derivada:** Os testes foram desenhados para exercitar a interface do ponto de vista do usuario, sem espionar estados internos ou quebrar com mudancas estruturais cosméticas.

---

## 2. Estrutura de Arquivos de Teste

A suite de testes esta organizada de forma modular:

- `src/lib/__tests__/utils.test.ts`:
  - Valida fusao de classes utilitarias (`clsx` + `tailwind-merge`).
  - Garante resolucao correta de classes conflitantes do Tailwind (ex: `p-4` vs `p-2`).
  - Testa descarte de valores falsy (`false`, `null`, `undefined`, `""`).

- `src/components/central-cliente/__tests__/copy-row.test.tsx`:
  - Testa renderizacao correta de rotulos e valores textuais.
  - Testa acao do usuario ao clicar no botao de copiar para a area de transferencia (`navigator.clipboard.writeText`).
  - Testa feedback visual temporario de confirmacao (icone Check).

- `src/components/central-cliente/__tests__/slot-contrato.test.tsx`:
  - Testa renderizacao do botao de upload de contrato e instrucoes de formatos (PDF, Word).
  - Simula selecao de arquivo (`File`) e valida exibicao do nome do documento e link de visualizacao (`blob:`).

- `src/components/central-cliente/__tests__/slot-pix.test.tsx`:
  - Valida renderizacao dos dados padrao de pagamento (QR Code, Chave PIX, Favorecido).
  - Valida integridade do link do WhatsApp com mensagem codificada para envio de comprovante.
  - Testa suporte a propriedades customizadas.

- `src/components/central-cliente/__tests__/slot-onboarding.test.tsx`:
  - Testa renderizacao do botao e link seguro (`target="_blank"`, `rel="noreferrer"`) para o formulario de onboarding.
  - Valida flexibilidade para aceitar URL de formulario customizado.

- `src/components/central-cliente/__tests__/slot-gerar-contrato.test.tsx`:
  - Valida estado inicial do botao de submissao (desabilitado enquanto campos estiverem incompletos).
  - Simula preenchimento sequencial de todos os 5 campos obrigatorios (nome, documento, email, telefone, endereco).
  - Valida habilitacao do botao e disparo do callback `onEnviado` com os dados sanitizados.

- `src/test/routes/index.test.tsx`:
  - Teste de integracao da tela inteira da Central do Cliente.
  - Garante que os 4 slots de fluxo (01 a 04), cabecalho e rodape estao presentes e conectados.

---

## 3. Comandos de Execucao

- Rodar todos os testes uma vez (CI/CD):
  ```bash
  npm test
  ```

- Rodar testes em modo watch durante o desenvolvimento:
  ```bash
  npm run test:watch
  ```

- Validacao estatica (TypeScript + Linter):
  ```bash
  npx tsc --noEmit && npm run lint
  ```
