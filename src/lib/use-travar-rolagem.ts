import { useEffect } from "react";

// Com um modal aberto, a pagina de fundo nao rola (nem mostra a barra de rolagem).
export function useTravarRolagem(ativo: boolean) {
  useEffect(() => {
    if (!ativo || typeof document === "undefined") return;
    const { overflow, paddingRight } = document.body.style;
    // compensa a largura da barra para o layout nao "pular"
    const barra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [ativo]);
}
