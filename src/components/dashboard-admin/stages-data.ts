export type Stage = {
  short: string;
  title: string;
  description: string;
  groups?: { title: string; items: string[] }[];
};

export const stages: Stage[] = [
  { short: "Painel", title: "Onboarding de alta performance", description: "Processo de entrada, estruturação e início da operação. Até 3 dias úteis para contato e mapeamento, e até 5 dias úteis para a produção." },
  { short: "Início", title: "Início do onboarding", description: "A partir destes gatilhos, o cliente deixa de ser responsabilidade exclusivamente comercial e passa para a implantação WRMax.", groups: [{ title: "Gatilhos de início", items: ["Fechamento comercial confirmado", "Contrato assinado", "Pagamento confirmado ou condição validada", "Responsável interno pelo cliente definido"] }] },
  { short: "Contrato", title: "Estruturação do contrato", description: "O contrato deve refletir exatamente aquilo que foi vendido e acordado comercialmente.", groups: [{ title: "Conferir no contrato", items: ["Dados do cliente e CNPJ", "Escopo e serviços contratados", "Valores e forma de pagamento", "Prazos e datas de vencimento", "Responsabilidades e entregas", "Condições específicas negociadas"] }] },
  { short: "Boas-vindas", title: "Boas-vindas e primeiro contato", description: "O cliente precisa saber o que acontecerá, quando acontecerá e quem será responsável por cada etapa.", groups: [{ title: "O contato deve apresentar", items: ["Mensagem de boas-vindas enviada", "Responsável pelo atendimento apresentado", "Processo e próximas etapas explicados", "Prazo do primeiro mapeamento informado", "Materiais solicitados ao cliente"] }] },
  { short: "3 dias úteis", title: "Do pagamento ao mapeamento - até 3 dias úteis", description: "Compromisso interno entre a confirmação do pagamento e a conclusão do primeiro mapeamento estratégico.", groups: [
    { title: "Dia 1 - Acolhimento e organização", items: ["Boas-vindas enviadas e responsável apresentado", "Contrato conferido", "Pasta do cliente criada e materiais solicitados", "Reunião de onboarding agendada"] },
    { title: "Dia 2 - Diagnóstico e mapeamento", items: ["História, produtos e serviços", "Público-alvo e cliente ideal", "Diferenciais e posicionamento atual", "Concorrentes e comunicação atual", "Objetivos, metas e dificuldades"] },
    { title: "Dia 3 - Estratégia e direcionamento", items: ["Posicionamento e pilares de comunicação", "Direcionamento de conteúdo", "Público prioritário e mensagens principais", "Estratégia inicial e prioridades"] },
  ] },
  { short: "Estratégia", title: "Desenvolvimento da estratégia", description: "Negócio -> Posicionamento -> Público -> Estratégia -> Conteúdo -> Resultado. A produção é consequência de uma estratégia definida.", groups: [{ title: "A estratégia deve considerar", items: ["Momento atual e objetivos do cliente", "Perfil do público e diferenciais competitivos", "Produtos e serviços prioritários", "Posicionamento desejado", "Canais e oportunidades comerciais"] }] },
  { short: "Produção", title: "Produção de conteúdo - até 5 dias úteis", description: "Fazer o cliente perceber rapidamente a transformação da estratégia em entregas concretas.", groups: [{ title: "Etapas", items: ["Temas definidos", "Textos e conteúdos criados", "Direção visual e design", "Revisão interna e aprovação", "Calendário de publicação organizado"] }] },
  { short: "PIX", title: "PIX facilitado - apresentação e QR Code", description: "Reduzir barreiras no momento do pagamento e facilitar a experiência do consumidor.", groups: [{ title: "Entregas", items: ["Solução apresentada ao cliente", "QR Code criado e organizado", "Material visual personalizado", "QR Code plastificado", "Posicionamento estratégico no ponto de atendimento"] }] },
  { short: "Apresentação", title: "Apresentação personalizada", description: "Personalizada de acordo com o serviço contratado - nunca um material genérico.", groups: [{ title: "Estrutura da apresentação", items: ["Quem é a WRMax", "O que entendemos sobre o cliente", "Onde estamos", "Para onde vamos", "Como vamos fazer", "O que será entregue", "Próximos passos"] }] },
  { short: "Cronograma", title: "Cronograma padrão do onboarding", description: "Do fechamento à operação: prazos e principais ações de cada etapa." },
  { short: "Responsáveis", title: "Responsabilidades internas", description: "Quem responde por cada parte do onboarding." },
  { short: "Liberação", title: "Checklist de liberação do cliente", description: "Antes de considerar o onboarding concluído, confirmar todos os itens.", groups: [
    { title: "Documentação", items: ["Contrato estruturado e assinado", "Dados cadastrais e condições comerciais conferidos"] },
    { title: "Financeiro", items: ["Pagamento confirmado", "Forma de pagamento definida"] },
    { title: "Relacionamento", items: ["Boas-vindas enviadas e responsável apresentado", "Reunião de onboarding realizada"] },
    { title: "Estratégia", items: ["Diagnóstico e público definidos", "Estratégia e pilares de conteúdo estruturados"] },
    { title: "Produção", items: ["Primeiros conteúdos produzidos e aprovados", "Calendário inicial organizado"] },
    { title: "Experiência do cliente", items: ["Apresentação personalizada entregue", "PIX estruturado (quando aplicável)", "Cliente orientado sobre os próximos passos"] },
  ] },
  { short: "Próximos passos", title: "Próximos passos", description: "O que foi entendido -> o que será feito -> como será feito -> quando será entregue." },
];

export const roleGroups = [
  ["Comercial", "Formalização do fechamento", "Alinhamento do que foi vendido", "Repasse das informações comerciais", "Garantia de escopo claro"],
  ["Onboarding / Atendimento", "Primeiro contato", "Boas-vindas", "Organização das informações", "Agendamento", "Acompanhamento dos prazos"],
  ["Estratégia", "Diagnóstico", "Mapeamento", "Definição do direcionamento", "Estratégia de comunicação"],
  ["Criação / Marketing", "Transformar estratégia em conteúdo", "Criar materiais", "Desenvolver peças", "Organizar calendário"],
];

export function stageItems(index: number) {
  return stages[index]?.groups?.flatMap((group) => group.items) ?? [];
}
