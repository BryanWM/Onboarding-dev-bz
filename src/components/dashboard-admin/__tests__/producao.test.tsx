import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import type { ClienteOnboarding } from "@/lib/mock-data";

// Banco simulado: uma linha por item entregue, como a tabela checklist_producao
const banco = vi.hoisted(() => ({ linhas: [] as { cliente_id: string; etapa: number; item: string }[], falhar: false }));
vi.mock("@/lib/producao-service", () => ({
  listarChecklistProducao: vi.fn(async (ids: string[]) => banco.linhas.filter((l) => ids.includes(l.cliente_id))),
  marcarItemProducao: vi.fn(async (cliente_id: string, etapa: number, item: string, feito: boolean) => {
    if (banco.falhar) throw new Error("Seu usuário não tem permissão de gestor.");
    banco.linhas = banco.linhas.filter((l) => !(l.cliente_id === cliente_id && l.etapa === etapa && l.item === item));
    if (feito) banco.linhas.push({ cliente_id, etapa, item });
  }),
}));

import { ProducaoKanban } from "../producao-kanban";
import { WorkspaceStageTab } from "../workspace-stage-tab";
import { carregarChecklist, diasUteisDesde, progressoProducao } from "../producao";
import { stageItems } from "../stages-data";

const cliente = (id: string, nome: string, validadoEm?: string): ClienteOnboarding => ({
  id,
  nome_completo: nome,
  status: "concluido",
  contratos: [{ id: `ct-${id}`, valor_mensal: 1000, dia_vencimento: 10, validado_em: validadoEm ?? new Date().toISOString() }],
});

const marcarTudo = (clienteId: string, etapa: number) =>
  stageItems(etapa).forEach((item) => banco.linhas.push({ cliente_id: clienteId, etapa, item }));

describe("Producao", () => {
  beforeEach(async () => {
    banco.linhas = [];
    banco.falhar = false;
    await carregarChecklist(["c1", "c2"]);
  });

  it("cliente novo fica em Boas-vindas com o primeiro item como proximo", () => {
    const p = progressoProducao("c1");
    expect(p.atual?.etapa.id).toBe("6_boas_vindas");
    expect(p.atual?.pendentes[0]).toBe(stageItems(3)[0]);
  });

  it("etapas concluidas no banco levam o cliente para a proxima coluna e, no fim, para Entregue", async () => {
    marcarTudo("c1", 3);
    await carregarChecklist(["c1"]);
    expect(progressoProducao("c1").atual?.etapa.id).toBe("7_3_dias_uteis");
    [4, 5, 6].forEach((i) => marcarTudo("c1", i));
    await carregarChecklist(["c1"]);
    expect(progressoProducao("c1").atual).toBeNull();
  });

  it("conta so dias uteis", () => {
    // sexta 09/10/2026 -> segunda 12/10/2026 = 1 dia util
    expect(diasUteisDesde("2026-10-09T12:00:00", new Date("2026-10-12T12:00:00"))).toBe(1);
  });

  it("quadro le o banco e distribui os clientes nas colunas", async () => {
    marcarTudo("c2", 3);
    const onSelect = vi.fn();
    render(<ProducaoKanban clientes={[cliente("c1", "Alfa"), cliente("c2", "Beta")]} onSelect={onSelect} />);

    const tresDias = await screen.findByRole("region", { name: /3 dias úteis: 1 projeto/ });
    expect(within(tresDias).getByText("Beta")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /Boas-vindas: 1 projeto/ })).getByText("Alfa")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Alfa"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }));
  });

  it("mostra quando o prazo da etapa passou", async () => {
    const antigo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
    render(<ProducaoKanban clientes={[cliente("c1", "Alfa", antigo)]} onSelect={() => {}} />);
    expect(await screen.findByText("Prazo da etapa passou")).toBeInTheDocument();
  });

  it("aba da etapa grava no banco e oferece ir para a proxima ao concluir", async () => {
    const onIrPara = vi.fn();
    render(<WorkspaceStageTab etapaId="6_boas_vindas" clienteId="c1" onIrPara={onIrPara} />);

    expect(screen.getByText("Não iniciada")).toBeInTheDocument();
    const itens = screen.getAllByRole("checkbox");
    fireEvent.click(itens[0]!);
    expect(itens[0]).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Em andamento · 1\//)).toBeInTheDocument();
    await waitFor(() => expect(banco.linhas).toHaveLength(1));

    itens.slice(1).forEach((i) => fireEvent.click(i));
    expect(screen.getByText("Etapa concluída")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ir para 7/ }));
    expect(onIrPara).toHaveBeenCalledWith("7_3_dias_uteis");
    await waitFor(() => expect(banco.linhas).toHaveLength(stageItems(3).length));
  });

  it("se o banco recusar, desfaz a marcacao e mostra o erro", async () => {
    banco.falhar = true;
    render(<WorkspaceStageTab etapaId="6_boas_vindas" clienteId="c1" />);
    const item = screen.getAllByRole("checkbox")[0]!;
    fireEvent.click(item);
    expect(await screen.findByRole("alert")).toHaveTextContent("permissão de gestor");
    expect(item).toHaveAttribute("aria-checked", "false");
  });
});
