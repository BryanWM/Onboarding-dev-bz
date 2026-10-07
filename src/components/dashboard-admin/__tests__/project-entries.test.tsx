import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectEntries } from "../project-entries";

describe("ProjectEntries component", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should render title and input fields", () => {
    render(<ProjectEntries />);
    expect(screen.getByText("Novos projetos")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nome do cliente ou projeto")).toBeInTheDocument();
  });

  it("should add a new project when form is filled and submitted", () => {
    render(<ProjectEntries />);
    const input = screen.getByPlaceholderText("Nome do cliente ou projeto");
    fireEvent.change(input, { target: { value: "Empresa Teste Alpha" } });
    
    const saveButton = screen.getByRole("button", { name: /Salvar projeto/i });
    fireEvent.click(saveButton);

    expect(screen.getByText("Empresa Teste Alpha")).toBeInTheDocument();
  });
});
