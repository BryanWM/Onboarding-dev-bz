// Codigos devolvidos pelas RPCs/server functions -> mensagem para a tela.
const MENSAGENS_ERRO: Record<string, string> = {
  LINK_INVALIDO_OU_EXPIRADO: "Este link expirou ou foi bloqueado. Fale com seu gestor WRMax.",
  CONTRATO_NAO_LIBERADO: "O contrato ainda não foi liberado pelo gestor.",
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
