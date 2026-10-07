import { describe, it, expect } from "vitest";
import { stages, stageItems, roleGroups } from "../stages-data";

describe("stages-data", () => {
  it("should contain exactly 13 stages", () => {
    expect(stages).toHaveLength(13);
  });

  it("should return all items for stages with groups", () => {
    const items = stageItems(1);
    expect(items.length).toBeGreaterThan(0);
    expect(items).toContain("Fechamento comercial confirmado");
  });

  it("should have correct role groups defined", () => {
    expect(roleGroups.length).toBe(4);
    const roles = roleGroups.map(([role]) => role);
    expect(roles).toEqual(["Comercial", "Onboarding / Atendimento", "Estratégia", "Criação / Marketing"]);
  });
});
