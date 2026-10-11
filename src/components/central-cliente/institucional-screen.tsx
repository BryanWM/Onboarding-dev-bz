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

  const pilares = [
    { icone: TrendingUp, titulo: "Escala e Aquisição", texto: "Gestão focada em CAC reduzido e maximização de faturamento previsível." },
    { icone: Zap, titulo: "Velocidade de Execução", texto: "Implantação ágil com processos validados e acompanhamento diário." },
    { icone: ShieldCheck, titulo: "Método Consolidado", texto: "Alinhamento estratégico, criativo e operacional em um só lugar." },
  ];

  return (
    // Tela unica (h-dvh, sem rolagem): cabecalho, chamada, botao, pilares e rodape cabem juntos
    <div className="relative h-dvh overflow-hidden text-foreground flex flex-col selection:bg-primary/20">
      <AmbientBackground />
      {/* Header Institucional */}
      <div className="shrink-0 z-20 px-4 sm:px-6 pt-4">
        <header className="metal-panel !rounded-2xl mx-auto max-w-5xl px-5 py-3 flex items-center justify-between">
          <LogoWrmax className="h-7" />
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
      <main className="flex-1 min-h-0 flex items-center justify-center px-5 sm:px-6 py-4 relative">
        <div className="mx-auto max-w-3xl text-center relative z-10">
          <div className="tag-ouro inline-flex items-center gap-2 mb-[min(1.5rem,2.5vh)]">
            <Sparkles className="size-3.5" />
            Assessoria de Crescimento Exclusiva
          </div>

          <h1 className="text-[clamp(1.5rem,min(6.4vw,6.4vh),3.4rem)] font-extrabold tracking-tight leading-[1.1] text-foreground">
            Deseja contratar os nossos serviços?{" "}
            <span className="metal-text block mt-1 sm:inline sm:mt-0">Entre em contato aqui!</span>
          </h1>

          <p className="mt-[min(1.25rem,2.5vh)] text-[clamp(0.85rem,2.4vh,1.125rem)] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Estruturamos estratégias de marketing, aquisição acelerada e posicionamento sob medida para empresas que buscam liderança e escala contínua.
          </p>

          {/* Botao de Acao Principal */}
          <div className="mt-[min(2rem,3.5vh)] flex justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="metal-button w-full sm:w-auto min-w-[280px] h-12 px-8 rounded-xl text-primary-foreground font-semibold text-base flex items-center justify-center gap-3 shadow-xl transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <IconeWhatsApp className="size-5" />
              Contratar no WhatsApp
              <ArrowRight className="size-4 opacity-70" />
            </a>
          </div>

          {/* Pilares: no hover/foco o card sobe, inclina (flip) e se expande para cima
              mostrando a descricao. A caixa externa tem altura fixa: nada empurra o layout. */}
          <div className="mt-[min(3rem,5vh)] grid grid-cols-3 gap-2.5 sm:gap-4 text-left">
            {pilares.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="pilar" tabIndex={0} aria-label={`${titulo}: ${texto}`}>
                {/* copia invisivel do card fechado: define a altura reservada */}
                <div aria-hidden="true" className="invisible metal-panel p-3 sm:p-5">
                  <Icone className="size-4 sm:size-5 mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm font-semibold leading-snug">{titulo}</p>
                </div>
                <div className="pilar-card metal-panel p-3 sm:p-5">
                  <Icone className="pilar-icone size-4 sm:size-5 text-primary mb-2 sm:mb-3" />
                  <h2 className="text-xs sm:text-sm font-semibold text-foreground leading-snug">{titulo}</h2>
                  <div className="pilar-desc">
                    <p className="text-xs text-muted-foreground leading-relaxed">{texto}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Rodape */}
      <footer className="shrink-0 px-6 py-4 text-center text-[11px] sm:text-xs text-muted-foreground/70 font-mono">
        WRMAX Marketing &amp; Performance - Todos os direitos reservados
      </footer>
    </div>
  );
}