import { z } from "zod";

/**
 * Building blocks shared by every entity schema.
 *
 * These describe what the API returns TODAY, not an idealized shape. Where
 * the wire is inconsistent the schema is inconsistent too, on purpose: a
 * schema that rejects real traffic is worse than no schema, and the
 * mismatches documented here are the map for fixing them later.
 */

/**
 * A money value as it actually arrives.
 *
 * The mysql2 pool sets neither `decimalNumbers` nor `typeCast`, so every
 * DECIMAL column reaches the client as a STRING. Some are then coerced to
 * numbers by hand-written code and some are not, inconsistently and
 * sometimes conditionally — so a bare z.number() would reject real
 * responses. Callers should run this through Number() before arithmetic.
 */
export const money = z.union([z.number(), z.string()]);

/** A money value that can also be absent entirely. */
export const nullableMoney = money.nullable();

/**
 * A DATETIME column. Arrives as a JS Date server-side, which res.json()
 * serializes to an ISO-8601 string, so the client always sees a string.
 */
export const isoDateTime = z.string();

/** A DATE column, which serializes as "YYYY-MM-DD" rather than full ISO. */
export const isoDate = z.string();

/**
 * MySQL TINYINT. Never a boolean on the wire — 0/1, and for some columns
 * 0..3. Do not `if (row.someFlag)` without checking the column's meaning:
 * `client_is_active` uses 0 to mean ACTIVE, the opposite of the obvious
 * reading (two frontend comments currently state it backwards).
 */
export const tinyIntFlag = z.number();

/** The dominant success envelope: {success: true, data: T}. */
export const apiResponse = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), data });

/** Pagination block accompanying the list endpoints that have one. */
export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

/** A paginated list envelope: {success, data: T[], pagination}. */
export const paginatedResponse = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(item),
    pagination: paginationSchema,
  });

/**
 * The error envelope. Note `success` is absent on some endpoints rather
 * than false, and the message lives under `error` on most but `message` on
 * a few — both are optional here so this matches every shape currently in
 * use. The frontend keys off the HTTP status, not these fields.
 */
export const apiErrorBody = z.object({
  success: z.literal(false).optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});
