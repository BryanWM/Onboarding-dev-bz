import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SlotOnboarding, FORM_ONBOARDING_DEFAULT } from "../slot-onboarding";
import { urlFormularioEmbutido } from "../onboarding-form-modal";
import * as supabaseLib from "@/lib/supabase";

afterEach(() => vi.restoreAllMocks());

describe("SlotOnboarding component", () => {
  it("orienta o cliente a reservar um tempo, sem contador", () => {
    render(<SlotOnboarding token="tok" segundosParaConfirmar={185} />);

    expect(screen.getByText("Onboarding do cliente")).toBeInTheDocument();
    expect(screen.getByText("Reserve um tempo")).toBeInTheDocument();
    expect(screen.getByText("Pode parar no meio.")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.queryByText(/3:05/)).toBeNull();
  });

  it("link 'Abrir no Google' aponta para o formulario (padrao ou personalizado)", () => {
    const { unmount } = render(<SlotOnboarding />);
    expect(screen.getByRole("link", { name: /abrir no google/i })).toHaveAttribute("href", FORM_ONBOARDING_DEFAULT);
    unmount();

    render(<SlotOnboarding formUrl="https://custom.form/link" />);
    const link = screen.getByRole("link", { name: /abrir no google/i });
    expect(link).toHaveAttribute("href", "https://custom.form/link");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("antes de abrir o formulario, a confirmacao fica bloqueada", () => {
    render(<SlotOnboarding token="tok" segundosParaConfirmar={null} />);
    expect(screen.getByRole("button", { name: /abra o formulário para liberar/i })).toBeDisabled();
  });

  it("abrir o formulario no modal registra a abertura e mostra o iframe embutido", async () => {
    const spy = vi.spyOn(supabaseLib, "registrarAberturaOnboarding").mockResolvedValue({ segundosParaConfirmar: 300 });
    render(<SlotOnboarding token="tok-abre" segundosParaConfirmar={null} />);

    fireEvent.click(screen.getByRole("button", { name: /preencher formulário/i }));

    expect(screen.getByRole("dialog", { name: /formulário de onboarding/i })).toBeInTheDocument();
    expect(screen.getByTitle("Formulário de onboarding WRMax")).toHaveAttribute(
      "src",
      urlFormularioEmbutido(FORM_ONBOARDING_DEFAULT),
    );
    expect(spy).toHaveBeenCalledWith("tok-abre");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /responda o formulário e volte aqui/i })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /fechar formulário/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("depois de liberado, confirma pelo token e mostra a data", async () => {
    const spy = vi
      .spyOn(supabaseLib, "confirmarOnboardingForm")
      .mockResolvedValue({ sucesso: true, confirmadoEm: "2026-10-07T15:00:00.000Z" });
    render(<SlotOnboarding token="tok-123" segundosParaConfirmar={0} />);

    const botao = screen.getByRole("button", { name: /confirmo que preenchi/i });
    expect(botao).toBeEnabled();
    fireEvent.click(botao);

    await waitFor(() => {
      expect(screen.getByText("Preenchimento do formulário confirmado!")).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalledWith("tok-123");
  });

  it("ja confirmado mostra o estado confirmado sem botao", () => {
    render(<SlotOnboarding token="tok" confirmadoEm="2026-10-07T15:00:00.000Z" />);
    expect(screen.getByText("Preenchimento do formulário confirmado!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmo que preenchi/i })).toBeNull();
  });

  it("mostra o erro devolvido pelo servidor", async () => {
    vi.spyOn(supabaseLib, "confirmarOnboardingForm").mockRejectedValue(
      new Error("A confirmação ainda não foi liberada. Responda o formulário com calma e tente de novo em alguns minutos."),
    );
    render(<SlotOnboarding token="tok" segundosParaConfirmar={0} />);
    fireEvent.click(screen.getByRole("button", { name: /confirmo que preenchi/i }));
    await waitFor(() => {
      expect(screen.getByText(/ainda não foi liberada/)).toBeInTheDocument();
    });
  });
});

describe("urlFormularioEmbutido", () => {
  it("adiciona embedded=true so em links do Google Forms", () => {
    expect(urlFormularioEmbutido("https://docs.google.com/forms/d/e/abc/viewform")).toBe(
      "https://docs.google.com/forms/d/e/abc/viewform?embedded=true",
    );
    expect(urlFormularioEmbutido("https://docs.google.com/forms/d/e/abc/viewform?usp=sf_link")).toContain("embedded=true");
    expect(urlFormularioEmbutido("https://custom.form/link")).toBe("https://custom.form/link");
  });
});
