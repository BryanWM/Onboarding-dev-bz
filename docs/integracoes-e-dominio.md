# Guia de Integracoes e Configuracao de Dominio .com.br

Projeto: WRMax - Central do Cliente
Orquestradora: Quinta-feira
Data: 25/09/2026

---

## 1. Analise de Integracoes Necessarias para Subir

A Central do Cliente da WRMax possui 4 etapas de fluxo. Abaixo esta o diagnostico de cada etapa e as opcoes de integracao:

### Etapa 01 - Contrato da Reuniao
- **Estado Atual:** Apenas selecao de arquivo no navegador via `URL.createObjectURL(file)`. O arquivo fica apenas na memoria da sessao local do usuario.
- **Opcao 1 (Imediata / Sem Custo):**
  - Manter como visualizador local para o cliente revisar o arquivo em PDF ou Word que ele ja recebeu.
- **Opcao 2 (Armazenamento em Nuvem Profissional):**
  - Integrar com Cloudflare R2 ou AWS S3 via endpoint de upload assinado (`presigned URL`). O cliente envia o contrato e ele fica salvo no bucket da WRMax vinculado ao CNPJ/CPF do cliente.

---

### Etapa 02 - Pagamento via PIX
- **Estado Atual:**
  - Chave PIX estatica: `financeiro@wrmaxmarketing.com.br`
  - Favorecido estatico: `KFGMoreira`
  - Imagem estatica de QR Code em `src/assets/qrcode-pix.png`
  - Link de WhatsApp com telefone ficticio: `5585999999999`
- **Ajuste Imediato Obrigatorio:**
  - Substituir o numero de telefone em `src/components/central-cliente/slot-pix.tsx` pelo WhatsApp oficial da equipe financeira da WRMax com DDI e DDD (ex: `5585XXXXXXXXX`).
  - Confirmar se o QR Code em `src/assets/qrcode-pix.png` corresponde exatamente a chave PIX atual.
- **Integracao Automatizada (Recomendada para Producao):**
  - Gateway de Pagamento PIX com Webhook (Asaas, Mercado Pago, EFI / Gerencianet ou Stripe).
  - Como funciona:
    1. A aplicacao gera uma cobranca PIX dinamica com valor exato e tempo de expiracao via API.
    2. O gateway notifica a aplicacao via Webhook quando o pagamento e liquidado.
    3. A tela do cliente atualiza automaticamente com status "Pagamento Confirmado", liberando a proxima etapa sem necessidade de conferencia manual no WhatsApp.

---

### Etapa 03 - Onboarding do Cliente
- **Estado Atual:**
  - Link direto para Google Forms (`https://docs.google.com/forms/d/e/...`).
- **Ajuste Imediato:**
  - Validar se o link do Google Forms configurado esta ativo e com permissao publica de resposta.
- **Integracao Automatizada:**
  - Opcao A: Integrar o Google Forms com webhook (usando Google Apps Script, Make ou n8n) para enviar notificacao automatica no canal do Slack/Discord/WhatsApp interno da equipe quando o cliente responder.
  - Opcao B: Converter o onboarding em formulario nativo dentro do proprio projeto, salvando diretamente em banco de dados relacional (ex: PostgreSQL / Supabase).

---

### Etapa 04 - Criar Contrato de Prestacao de Servico
- **Estado Atual:**
  - Disparo de link `mailto:financeiro@wrmaxmarketing.com.br` com os dados preenchidos no corpo do e-mail.
  - Limitacao: Se o cliente estiver no celular sem app de e-mail padrao ou no navegador desktop sem cliente de e-mail padrao configurado, o clique pode nao disparar.
- **Integracao Intermediaria (Envio de E-mail por API):**
  - Implementar rota de API no backend (Nitro/TanStack Start): `POST /api/solicitar-contrato`.
  - Usar provedor de e-mail transacional (Resend, SendGrid ou Postmark) com chave de API segura no servidor.
  - O formulario envia os dados via `fetch("/api/solicitar-contrato")`, garantindo 100% de entrega tanto para a WRMax quanto um e-mail de confirmacao para o cliente.
- **Integracao Avancada (Assinatura Eletronica Automatica):**
  - Integrar com ZapSign, ClickSign ou DocuSign via API.
  - Quando o cliente clica em "Gerar meu contrato", o backend gera o contrato em PDF, cadastra o documento na plataforma de assinatura e envia o link de assinatura automaticamente para o WhatsApp e e-mail do cliente.

---

## 2. Como Atrelar a um Dominio .com.br (Passo a Passo)

### 2.1 Onde fica o dominio .com.br
- No Brasil, todos os dominios `.com.br` sao registrados no **Registro.br** (ou em revendedores autorizados como Hostinger, GoDaddy, etc.).

### 2.2 Escolha da Hospedagem / Plataforma de Deploy

Como o projeto foi construido com **TanStack Start + Nitro** (compilado nativamente com preset para Cloudflare), as duas melhores plataformas sao **Cloudflare** ou **Vercel**.

---

### Opcao A: Cloudflare Pages / Workers (Recomendada - Nativa do Nitro)

1. **Criar conta gratuita na Cloudflare:**
   - Acesse [dash.cloudflare.com](https://dash.cloudflare.com) e crie uma conta.
   - Adicione o dominio `seudominio.com.br` na Cloudflare.
   - A Cloudflare informara dois servidores de nomes (NameServers), por exemplo:
     - `alice.ns.cloudflare.com`
     - `bob.ns.cloudflare.com`

2. **Apontar no Registro.br:**
   - Acesse [registro.br](https://registro.br) e faca login.
   - Clique no dominio `.com.br` desejado.
   - Na secao **DNS**, clique em **Alterar Servidores DNS**.
   - Insira os dois servidores de nome informados pela Cloudflare (ex: `alice.ns.cloudflare.com` e `bob.ns.cloudflare.com`).
   - Salve a alteracao (a propagacao no Registro.br leva tipicamente entre 30 minutos e 2 horas).

3. **Conectar o Repositorio e Fazer Deploy:**
   - Na Cloudflare, acesse **Compute & Workers** -> **Pages** -> **Create application** -> **Connect to Git**.
   - Selecione o repositorio GitHub do projeto.
   - Configuracoes de Build:
     - **Framework preset:** `TanStack Start` ou `None`
     - **Build command:** `npm run build`
     - **Output directory:** `.output/public` (ou `.output`)
   - Clique em **Save and Deploy**.

4. **Vincular o Dominio:**
   - No painel da aplicacao na Cloudflare Pages, va em **Custom domains**.
   - Adicione `seudominio.com.br` e `www.seudominio.com.br`.
   - O certificado SSL/TLS (HTTPS) sera emitido de forma automatica e gratuita.

---

### Opcao B: Vercel (Alternativa Rapida com Apontamento Direto no Registro.br)

Se optar por publicar na Vercel sem trocar os NameServers do Registro.br:

1. **Deploy na Vercel:**
   - Conecte o repositorio GitHub na Vercel.
   - A Vercel detectara o projeto e efetuara o build com `npm run build`.

2. **Configuracao de DNS no Registro.br:**
   - No painel do Registro.br, na secao de DNS, selecione **Configurar Enderecamento** (usar DNS do proprio Registro.br).
   - Adicione as seguintes entradas:
     - **Tipo A:**
       - Nome: `@` (ou em branco)
       - Dados: `76.76.21.21` (IP oficial Vercel)
     - **Tipo CNAME:**
       - Nome: `www`
       - Dados: `cname.vercel-dns.com.`
   - No painel da Vercel, va em **Settings** -> **Domains** e adicione `seudominio.com.br` e `www.seudominio.com.br`.
   - A Vercel valida a conexao e ativa o SSL automaticamente.
