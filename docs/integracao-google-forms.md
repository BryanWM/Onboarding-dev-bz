# Guia Tecnico - Integracao do Google Forms com Outro Projeto

Este documento explica como enviar automaticamente todas as respostas do formulario de onboarding:
`https://docs.google.com/forms/d/e/1FAIpQLSdyJjJicNhDIqPgkUSgEHwovvbywPsazFhWcPV3mJCVkobErg/viewform`
diretamente para a API, banco de dados ou backend de outro projeto via Webhook.

---

## Metodo Recomendado: Google Apps Script (100% Gratuito e Nativo)

Com este metodo, toda vez que um cliente concluir o onboarding, o Google dispara imediatamente uma requisicao HTTP POST com o JSON de todas as respostas para a URL do seu outro projeto.

### Passo 1: Acessar o Editor de Scripts do Formulario
1. Acesse o formulario no modo de edicao (com sua conta Google proprietaria).
2. Clique no icone de **3 pontinhos verticais** (no canto superior direito, proximo ao botao "Enviar").
3. Clique em **Editor de scripts** (`Apps Script`).
4. Uma aba de codigo sera aberta no navegador.

---

### Passo 2: Colar o Codigo do Webhook

Substitua todo o conteudo do arquivo `Codigo.gs` pelo seguinte script:

```javascript
/**
 * Script de Integracao Google Forms -> Outro Projeto
 * WRMax - Central do Cliente
 */

// INSIRA AQUI A URL DE ENTRADA DO SEU OUTRO PROJETO (ENDPOINT API OU WEBHOOK):
var ENDPOINT_OUTRO_PROJETO = "https://seu-outro-projeto.com.br/api/onboarding";

// (Opcional) Token de seguranca para autorizar a chamada no outro projeto:
var TOKEN_AUTORIZACAO = "SEU_TOKEN_SECRETO_AQUI";

function enviarParaOutroProjeto(e) {
  try {
    var respostasDoForm = e.response.getItemResponses();
    var payload = {
      timestamp: e.response.getTimestamp(),
      emailRespondente: e.response.getRespondentEmail ? e.response.getRespondentEmail() : null,
      respostas: {}
    };

    // Percorre cada pergunta e resposta do formulario
    for (var i = 0; i < respostasDoForm.length; i++) {
      var itemResponse = respostasDoForm[i];
      var pergunta = itemResponse.getItem().getTitle();
      var resposta = itemResponse.getResponse();
      payload.respostas[pergunta] = resposta;
    }

    // Configuracao da requisicao HTTP POST
    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + TOKEN_AUTORIZACAO,
        "X-Source": "WRMax-Onboarding-Form"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // Envio para o outro projeto
    var response = UrlFetchApp.fetch(ENDPOINT_OUTRO_PROJETO, options);
    Logger.log("Status de envio: " + response.getResponseCode());
    Logger.log("Retorno do projeto destino: " + response.getContentText());

  } catch (erro) {
    Logger.log("Erro ao enviar dados do onboarding: " + erro.toString());
  }
}
```

---

### Passo 3: Ativar o Gatilho Automatico (Trigger)
1. No menu lateral esquerdo do Google Apps Script, clique no icone de **Gatilhos** (relogio).
2. Clique no botao **Adicionar gatilho** (canto inferior direito).
3. Configure os seguintes campos:
   - **Escolha a funcao a ser executada:** `enviarParaOutroProjeto`
   - **Escolha a versao a ser executada:** `Head`
   - **Selecione a fonte do evento:** `Do formulario`
   - **Selecione o tipo de evento:** `Ao enviar o formulario`
4. Clique em **Salvar**.
5. Se o Google solicitar permissao para acessar sua conta, clique em "Avancado" e autorize a execucao.

Pronto. A partir desse momento, cada novo envio de formulario sera entregue automaticamente no endpoint do seu outro projeto em tempo real.

---

## Alternativa: Via Planilha Google Vinculada + Webhook (Make / n8n / Zapier)

Se o seu outro projeto aceitar integracoes no-code:
1. No Google Forms, va na aba **Respostas** e clique em **Vincular ao Planilhas** (criar nova planilha).
2. Na ferramenta de integracao (Make, n8n ou Zapier):
   - Modulo inicial: **Google Sheets - Watch New Rows** (monitorar novas linhas).
   - Modulo final: **HTTP - Make a request** (ou o modulo especifico do seu outro sistema/CRM).
