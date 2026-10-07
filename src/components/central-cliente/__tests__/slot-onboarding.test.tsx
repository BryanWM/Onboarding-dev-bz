import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlotOnboarding, FORM_ONBOARDING_DEFAULT } from "../slot-onboarding";

describe("SlotOnboarding component", () => {
  it("should render title, description and button linking to the onboarding form", () => {
    render(<SlotOnboarding />);

    expect(screen.getByText("Onboarding do cliente")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Preencha o formulário com os dados da sua empresa para iniciarmos a operação.",
      ),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /abrir formulário de onboarding/i });
    expect(link).toHaveAttribute("href", FORM_ONBOARDING_DEFAULT);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("should accept custom onboarding form URL", () => {
    render(<SlotOnboarding formUrl="https://custom.form/link" />);
    const link = screen.getByRole("link", { name: /abrir formulário de onboarding/i });
    expect(link).toHaveAttribute("href", "https://custom.form/link");
  });
});
