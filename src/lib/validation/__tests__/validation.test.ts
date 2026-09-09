import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { matches, resetValidationReports, validate, validateStrict } from "../index";

const schema = z.object({ id: z.number(), name: z.string() });

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetValidationReports();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe("validate", () => {
  it("returns the parsed value when the shape matches", () => {
    expect(validate(schema, { id: 1, name: "a" }, "/api/x", "warn")).toEqual({
      id: 1,
      name: "a",
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("in warn mode returns the data unchanged so the page still renders", () => {
    const bad = { id: "not-a-number", name: "a" };
    expect(validate(schema, bad, "/api/x", "warn")).toBe(bad);
    expect(warn).toHaveBeenCalled();
  });

  it("in warn mode names the field and the source", () => {
    validate(schema, { id: "x", name: "a" }, "/api/payments", "warn");
    expect(String(warn.mock.calls[0][0])).toContain("/api/payments");
    expect(String(warn.mock.calls[0][0])).toContain("id");
  });

  it("throws in throw mode", () => {
    expect(() => validate(schema, { id: "x" }, "/api/x", "throw")).toThrow(z.ZodError);
  });

  it("defaults to throwing under vitest, so drift fails CI", () => {
    // No explicit mode: the ambient default applies, and MODE is "test" here.
    expect(() => validate(schema, { id: "x", name: "a" }, "/api/x")).toThrow(z.ZodError);
  });

  it("reports each distinct issue once, not once per row", () => {
    for (let i = 0; i < 50; i++) {
      validate(schema, { id: "x", name: "a" }, "/api/x", "warn");
    }
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("still reports the same issue from a different source", () => {
    validate(schema, { id: "x", name: "a" }, "/api/a", "warn");
    validate(schema, { id: "x", name: "a" }, "/api/b", "warn");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("reports several distinct issues from one payload", () => {
    validate(schema, { id: "x", name: 5 }, "/api/x", "warn");
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("validateStrict", () => {
  it("throws regardless of the ambient mode", () => {
    expect(() => validateStrict(schema, { id: "x" }, "/api/money")).toThrow(z.ZodError);
  });

  it("returns the parsed value on a match", () => {
    expect(validateStrict(schema, { id: 2, name: "b" }, "/api/money")).toEqual({
      id: 2,
      name: "b",
    });
  });
});

describe("matches", () => {
  it("answers without warning or throwing", () => {
    expect(matches(schema, { id: 1, name: "a" })).toBe(true);
    expect(matches(schema, { id: "x" })).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
