import { z } from "zod";
import { isoDate, isoDateTime, tinyIntFlag } from "./common";

/**
 * Car has FIVE distinct wire shapes, not one. They are not interchangeable:
 * `status` carries a different value set in three of them, and one renames
 * the field outright. The shared base below is only what genuinely appears
 * in all five; everything else lives on the variant that emits it.
 *
 *   carListSchema        GET /api/cars
 *   carDetailSchema      GET /api/cars/:id
 *   clientCarSchema      GET /api/client/cars          (raw SQL, no mapper)
 *   embeddedCarSchema    car[] inside GET /api/clients/:id
 *   profileCarSchema     car[] inside GET /api/client/profile
 */

/** The five-member DB enum, as stored. */
export const carRawStatus = z.enum([
  "pending",
  "available",
  "in_use",
  "maintenance",
  "off_fleet",
]);

/**
 * The two-member projection /api/cars and /api/cars/:id emit instead.
 * Lossy: available|in_use -> ACTIVE, and the other THREE all collapse to
 * INACTIVE, so it cannot be mapped back to carRawStatus.
 */
export const carMappedStatus = z.enum(["ACTIVE", "INACTIVE"]);

export const carManagementStatus = z.enum(["management", "own", "off_ride"]);

/** Fields present, with the same name and type, in all five variants. */
const carBase = z.object({
  id: z.number(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().nullable(),
  mileage: z.number(),
  tireSize: z.string().nullable(),
  oilType: z.string().nullable(),
  lastOilChange: z.string().nullable(),
  fuelType: z.string().nullable(),
});

const carOwner = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  // Present only on the primary branch; absent when the response falls back
  // to the ownerNameOverride path, hence optional rather than nullable.
  lastLoginAt: z.string().nullable().optional(),
  lastLogoutAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  status: z.number().optional(),
});

/** GET /api/cars */
export const carListSchema = carBase.extend({
  // Coerced to "" by the mapper, so never null here (unlike the other variants).
  vin: z.string(),
  makeModel: z.string(),
  licensePlate: z.string().nullable(),
  color: z.string().nullable(),
  status: carMappedStatus,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  userId: z.number().nullable(),
  clientId: z.number().nullable(),
  owner: carOwner.nullable(),
  ownerNameOverride: z.string().nullable(),
  ownerContactOverride: z.string().nullable(),
  ownerEmailOverride: z.string().nullable(),
  photos: z.array(z.string()),
  registrationExpiration: isoDate.nullable(),
  contactPhone: z.string().nullable(),
  turoLink: z.string().nullable(),
  adminTuroLink: z.string().nullable(),
  turoVehicleIds: z.array(z.string()).nullable(),
  locationTag: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  // 0..3, not a boolean. Derived from car_is_active.
  isActive: tinyIntFlag,
  managementStatus: carManagementStatus,
  // Hardcoded null by the backend despite the frontend declaring a union.
  offboardReason: z.null(),
  offboardNote: z.null(),
  offboardAt: z.null(),
});

/** GET /api/cars/:id — omits isActive and contactPhone, adds much else. */
export const carDetailSchema = carListSchema
  .omit({ isActive: true, contactPhone: true })
  .extend({
    // Detail alone carries BOTH projections of status.
    rawStatus: carRawStatus,
    interiorColor: z.string().nullable(),
    vehicleTrim: z.string().nullable(),
    vehicleRecall: z.string().nullable(),
    numberOfSeats: z.number().nullable(),
    numberOfDoors: z.number().nullable(),
    // VARCHAR columns, not booleans.
    skiRacks: z.string().nullable(),
    skiCrossBars: z.string().nullable(),
    roofRails: z.string().nullable(),
    freeDealershipOilChanges: z.string().nullable(),
    oilPackageDetails: z.string().nullable(),
    dealershipAddress: z.string().nullable(),
    // JSON.parsed to an array when it parses, left as the raw string otherwise.
    vehicleFeatures: z.union([z.string(), z.array(z.string())]).nullable(),
    currentMileage: z.number().nullable(),
    coHost: z
      .object({
        id: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        turoProfileUrl: z.string().nullable(),
      })
      .nullable(),
  });

/**
 * GET /api/client/cars — raw aliased SQL with no mapper, so driver types
 * leak through. Note `carStatus` (not `status`), `plateNumber` (not
 * `licensePlate`), and `photo` as unparsed JSON TEXT (not a photos array).
 */
export const clientCarSchema = carBase.extend({
  date: isoDateTime,
  // SQL literal '' as name — always the empty string.
  name: z.string(),
  makeModel: z.string().nullable(),
  vin: z.string().nullable(),
  plateNumber: z.string().nullable(),
  photo: z.string().nullable(),
  dropOffDate: isoDateTime,
  isActive: tinyIntFlag,
  returnedAt: isoDateTime.nullable(),
  clientId: z.number().nullable(),
  carStatus: carRawStatus,
  turoLink: z.string().nullable(),
  adminTuroLink: z.string().nullable(),
  contactPhone: z.string().nullable(),
  // Flat here, nested under `owner` in the list/detail variants.
  ownerFirstName: z.string().nullable(),
  ownerLastName: z.string().nullable(),
});

/**
 * ?for=onboarding narrows the same endpoint to ten columns. Every field the
 * full shape adds is simply absent, so this is its own schema rather than a
 * partial of the one above.
 */
export const clientCarOnboardingSchema = z.object({
  id: z.number(),
  date: isoDateTime,
  name: z.string(),
  makeModel: z.string().nullable(),
  plateNumber: z.string().nullable(),
  dropOffDate: isoDateTime,
  isActive: tinyIntFlag,
  returnedAt: isoDateTime.nullable(),
  clientId: z.number().nullable(),
  carStatus: carRawStatus,
});

/**
 * A car inside GET /api/clients/:id. Fifteen keys only — `owner` and
 * `contactPhone` are computed server-side then dropped by the projection,
 * so despite what client-detail.tsx declares they never arrive.
 */
export const embeddedCarSchema = carBase.extend({
  vin: z.string().nullable(),
  // Built by template literal without COALESCE, so a null model yields the
  // literal string "Toyota null".
  makeModel: z.string().nullable(),
  licensePlate: z.string().nullable(),
  status: carRawStatus,
  createdAt: isoDateTime,
  registrationExpiration: isoDate.nullable(),
});

/** A car inside GET /api/client/profile. */
export const profileCarSchema = carBase.extend({
  vin: z.string().nullable(),
  makeModel: z.string(),
  licensePlate: z.string().nullable(),
  status: carRawStatus,
  createdAt: isoDateTime,
  exteriorColor: z.string().nullable(),
  interiorColor: z.string().nullable(),
  registrationExpiration: isoDate.nullable(),
  manufacturerWebsite: z.string().nullable(),
  manufacturerUsername: z.string().nullable(),
  // Withheld unless the requester is a non-impersonating admin.
  turoPassword: z.string().nullable(),
  turoLink: z.string().nullable(),
});
