// Codigos devolvidos pelas RPCs/server functions -> mensagem para a tela.
const MENSAGENS_ERRO: Record<string, string> = {
  LINK_INVALIDO_OU_EXPIRADO: "Este link expirou ou foi bloqueado. Fale com seu gestor WRMax.",
  CONTRATO_NAO_LIBERADO: "O contrato ainda não foi liberado pelo gestor.",
  CONFIRMACAO_AINDA_NAO_LIBERADA: "A confirmação ainda não foi liberada. Responda o formulário com calma e tente de novo em alguns minutos.",
  FORMULARIO_NAO_ABERTO: "Abra o formulário de onboarding antes de confirmar o preenchimento.",
  CADASTRO_INCOMPLETO: "Preencha o nome completo, o CPF e o e-mail.",
  CPF_INVALIDO: "CPF inválido. Confira os números e tente de novo.",
  CNPJ_INVALIDO: "CNPJ inválido. Confira os números ou deixe o campo em branco.",
  CONTRATO_JA_VALIDADO: "Este contrato já foi validado pelo gestor. Fale com a WRMax se precisar trocar a via.",
  VIA_ASSINADA_AUSENTE: "O cliente ainda não enviou a via assinada.",
  // coluna obrigatoria no banco antigo (ex.: CNPJ sem a migration 20261009)
  "violates not-null constraint":
    "O servidor ainda não recebeu a atualização do cadastro (migration pendente). Avise o gestor WRMax.",
  CONTRATO_NAO_ENCONTRADO: "Contrato não encontrado. Atualize a página e tente de novo.",
  CLIENTE_NAO_ENCONTRADO: "Cliente não encontrado. Atualize a página e tente de novo.",
  ARQUIVO_MUITO_GRANDE: "O arquivo excede o tamanho máximo permitido.",
  TIPO_DE_ARQUIVO_NAO_PERMITIDO: "Formato de arquivo não permitido.",
  ARQUIVO_INVALIDO: "Arquivo inválido. Tente enviar novamente.",
  ARQUIVO_NAO_ENCONTRADO: "O arquivo não chegou ao servidor. Tente enviar novamente.",
  ARMAZENAMENTO_NAO_CONFIGURADO: "Envio de arquivos indisponível no momento. Fale com seu gestor WRMax.",
  ACESSO_NEGADO: "Seu usuário não tem permissão de gestor.",
  "row-level security": "Seu usuário não tem permissão de gestor.",
  MODELO_NAO_ENCONTRADO: "Modelo de contrato não encontrado ou inativo.",
  VALOR_MENSAL_INVALIDO: "Informe um valor mensal maior que zero.",
  DIA_VENCIMENTO_INVALIDO: "O dia de vencimento deve estar entre 1 e 31.",
  SUPABASE_NAO_CONFIGURADO: "Supabase não configurado neste ambiente.",
  // RPC/coluna inexistente: migration nao aplicada no banco
  "Could not find the function": "Recurso indisponível no servidor: o banco ainda não recebeu a atualização (migration pendente). Avise o gestor WRMax.",
  PGRST202: "Recurso indisponível no servidor: o banco ainda não recebeu a atualização (migration pendente). Avise o gestor WRMax.",
  // tabela inexistente (ex.: checklist_producao sem a migration 20261011)
  "Could not find the table": "Recurso indisponível no servidor: o banco ainda não recebeu a atualização (migration pendente). Avise o gestor WRMax.",
  PGRST205: "Recurso indisponível no servidor: o banco ainda não recebeu a atualização (migration pendente). Avise o gestor WRMax.",
  "does not exist": "Recurso indisponível no servidor: o banco ainda não recebeu a atualização (migration pendente). Avise o gestor WRMax.",
};

export function mensagemDeErro(err: unknown, padrao: string): string {
  const texto =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
  const codigo = Object.keys(MENSAGENS_ERRO).find((c) => texto.includes(c));
  return codigo ? MENSAGENS_ERRO[codigo]! : padrao;
}
