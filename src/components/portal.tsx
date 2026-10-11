import { createPortal } from "react-dom";
import type { ReactNode } from "react";

// Renderiza no <body>. Modais precisam disso: dentro de um card com
// backdrop-filter/transform (ex.: .metal-panel), "position: fixed" passa a ser
// relativo ao card e o modal fica preso nele em vez de cobrir a tela.
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
