import JSZip from "jszip";

export interface DadosContratoForm {
  nome: string;
  documento: string;
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
  endereco: string;
  cep: string;
  email: string;
  telefone?: string;
  valorMensal?: string;
  diaVencimento?: string;
  dataInicio?: string;
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function converterReaisPorExtenso(num: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenasEspeciais = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  const dezenas = [
    "",
    "dez",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];
  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  function centenaTexto(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];
    if (c > 0 && centenas[c]) partes.push(centenas[c]!);
    if (d === 1 && dezenasEspeciais[u]) {
      partes.push(dezenasEspeciais[u]!);
    } else {
      if (d > 1 && dezenas[d]) partes.push(dezenas[d]!);
      if (u > 0 && unidades[u]) partes.push(unidades[u]!);
    }
    return partes.join(" e ");
  }

  const inteiro = Math.floor(num);
  if (inteiro === 0) return "zero reais";
  const milhares = Math.floor(inteiro / 1000);
  const resto = inteiro % 1000;
  const partes: string[] = [];

  if (milhares > 0) {
    partes.push(milhares === 1 ? "um mil" : `${centenaTexto(milhares)} mil`);
  }
  if (resto > 0) {
    partes.push(centenaTexto(resto));
  }
  return partes.join(" e ") + (inteiro === 1 ? " real" : " reais");
}

export function formatarValorPorExtenso(valorStr: string): string {
  const clean = (valorStr || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) {
    return "um mil e quinhentos reais";
  }
  return converterReaisPorExtenso(num);
}

function formatarDataBR(d: Date): string {
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export function compilarVariaveisContrato(
  dados: DadosContratoForm,
  dataReferencia: Date = new Date(),
): Record<string, string> {
  const inicio = dataReferencia;
  const termino = new Date(inicio);
  termino.setDate(termino.getDate() + 90);

  const nome = (dados.nome || "Cliente Parceiro").trim();
  const doc = (dados.documento || "A informar nos dados cadastrais").trim();
  const endereco = (dados.endereco || "Teresina - PI").trim();
  const cep = dados.cep?.trim() || "{{CEP}}";
  const email = (dados.email || "contato@empresa.com").trim();
  const nac = (dados.nacionalidade || "brasileiro(a)").trim();
  const estCivil = (dados.estadoCivil || "solteiro(a)").trim();
  const prof = (dados.profissao || "empresário(a)").trim();
  // Sem valor/vencimento informados a tag fica no texto (melhor do que um valor inventado)
  const diaVenc = dados.diaVencimento?.trim() || "{{DIA_VENCIMENTO}}";

  const valor = dados.valorMensal?.trim() || "{{VALOR_MENSAL}}";
  const valorExtenso = dados.valorMensal?.trim() ? formatarValorPorExtenso(valor) : "{{VALOR_MENSAL_EXTENSO}}";

  return {
    // Tags oficiais do modelo WRMAX
    "{{NOME_COMPLETO_OU_RAZAO_SOCIAL}}": nome,
    "{{NACIONALIDADE}}": nac,
    "{{ESTADO_CIVIL}}": estCivil,
    "{{PROFISSAO}}": prof,
    "{{CPF_OU_CNPJ}}": doc,
    "{{ENDERECO_COMPLETO}}": endereco,
    "{{CEP}}": cep,
    "{{EMAIL_CLIENTE}}": email,
    "{{PRAZO_VIGENCIA_DIAS}}": "90",
    "{{PRAZO_VIGENCIA_EXTENSO}}": "noventa",
    "{{DATA_INICIO_VIGENCIA}}": formatarDataBR(inicio),
    "{{DATA_TERMINO_VIGENCIA}}": formatarDataBR(termino),
    "{{VALOR_MENSAL}}": valor,
    "{{VALOR_MENSAL_EXTENSO}}": valorExtenso,
    "{{DURACAO_MESES}}": "3",
    "{{DURACAO_MESES_EXTENSO}}": "três",
    "{{DIA_VENCIMENTO}}": diaVenc,
    "{{DIA_ASSINATURA}}": String(inicio.getDate()),
    "{{MES_ASSINATURA_EXTENSO}}": MESES[inicio.getMonth()] || "janeiro",
    "{{ANO_ASSINATURA}}": String(inicio.getFullYear()),

    // Aliases defensivos adicionais
    "{{RAZAO_SOCIAL}}": nome,
    "{{NOME_CLIENTE}}": nome,
    "{{REPRESENTANTE_NOME}}": nome,
    "{{CNPJ}}": doc,
    "{{CPF}}": doc,
    "{{DOCUMENTO}}": doc,
    "{{EMAIL}}": email,
    "{{ENDERECO}}": endereco,
    "{{VALOR}}": valor,
    "{{VENCIMENTO}}": diaVenc,
  };
}

export async function gerarContratoDocx(
  dados: DadosContratoForm,
  templateBuffer?: ArrayBuffer,
  customTemplateUrl?: string,
): Promise<{ blob: Blob; fileName: string }> {
  let buffer = templateBuffer;
  if (!buffer) {
    const urlsToTry = [
      customTemplateUrl,
      "/contratos/Contrato_WRMAX_Modelo_Parametrizado.docx",
      "/modelo_de_contratos/predefinidos/Contrato_WRMAX_Modelo_Parametrizado.docx",
    ].filter(Boolean) as string[];

    let lastError: Error | null = null;
    for (const url of urlsToTry) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          buffer = await response.arrayBuffer();
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!buffer) {
      throw new Error(`Falha ao carregar modelo de contrato: ${lastError?.message || "Modelo não encontrado"}`);
    }
  }

  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Arquivo word/document.xml não encontrado no arquivo DOCX");
  }

  let xml = await docXmlFile.async("string");
  const mapa = compilarVariaveisContrato(dados);

  for (const [placeholder, valor] of Object.entries(mapa)) {
    xml = xml.replaceAll(placeholder, escapeXml(valor));
  }

  zip.file("word/document.xml", xml);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const nomeSanitizado = (dados.nome || "Cliente")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);

  const fileName = `Contrato_WRMAX_${nomeSanitizado || "Cliente"}.docx`;
  return { blob, fileName };
}

export function baixarBlobNoNavegador(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function gerarLinkWhatsappContrato(
  dados: DadosContratoForm,
  whatsappDestino = "5586999216675",
): string {
  const texto = encodeURIComponent(
    `Olá! Acabei de gerar meu contrato de prestação de serviços na Central WRMax.\n\n` +
      `Nome: ${dados.nome}\n` +
      `CPF/CNPJ: ${dados.documento}\n` +
      `E-mail: ${dados.email}\n` +
      `Estou enviando para formalizarmos a assinatura.`,
  );
  return `https://wa.me/${whatsappDestino}?text=${texto}`;
}
