export interface ClienteOnboarding {
  id: string;
  nome_completo: string;
  email?: string | null;
  whatsapp?: string | null;
  status: string;
  apresentacao_pdf_url?: string | null;
  apresentacao_pdf_nome?: string | null;
  link_onboarding_form?: string | null;
  contrato_assinado?: any;
  pix_pago?: boolean;
  pix_pago_em?: string | null;
  comprovante_pix_path?: string | null;
  comprovante_pix_nome?: string | null;
  comprovante_pix_enviado_em?: string | null;
  data_programacao?: string | null;
  onboarding_aberto_em?: string | null;
  onboarding_confirmado_em?: string | null;
  onboarding_confirmado_por?: "cliente" | "gestor" | null;
  created_at?: string;
  links_temporarios?: Array<{
    id: string;
    token: string;
    expira_em?: string;
    bloqueado_manualmente?: boolean;
    segundos_restantes?: number;
    acessos_count?: number;
  }>;
  dados_cadastrais_cliente?: Array<{
    razao_social: string;
    cnpj: string | null;
    nome_fantasia?: string | null;
    representante_nome?: string;
    representante_cpf?: string;
    email_financeiro?: string;
    telefone_financeiro?: string | null;
    logradouro?: string | null;
  }>;
  contratos?: Array<{
    id: string;
    origem?: "automatico" | "manual";
    valor_mensal: number | null;
    dia_vencimento: number | null;
    status_envio?: string;
    docx_nome?: string | null;
    assinado_em?: string | null;
    created_at?: string;
    liberado_para_cliente?: boolean;
    docx_storage_path?: string | null;
    docx_assinado_storage_path?: string | null;
    docx_assinado_nome?: string | null;
    modelo_id?: string | null;
  }>;
}

export const MOCK_CLIENTES: ClienteOnboarding[] = [
  {
    id: "mock-1",
    nome_completo: "Loja Exemplo Modas",
    email: "contato@lojaexemplo.com.br",
    whatsapp: "86999991111",
    status: "link_ativo",
    apresentacao_pdf_url: null,
    apresentacao_pdf_nome: "Proposta_Comercial_LojaExemplo.pdf",
    pix_pago: false,
    created_at: new Date().toISOString(),
    links_temporarios: [
      {
        id: "link-1",
        token: "tok_loja_exemplo_123",
        expira_em: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        bloqueado_manualmente: false,
        acessos_count: 2,
      },
    ],
  },
  {
    id: "mock-2",
    nome_completo: "Clinica Odontologica Sorrir",
    email: "financeiro@sorrir.com.br",
    whatsapp: "86999992222",
    status: "cadastro_recebido",
    apresentacao_pdf_url: null,
    apresentacao_pdf_nome: "Apresentacao_Sorrir.pdf",
    pix_pago: true,
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    links_temporarios: [
      {
        id: "link-2",
        token: "tok_sorrir_456",
        expira_em: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        bloqueado_manualmente: false,
        acessos_count: 5,
      },
    ],
    dados_cadastrais_cliente: [
      {
        razao_social: "Clinica Sorrir Odontologia Eireli",
        cnpj: "34.567.890/0001-12",
        representante_nome: "Dr. Carlos Eduardo",
        email_financeiro: "financeiro@sorrir.com.br",
      },
    ],
  },
];

export const MOCK_MODELOS = [
  {
    id: "modelo-padrao-1",
    titulo: "Contrato de Prestacao de Servicos Digitais WRMax (Padrao)",
    descricao: "Modelo padrao com clausulas gerais de desenvolvimento, suporte mensal e SLA.",
    template_storage_path: "modelos-contrato/contrato_padrao_wrmax.docx",
    variaveis_tags: [
      "{{RAZAO_SOCIAL}}",
      "{{CNPJ}}",
      "{{REPRESENTANTE_NOME}}",
      "{{REPRESENTANTE_CPF}}",
      "{{VALOR_MENSAL}}",
      "{{DIA_VENCIMENTO}}",
      "{{CIDADE}}",
      "{{UF}}",
    ],
    ativo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "modelo-consultoria-2",
    titulo: "Contrato de Consultoria e Assessoria Tecnologica",
    descricao: "Modelo especifico para projetos pontuais com horas pre-fixadas e suporte consultivo.",
    template_storage_path: "modelos-contrato/contrato_consultoria_wrmax.docx",
    variaveis_tags: [
      "{{RAZAO_SOCIAL}}",
      "{{CNPJ}}",
      "{{REPRESENTANTE_NOME}}",
      "{{VALOR_MENSAL}}",
      "{{DIA_VENCIMENTO}}",
    ],
    ativo: true,
    created_at: new Date().toISOString(),
  },
];
