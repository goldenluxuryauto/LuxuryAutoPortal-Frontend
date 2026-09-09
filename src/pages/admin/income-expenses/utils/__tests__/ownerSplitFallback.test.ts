import { describe, it, expect } from "vitest";

/**
 * The "unset vs genuinely 0" split-percent rule.
 *
 * This bug has now been fixed four times in four places
 * (calculateNegativeBalanceCarryOver, aggregateFromLoadedData, earnings.tsx,
 * and calculatePrevYearNegativeBalance). Every instance was the same shape:
 * a `|| 0` on a split percent that is *absent*, which silently pays the car
 * owner 0% instead of the configured default.
 *
 * The reason it keeps coming back is that the reader cannot tell "no value"
 * from "a real 0": `getPrevYearValue` returns 0 for a missing row, a missing
 * field, null, undefined and NaN alike. So every call site has to apply the
 * same fallback by hand.
 *
 * These tests pin the rule itself so the next copy of it has something to
 * fail against.
 */

/**
 * The fallback as the fixed call sites implement it, for a reader that
 * collapses "absent" to 0 (`getPrevYearValue`).
 */
function resolveSplitPercentFromZeroCollapsingReader(
  rawFromReader: number,
  configuredPercent: number | null | undefined,
  fallbackConfiguredPercent?: number | null,
): number {
  return rawFromReader !== 0
    ? rawFromReader
    : (configuredPercent ?? fallbackConfiguredPercent ?? 50);
}

/**
 * The same rule for a reader that preserves null/undefined (a direct row
 * lookup, as in earnings.tsx and the two sibling sites).
 */
function resolveSplitPercentFromNullableRaw(
  raw: number | string | null | undefined,
  configuredPercent: number | null | undefined,
): number {
  return raw != null ? Number(raw) : (configuredPercent ?? 50);
}

describe("owner split percent fallback (zero-collapsing reader)", () => {
  it("uses a recorded percent when there is one", () => {
    expect(resolveSplitPercentFromZeroCollapsingReader(70, 50)).toBe(70);
    expect(resolveSplitPercentFromZeroCollapsingReader(30, 50)).toBe(30);
  });

  it("falls back to the configured percent when the value is absent", () => {
    // The whole bug: `|| 0` here paid the owner 0%.
    expect(resolveSplitPercentFromZeroCollapsingReader(0, 60)).toBe(60);
  });

  it("defaults to 50, never 0, when nothing is configured either", () => {
    expect(resolveSplitPercentFromZeroCollapsingReader(0, null)).toBe(50);
    expect(resolveSplitPercentFromZeroCollapsingReader(0, undefined)).toBe(50);
  });

  it("honours a second configured source before defaulting", () => {
    // calculatePrevYearNegativeBalance reads the prior year's setting first,
    // then the current year's, then 50.
    expect(resolveSplitPercentFromZeroCollapsingReader(0, undefined, 65)).toBe(65);
    expect(resolveSplitPercentFromZeroCollapsingReader(0, 40, 65)).toBe(40);
  });

  it("never yields 0 for an absent percent under any configuration", () => {
    for (const configured of [null, undefined, 50, 70, 30]) {
      expect(resolveSplitPercentFromZeroCollapsingReader(0, configured)).not.toBe(0);
    }
  });
});

describe("owner split percent fallback (nullable reader)", () => {
  it("preserves a genuine stored 0 that a zero-collapsing reader cannot see", () => {
    // This is the one case where the two readers legitimately disagree: a
    // real, deliberate 0% is distinguishable here and must be honoured.
    expect(resolveSplitPercentFromNullableRaw(0, 50)).toBe(0);
  });

  it("falls back only when the value is truly absent", () => {
    expect(resolveSplitPercentFromNullableRaw(null, 50)).toBe(50);
    expect(resolveSplitPercentFromNullableRaw(undefined, 50)).toBe(50);
    expect(resolveSplitPercentFromNullableRaw(undefined, null)).toBe(50);
  });

  it("coerces the string a DECIMAL column arrives as", () => {
    // mysql2 hands DECIMALs over as strings; Number() is required before use.
    expect(resolveSplitPercentFromNullableRaw("70", 50)).toBe(70);
    expect(resolveSplitPercentFromNullableRaw("70.00", 50)).toBe(70);
  });
});
