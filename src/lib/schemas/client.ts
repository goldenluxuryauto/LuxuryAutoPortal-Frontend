import { z } from "zod";
import { isoDateTime } from "./common";
import { embeddedCarSchema, profileCarSchema } from "./car";

/**
 * Client has three wire shapes:
 *   clientListSchema     GET /api/clients
 *   clientDetailSchema   GET /api/clients/:id
 *   clientProfileSchema  GET /api/client/profile   (the client's own record)
 *
 * WARNING on isActive: the DB stores 0 = ACTIVE. `isActive` is derived as
 * `status === 0`, so the boolean reads the way you would expect while the
 * number does not. Two frontend comments currently document this backwards
 * (client-detail.tsx:80, cars.tsx:96).
 */

/** 0 = Active, 1 = Inactive, 2 = Suspended, 3 = Blocked. */
export const clientStatus = z.number();

const clientBase = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  // `|| undefined` in the mapper, so the KEY IS STRIPPED when empty —
  // optional, never null. The neighbouring lastLoginAt uses `|| null` and is
  // therefore always present. That asymmetry is deliberate in the source.
  phone: z.string().optional(),
  roleId: z.number(),
  roleName: z.string(),
  isActive: z.boolean(),
  status: clientStatus,
  createdAt: isoDateTime,
  lastLoginAt: isoDateTime.nullable(),
  lastLogoutAt: isoDateTime.nullable(),
});

/** GET /api/clients */
export const clientListSchema = clientBase.extend({
  carCount: z.number(),
});

/**
 * The personal/banking fields the detail mapper adds. Every one uses
 * `|| undefined`, so all are optional and none are ever null. The masked
 * variants hold "•••" placeholders; full values come from
 * POST /api/sensitive/reveal.
 */
const clientDetailFields = {
  birthday: z.string().optional(),
  tshirtSize: z.string().optional(),
  ssn: z.string().optional(),
  ssnLast4: z.string().optional(),
  representative: z.string().optional(),
  heardAboutUs: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  bankName: z.string().optional(),
  bankRoutingNumberLast4: z.string().optional(),
  bankAccountNumberLast4: z.string().optional(),
  taxClassification: z.string().optional(),
  businessName: z.string().optional(),
  ein: z.string().optional(),
  einLast4: z.string().optional(),
};

const onboardingSummary = z.object({
  id: z.number(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  contractStatus: z.string().nullable(),
  contractSignedAt: isoDateTime.nullable(),
  contractToken: z.string().nullable(),
  createdAt: isoDateTime,
});

/** GET /api/clients/:id */
export const clientDetailSchema = clientBase.extend({
  ...clientDetailFields,
  // Optional here; the profile endpoint returns these masked-and-always-present.
  bankRoutingNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  userId: z.number().nullable(),
  cars: z.array(embeddedCarSchema),
  onboarding: onboardingSummary.nullable(),
  signedContracts: z.array(z.record(z.unknown())),
});

/** GET /api/client/profile */
export const clientProfileSchema = clientBase.extend({
  ...clientDetailFields,
  // Overwritten by maskField(), which returns `v ?? null` — so unlike the
  // detail endpoint these are always present and nullable, not optional.
  bankRoutingNumber: z.string().nullable(),
  bankAccountNumber: z.string().nullable(),
  // Different element shape from clientDetailSchema's `cars`.
  cars: z.array(profileCarSchema),
  // Built with a `...onboarding` spread, so it carries the whole raw row;
  // passthrough rather than pretend we know every column.
  onboarding: z.record(z.unknown()).nullable(),
  signedContracts: z.array(z.record(z.unknown())),
  bankingInfo: z.record(z.unknown()).nullable(),
});
