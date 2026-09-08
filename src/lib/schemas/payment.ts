import { z } from "zod";
import { isoDateTime, money, tinyIntFlag } from "./common";

/**
 * Payment is the one entity returned in RAW snake_case — there is no
 * camelCase mapper anywhere in its path.
 *
 *   paymentSearchSchema    POST /api/payments/search        (the main one)
 *   paymentListSchema      GET  /api/payments
 *   paymentByCarSchema     GET  /api/payments/car/:carId
 *   paymentByClientSchema  GET  /api/payments/client/:clientId
 *
 * MONEY TYPING — four adjacent amount fields, four behaviours:
 *   payments_amount          overwritten to a number ... conditionally
 *   payments_amount_balance  overwritten to a number ... conditionally
 *   payments_amount_payout   NEVER coerced, always a DECIMAL string
 *   payments_amount_v3       never coerced, string | null (40% of rows)
 *
 * The coercion happens in _recomputeOwnerSplitsForList, which `continue`s
 * past any row whose payments_year_month fails /^\d{4}-\d{2}$/ or whose
 * payments_car_id is falsy (paymentService.ts:938,941). Skipped rows keep
 * STRING amounts and lack the two boolean flags entirely. As of the last
 * audit no production row takes that path, but nothing enforces it — and
 * cleanupOrphanPayments exists precisely because orphans have occurred —
 * so the union is the honest type.
 *
 * KNOWN FRONTEND BUG: four files declare payments_amount_payout as `number`
 * (payments-main.tsx:39, payments.tsx:59, co-host-payments.tsx:15,
 * client/_components/types.ts:52). It is a string. co-host-payments.tsx:44
 * already accepts `number | string` in its formatter, which is the tell.
 */

const paymentBase = z.object({
  payments_aid: z.number(),
  payments_client_id: z.number(),
  payments_status_id: z.number(),
  payments_car_id: z.number(),
  payments_year_month: z.string(),
  payments_amount: money,
  payments_amount_payout: z.string(),
  payments_amount_balance: money,
  payments_amount_v3: z.string().nullable(),
  payments_reference_number: z.string(),
  payments_invoice_id: z.string(),
  // A DATE column, but it arrives as a full ISO datetime (verified against
  // live data: "2025-02-12T00:00:00.000Z"), not the bare "YYYY-MM-DD"
  // the column type suggests.
  payments_invoice_date: isoDateTime.nullable(),
  payments_attachment: z.string().nullable(),
  payments_remarks: z.string(),
  payments_created: isoDateTime,
  payments_datetime: isoDateTime,
  // Absent on rows the recompute skipped, hence optional rather than nullable.
  payments_amount_is_live: z.boolean().optional(),
  payments_has_income_expense: z.boolean().optional(),
  // Admin-managed rows in `payment_status`, NOT a fixed enum — never z.enum()
  // here or adding a status through the UI would start failing validation.
  payment_status_name: z.string().nullable(),
  payment_status_color: z.string().nullable(),
  car_plate_number: z.string().nullable(),
  car_vin_number: z.string().nullable(),
});

/**
 * POST /api/payments/search. Note car_make_NAME here versus car_make_MODEL
 * on the other three, for the identical CONCAT expression, and that
 * `fullname` is "Last, First" here but "First Last" on list/by-car.
 */
export const paymentSearchSchema = paymentBase.extend({
  car_make_name: z.string().nullable(),
  car_specs: z.string().nullable(),
  car_year: z.number().nullable(),
  car_is_active: tinyIntFlag,
  client_fname: z.string().nullable(),
  client_lname: z.string().nullable(),
  fullname: z.string().nullable(),
  // TRIM(CONCAT(COALESCE(...))) yields "" rather than null when unset.
  co_host_name: z.string(),
});

/** GET /api/payments */
export const paymentListSchema = paymentBase.extend({
  car_make_model: z.string().nullable(),
  car_year: z.number().nullable(),
  client_fname: z.string().nullable(),
  client_lname: z.string().nullable(),
  fullname: z.string().nullable(),
});

/** GET /api/payments/car/:carId — same projection as the list. */
export const paymentByCarSchema = paymentListSchema;

/**
 * GET /api/payments/client/:clientId — drops car_year and all three client
 * name fields, and its envelope carries no pagination.
 */
export const paymentByClientSchema = paymentBase.extend({
  car_make_model: z.string().nullable(),
});
