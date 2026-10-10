import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock, FolderOpen, Loader2, AlertCircle, Lock, Save, Hourglass } from "lucide-react";
import { SlotHeader } from "./slot-header";
import { OnboardingFormModal } from "./onboarding-form-modal";
import { confirmarOnboardingForm, registrarAberturaOnboarding } from "@/lib/supabase";

interface SlotOnboardingProps {
  formUrl?: string | undefined;
  token?: string | undefined;
  // segundos que faltam para liberar a confirmacao (vem do servidor);
  // null/undefined = o cliente ainda nao abriu o formulario
  segundosParaConfirmar?: number | null | undefined;
  confirmadoEm?: string | null | undefined;
}

export const FORM_ONBOARDING_DEFAULT =
  "https://docs.google.com/forms/d/e/1FAIpQLSdyJjJicNhDIqPgkUSgEHwovvbywPsazFhWcPV3mJCVkobErg/viewform";

export function SlotOnboarding({
  formUrl = FORM_ONBOARDING_DEFAULT,
  token,
  segundosParaConfirmar = null,
  confirmadoEm = null,
}: SlotOnboardingProps) {
  const [aberto, setAberto] = useState(segundosParaConfirmar != null);
  const [restantes, setRestantes] = useState(Math.max(0, segundosParaConfirmar ?? 0));
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmado, setConfirmado] = useState<string | null>(confirmadoEm);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O servidor reenvia o tempo restante a cada polling.
  useEffect(() => {
    if (segundosParaConfirmar == null) return;
    setAberto(true);
    setRestantes(Math.max(0, segundosParaConfirmar));
  }, [segundosParaConfirmar]);

  useEffect(() => {
    if (confirmadoEm) setConfirmado(confirmadoEm);
  }, [confirmadoEm]);

  // Contagem interna, sem exibir numeros: so habilita o botao quando zerar.
  useEffect(() => {
    if (restantes <= 0) return;
    const intervalo = setInterval(() => setRestantes((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(intervalo);
  }, [restantes > 0]);

  const registrarAbertura = () => {
    if (!token || aberto) return;
    setAberto(true);
    setRestantes(300);
    registrarAberturaOnboarding(token)
      .then((r) => setRestantes(r.segundosParaConfirmar))
      .catch((err) => console.warn("Falha ao registrar abertura do onboarding:", err));
  };

  const abrirModal = () => {
    registrarAbertura();
    setModalAberto(true);
  };

  const handleConfirmar = async () => {
    if (!token) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await confirmarOnboardingForm(token);
      setConfirmado(res.confirmadoEm);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível registrar a confirmação.");
    } finally {
      setEnviando(false);
    }
  };

  const liberado = aberto && restantes <= 0;

  return (
    <section className="metal-panel p-6">
      <SlotHeader
        index="03"
        icon={<FolderOpen className="size-4" />}
        title="Onboarding do cliente"
        subtitle="Preencha o formulário com os dados da sua empresa para iniciarmos a operação."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="glass-soft rounded-xl p-4 flex items-start gap-3">
          <Hourglass className="size-4 shrink-0 mt-0.5 text-primary" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-semibold">Reserve um tempo</strong> para responder com calma: leva de
            10 a 15 minutos. Quanto mais detalhadas as respostas, mais rápido e certeiro será o início da sua operação.
          </p>
        </div>
        <div className="glass-soft rounded-xl p-4 flex items-start gap-3">
          <Save className="size-4 shrink-0 mt-0.5 text-primary" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-semibold">Pode parar no meio.</strong> Entrando com sua conta Google,
            suas respostas ficam salvas como rascunho para continuar depois.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={abrirModal}
          className="glass-button inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 h-12 text-sm font-semibold cursor-pointer"
        >
          <FolderOpen className="size-4" />
          Preencher formulário
        </button>
        <a
          href={formUrl}
          target="_blank"
          rel="noreferrer"
          onClick={registrarAbertura}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 h-12 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Abrir no Google <ArrowUpRight className="size-4" />
        </a>
      </div>

      {token && (
        <div className="mt-5">
          {confirmado ? (
            <div role="status" className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-sm flex items-center gap-3.5">
              <CheckCircle2 className="size-7 shrink-0" />
              <div>
                <p className="font-semibold text-base">Preenchimento do formulário confirmado!</p>
                <p className="text-xs text-muted-foreground">
                  Confirmado em {new Date(confirmado).toLocaleString("pt-BR")}. O gestor já foi avisado.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {erro && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={!liberado || enviando}
                className="metal-button w-full h-12 rounded-lg text-sm sm:text-base font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : !aberto ? (
                  <Lock className="size-4" />
                ) : !liberado ? (
                  <Clock className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                <span>
                  {enviando
                    ? "Registrando confirmação..."
                    : !aberto
                      ? "Abra o formulário para liberar a confirmação"
                      : !liberado
                        ? "Responda o formulário e volte aqui para confirmar"
                        : "Confirmo que preenchi o formulário de onboarding"}
                </span>
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Depois de enviar o formulário do Google, volte aqui e confirme o preenchimento.
              </p>
            </div>
          )}
        </div>
      )}

      <OnboardingFormModal open={modalAberto} formUrl={formUrl} onClose={() => setModalAberto(false)} />
    </section>
  );
}
