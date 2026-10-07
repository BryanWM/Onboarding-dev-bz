import { supabase, isSupabaseConfigured, isModoDemo } from "./supabase-client";
import { MOCK_CLIENTES } from "./mock-data";
import type { ClienteOnboarding } from "./mock-data";
import type { Database } from "../types/database.types";
import { montarRefStorage } from "./storage-refs";
import { mensagemDeErro } from "./erros";

function getStorage<T>(key: string, def: T): T {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
}

function setStorage(key: string, val: unknown) {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function exigirSupabaseOuDemo(): boolean {
  if (isSupabaseConfigured) return true;
  if (isModoDemo) return false;
  throw new Error("SUPABASE_NAO_CONFIGURADO");
}

function baseUrlLinks() {
  if (typeof window === "undefined") return "http://localhost:8080";
  return window.location.port === "8081" ? "http://localhost:8080" : window.location.origin;
}

export async function listarClientes(): Promise<ClienteOnboarding[]> {
  if (exigirSupabaseOuDemo()) {
    const { data, error } = await supabase
      .from("clientes_onboarding")
      .select("*, links_temporarios(*), dados_cadastrais_cliente(*), contratos(*)")
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "links_temporarios", ascending: false })
      .order("created_at", { referencedTable: "contratos", ascending: false });
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível carregar os clientes."));
    return (data || []) as unknown as ClienteOnboarding[];
  }

  return listarClientesModoDemo();
}

function listarClientesModoDemo(): ClienteOnboarding[] {
  let clientes: ClienteOnboarding[] = [...MOCK_CLIENTES];
  if (typeof window === "undefined") return clientes;

  const locais = getStorage<ClienteOnboarding[]>("wrmax_clientes_locais", []);
  locais.forEach((loc) => {
    if (!clientes.some((c) => c.id === loc.id)) clientes.unshift(loc);
  });

  const editados = getStorage<Record<string, any>>("wrmax_clientes_editados", {});
  clientes = clientes.map((c) => (editados[c.id] ? { ...c, ...editados[c.id] } : c));

  const excluidos = getStorage<string[]>("wrmax_clientes_excluidos", []);
  if (excluidos.length > 0) {
    clientes = clientes.filter((c) => !excluidos.includes(c.id));
  }
  return clientes;
}

export async function criarClienteComLink(
  nome: string,
  email: string,
  whatsapp: string,
  apresentacaoFile?: File,
  dataProgramacao?: string,
  linkOnboardingForm?: string
) {
  const base = baseUrlLinks();

  if (exigirSupabaseOuDemo()) {
    let pdfRef: string | null = null;
    let pdfNome: string | null = null;

    if (apresentacaoFile) {
      const caminho = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("apresentacoes-pdf")
        .upload(caminho, apresentacaoFile, { contentType: "application/pdf" });
      if (uploadError) throw new Error(mensagemDeErro(uploadError, "Falha no envio da apresentação em PDF."));
      pdfRef = montarRefStorage("apresentacoes-pdf", caminho);
      pdfNome = apresentacaoFile.name;
    }

    const { data: cliente, error: cliError } = await supabase
      .from("clientes_onboarding")
      .insert({
        nome_completo: nome,
        email: email || null,
        whatsapp: whatsapp || null,
        status: "link_ativo",
        apresentacao_pdf_url: pdfRef,
        apresentacao_pdf_nome: pdfNome,
        link_onboarding_form: linkOnboardingForm || null,
        data_programacao: dataProgramacao || null,
      })
      .select()
      .single();
    if (cliError || !cliente) throw new Error(mensagemDeErro(cliError, "Não foi possível cadastrar o cliente."));

    const { data: link, error: linkError } = await supabase
      .from("links_temporarios")
      .insert({
        cliente_id: cliente.id,
        expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      })
      .select()
      .single();
    if (linkError || !link) throw new Error(mensagemDeErro(linkError, "Cliente cadastrado, mas o link não foi gerado."));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wrmax:cliente_criado", { detail: { ...cliente, links_temporarios: [link] } })
      );
    }
    return { clienteId: cliente.id, token: link.token, linkCompleto: `${base}/c/${link.token}` };
  }

  // Modo demo: cliente e link so existem neste navegador
  const novoId = "cli-" + Date.now();
  const novoToken = "tok_" + Math.random().toString(36).substring(2, 10);
  const novoCliente: ClienteOnboarding = {
    id: novoId,
    nome_completo: nome,
    email: email || null,
    whatsapp: whatsapp || null,
    status: "link_ativo",
    apresentacao_pdf_url: apresentacaoFile ? URL.createObjectURL(apresentacaoFile) : null,
    apresentacao_pdf_nome: apresentacaoFile?.name || null,
    link_onboarding_form: linkOnboardingForm || null,
    pix_pago: false,
    created_at: new Date().toISOString(),
    data_programacao: dataProgramacao || null,
    links_temporarios: [{
      id: `link-${Date.now()}`,
      token: novoToken,
      expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      segundos_restantes: 18000,
      bloqueado_manualmente: false,
      acessos_count: 0,
    }],
  };

  if (typeof window !== "undefined") {
    const locais = getStorage<ClienteOnboarding[]>("wrmax_clientes_locais", []);
    locais.unshift(novoCliente);
    setStorage("wrmax_clientes_locais", locais);
    window.dispatchEvent(new CustomEvent("wrmax:cliente_criado", { detail: novoCliente }));
  }

  return { clienteId: novoId, token: novoToken, linkCompleto: `${base}/c/${novoToken}` };
}

export async function atualizarProjeto(
  clienteId: string,
  dados: {
    nome_completo: string;
    email?: string | null;
    whatsapp?: string | null;
    data_programacao?: string | null;
    link_onboarding_form?: string | null;
  }
) {
  if (exigirSupabaseOuDemo()) {
    const payload: Database["public"]["Tables"]["clientes_onboarding"]["Update"] = {
      nome_completo: dados.nome_completo,
    };
    if (dados.email !== undefined) payload["email"] = dados.email;
    if (dados.whatsapp !== undefined) payload["whatsapp"] = dados.whatsapp;
    if (dados.data_programacao !== undefined) payload["data_programacao"] = dados.data_programacao;
    if (dados.link_onboarding_form !== undefined) payload["link_onboarding_form"] = dados.link_onboarding_form;

    const { error } = await supabase.from("clientes_onboarding").update(payload).eq("id", clienteId);
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível salvar as alterações."));
  } else if (typeof window !== "undefined") {
    const locais = getStorage<ClienteOnboarding[]>("wrmax_clientes_locais", []);
    const idx = locais.findIndex((c) => c.id === clienteId);
    if (idx >= 0) {
      locais[idx] = { ...locais[idx]!, ...dados };
      setStorage("wrmax_clientes_locais", locais);
    }
    const editados = getStorage<Record<string, any>>("wrmax_clientes_editados", {});
    editados[clienteId] = { ...(editados[clienteId] || {}), ...dados };
    setStorage("wrmax_clientes_editados", editados);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wrmax:projeto_atualizado", { detail: { clienteId, dados } })
    );
  }

  return { sucesso: true };
}

export async function excluirProjeto(clienteId: string) {
  if (exigirSupabaseOuDemo()) {
    // links, cadastro e contratos saem em cascata (ON DELETE CASCADE)
    const { data: links } = await supabase
      .from("links_temporarios")
      .select("token")
      .eq("cliente_id", clienteId);
    const { error } = await supabase.from("clientes_onboarding").delete().eq("id", clienteId);
    if (error) throw new Error(mensagemDeErro(error, "Não foi possível excluir o cliente."));
    const tokensRevogados = (links || []).map((l) => l.token);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wrmax:projeto_excluido", { detail: { clienteId, tokens: tokensRevogados } })
      );
    }
    return { sucesso: true, tokensRevogados };
  }

  let tokensRevogados: string[] = [];
  if (typeof window !== "undefined") {
    const locais = getStorage<ClienteOnboarding[]>("wrmax_clientes_locais", []);
    const cliEncontrado = locais.find((c) => c.id === clienteId);
    if (cliEncontrado?.links_temporarios) {
      tokensRevogados = cliEncontrado.links_temporarios.map((l) => l.token);
    }

    setStorage("wrmax_clientes_locais", locais.filter((c) => c.id !== clienteId));

    const excluidos = getStorage<string[]>("wrmax_clientes_excluidos", []);
    if (!excluidos.includes(clienteId)) {
      setStorage("wrmax_clientes_excluidos", [...excluidos, clienteId]);
    }

    const tokExcluidos = getStorage<string[]>("wrmax_tokens_excluidos", []);
    tokensRevogados.forEach((t) => {
      if (!tokExcluidos.includes(t)) tokExcluidos.push(t);
      try {
        localStorage.removeItem(`wrmax_cadastro_${t}`);
        localStorage.removeItem(`wrmax_contrato_${t}`);
        localStorage.removeItem(`wrmax_comprovante_pix_${t}`);
      } catch {}
    });
    setStorage("wrmax_tokens_excluidos", tokExcluidos);

    try {
      localStorage.removeItem(`wrmax_contrato_${clienteId}`);
      localStorage.removeItem(`wrmax_comprovante_pix_${clienteId}`);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("wrmax:projeto_excluido", { detail: { clienteId, tokens: tokensRevogados } })
    );
  }

  return { sucesso: true, tokensRevogados };
}
