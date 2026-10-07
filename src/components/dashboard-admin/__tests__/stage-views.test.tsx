import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Timeline, Roles, NextSteps } from "../stage-views";

describe("Stage views modular components", () => {
  it("should render Timeline items with milestones", () => {
    render(<Timeline />);
    expect(screen.getByText("Fechamento")).toBeInTheDocument();
    expect(screen.getByText("Boas-vindas")).toBeInTheDocument();
    expect(screen.getByText("D0")).toBeInTheDocument();
  });

  it("should render Roles section with team headers", () => {
    render(<Roles />);
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Onboarding / Atendimento")).toBeInTheDocument();
    expect(screen.getByText("Estratégia")).toBeInTheDocument();
  });

  it("should render NextSteps list", () => {
    const mockGo = vi.fn();
    render(<NextSteps go={mockGo} checked={{}} />);
    expect(screen.getByText("Início do onboarding")).toBeInTheDocument();
    expect(screen.getByText("Estruturação do contrato")).toBeInTheDocument();
  });
});
