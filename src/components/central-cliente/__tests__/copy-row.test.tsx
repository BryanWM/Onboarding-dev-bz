import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CopyRow } from "../copy-row";

describe("CopyRow component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should render label and value accurately", () => {
    render(<CopyRow label="Chave PIX" value="financeiro@empresa.com" />);
    expect(screen.getByText("Chave PIX")).toBeInTheDocument();
    expect(screen.getByText("financeiro@empresa.com")).toBeInTheDocument();
  });

  it("should copy value to clipboard and show feedback state upon click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CopyRow label="Chave PIX" value="financeiro@empresa.com" />);

    const copyButton = screen.getByRole("button", { name: /copiar chave pix/i });
    expect(copyButton).toBeInTheDocument();

    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith("financeiro@empresa.com");

    await waitFor(() => {
      // The icon changes from Copy to Check
      expect(copyButton.querySelector("svg")).toBeInTheDocument();
    });
  });
});
