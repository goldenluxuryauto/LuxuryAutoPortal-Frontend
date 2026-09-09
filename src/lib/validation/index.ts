import type { z } from "zod";

/**
 * Boundary validation policy.
 *
 * Schemas in `src/lib/schemas` describe what the API returns *today*,
 * including its inconsistencies. They were checked against real production
 * rows (see `schemas/__tests__/realShapes.test.ts`), but "every row we
 * sampled" is not "every row that exists": the payments list alone has rows
 * whose LEFT JOINs miss, and endpoints change without the frontend knowing.
 *
 * So the default policy is **warn, don't throw**. A schema mismatch is a
 * signal that our model of the wire drifted — it is not, by itself, a reason
 * to blank out a page that would otherwise have rendered. Turning a
 * cosmetically-unexpected field into a crashed dashboard is a worse failure
 * than showing the data.
 *
 * In tests the policy flips to throwing, so a drift that reaches CI fails
 * loudly instead of scrolling past in a log nobody reads.
 *
 *   const payments = validate(paymentListSchema.array(), body.data, "/api/payments");
 *
 * Use `validateStrict` for the narrow cases where acting on a wrong shape is
 * worse than failing: anything that writes money, or a value fed straight
 * into arithmetic that lands in the database.
 */

export type ValidationMode = "warn" | "throw";

function defaultMode(): ValidationMode {
  // Vitest sets MODE=test; a schema drift should fail the suite, not warn.
  return import.meta.env?.MODE === "test" ? "throw" : "warn";
}

/** Reported once per (source, path) so a list of 500 bad rows logs once. */
const reported = new Set<string>();

export function resetValidationReports(): void {
  reported.clear();
}

function report(source: string, error: z.ZodError): void {
  for (const issue of error.issues) {
    const key = `${source}|${issue.path.join(".")}|${issue.code}`;
    if (reported.has(key)) continue;
    reported.add(key);
    console.warn(
      `[schema] ${source}: ${issue.path.join(".") || "(root)"} — ${issue.message}`,
    );
  }
}

/**
 * Parse `data` against `schema`.
 *
 * On success returns the parsed value. On failure, warns once per distinct
 * issue and returns the input unchanged (cast to the schema's type), so the
 * caller renders whatever actually arrived. Set `mode: "throw"` to reject.
 */
export function validate<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  source: string,
  mode: ValidationMode = defaultMode(),
): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  if (mode === "throw") {
    report(source, result.error);
    throw result.error;
  }

  report(source, result.error);
  // Deliberately the unparsed input: the page showed this data before the
  // schema existed and must keep showing it.
  return data as z.infer<S>;
}

/** Validate and throw on mismatch, whatever the ambient mode. */
export function validateStrict<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  source: string,
): z.infer<S> {
  return validate(schema, data, source, "throw");
}

/**
 * Whether `data` matches, without parsing or warning. For branching on shape
 * (e.g. two response formats from one endpoint) rather than for checking.
 */
export function matches<S extends z.ZodTypeAny>(schema: S, data: unknown): boolean {
  return schema.safeParse(data).success;
}
