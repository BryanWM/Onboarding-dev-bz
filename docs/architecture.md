# Arquitetura do Sistema WRMax

Data: 26/09/2026  
Versao: 2.0.0  
Autores: Quinta-feira, Arquiteto & Engenheiro  
Embasamento: Clean Architecture (Robert C. Martin), Refactoring UI (Adam Wathan) e Accelerate (Nicole Forsgren)

---

## 1. Modelo de Implantacao em Dominio Unico

Para permitir deploy continuo em provedores como Vercel sob um unico dominio (ex: `onboarding.wrmaxmarketing.com.br`), o ecossistema foi estruturado para atender as duas pontas operacionais na mesma instancia de roteamento do TanStack Router.

### Estrutura de Rotas

```
https://onboarding.wrmaxmarketing.com.br
│
├── /              -> Tela Institucional Comercial (Fallback global e captura WhatsApp)
├── /c/:token      -> Central do Cliente (Jornada Efemera de 5 horas com 4 Slots)
├── /admin         -> Painel de Controle Operacional do Gestor (Guarded por Auth)
└── /login         -> Autenticacao Administrativa (Supabase Auth com JWT)
```

---

## 2. Inversao de Papeis na Elaboracao de Contratos

Ao contrario do modelo legado em que o cliente preenchia dados contratuais arbitrarios, o novo fluxo separa responsabilidades estritamente:

1. **Cliente (Slot 03):** Envia dados cadastrais (Razao Social, CNPJ, Representante, E-mail Financeiro).
2. **Gestor (Painel Admin - Estagio 2):**
   - Recebe notificacao de dados preenchidos.
   - Define o Valor Mensal (R$) acordado comercialmente.
   - Define o Dia de Vencimento da fatura (1 a 31).
   - Seleciona a minuta pre-aprovada no catalogo DOCX.
   - Aciona "Emitir e Enviar Contrato ao Cliente".
3. **Liberacao (Slot 04):** O contrato oficial e desbloqueado para o cliente conferir, baixar o arquivo DOCX e anexar a via assinada.

---

## 3. Principio de Falha Segura (Fail Closed)

Qualquer anomalia de acesso resulta em convergencia silenciosa para a Tela Institucional:

- Acesso a raiz sem token (`/`)
- Token inexistente ou corrompido
- Link expirado (tempo limite de 5 horas atingido)
- Link revogado manualmente pelo gestor (Kill-switch)

Nenhuma mensagem tecnica de banco ou detalhe de infraestrutura e vazado para o visitante.

---

## 4. Padrao Visual Metalico Escuro

Todas as telas seguem os principios de *Refactoring UI*:
- **Fundo Profundo:** Tons neutros escuros (`#0b0d10`, `#12161b`).
- **Acentos Metalicos:** Bordas sutis com brilho prateado e gradientes controlados.
- **Botoes Metalicos:** Classe `.metal-button` com varredura diagonal organica (`skewX(-22deg)`) e animacao continua de 4.5 segundos sem solavancos.
- **Escala Modular:** Tipografia IBM Plex Mono para identificadores, tags e valores numericos; Manrope para leitura densa e legivel.
