import { z } from "zod";
import { apiErrorBody } from "../schemas/common";

/**
 * A failed API call, carrying the HTTP status alongside whatever the server
 * put in the body.
 *
 * `message` is deliberately the human-readable string the server sent, so
 * existing `catch (e) { toast({ description: e.message }) }` call sites keep
 * working unchanged — there are ~507 destructive-toast sites depending on
 * that, and breaking them would make this layer unadoptable.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** Zod issues, when the server rejected input validation. */
  readonly details: unknown;

  constructor(status: number, message: string, body?: unknown, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.details = details;
  }

  /** The session expired or was never established. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Authenticated, but not allowed to do this. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** The server rejected the request body. */
  get isValidationError(): boolean {
    return this.status === 400;
  }
}

/**
 * Build an ApiError from a failed Response, reading the message from
 * whichever key the endpoint happens to use.
 *
 * The backend is not consistent here: most send {success:false, error},
 * some send a bare {error} with no success key, and a few use `message`
 * instead. Rather than normalize the backend (which would be a wire change
 * across ~100 endpoints) this reads all of them.
 */
export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    // Non-JSON error page (a proxy 502, an HTML error) — fall through.
    return new ApiError(res.status, `${res.status}: ${res.statusText}`, undefined);
  }

  const parsed = apiErrorBody.safeParse(body);
  const message = parsed.success
    ? parsed.data.error ?? parsed.data.message ?? `${res.status}: ${res.statusText}`
    : `${res.status}: ${res.statusText}`;
  const details = parsed.success ? parsed.data.details : undefined;

  return new ApiError(res.status, message, body, details);
}

/** Narrowing helper for `catch (e)` blocks. */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export type ApiErrorBody = z.infer<typeof apiErrorBody>;
