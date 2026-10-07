import { MessageCircle, ArrowRight, ShieldCheck, Zap, TrendingUp, Sparkles } from "lucide-react";

export const WHATSAPP_COMERCIAL = "5586999216675";
export const MENSAGEM_WHATSAPP = encodeURIComponent(
  "Olá! Desejo contratar os serviços da WRMax e gostaria de mais informações."
);

export function InstitucionalScreen() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_COMERCIAL}?text=${MENSAGEM_WHATSAPP}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Header Institucional */}
      <header className="border-b border-border/80 bg-sidebar/80 backdrop-blur-md px-6 py-6 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <div className="metal-text text-3xl font-black tracking-wider font-mono">WRMAX</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.34em] text-muted-foreground mt-0.5">
              Marketing &amp; Alta Performance
            </div>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 text-xs font-mono text-primary hover:text-foreground transition-colors"
          >
            <MessageCircle className="size-4" />
            Falar com a equipe
          </a>
        </div>
      </header>

      {/* Conteudo Principal */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 sm:py-24 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />

        <div className="mx-auto max-w-3xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-wider mb-6">
            <Sparkles className="size-3.5" />
            Assessoria de Crescimento Exclusiva
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
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
              className="metal-button w-full sm:w-auto min-w-[280px] h-13 px-8 rounded-xl text-primary-foreground font-bold text-base flex items-center justify-center gap-3 shadow-xl transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <MessageCircle className="size-5" />
              Contratar no WhatsApp
              <ArrowRight className="size-4 opacity-70" />
            </a>
          </div>

          {/* Pilares de Diferenciacao */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="metal-panel p-5">
              <TrendingUp className="size-5 text-primary mb-3" />
              <h2 className="text-sm font-bold text-foreground">Escala e Aquisicao</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Gestão focada em CAC reduzido e maximização de faturamento previsível.
              </p>
            </div>

            <div className="metal-panel p-5">
              <Zap className="size-5 text-primary mb-3" />
              <h2 className="text-sm font-bold text-foreground">Velocidade de Execucao</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Implantação ágil com processos validados e acompanhamento diário.
              </p>
            </div>

            <div className="metal-panel p-5">
              <ShieldCheck className="size-5 text-primary mb-3" />
              <h2 className="text-sm font-bold text-foreground">Metodo Consolidado</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Alinhamento estratégico, criativo e operacional em um só lugar.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Rodape */}
      <footer className="border-t border-border/60 px-6 py-8 text-center text-xs text-muted-foreground/60 font-mono">
        WRMAX Marketing &amp; Performance - Todos os direitos reservados
      </footer>
    </div>
  );
}
