import type { z } from "zod";
import { buildApiUrl, buildUploadApiUrl } from "../queryClient";
import { ApiError, apiErrorFromResponse } from "../errors";
import { validate, validateStrict } from "../validation";

/**
 * Typed HTTP client for the backend.
 *
 * This is the one place a request is assembled: URL, credentials, headers,
 * body encoding, query string, timeout, and error translation. It exists so
 * the ~490 hand-rolled `fetch(buildApiUrl(...), { credentials: "include" })`
 * sites can collapse onto a single implementation without changing what any
 * of them observe.
 *
 * Behaviour that call sites depend on and that this module must preserve:
 *
 * - Every request sends the session cookie (`credentials: "include"`).
 * - A non-2xx response becomes an {@link ApiError} whose `.message` is the
 *   server's own text (`error` or `message` key), because hundreds of
 *   `toast({ description: e.message })` handlers display it verbatim.
 * - Multipart uploads go through `buildUploadApiUrl`, which bypasses the
 *   Vite dev proxy (the proxy drops multipart bodies), and never set a
 *   Content-Type header so the browser can add the boundary.
 * - A timeout aborts via AbortController and surfaces as the native
 *   `AbortError`, which the query client's retry predicate already knows
 *   how to classify.
 *
 * Deliberately NOT here: the `/api/auth/me` 401-to-`{user: undefined}`
 * special case and React Query's `on401: "returnNull"` mode. Both live in
 * `queryClient.ts` and are cache-semantics decisions, not transport ones.
 * Callers that want them check `isApiError(e) && e.isUnauthorized`.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: HttpMethod;
  /**
   * Request body. Plain objects and arrays are JSON-encoded with a
   * `Content-Type: application/json` header. FormData, Blob, URLSearchParams
   * and string bodies are sent as-is with no Content-Type set, so the
   * browser can pick the right one (including the multipart boundary).
   */
  body?: unknown;
  /**
   * Query-string parameters. `null` and `undefined` values are omitted so
   * optional filters can be passed straight through without an `if`.
   */
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  /** Caller-supplied abort signal, combined with the timeout if both are set. */
  signal?: AbortSignal;
  /** Abort after this many milliseconds. No timeout by default. */
  timeoutMs?: number;
  /** Route through `buildUploadApiUrl` (multipart uploads in dev). */
  upload?: boolean;
  /**
   * Message to use when the server sent none. Lets a call site keep its
   * existing user-facing wording ("Failed to save") without re-implementing
   * the error read.
   */
  fallbackMessage?: string;
  /** Override the default `"include"`. The password-reset flow uses `"omit"`. */
  credentials?: RequestCredentials;
}

/** Mirrors `RequestOptions` without `method`/`body`, which the verb helpers set. */
export type VerbOptions = Omit<RequestOptions, "method" | "body">;

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
    (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer)
  );
}

/**
 * Append `query` to `path`, respecting any `?` the path already carries.
 * Exported so tests and the occasional `<a href>`/`window.open` site can
 * build the same URL the client would request.
 */
export function buildQueryPath(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return path;
  return path + (path.includes("?") ? "&" : "?") + qs;
}

/**
 * Perform a request and return the raw `Response`.
 *
 * Throws {@link ApiError} for any non-2xx status. Network failures and
 * timeouts propagate as the browser's own `TypeError` / `AbortError` so
 * existing retry logic keyed on those keeps working.
 *
 * Use this directly only when you need the `Response` itself (streaming,
 * headers, a `.blob()` you will hand to `URL.createObjectURL`). For JSON
 * prefer {@link apiJson} or the `api.*` verb helpers.
 */
export async function apiFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const {
    method = "GET",
    body,
    query,
    headers = {},
    signal,
    timeoutMs,
    upload = false,
    fallbackMessage,
    credentials = "include",
  } = options;

  const fullPath = buildQueryPath(path, query);
  const url = upload ? buildUploadApiUrl(fullPath) : buildApiUrl(fullPath);

  const init: RequestInit = { method, credentials, headers: { ...headers } };

  if (body !== undefined && body !== null) {
    if (isRawBody(body)) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      if (!hasHeader(headers, "content-type")) {
        (init.headers as Record<string, string>)["Content-Type"] = "application/json";
      }
    }
  }

  // Combine the caller's signal with the timeout. AbortSignal.any is not
  // available in every supported browser, so wire it by hand.
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (timeoutMs !== undefined || signal) {
    const controller = new AbortController();
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
    }
    if (timeoutMs !== undefined) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    init.signal = controller.signal;
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const err = await apiErrorFromResponse(res);
    if (fallbackMessage && isStatusOnlyMessage(err, res)) {
      throw new ApiError(err.status, fallbackMessage, err.body, err.details);
    }
    throw err;
  }

  return res;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((k) => k.toLowerCase() === name);
}

/** True when `apiErrorFromResponse` found no server-supplied text. */
function isStatusOnlyMessage(err: ApiError, res: Response): boolean {
  return err.message === `${res.status}: ${res.statusText}`;
}

export interface JsonOptions<S extends z.ZodTypeAny = z.ZodTypeAny> extends RequestOptions {
  /**
   * Validate the parsed body against a schema and return the inferred type.
   * Opt-in: nothing is validated unless a schema is passed.
   *
   * Routed through `lib/validation`, so the default policy applies — a
   * mismatch WARNS and returns the body unchanged in the browser, and
   * THROWS under test so drift fails CI. Pass `strict: true` where acting on
   * a wrong shape is worse than failing.
   */
  schema?: S;
  /** Reject a schema mismatch instead of warning. */
  strict?: boolean;
}

/**
 * Request JSON. Returns the parsed body, typed as `T` by assertion or by the
 * schema's inferred type when one is supplied.
 *
 * A 204 or an empty body resolves to `undefined` rather than throwing on
 * `res.json()`, which several DELETE endpoints would otherwise trigger.
 */
export async function apiJson<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
export async function apiJson<S extends z.ZodTypeAny>(
  path: string,
  options: JsonOptions<S> & { schema: S },
): Promise<z.infer<S>>;
export async function apiJson(path: string, options: JsonOptions = {}): Promise<unknown> {
  const { schema, strict, ...rest } = options;
  const res = await apiFetch(path, rest);
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (text === "") return undefined;
  const parsed: unknown = JSON.parse(text);
  if (!schema) return parsed;
  return strict
    ? validateStrict(schema, parsed, path)
    : validate(schema, parsed, path);
}

/** Request a binary payload (PDF exports, proxied images, CSV downloads). */
export async function apiBlob(path: string, options?: RequestOptions): Promise<Blob> {
  const res = await apiFetch(path, options);
  return res.blob();
}

/** Request a text payload. */
export async function apiText(path: string, options?: RequestOptions): Promise<string> {
  const res = await apiFetch(path, options);
  return res.text();
}

/**
 * Verb helpers. Each returns the parsed JSON body typed as `T`.
 *
 *   const cars = await api.get<CarListResponse>("/api/cars", { query: { status: "ACTIVE" } });
 *   await api.patch(`/api/car-block-off/submissions/${id}/status`, { status });
 *   await api.post("/api/record-files/upload", formData, { upload: true });
 */
export const api = {
  get: <T = unknown>(path: string, options?: VerbOptions) =>
    apiJson<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: VerbOptions) =>
    apiJson<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: VerbOptions) =>
    apiJson<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: VerbOptions) =>
    apiJson<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: VerbOptions) =>
    apiJson<T>(path, { ...options, method: "DELETE" }),
} as const;

export { ApiError, isApiError } from "../errors";
