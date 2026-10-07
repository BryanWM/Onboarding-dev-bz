import { supabase, isSupabaseConfigured } from "./supabase-client";
import { MOCK_CLIENTES } from "./mock-data";
import type { ClienteOnboarding } from "./mock-data";

export interface ValidacaoTokenResultado {
  valido: boolean;
  motivo?: string;
  link?: {
    id: string;
    token?: string;
    expira_em: string;
    segundos_restantes?: number;
    bloqueado_manualmente?: boolean;
  };
  cliente?: {
    id: string;
    nome_completo: string;
    email: string | null;
    whatsapp: string | null;
    status: string;
    apresentacao_pdf_url: string | null;
    apresentacao_pdf_nome: string | null;
    pix_pago: boolean;
    link_onboarding_form?: string | null;
  };
  cadastro_preenchido?: boolean;
  dados_cadastrais?: Record<string, any> | null;
  contrato_liberado?: boolean;
  contrato?: {
    id: string;
    valor_mensal: number;
    dia_vencimento: number;
    status_envio: string;
    docx_storage_path: string | null;
    docx_assinado_storage_path: string | null;
  };
}

export async function validarLinkToken(token: string): Promise<ValidacaoTokenResultado> {
  if (!token) {
    return { valido: false, motivo: "TOKEN_NAO_ENCONTRADO" };
  }

  // 0. Bloqueio imediato caso o projeto ou token tenha sido excluido
  if (typeof window !== "undefined") {
    try {
      const tokExcluidosRaw = localStorage.getItem("wrmax_tokens_excluidos");
      if (tokExcluidosRaw) {
        const tokExcluidos: string[] = JSON.parse(tokExcluidosRaw);
        if (tokExcluidos.includes(token)) {
          return { valido: false, motivo: "PROJETO_EXCLUIDO" };
        }
      }
      const cliExcluidosRaw = localStorage.getItem("wrmax_clientes_excluidos");
      if (cliExcluidosRaw) {
        const cliExcluidos: string[] = JSON.parse(cliExcluidosRaw);
        if (cliExcluidos.includes(token)) {
          return { valido: false, motivo: "PROJETO_EXCLUIDO" };
        }
      }
    } catch {}
  }

  let resultado: ValidacaoTokenResultado = { valido: false, motivo: "TOKEN_NAO_ENCONTRADO" };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc("validar_link_token", { p_token: token });
      if (error) {
        return { valido: false, motivo: error.message };
      }
      if (data) {
        const rpcRes = data as unknown as ValidacaoTokenResultado;
        if (rpcRes.valido) return rpcRes;
      }
    } catch {
      // continua para fallback
    }
  }

  // 1. Procurar em clientes locais salvos no localStorage
  if (typeof window !== "undefined") {
    try {
      const locaisRaw = localStorage.getItem("wrmax_clientes_locais");
      if (locaisRaw) {
        const locais: ClienteOnboarding[] = JSON.parse(locaisRaw);
        const cliLocal = locais.find((c) =>
          c.links_temporarios?.some((l) => l.token === token) || c.id === token
        );
        if (cliLocal) {
          const linkLocal = cliLocal.links_temporarios?.find((l) => l.token === token);
          return {
            valido: !linkLocal?.bloqueado_manualmente,
            motivo: linkLocal?.bloqueado_manualmente ? "MANUALLY_BLOCKED" : undefined,
            link: linkLocal || {
              id: `local-link-${token}`,
              token,
              expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
              segundos_restantes: 18000,
              bloqueado_manualmente: false,
            },
            cliente: {
              id: cliLocal.id,
              nome_completo: cliLocal.nome_completo,
              email: cliLocal.email || null,
              whatsapp: cliLocal.whatsapp || null,
              status: cliLocal.status || "link_ativo",
              apresentacao_pdf_url: cliLocal.apresentacao_pdf_url || null,
              apresentacao_pdf_nome: cliLocal.apresentacao_pdf_nome || null,
              pix_pago: Boolean(cliLocal.pix_pago),
              link_onboarding_form: cliLocal.link_onboarding_form || null,
            },
            cadastro_preenchido: Boolean(cliLocal.dados_cadastrais_cliente?.length),
            dados_cadastrais: cliLocal.dados_cadastrais_cliente?.[0] || null,
            contrato_liberado: Boolean(cliLocal.contratos?.length),
            contrato: cliLocal.contratos?.[0] || null,
          };
        }
      }
    } catch {}
  }

  // 2. Procurar em MOCK_CLIENTES
  const cliMock = MOCK_CLIENTES.find((c) =>
    c.links_temporarios?.some((l) => l.token === token) || c.id === token
  );
  if (cliMock) {
    const linkMock = cliMock.links_temporarios?.find((l) => l.token === token);
    return {
      valido: !linkMock?.bloqueado_manualmente,
      motivo: linkMock?.bloqueado_manualmente ? "MANUALLY_BLOCKED" : undefined,
      link: linkMock || {
        id: `mock-link-${token}`,
        token,
        expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
        segundos_restantes: 18000,
        bloqueado_manualmente: false,
      },
      cliente: {
        id: cliMock.id,
        nome_completo: cliMock.nome_completo,
        email: cliMock.email || null,
        whatsapp: cliMock.whatsapp || null,
        status: cliMock.status,
        apresentacao_pdf_url: cliMock.apresentacao_pdf_url || null,
        apresentacao_pdf_nome: cliMock.apresentacao_pdf_nome || null,
        pix_pago: Boolean(cliMock.pix_pago),
        link_onboarding_form: cliMock.link_onboarding_form || null,
      },
      cadastro_preenchido: false,
      contrato_liberado: false,
    };
  }

  // 3. Fallback defensivo exclusivo para tokens de desenvolvimento de testes locais
  if (token === "tok_padrao" || token.startsWith("mock-")) {
    resultado = {
      valido: true,
      link: {
        id: `mock-link-${token}`,
        token,
        expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
        segundos_restantes: 18000,
        bloqueado_manualmente: false,
      },
      cliente: {
        id: `mock-cliente-${token}`,
        nome_completo: "Cliente Parceiro WRMax",
        email: "contato@cliente.com.br",
        whatsapp: "86999216675",
        status: "link_ativo",
        apresentacao_pdf_url: null,
        apresentacao_pdf_nome: null,
        pix_pago: false,
        link_onboarding_form: null,
      },
      cadastro_preenchido: false,
      contrato_liberado: false,
    };
  }

  if (typeof window !== "undefined") {
    try {
      const cadLocal = localStorage.getItem(`wrmax_cadastro_${token}`);
      if (cadLocal) {
        resultado.cadastro_preenchido = true;
        resultado.dados_cadastrais = JSON.parse(cadLocal);
      }
    } catch {}
  }

  return resultado;
}
