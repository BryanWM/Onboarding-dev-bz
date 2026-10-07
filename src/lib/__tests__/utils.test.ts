import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility function", () => {
  it("should merge simple class names", () => {
    expect(cn("class-a", "class-b")).toBe("class-a class-b");
  });

  it("should ignore falsy values", () => {
    expect(cn("base-class", false, null, undefined, "")).toBe("base-class");
  });

  it("should resolve tailwind conflict classes properly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});
