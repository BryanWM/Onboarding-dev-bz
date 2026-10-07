import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OnboardingFormCard, PixPanel, ONBOARDING_FORM_URL } from "../panels";

describe("Admin panels", () => {
  it("should render onboarding form card with link", () => {
    render(<OnboardingFormCard />);
    expect(screen.getByText("Onboarding do cliente")).toBeInTheDocument();
    expect(screen.getByText(ONBOARDING_FORM_URL)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir formulário/i })).toHaveAttribute("href", ONBOARDING_FORM_URL);
  });

  it("should render PIX panel with keys", () => {
    render(<PixPanel />);
    expect(screen.getByText("Dados PIX")).toBeInTheDocument();
    expect(screen.getByText("financeiro@wrmaxmarketing.com.br")).toBeInTheDocument();
    expect(screen.getByText("KFGMoreira")).toBeInTheDocument();
  });
});
