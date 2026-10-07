import type { DadosContratoForm } from "@/lib/contrato-generator";

export interface CampoContratoConfig {
  id: keyof DadosContratoForm;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
}

export const DADOS_EXEMPLO_MOCK: DadosContratoForm = {
  nome: "Studio Alpha Saúde & Estética Integrada Ltda",
  documento: "42.819.304/0001-92",
  email: "diretoria@studioalpha.com.br",
  telefone: "(86) 99812-4433",
  profissao: "Diretor Executivo / Administrador",
  estadoCivil: "Casado(a)",
  endereco: "Av. Frei Serafim, 2450, Sala 801 - Centro, Teresina - PI",
  cep: "64000-020",
  valorMensal: "2.850,00",
  diaVencimento: "15",
};

export const VALORES_INICIAIS_FORM: DadosContratoForm = {
  nome: "",
  documento: "",
  email: "",
  telefone: "",
  profissao: "",
  estadoCivil: "",
  endereco: "",
  cep: "",
  valorMensal: "2.850,00",
  diaVencimento: "15",
};

export const CAMPOS_CONTRATO: CampoContratoConfig[] = [
  {
    id: "nome",
    label: "Nome completo / Razão social",
    type: "text",
    placeholder: "Ex: Studio Alpha Saúde & Estética Integrada Ltda",
    required: true,
  },
  {
    id: "documento",
    label: "CPF ou CNPJ",
    type: "text",
    placeholder: "Ex: 42.819.304/0001-92 ou 123.456.789-00",
    required: true,
  },
  {
    id: "email",
    label: "E-mail de contato",
    type: "email",
    placeholder: "Ex: diretoria@studioalpha.com.br",
    required: true,
  },
  {
    id: "telefone",
    label: "WhatsApp / Telefone",
    type: "tel",
    placeholder: "Ex: (86) 99812-4433",
    required: true,
  },
  {
    id: "profissao",
    label: "Profissão / Cargo",
    type: "text",
    placeholder: "Ex: Diretor Executivo, Cirurgião Dentista",
  },
  {
    id: "estadoCivil",
    label: "Estado civil",
    type: "text",
    placeholder: "Ex: Casado(a), Solteiro(a)",
  },
  {
    id: "endereco",
    label: "Endereço completo (Rua, nº, bairro, cidade/UF)",
    type: "text",
    placeholder: "Ex: Av. Frei Serafim, 2450, Sala 801 - Centro, Teresina - PI",
    required: true,
  },
  { id: "cep", label: "CEP", type: "text", placeholder: "Ex: 64000-020", required: true },
  { id: "valorMensal", label: "Valor mensal (R$)", type: "text", placeholder: "2.850,00" },
  { id: "diaVencimento", label: "Dia de vencimento", type: "text", placeholder: "15" },
];
