import { describe, it, expect } from "vitest";
import realRows from "./fixtures/payment-rows.real.json";
import { paymentListSchema } from "../payment";

/**
 * Schemas checked against REAL production rows, not hand-written examples.
 *
 * The fixture was captured by running the exact `getAllPayments` query from
 * paymentService.ts against the live database and serializing the result the
 * same way `res.json()` does, so the values here are the literal wire shapes
 * the browser receives. Only identifying VALUES were replaced (names, VINs,
 * plates, invoice/reference numbers, remarks); every type, null and key is
 * untouched.
 *
 * This matters because a schema that rejects real traffic is worse than no
 * schema. Hand-written fixtures agree with whatever the schema author already
 * believed; these rows do not. They pin, among other things:
 *
 * - Money as STRINGS ("0.00"), because the mysql2 pool sets neither
 *   decimalNumbers nor typeCast.
 * - `payments_amount_v3` present on some rows and null on most.
 * - DATETIME columns as full ISO strings, DATE columns as null when unset.
 * - **Orphan rows**: the list query LEFT JOINs car, client and payment_status,
 *   and there are rows in production where those joins miss, so
 *   payment_status_name / car_plate_number / fullname come back null. A
 *   schema that marked them required would throw on live data.
 */

type Fixture = Record<string, unknown[]>;
const rows = realRows as unknown as Fixture;

describe("paymentListSchema accepts real production rows", () => {
  for (const group of ["recent", "v3", "orphan", "nullDate"] as const) {
    it(`${group} rows parse`, () => {
      const sample = rows[group];
      expect(sample.length).toBeGreaterThan(0);

      const failures = sample
        .map((row) => paymentListSchema.safeParse(row))
        .flatMap((res) =>
          res.success
            ? []
            : [res.error.issues.map((i) => `${i.path.join(".")}: ${i.code}`).join(", ")],
        );

      expect(failures).toEqual([]);
    });
  }

  it("really does contain rows whose joins missed", () => {
    // Guards the fixture itself: if a future re-capture quietly dropped the
    // orphan rows, the group above would pass for the wrong reason.
    const orphans = rows.orphan as Record<string, unknown>[];
    const withNullJoin = orphans.filter(
      (r) =>
        r.payment_status_name === null ||
        r.car_plate_number === null ||
        r.fullname === null,
    );
    expect(withNullJoin.length).toBeGreaterThan(0);
  });

  it("really does contain money as strings", () => {
    const recent = rows.recent as Record<string, unknown>[];
    expect(recent.some((r) => typeof r.payments_amount === "string")).toBe(true);
    expect(recent.some((r) => typeof r.payments_amount_payout === "string")).toBe(true);
  });
});
