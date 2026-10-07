import { useEffect, useState, useCallback, useMemo } from "react";
import { Clock, ShieldCheck, UserCheck } from "lucide-react";
import { validarLinkToken, isSupabaseConfigured, type ValidacaoTokenResultado } from "@/lib/supabase";
import { SlotApresentacao } from "./slot-apresentacao";
import { SlotPix } from "./slot-pix";
import { SlotOnboarding } from "./slot-onboarding";
import { SlotDadosCadastrais } from "./slot-dados-cadastrais";
import { SlotContratoCliente } from "./slot-contrato-cliente";
import { InstitucionalScreen } from "./institucional-screen";

interface ClienteTokenScreenProps {
  token?: string;
}

export function ClienteTokenScreen({ token: propToken }: ClienteTokenScreenProps) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<ValidacaoTokenResultado | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);

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

      if (res.valido) {
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

        setDados(res);
        if (res.link?.segundos_restantes) {
          setSegundosRestantes(res.link.segundos_restantes);
        }
      } else {
        setDados(res);
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

  const formatarTempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return `${h}h ${m}m restantes`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
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

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Topbar do Cliente com fontes aumentadas */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-md px-5 sm:px-8 py-4 sticky top-0 z-30">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="metal-text text-2xl sm:text-3xl font-black tracking-wide font-mono">WRMAX</div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary font-mono text-xs uppercase font-semibold">
                <ShieldCheck className="size-3.5" />
                Ambiente Criptografado
              </span>
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Central do cliente · Alta performance
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-secondary/40 text-xs sm:text-sm font-mono text-muted-foreground">
              <Clock className="size-4 text-primary" />
              <span className="font-semibold text-foreground">{formatarTempo(segundosRestantes)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Saudacao e orientacoes */}
      <section className="border-b border-border/60 bg-secondary/10 px-5 sm:px-8 py-7 sm:py-9">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-primary uppercase tracking-wider mb-2 font-semibold">
            <UserCheck className="size-4" />
            Jornada de Implantação e Onboarding
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Olá, {dados.cliente?.nome_completo || "Cliente Parceiro"}!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Siga as cinco etapas abaixo para revisar a proposta comercial, efetuar o pagamento do PIX, preencher o formulário de onboarding, enviar seus dados cadastrais e acessar seu contrato de prestação de serviços.
          </p>
        </div>
      </section>

      {/* Slots da Jornada com paddings e fontes aprimorados */}
      <main className="mx-auto grid max-w-4xl gap-6 sm:gap-8 px-5 sm:px-8 py-8 sm:py-12">
        {/* Slot 01: Apresentacao em PDF enviada pelo Admin */}
        <SlotApresentacao
          apresentacaoUrl={dados.cliente?.apresentacao_pdf_url}
          apresentacaoNome={dados.cliente?.apresentacao_pdf_nome}
        />

        {/* Slot 02: Pagamento via PIX com QR Code oficial e opcao de anexar comprovante */}
        <SlotPix
          pixPago={Boolean(dados.cliente?.pix_pago)}
          clienteId={dados.cliente?.id || token}
        />

        {/* Slot 03: Formulario de Onboarding (Google Forms) configurado pelo Admin */}
        <SlotOnboarding
          formUrl={dados.cliente?.link_onboarding_form || undefined}
        />

        {/* Slot 04: Dados Cadastrais preenchidos pelo Cliente (Envio unico) */}
        <SlotDadosCadastrais
          token={token || ""}
          cadastroPreenchidoInicial={dados.cadastro_preenchido}
          dadosIniciais={dados.dados_cadastrais}
          onCadastroSucesso={carregarStatus}
        />

        {/* Slot 05: Contrato emitido pelo Admin com envio de via assinada */}
        <SlotContratoCliente
          contratoLiberado={dados.contrato_liberado}
          contrato={dados.contrato}
          dadosCadastrais={dados.dados_cadastrais}
          clienteNome={dados.cliente?.nome_completo}
          clienteEmail={dados.cliente?.email}
          clienteId={dados.cliente?.id}
          token={token}
        />
      </main>

      <footer className="border-t border-border px-5 py-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
        WRMax Marketing &amp; Performance - Suporte: (86) 99921-6675
      </footer>
    </div>
  );
}

export default ClienteTokenScreen;
