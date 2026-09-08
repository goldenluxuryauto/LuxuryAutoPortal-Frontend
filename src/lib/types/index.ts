/**
 * Types for the API surface — every one INFERRED from a schema, never
 * hand-written. If a shape is wrong, fix the schema and the type follows.
 */
import { z } from "zod";
import * as carSchemas from "../schemas/car";
import * as clientSchemas from "../schemas/client";
import * as paymentSchemas from "../schemas/payment";

// Car — five distinct wire shapes, not interchangeable.
export type CarListItem = z.infer<typeof carSchemas.carListSchema>;
export type CarDetail = z.infer<typeof carSchemas.carDetailSchema>;
export type ClientCar = z.infer<typeof carSchemas.clientCarSchema>;
export type ClientCarOnboarding = z.infer<typeof carSchemas.clientCarOnboardingSchema>;
export type EmbeddedCar = z.infer<typeof carSchemas.embeddedCarSchema>;
export type ProfileCar = z.infer<typeof carSchemas.profileCarSchema>;
export type CarRawStatus = z.infer<typeof carSchemas.carRawStatus>;
export type CarMappedStatus = z.infer<typeof carSchemas.carMappedStatus>;

// Client
export type ClientListItem = z.infer<typeof clientSchemas.clientListSchema>;
export type ClientDetail = z.infer<typeof clientSchemas.clientDetailSchema>;
export type ClientProfile = z.infer<typeof clientSchemas.clientProfileSchema>;

// Payment — raw snake_case on the wire.
export type PaymentSearchRow = z.infer<typeof paymentSchemas.paymentSearchSchema>;
export type PaymentListRow = z.infer<typeof paymentSchemas.paymentListSchema>;
export type PaymentByCarRow = z.infer<typeof paymentSchemas.paymentByCarSchema>;
export type PaymentByClientRow = z.infer<typeof paymentSchemas.paymentByClientSchema>;
