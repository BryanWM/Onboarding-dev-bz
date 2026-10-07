/**
 * Utilitario para geracao de payload oficial do PIX (BR Code / EMVCo)
 * Padrao Banco Central do Brasil
 */

export interface PixPayloadConfig {
  chavePix: string;
  nomeRecebedor?: string;
  cidadeRecebedor?: string;
  valor?: number;
  txid?: string;
}

// Payload BR Code oficial da WRMax extraido do QR Code padrao da empresa
export const WRMAX_PIX_BR_CODE_DEFAULT =
  "00020126540014br.gov.bcb.pix0132financeiro@wrmaxmarketing.com.br5204000053039865802BR5901N6001C62140510KFGMoreira63049FE3";

/**
 * Calcula o checksum CRC16-CCITT (0xFFFF) segundo padrao EMVCo / BACEN
 */
export function calcularCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatarCampoEmv(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/**
 * Gera a string Pix Copia e Cola (BR Code) oficial reconhecida por qualquer app de banco
 */
export function gerarPixCopiaECola(config: PixPayloadConfig): string {
  const {
    chavePix,
    nomeRecebedor = "KFGMoreira",
    cidadeRecebedor = "TERESINA",
    valor,
    txid = "KFGMoreira",
  } = config;

  // Se a chave for a padrao da WRMax e nao houver valor especifico, retorna o BR Code oficial testado
  if (
    chavePix.toLowerCase() === "financeiro@wrmaxmarketing.com.br" &&
    !valor &&
    txid === "KFGMoreira"
  ) {
    return WRMAX_PIX_BR_CODE_DEFAULT;
  }

  let payload = formatarCampoEmv("00", "01");
  const gui = formatarCampoEmv("00", "br.gov.bcb.pix");
  const chave = formatarCampoEmv("01", chavePix);
  payload += formatarCampoEmv("26", `${gui}${chave}`);
  payload += formatarCampoEmv("52", "0000");
  payload += formatarCampoEmv("53", "986");

  if (valor && valor > 0) {
    payload += formatarCampoEmv("54", valor.toFixed(2));
  }

  payload += formatarCampoEmv("58", "BR");
  const nomeSanitizado = nomeRecebedor.substring(0, 25);
  payload += formatarCampoEmv("59", nomeSanitizado);
  const cidadeSanitizada = cidadeRecebedor.substring(0, 15);
  payload += formatarCampoEmv("60", cidadeSanitizada);
  const txidSanitizado = (txid || "***").substring(0, 25);
  const txidCampo = formatarCampoEmv("05", txidSanitizado);
  payload += formatarCampoEmv("62", txidCampo);
  payload += "6304";
  const crc = calcularCrc16(payload);

  return `${payload}${crc}`;
}
