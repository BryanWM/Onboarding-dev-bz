import { supabase, isSupabaseConfigured } from "./supabase-client";
import { MOCK_CLIENTES } from "./mock-data";
import type { ClienteOnboarding } from "./mock-data";

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

export async function listarClientes(): Promise<ClienteOnboarding[]> {
  let clientes: ClienteOnboarding[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("clientes_onboarding")
        .select("*, links_temporarios(*), dados_cadastrais_cliente(*), contratos(*)")
        .order("created_at", { ascending: false });
      clientes = !error && data && data.length > 0 ? (data as unknown as ClienteOnboarding[]) : [...MOCK_CLIENTES];
    } catch {
      clientes = [...MOCK_CLIENTES];
    }
  } else {
    clientes = [...MOCK_CLIENTES];
  }

  if (typeof window !== "undefined") {
    const locais = getStorage<ClienteOnboarding[]>("wrmax_clientes_locais", []);
    const locaisValidos: ClienteOnboarding[] = [];

    locais.forEach((loc) => {
      const duplicadoSupabase =
        isSupabaseConfigured &&
        clientes.some(
          (c) => c.id === loc.id || c.nome_completo?.trim().toLowerCase() === loc.nome_completo?.trim().toLowerCase()
        );
      const duplicadoNaLista = clientes.some((c) => c.id === loc.id);

      if (!duplicadoSupabase && !duplicadoNaLista) {
        clientes.unshift(loc);
        locaisValidos.push(loc);
      }
    });

    if (isSupabaseConfigured && locaisValidos.length !== locais.length) {
      setStorage("wrmax_clientes_locais", locaisValidos);
    }

    const editados = getStorage<Record<string, any>>("wrmax_clientes_editados", {});
    clientes = clientes.map((c) => (editados[c.id] ? { ...c, ...editados[c.id] } : c));

    const excluidos = getStorage<string[]>("wrmax_clientes_excluidos", []);
    if (excluidos.length > 0) {
      clientes = clientes.filter((c) => !excluidos.includes(c.id));
    }
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
  let pdfUrl: string | null = null;
  let pdfNome: string | null = null;
  const isPort8081 = typeof window !== "undefined" && window.location.port === "8081";
  const base = typeof window !== "undefined"
    ? (isPort8081 ? "http://localhost:8080" : window.location.origin)
    : "http://localhost:8080";

  const novoId = "cli-" + Date.now();
  const novoToken = "tok_" + Math.random().toString(36).substring(2, 10);
  const dataCriacao = new Date().toISOString();

  if (apresentacaoFile) {
    if (isSupabaseConfigured) {
      try {
        const fileExt = apresentacaoFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("apresentacoes-pdf")
          .upload(fileName, apresentacaoFile, { contentType: "application/pdf", upsert: true });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from("apresentacoes-pdf").getPublicUrl(fileName);
          pdfUrl = publicUrlData.publicUrl;
          pdfNome = apresentacaoFile.name;
        } else {
          console.error("Falha no upload da apresentacao:", uploadError);
        }
      } catch (err) {
        console.warn("Upload de PDF falhou:", err);
      }
    } else {
      try {
        pdfUrl = URL.createObjectURL(apresentacaoFile);
        pdfNome = apresentacaoFile.name;
      } catch {}
    }
  }

  if (isSupabaseConfigured) {
    try {
      const { data: cliente, error: cliError } = await supabase
        .from("clientes_onboarding")
        .insert({
          nome_completo: nome,
          email: email || null,
          whatsapp: whatsapp || null,
          status: "link_ativo",
          apresentacao_pdf_url: pdfUrl,
          apresentacao_pdf_nome: pdfNome,
          link_onboarding_form: linkOnboardingForm || null,
        })
        .select()
        .single();

      if (!cliError && cliente) {
        const { data: link, error: linkError } = await supabase
          .from("links_temporarios")
          .insert({
            cliente_id: cliente.id,
            expira_em: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
          })
          .select()
          .single();

        if (!linkError && link) {
          if (dataProgramacao && typeof window !== "undefined") {
            const editados = getStorage<Record<string, any>>("wrmax_clientes_editados", {});
            editados[cliente.id] = { ...(editados[cliente.id] || {}), data_programacao: dataProgramacao };
            setStorage("wrmax_clientes_editados", editados);
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("wrmax:cliente_criado", {
                detail: { ...cliente, links_temporarios: [link], data_programacao: dataProgramacao || null },
              })
            );
          }
          return { clienteId: cliente.id, token: link.token, linkCompleto: `${base}/c/${link.token}` };
        }
      }
    } catch (err) {
      console.warn("Supabase insert fallthrough para modo local:", err);
    }
  }

  const novoCliente: ClienteOnboarding = {
    id: novoId,
    nome_completo: nome,
    email: email || null,
    whatsapp: whatsapp || null,
    status: "link_ativo",
    apresentacao_pdf_url: pdfUrl,
    apresentacao_pdf_nome: pdfNome,
    link_onboarding_form: linkOnboardingForm || null,
    pix_pago: false,
    created_at: dataCriacao,
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
  if (isSupabaseConfigured) {
    try {
      const payload: Record<string, any> = {
        nome_completo: dados.nome_completo,
        email: dados.email,
        whatsapp: dados.whatsapp,
      };
      if (dados.link_onboarding_form !== undefined) {
        payload.link_onboarding_form = dados.link_onboarding_form;
      }
      await supabase.from("clientes_onboarding").update(payload).eq("id", clienteId);
    } catch (err) {
      console.warn("Supabase update falhou:", err);
    }
  }

  if (typeof window !== "undefined") {
    const locais = getStorage<ClienteOnboarding[]>("wrmax_clientes_locais", []);
    const idx = locais.findIndex((c) => c.id === clienteId);
    if (idx >= 0) {
      locais[idx] = { ...locais[idx], ...dados };
      setStorage("wrmax_clientes_locais", locais);
    }

    const editados = getStorage<Record<string, any>>("wrmax_clientes_editados", {});
    editados[clienteId] = { ...(editados[clienteId] || {}), ...dados };
    setStorage("wrmax_clientes_editados", editados);

    window.dispatchEvent(
      new CustomEvent("wrmax:projeto_atualizado", { detail: { clienteId, dados } })
    );
  }

  return { sucesso: true };
}

export async function excluirProjeto(clienteId: string) {
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

  if (isSupabaseConfigured) {
    try {
      await supabase.from("links_temporarios").delete().eq("cliente_id", clienteId);
      await supabase.from("contratos").delete().eq("cliente_id", clienteId);
      await supabase.from("dados_cadastrais_cliente").delete().eq("cliente_id", clienteId);
      await supabase.from("clientes_onboarding").delete().eq("id", clienteId);
    } catch (err) {
      console.warn("Supabase delete falhou:", err);
    }
  }

  return { sucesso: true, tokensRevogados };
}
