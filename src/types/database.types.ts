export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ClienteStatus =
  | "pendente_link"
  | "link_ativo"
  | "aguardando_cadastro"
  | "cadastro_recebido"
  | "contrato_gerado"
  | "contrato_enviado"
  | "assinado"
  | "concluido"
  | "expirado"
  | "bloqueado";

export type ContratoStatusEnvio = "rascunho" | "gerado" | "enviado_ao_cliente" | "assinado";

export type OrigemContrato = "automatico" | "manual";

// Escrito a mao no formato que o supabase-js espera (Relationships/Views).
// Mantenha alinhado com supabase/migrations.
export type Database = {
  public: {
    Tables: {
      clientes_onboarding: {
        Row: {
          id: string;
          nome_completo: string;
          email: string | null;
          whatsapp: string | null;
          status: ClienteStatus;
          apresentacao_pdf_url: string | null;
          apresentacao_pdf_nome: string | null;
          pix_pago: boolean;
          pix_pago_em: string | null;
          link_onboarding_form: string | null;
          comprovante_pix_path: string | null;
          comprovante_pix_nome: string | null;
          comprovante_pix_enviado_em: string | null;
          data_programacao: string | null;
          onboarding_aberto_em: string | null;
          onboarding_confirmado_em: string | null;
          onboarding_confirmado_por: "cliente" | "gestor" | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome_completo: string;
          email?: string | null;
          whatsapp?: string | null;
          status?: ClienteStatus;
          apresentacao_pdf_url?: string | null;
          apresentacao_pdf_nome?: string | null;
          pix_pago?: boolean;
          pix_pago_em?: string | null;
          link_onboarding_form?: string | null;
          comprovante_pix_path?: string | null;
          comprovante_pix_nome?: string | null;
          comprovante_pix_enviado_em?: string | null;
          data_programacao?: string | null;
          onboarding_aberto_em?: string | null;
          onboarding_confirmado_em?: string | null;
          onboarding_confirmado_por?: "cliente" | "gestor" | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clientes_onboarding"]["Insert"]>;
        Relationships: [];
      };
      links_temporarios: {
        Row: {
          id: string;
          cliente_id: string;
          token: string;
          expira_em: string;
          bloqueado_manualmente: boolean;
          bloqueado_em: string | null;
          motivo_bloqueio: string | null;
          acessos_count: number;
          ultimo_acesso_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          token?: string;
          expira_em?: string;
          bloqueado_manualmente?: boolean;
          bloqueado_em?: string | null;
          motivo_bloqueio?: string | null;
          acessos_count?: number;
          ultimo_acesso_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["links_temporarios"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "links_temporarios_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes_onboarding";
            referencedColumns: ["id"];
          },
        ];
      };
      dados_cadastrais_cliente: {
        Row: {
          id: string;
          cliente_id: string;
          razao_social: string;
          nome_fantasia: string | null;
          cnpj: string | null;
          inscricao_estadual: string | null;
          cep: string;
          logradouro: string;
          numero: string;
          complemento: string | null;
          bairro: string;
          cidade: string;
          uf: string;
          representante_nome: string;
          representante_cpf: string;
          representante_rg: string | null;
          representante_profissao: string | null;
          representante_estado_civil: string | null;
          email_financeiro: string;
          telefone_financeiro: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          razao_social: string;
          nome_fantasia?: string | null;
          cnpj?: string | null;
          inscricao_estadual?: string | null;
          cep: string;
          logradouro: string;
          numero: string;
          complemento?: string | null;
          bairro: string;
          cidade: string;
          uf: string;
          representante_nome: string;
          representante_cpf: string;
          representante_rg?: string | null;
          representante_profissao?: string | null;
          representante_estado_civil?: string | null;
          email_financeiro: string;
          telefone_financeiro?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["dados_cadastrais_cliente"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "dados_cadastrais_cliente_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: true;
            referencedRelation: "clientes_onboarding";
            referencedColumns: ["id"];
          },
        ];
      };
      modelos_contrato: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          template_storage_path: string;
          variaveis_tags: Json;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao?: string | null;
          template_storage_path: string;
          variaveis_tags?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["modelos_contrato"]["Insert"]>;
        Relationships: [];
      };
      contratos: {
        Row: {
          id: string;
          cliente_id: string;
          modelo_id: string | null;
          origem: OrigemContrato;
          valor_mensal: number | null;
          dia_vencimento: number | null;
          status_envio: ContratoStatusEnvio;
          liberado_para_cliente: boolean;
          docx_storage_path: string | null;
          docx_nome: string | null;
          docx_assinado_storage_path: string | null;
          docx_assinado_nome: string | null;
          enviado_ao_cliente_em: string | null;
          assinado_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          modelo_id?: string | null;
          origem?: OrigemContrato;
          valor_mensal?: number | null;
          dia_vencimento?: number | null;
          status_envio?: ContratoStatusEnvio;
          liberado_para_cliente?: boolean;
          docx_storage_path?: string | null;
          docx_nome?: string | null;
          docx_assinado_storage_path?: string | null;
          docx_assinado_nome?: string | null;
          enviado_ao_cliente_em?: string | null;
          assinado_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contratos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes_onboarding";
            referencedColumns: ["id"];
          },
        ];
      };
      gestores: {
        Row: {
          user_id: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gestores"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      validar_link_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      submeter_cadastro_cliente: {
        Args: { p_token: string; p_dados: Json };
        Returns: Json;
      };
      prorrogar_link: {
        Args: { p_link_id: string; p_minutos: number };
        Returns: Json;
      };
      bloquear_link: {
        Args: { p_link_id: string; p_motivo?: string };
        Returns: Json;
      };
      desbloquear_link: {
        Args: { p_link_id: string };
        Returns: Json;
      };
      excluir_link_temporario: {
        Args: { p_link_id: string };
        Returns: Json;
      };
      atualizar_status_pix: {
        Args: { p_cliente_id: string; p_pago: boolean };
        Returns: Json;
      };
      emitir_e_enviar_contrato: {
        Args: {
          p_cliente_id: string;
          p_modelo_id: string | null;
          p_valor_mensal: number;
          p_dia_vencimento: number;
        };
        Returns: Json;
      };
      confirmar_onboarding_form: {
        Args: { p_token: string };
        Returns: Json;
      };
      registrar_abertura_onboarding: {
        Args: { p_token: string };
        Returns: Json;
      };
      anexar_contrato_manual: {
        Args: {
          p_cliente_id: string;
          p_path: string;
          p_nome: string;
          p_valor_mensal?: number | null;
          p_dia_vencimento?: number | null;
        };
        Returns: Json;
      };
      liberar_contrato_cliente: {
        Args: { p_contrato_id: string };
        Returns: Json;
      };
      registrar_comprovante_pix: {
        Args: { p_token: string; p_path: string; p_nome: string };
        Returns: Json;
      };
      registrar_contrato_assinado: {
        Args: { p_token: string; p_path: string; p_nome: string };
        Returns: Json;
      };
      is_gestor: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}
