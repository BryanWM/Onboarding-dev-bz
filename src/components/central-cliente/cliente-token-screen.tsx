import { useEffect, useState, useCallback, useMemo } from "react";
import { Check, CheckCircle2, ChevronDown, Clock, Lock } from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { LogoWrmax } from "@/components/logo-wrmax";
import {
  validarLinkToken,
  isSupabaseConfigured,
  isModoDemo,
  MOTIVO_FALHA_CONEXAO,
  type ValidacaoTokenResultado,
} from "@/lib/supabase";
import { obterArquivosCliente } from "@/lib/arquivos-cliente";
import { SlotApresentacao } from "./slot-apresentacao";
import { SlotPix } from "./slot-pix";
import { SlotOnboarding } from "./slot-onboarding";
import { SlotDadosCadastrais } from "./slot-dados-cadastrais";
import { SlotContratoCliente } from "./slot-contrato-cliente";
import { InstitucionalScreen } from "./institucional-screen";

interface ClienteTokenScreenProps {
  token?: string;
}

interface UrlsArquivos {
  apresentacao: string | null;
  contratoModelo: string | null;
  contratoAssinado: string | null;
}

// URLs assinadas valem 1h; renova antes de expirar com a pagina aberta.
const RENOVAR_URLS_MS = 45 * 60 * 1000;

// Etapas da jornada: concluida, bloqueada e tempo estimado. A atual e a primeira
// pendente que nao esta bloqueada.
const ETAPAS_BASE = [
  { titulo: "Apresentação do Projeto", curto: "Proposta", tempo: "~2 min" },
  { titulo: "Pagamento via PIX", curto: "PIX", tempo: "~2 min" },
  { titulo: "Onboarding do cliente", curto: "Onboard", tempo: "~10 min" },
  { titulo: "Dados Cadastrais", curto: "Dados", tempo: "~3 min" },
  { titulo: "Contrato de Prestação de Serviços", curto: "Contrato", tempo: "~5 min" },
];

function calcularEtapas(dados: ValidacaoTokenResultado | null) {
  const estado = [
    { ok: Boolean(dados?.cliente?.apresentacao_pdf_url), bloqueada: false },
    { ok: Boolean(dados?.cliente?.pix_pago || dados?.cliente?.comprovante_pix_nome), bloqueada: false },
    { ok: Boolean(dados?.cliente?.onboarding_confirmado_em), bloqueada: false },
    { ok: Boolean(dados?.cadastro_preenchido), bloqueada: false },
    { ok: Boolean(dados?.contrato?.docx_assinado_storage_path), bloqueada: !dados?.contrato_liberado },
  ];
  const etapas = ETAPAS_BASE.map((e, i) => ({ ...e, ...estado[i]! }));
  return { etapas, indiceAtual: etapas.findIndex((e) => !e.ok && !e.bloqueada) };
}

export function ClienteTokenScreen({ token: propToken }: ClienteTokenScreenProps) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<ValidacaoTokenResultado | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);
  const [urls, setUrls] = useState<UrlsArquivos>({
    apresentacao: null,
    contratoModelo: null,
    contratoAssinado: null,
  });

  const token = useMemo(() => {
    if (propToken) return propToken;
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/c\/([^/?#]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    return undefined;
  }, [propToken]);

  const obterContratoLocal = useCallback((clienteId?: string) => {
    if (typeof window === "undefined") return null;
    try {
      if (clienteId) {
        const item = localStorage.getItem(`wrmax_contrato_${clienteId}`);
        if (item) return JSON.parse(item);
      }
      if (token) {
        const itemToken = localStorage.getItem(`wrmax_contrato_${token}`);
        if (itemToken) return JSON.parse(itemToken);
      }
    } catch {
      return null;
    }
    return null;
  }, [token]);

  const carregarStatus = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);

    try {
      const res = await validarLinkToken(token || "");

      // Falha de rede no polling nao derruba o cliente da jornada.
      if (silencioso && !res.valido && res.motivo === MOTIVO_FALHA_CONEXAO) {
        return;
      }

      // Com Supabase configurado, o servidor e a unica fonte de verdade.
      if (res.valido && isModoDemo) {
        const contratoLocal = obterContratoLocal(res.cliente?.id);
        if (!res.contrato_liberado && contratoLocal) {
          res.contrato_liberado = true;
          res.contrato = contratoLocal;
        }

        if (typeof window !== "undefined") {
          try {
            if (token) {
              const cadLocal = localStorage.getItem(`wrmax_cadastro_${token}`);
              if (cadLocal && !res.cadastro_preenchido) {
                res.cadastro_preenchido = true;
                res.dados_cadastrais = JSON.parse(cadLocal);
              }
            }
            if (res.cliente?.id) {
              const editadosRaw = localStorage.getItem("wrmax_clientes_editados");
              if (editadosRaw) {
                const editados = JSON.parse(editadosRaw);
                if (editados[res.cliente.id]?.pix_pago !== undefined) {
                  res.cliente.pix_pago = Boolean(editados[res.cliente.id].pix_pago);
                }
              }
            }
          } catch {}
        }
      }

      setDados(res);
      if (res.valido && res.link?.segundos_restantes) {
        setSegundosRestantes(res.link.segundos_restantes);
      }
    } catch {
      setDados({ valido: false });
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [token, obterContratoLocal]);

  useEffect(() => {
    carregarStatus();
  }, [carregarStatus]);

  // Sincronizacao em tempo real: polling a cada 3 segundos + escuta de storage e eventos
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      carregarStatus(true);
    }, 3000);

    const onRecarregar = () => carregarStatus(true);
    const onProjetoExcluido = (e: any) => {
      const detail = e?.detail;
      if (detail?.tokens?.includes(token)) {
        setDados({ valido: false, motivo: "PROJETO_EXCLUIDO" });
      } else {
        carregarStatus(true);
      }
    };

    window.addEventListener("storage", onRecarregar);
    window.addEventListener("wrmax:contrato_emitido", onRecarregar);
    window.addEventListener("wrmax:cadastro_submetido", onRecarregar);
    window.addEventListener("wrmax:comprovante_pix_enviado", onRecarregar);
    window.addEventListener("wrmax:contrato_assinado_enviado", onRecarregar);
    window.addEventListener("wrmax:pix_status_atualizado", onRecarregar);
    window.addEventListener("wrmax:projeto_atualizado", onRecarregar);
    window.addEventListener("wrmax:projeto_excluido", onProjetoExcluido);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onRecarregar);
      window.removeEventListener("wrmax:contrato_emitido", onRecarregar);
      window.removeEventListener("wrmax:cadastro_submetido", onRecarregar);
      window.removeEventListener("wrmax:comprovante_pix_enviado", onRecarregar);
      window.removeEventListener("wrmax:contrato_assinado_enviado", onRecarregar);
      window.removeEventListener("wrmax:pix_status_atualizado", onRecarregar);
      window.removeEventListener("wrmax:projeto_atualizado", onRecarregar);
      window.removeEventListener("wrmax:projeto_excluido", onProjetoExcluido);
    };
  }, [token, carregarStatus]);

  // Buckets privados: as URLs dos arquivos vem assinadas do servidor, que valida o
  // token. So busca de novo quando algum arquivo muda (o polling roda a cada 3s).
  const refApresentacao = dados?.valido ? dados.cliente?.apresentacao_pdf_url || null : null;
  const refModelo = dados?.valido ? dados.contrato?.docx_storage_path || null : null;
  const refAssinado = dados?.valido ? dados.contrato?.docx_assinado_storage_path || null : null;

  useEffect(() => {
    if (!token || !dados?.valido) return;
    if (!isSupabaseConfigured) {
      setUrls({ apresentacao: refApresentacao, contratoModelo: refModelo, contratoAssinado: refAssinado });
      return;
    }

    let ativo = true;
    const buscar = () => {
      obterArquivosCliente({ data: { token } })
        .then((r) => {
          if (ativo && r.valido) {
            setUrls({ apresentacao: r.apresentacao, contratoModelo: r.contratoModelo, contratoAssinado: r.contratoAssinado });
          }
        })
        .catch((err) => console.warn("Falha ao obter arquivos do cliente:", err));
    };
    buscar();
    const intervalo = setInterval(buscar, RENOVAR_URLS_MS);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [token, dados?.valido, refApresentacao, refModelo, refAssinado]);

  // Contador regressivo do link
  useEffect(() => {
    if (segundosRestantes <= 0) return;
    const interval = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setDados((old) => (old ? { ...old, valido: false } : null));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [segundosRestantes]);

  // Acordeao: so uma etapa aberta. Segue a etapa atual ate o cliente abrir outra;
  // quando a atual muda (etapa concluida), a nova abre sozinha.
  const [abertaManual, setAbertaManual] = useState<number | null | undefined>(undefined);
  const indiceAtualCalc = useMemo(() => calcularEtapas(dados).indiceAtual, [dados]);
  useEffect(() => setAbertaManual(undefined), [indiceAtualCalc]);

  const formatarTempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return `${h}h ${m}m restantes`;
  };

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center text-foreground">
        <AmbientBackground />
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
            Acessando ambiente seguro...
          </span>
        </div>
      </div>
    );
  }

  // Fallback silencioso (fail-closed) para a Tela Institucional caso link seja invalido, expirado ou bloqueado
  if (!dados || !dados.valido) {
    return <InstitucionalScreen />;
  }

  const { etapas, indiceAtual } = calcularEtapas(dados);
  const concluidas = etapas.filter((e) => e.ok).length;
  const faltam = 5 - concluidas;
  const aberta = abertaManual === undefined ? indiceAtual : abertaManual;

  const conteudoEtapa = (i: number) => {
    switch (i) {
      case 0:
        return <SlotApresentacao apresentacaoUrl={urls.apresentacao} apresentacaoNome={dados.cliente?.apresentacao_pdf_nome} />;
      case 1:
        return (
          <SlotPix
            pixPago={Boolean(dados.cliente?.pix_pago)}
            token={token || ""}
            clienteId={dados.cliente?.id || token}
            comprovanteEnviadoInicial={dados.cliente?.comprovante_pix_nome || null}
          />
        );
      case 2:
        return (
          <SlotOnboarding
            formUrl={dados.cliente?.link_onboarding_form || undefined}
            token={token}
            segundosParaConfirmar={dados.link?.segundos_para_confirmar_onboarding ?? null}
            confirmadoEm={dados.cliente?.onboarding_confirmado_em ?? null}
          />
        );
      case 3:
        return (
          <SlotDadosCadastrais
            token={token || ""}
            cadastroPreenchidoInicial={dados.cadastro_preenchido}
            dadosIniciais={dados.dados_cadastrais}
            onCadastroSucesso={carregarStatus}
          />
        );
      default:
        return (
          <SlotContratoCliente
            contratoLiberado={dados.contrato_liberado}
            contrato={dados.contrato}
            modeloUrl={urls.contratoModelo}
            dadosCadastrais={dados.dados_cadastrais}
            clienteNome={dados.cliente?.nome_completo}
            clienteEmail={dados.cliente?.email}
            clienteId={dados.cliente?.id}
            token={token}
          />
        );
    }
  };

  return (
    <div className="relative min-h-screen text-foreground selection:bg-primary/20">
      <AmbientBackground />

      <div className="sticky top-0 z-30 px-4 sm:px-6 pt-4">
        <header className="metal-panel !rounded-[14px] !bg-[rgba(10,9,7,0.7)] mx-auto max-w-3xl pl-5 pr-3 sm:pr-4 py-3 flex items-center justify-between gap-4">
          <LogoWrmax className="h-6 sm:h-7" />
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Link válido ·</span>
            <span className="text-foreground whitespace-nowrap">{formatarTempo(segundosRestantes)}</span>
          </span>
        </header>
      </div>

      {/* [&>*]:min-w-0: conteudo longo (codigo PIX, PDF) nao alarga a coluna no celular */}
      <main className="central-etapas mx-auto max-w-3xl px-4 sm:px-6 pt-10 sm:pt-14 pb-8 grid grid-cols-1 gap-2.5 [&>*]:min-w-0">
        {/* Saudacao curta + progresso */}
        <section className="px-1 pb-6 sm:pb-8 space-y-3">
          <span className="rotulo block">Central do cliente</span>
          <h1 className="text-[2rem] sm:text-[2.75rem] leading-[1.05] font-extrabold text-foreground tracking-tight break-words">
            Olá, {dados.cliente?.nome_completo || "Cliente Parceiro"}.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {faltam === 0
              ? "Tudo pronto! Todas as etapas foram concluídas."
              : `Faltam ${faltam} ${faltam === 1 ? "etapa" : "etapas"}. Você pode voltar a este link enquanto ele estiver válido.`}
          </p>

          {/* Celular: barra fina */}
          <div className="sm:hidden space-y-2 pt-3">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-semibold">{concluidas} de 5 etapas concluídas</span>
              {indiceAtual >= 0 && <span className="rotulo">Próximo · {etapas[indiceAtual]?.curto}</span>}
            </div>
            <div
              role="progressbar"
              aria-label="Etapas concluídas"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={concluidas}
              className="h-1 rounded-full bg-[var(--linha)] overflow-hidden"
            >
              <div className="h-full rounded-full metal-fill transition-[width] duration-500" style={{ width: `${concluidas * 20}%` }} />
            </div>
          </div>

          {/* Computador: linha de passos */}
          <ol aria-label="Progresso das etapas" className="hidden sm:grid grid-cols-5 pt-6">
            {etapas.map((e, i) => {
              const atual = i === indiceAtual;
              return (
                <li key={e.curto} className="flex flex-col items-center gap-2.5">
                  <span
                    className={`size-7 rounded-full grid place-items-center font-mono text-xs ${
                      e.ok
                        ? "bg-[rgba(111,211,155,0.14)] border border-[rgba(111,211,155,0.5)] text-[#6fd39b]"
                        : atual
                          ? "border-2 border-[var(--ouro)] text-[var(--ouro)] shadow-[0_0_0_5px_rgba(232,199,122,0.12)]"
                          : "border border-[var(--linha-2)] text-[#8c836f]"
                    }`}
                  >
                    {e.ok ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className={`text-[13px] ${atual ? "font-semibold text-foreground" : e.ok ? "text-muted-foreground" : "text-[#8c836f]"}`}>
                    {e.curto}
                  </span>
                  <span className="sr-only">{e.ok ? "(concluída)" : atual ? "(etapa atual)" : e.bloqueada ? "(bloqueada)" : "(pendente)"}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Etapas em acordeao: so uma aberta; as outras viram uma linha */}
        {etapas.map((e, i) => {
          if (i === aberta) {
            return (
              <div key={e.curto} id={`etapa-${i}`} className={`scroll-mt-24 ${i === indiceAtual ? "etapa-atual" : ""}`}>
                {conteudoEtapa(i)}
              </div>
            );
          }
          // abre a etapa e rola ate ela (o cabecalho fixo fica acima: scroll-mt-24)
          const abrir = () => {
            setAbertaManual(i);
            requestAnimationFrame(() =>
              document.getElementById(`etapa-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
            );
          };
          if (e.bloqueada && !e.ok) {
            return (
              <div key={e.curto} className="flex items-center gap-3.5 px-4 sm:px-5 py-4 rounded-[14px] border border-dashed border-[var(--linha-2)] opacity-75">
                <Lock className="size-4 shrink-0 text-[#8c836f]" />
                <span className="flex-1 min-w-0 text-[15px] text-muted-foreground truncate">{e.titulo}</span>
                <span className="text-xs sm:text-[13px] text-[#8c836f] shrink-0">Liberado pelo gestor</span>
              </div>
            );
          }
          return (
            <button
              key={e.curto}
              type="button"
              onClick={abrir}
              aria-expanded={false}
              className="group w-full text-left flex items-center gap-3.5 px-4 sm:px-5 py-4 rounded-[14px] border border-[var(--linha)] bg-[rgba(21,19,14,0.6)] hover:border-[var(--linha-2)] transition-colors cursor-pointer"
            >
              {e.ok ? (
                <CheckCircle2 className="size-[18px] shrink-0 text-[#6fd39b]" />
              ) : (
                <span className="w-[18px] shrink-0 text-center font-mono text-xs text-[#8c836f]">{i + 1}</span>
              )}
              <span className={`flex-1 min-w-0 text-[15px] font-normal truncate ${e.ok ? "text-muted-foreground" : "text-foreground"}`}>
                {e.titulo}
              </span>
              <span className="text-xs sm:text-[13px] font-normal text-[#8c836f] shrink-0">{e.ok ? "Concluído" : e.tempo}</span>
              <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-foreground shrink-0 flex items-center gap-1">
                {e.ok ? "Ver" : "Abrir"}
                <ChevronDown className="size-3.5" />
              </span>
            </button>
          );
        })}
      </main>

      <footer className="px-5 pb-10 pt-2 text-center text-xs text-[#8c836f]">
        Dúvidas? Fale com a WRMax no WhatsApp (86) 99921-6675
      </footer>
    </div>
  );
}

export default ClienteTokenScreen;
