import { ArrowRight, ShieldCheck, Zap, TrendingUp, Sparkles } from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { LogoWrmax } from "@/components/logo-wrmax";
import { IconeWhatsApp } from "@/components/icone-whatsapp";

export const WHATSAPP_COMERCIAL = "5586999216675";
export const MENSAGEM_WHATSAPP = encodeURIComponent(
  "Olá! Desejo contratar os serviços da WRMax e gostaria de mais informações."
);

export function InstitucionalScreen() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_COMERCIAL}?text=${MENSAGEM_WHATSAPP}`;

  return (
    <div className="relative min-h-screen text-foreground flex flex-col justify-between selection:bg-primary/20">
      <AmbientBackground />
      {/* Header Institucional */}
      <div className="sticky top-0 z-20 px-4 sm:px-6 pt-4">
        <header className="metal-panel !rounded-2xl mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
          <LogoWrmax className="h-8" />
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar com a equipe no WhatsApp"
            title="Falar com a equipe no WhatsApp"
            className="chip-ouro size-10 rounded-full grid place-items-center transition-colors hover:bg-[rgba(232,199,122,0.18)]"
          >
            <IconeWhatsApp className="size-5" />
          </a>
        </header>
      </div>

      {/* Conteudo Principal */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 sm:py-24 relative">

        <div className="mx-auto max-w-3xl text-center relative z-10">
          <div className="tag-ouro inline-flex items-center gap-2 mb-6">
            <Sparkles className="size-3.5" />
            Assessoria de Crescimento Exclusiva
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-foreground">
            Deseja contratar os nossos serviços?{" "}
            <span className="metal-text block mt-2 sm:inline sm:mt-0">Entre em contato aqui!</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Estruturamos estratégias de marketing, aquisição acelerada e posicionamento sob medida para empresas que buscam liderança e escala contínua.
          </p>

          {/* Botao de Acao Principal */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="metal-button w-full sm:w-auto min-w-[280px] h-13 px-8 rounded-xl text-primary-foreground font-semibold text-base flex items-center justify-center gap-3 shadow-xl transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <IconeWhatsApp className="size-5" />
              Contratar no WhatsApp
              <ArrowRight className="size-4 opacity-70" />
            </a>
          </div>

          {/* Pilares de Diferenciacao */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="metal-panel p-5">
              <TrendingUp className="size-5 text-primary mb-3" />
              <h2 className="text-sm font-semibold text-foreground">Escala e Aquisicao</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Gestão focada em CAC reduzido e maximização de faturamento previsível.
              </p>
            </div>

            <div className="metal-panel p-5">
              <Zap className="size-5 text-primary mb-3" />
              <h2 className="text-sm font-semibold text-foreground">Velocidade de Execucao</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Implantação ágil com processos validados e acompanhamento diário.
              </p>
            </div>

            <div className="metal-panel p-5">
              <ShieldCheck className="size-5 text-primary mb-3" />
              <h2 className="text-sm font-semibold text-foreground">Metodo Consolidado</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Alinhamento estratégico, criativo e operacional em um só lugar.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Rodape */}
      <footer className="px-6 py-8 text-center text-xs text-muted-foreground/70 font-mono">
        WRMAX Marketing &amp; Performance - Todos os direitos reservados
      </footer>
    </div>
  );
}
