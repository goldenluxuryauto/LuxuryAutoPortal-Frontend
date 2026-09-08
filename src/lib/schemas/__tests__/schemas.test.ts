import { describe, it, expect } from "vitest";
import { paymentListSchema, paymentSearchSchema } from "../payment";
import { carListSchema, embeddedCarSchema, clientCarSchema } from "../car";
import { clientListSchema } from "../client";
import { money, apiErrorBody } from "../common";
import { ApiError, isApiError } from "../../errors";

// These schemas describe what the API returns TODAY, so the tests are built
// from payloads captured against the live database rather than from what the
// shapes arguably ought to be. A schema that rejects real traffic is worse
// than no schema.

// Captured from client_payments joined the way GET /api/payments does, then
// serialized as res.json would. Note every amount is a STRING here: this is
// a row BEFORE _recomputeOwnerSplitsForList coerces two of the four.
const REAL_PAYMENT_ROW = {
  payments_aid: 10932,
  payments_client_id: 480,
  payments_status_id: 2,
  payments_car_id: 816,
  payments_year_month: "2025-02",
  payments_amount: "2315.00",
  payments_amount_payout: "2315.00",
  payments_amount_balance: "0.00",
  payments_amount_v3: "2315.00",
  payments_reference_number: "",
  payments_invoice_id: "",
  payments_invoice_date: "2025-02-12T00:00:00.000Z",
  payments_attachment: null,
  payments_remarks: "",
  payments_created: "2026-06-15T15:56:42.000Z",
  payments_datetime: "2026-06-15T15:56:42.000Z",
  payment_status_name: "Paid",
  payment_status_color: "#22c55e",
  car_make_model: "Toyota 4Runner",
  car_plate_number: "ABC123",
  car_vin_number: "JTEBU5JR0L5000000",
  car_year: 2020,
  client_fname: "Jane",
  client_lname: "Doe",
  fullname: "Jane Doe",
};

describe("payment schemas accept real wire data", () => {
  it("accepts a row whose amounts are still DECIMAL strings", () => {
    const r = paymentListSchema.safeParse(REAL_PAYMENT_ROW);
    expect(r.success).toBe(true);
  });

  it("also accepts the same row after the recompute coerces two amounts", () => {
    // _recomputeOwnerSplitsForList overwrites these two with JS numbers but
    // leaves payout and v3 as strings — the mixed state must validate.
    const recomputed = {
      ...REAL_PAYMENT_ROW,
      payments_amount: 2315,
      payments_amount_balance: 0,
      payments_amount_is_live: true,
      payments_has_income_expense: true,
    };
    expect(paymentListSchema.safeParse(recomputed).success).toBe(true);
  });

  it("accepts a row the recompute skipped, missing both boolean flags", () => {
    // Rows with a malformed year-month or falsy car id `continue` past the
    // coercion, so the flags are absent rather than false.
    const { payments_amount_is_live, ...skipped } = {
      ...REAL_PAYMENT_ROW,
      payments_amount_is_live: undefined,
    } as Record<string, unknown>;
    expect(paymentListSchema.safeParse(skipped).success).toBe(true);
  });

  it("rejects a row missing a genuinely required field", () => {
    const { payments_aid, ...broken } = REAL_PAYMENT_ROW as Record<string, unknown>;
    expect(paymentListSchema.safeParse(broken).success).toBe(false);
  });

  it("does not accept the search shape as a list row", () => {
    // /search renames car_make_model to car_make_name; the schemas must not
    // silently treat the two endpoints as interchangeable.
    const searchRow = { ...REAL_PAYMENT_ROW } as Record<string, unknown>;
    delete searchRow.car_make_model;
    expect(paymentListSchema.safeParse(searchRow).success).toBe(false);
  });

  it("search rows carry car_make_name plus the co-host fields", () => {
    const searchRow: Record<string, unknown> = { ...REAL_PAYMENT_ROW };
    delete searchRow.car_make_model;
    Object.assign(searchRow, {
      car_make_name: "Toyota 4Runner",
      car_specs: "4Runner",
      car_is_active: 1,
      fullname: "Doe, Jane",   // "Last, First" here, unlike the list endpoint
      co_host_name: "",         // "" rather than null when unset
    });
    expect(paymentSearchSchema.safeParse(searchRow).success).toBe(true);
  });
});

describe("money accepts both representations", () => {
  it("takes the string form DECIMAL columns actually arrive as", () => {
    expect(money.safeParse("2315.00").success).toBe(true);
  });
  it("takes the number form hand-written coercion produces", () => {
    expect(money.safeParse(2315).success).toBe(true);
  });
  it("still rejects a non-numeric shape", () => {
    expect(money.safeParse({}).success).toBe(false);
    expect(money.safeParse(null).success).toBe(false);
  });
});

describe("car variants are not interchangeable", () => {
  const listCar = {
    id: 816, vin: "JTEBU5JR0L5000000", makeModel: "Toyota 4Runner",
    make: "Toyota", model: "4Runner", licensePlate: "ABC123", year: 2020,
    color: "Silver", mileage: 45000, status: "ACTIVE",
    offboardReason: null, offboardNote: null, offboardAt: null,
    createdAt: "2026-06-15T15:56:42.000Z", updatedAt: "2026-06-15T15:56:42.000Z",
    userId: 480, clientId: 480, owner: null,
    ownerNameOverride: null, ownerContactOverride: null, ownerEmailOverride: null,
    photos: [], tireSize: null, oilType: null, lastOilChange: null,
    fuelType: null, registrationExpiration: null, contactPhone: null,
    turoLink: null, adminTuroLink: null, turoVehicleIds: null,
    locationTag: null, city: null, state: null,
    isActive: 1, managementStatus: "management",
  };

  it("accepts the list shape with its two-member status", () => {
    expect(carListSchema.safeParse(listCar).success).toBe(true);
  });

  it("rejects the raw enum where the mapped status is expected", () => {
    // available|in_use -> ACTIVE and the other three -> INACTIVE, so the raw
    // value never appears on /api/cars.
    expect(carListSchema.safeParse({ ...listCar, status: "available" }).success).toBe(false);
  });

  it("the embedded shape takes the raw enum instead", () => {
    const embedded = {
      id: 816, vin: null, makeModel: "Toyota 4Runner", make: "Toyota",
      model: "4Runner", licensePlate: "ABC123", year: 2020, mileage: 45000,
      status: "off_fleet", createdAt: "2026-06-15T15:56:42.000Z",
      tireSize: null, oilType: null, lastOilChange: null, fuelType: null,
      registrationExpiration: null,
    };
    expect(embeddedCarSchema.safeParse(embedded).success).toBe(true);
    expect(embeddedCarSchema.safeParse({ ...embedded, status: "ACTIVE" }).success).toBe(false);
  });

  it("client cars use carStatus and plateNumber, not status and licensePlate", () => {
    const clientCar = {
      id: 816, date: "2026-06-15T15:56:42.000Z", name: "", makeModel: "Toyota 4Runner",
      vin: null, make: "Toyota", model: "4Runner", year: 2020, plateNumber: "ABC123",
      mileage: 45000, photo: null, dropOffDate: "2026-06-15T15:56:42.000Z",
      isActive: 1, returnedAt: null, clientId: 480, carStatus: "available",
      fuelType: null, tireSize: null, oilType: null, lastOilChange: null,
      turoLink: null, adminTuroLink: null, contactPhone: null,
      ownerFirstName: "Jane", ownerLastName: "Doe",
    };
    expect(clientCarSchema.safeParse(clientCar).success).toBe(true);
  });
});

describe("client list shape", () => {
  const base = {
    id: 480, firstName: "Jane", lastName: "Doe", email: "jane@example.com",
    roleId: 0, roleName: "Client", isActive: true, status: 0,
    createdAt: "2026-06-15T15:56:42.000Z",
    lastLoginAt: null, lastLogoutAt: null, carCount: 3,
  };

  it("accepts a row with phone absent, which is how the mapper emits it", () => {
    // `|| undefined` strips the key entirely, unlike lastLoginAt's `|| null`.
    expect(clientListSchema.safeParse(base).success).toBe(true);
  });

  it("accepts phone when present", () => {
    expect(clientListSchema.safeParse({ ...base, phone: "555-0100" }).success).toBe(true);
  });

  it("requires lastLoginAt to be present even when null", () => {
    const { lastLoginAt, ...missing } = base as Record<string, unknown>;
    expect(clientListSchema.safeParse(missing).success).toBe(false);
  });

  it("status 0 means ACTIVE, which isActive reflects", () => {
    // Documented because two frontend comments state this backwards.
    const parsed = clientListSchema.parse(base);
    expect(parsed.status).toBe(0);
    expect(parsed.isActive).toBe(true);
  });
});

describe("error envelope and ApiError", () => {
  it("matches every error shape the backend currently emits", () => {
    expect(apiErrorBody.safeParse({ success: false, error: "Unauthorized" }).success).toBe(true);
    expect(apiErrorBody.safeParse({ error: "Not authenticated" }).success).toBe(true);
    expect(apiErrorBody.safeParse({ success: false, message: "Forbidden" }).success).toBe(true);
    expect(
      apiErrorBody.safeParse({ success: false, error: "Validation error", details: [{ path: ["a"] }] }).success,
    ).toBe(true);
  });

  it("keeps the server message on .message so existing toasts keep working", () => {
    const e = new ApiError(400, "Invalid car ID", { error: "Invalid car ID" });
    expect(e.message).toBe("Invalid car ID");
    expect(e.isValidationError).toBe(true);
    expect(e.isUnauthorized).toBe(false);
    expect(isApiError(e)).toBe(true);
    expect(isApiError(new Error("plain"))).toBe(false);
  });
});
