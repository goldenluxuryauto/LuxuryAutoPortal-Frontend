import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { api, apiBlob, apiFetch, apiJson, apiText, buildQueryPath, isApiError } from "../index";

// The client is the replacement for ~490 hand-rolled fetch sites. These
// tests pin the behaviours those sites observe today, so the migration in
// Phase 4 is a pure rewrite of call shape, not of semantics.

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200, statusText = "OK"): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

function lastInit(): RequestInit {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return call[1] as RequestInit;
}

function lastUrl(): string {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return String(call[0]);
}

/** Resolve to whatever the promise rejected with, typed loosely for assertions. */
async function rejection(p: Promise<unknown>): Promise<any> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected the promise to reject");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("buildQueryPath", () => {
  it("appends a query string and drops null/undefined values", () => {
    expect(buildQueryPath("/api/cars", { status: "ACTIVE", page: 2, q: undefined, x: null })).toBe(
      "/api/cars?status=ACTIVE&page=2",
    );
  });

  it("uses & when the path already has a query", () => {
    expect(buildQueryPath("/api/cars?limit=50", { page: 1 })).toBe("/api/cars?limit=50&page=1");
  });

  it("leaves the path alone when every value is absent", () => {
    expect(buildQueryPath("/api/cars", { q: undefined })).toBe("/api/cars");
    expect(buildQueryPath("/api/cars")).toBe("/api/cars");
  });

  it("encodes values, including false and 0", () => {
    expect(buildQueryPath("/api/x", { vin: "A B", flag: false, n: 0 })).toBe("/api/x?vin=A+B&flag=false&n=0");
  });
});

describe("request assembly", () => {
  it("always sends the session cookie", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));
    await apiFetch("/api/cars");
    expect(lastInit().credentials).toBe("include");
  });

  it("lets the password-reset flow opt out of credentials", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await apiFetch("/api/auth/reset-password-request", { credentials: "omit" });
    expect(lastInit().credentials).toBe("omit");
  });

  it("JSON-encodes object bodies and sets Content-Type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.patch("/api/x/1/status", { status: "new" });
    const init = lastInit();
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ status: "new" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("does not set Content-Type for FormData, so the browser adds the boundary", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const fd = new FormData();
    fd.append("file", new Blob(["x"]), "x.txt");
    await api.post("/api/record-files/upload", fd);
    const init = lastInit();
    expect(init.body).toBe(fd);
    expect(Object.keys(init.headers as Record<string, string>)).not.toContain("Content-Type");
  });

  it("respects a caller-supplied Content-Type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.post("/api/x", { a: 1 }, { headers: { "content-type": "application/merge-patch+json" } });
    const headers = lastInit().headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/merge-patch+json");
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("sends GET without a body or Content-Type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.get("/api/cars");
    const init = lastInit();
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({});
  });

  it("appends query params to the URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.get("/api/cars", { query: { status: "ACTIVE", page: 2 } });
    expect(lastUrl()).toMatch(/\/api\/cars\?status=ACTIVE&page=2$/);
  });

  it("routes uploads through buildUploadApiUrl", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.post("/api/upload", new FormData(), { upload: true });
    // In the vitest (DEV) environment buildUploadApiUrl targets the backend
    // directly rather than the relative proxy path.
    expect(lastUrl()).toMatch(/^http:\/\/localhost:3000\/api\/upload$/);
  });
});

describe("error translation", () => {
  it("throws ApiError with the server's `error` text as .message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, error: "Car not found" }, 404, "Not Found"));
    const err = await rejection(api.get("/api/cars/999"));
    expect(isApiError(err)).toBe(true);
    expect(err.message).toBe("Car not found");
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ success: false, error: "Car not found" });
  });

  it("reads `message` when the endpoint uses that key instead", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Validation failed", details: [{ path: ["x"] }] }, 400, "Bad Request"));
    const err = await rejection(api.post("/api/x", {}));
    expect(err.message).toBe("Validation failed");
    expect(err.details).toEqual([{ path: ["x"] }]);
    expect(err.isValidationError).toBe(true);
  });

  it("falls back to status text for a non-JSON error page", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502, statusText: "Bad Gateway" }));
    const err = await rejection(api.get("/api/x"));
    expect(isApiError(err)).toBe(true);
    expect(err.message).toBe("502: Bad Gateway");
  });

  it("uses fallbackMessage only when the server sent no text", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500, "Internal Server Error"));
    const a = await rejection(api.post("/api/x", {}, { fallbackMessage: "Failed to save" }));
    expect(a.message).toBe("Failed to save");

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "VIN already exists" }, 409, "Conflict"));
    const b = await rejection(api.post("/api/x", {}, { fallbackMessage: "Failed to save" }));
    expect(b.message).toBe("VIN already exists");
  });

  it("marks 401 and 403 so callers can branch without string-matching", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Not authenticated" }, 401, "Unauthorized"));
    const a = await rejection(api.get("/api/me"));
    expect(a.isUnauthorized).toBe(true);
    expect(a.isForbidden).toBe(false);

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Admin only" }, 403, "Forbidden"));
    const b = await rejection(api.get("/api/admin"));
    expect(b.isForbidden).toBe(true);
  });

  it("lets network failures propagate untouched for the retry predicate", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await rejection(api.get("/api/x"));
    expect(err).toBeInstanceOf(TypeError);
    expect(isApiError(err)).toBe(false);
  });
});

describe("body decoding", () => {
  it("returns the parsed JSON body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: [{ id: 1 }] }));
    const body = await api.get<{ success: true; data: { id: number }[] }>("/api/cars");
    expect(body.data[0].id).toBe(1);
  });

  it("resolves undefined for 204 and empty bodies instead of throwing on res.json()", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.delete("/api/x/1")).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(api.delete("/api/x/1")).resolves.toBeUndefined();
  });

  it("validates against a schema when one is supplied and returns the inferred type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: 7, amount: "12.50" } }));
    const schema = z.object({ success: z.literal(true), data: z.object({ id: z.number(), amount: z.string() }) });
    const body = await apiJson("/api/x", { schema });
    expect(body.data.amount).toBe("12.50");
  });

  it("throws a ZodError when the body does not match the schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: "seven" } }));
    const schema = z.object({ success: z.literal(true), data: z.object({ id: z.number() }) });
    await expect(apiJson("/api/x", { schema })).rejects.toBeInstanceOf(z.ZodError);
  });

  it("does not validate when no schema is passed", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ anything: "goes" }));
    await expect(api.get("/api/x")).resolves.toEqual({ anything: "goes" });
  });

  it("apiBlob returns the binary payload", async () => {
    fetchMock.mockResolvedValue(new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), { status: 200 }));
    const blob = await apiBlob("/api/export.pdf");
    expect(await blob.text()).toBe("%PDF-1.4");
  });

  it("apiText returns the raw text", async () => {
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
    await expect(apiText("/api/ping")).resolves.toBe("ok");
  });
});

describe("abort and timeout", () => {
  it("aborts with the native AbortError when the timeout elapses", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
    );
    const pending = rejection(api.get("/api/slow", { timeoutMs: 10_000 }));
    await vi.advanceTimersByTimeAsync(10_000);
    const err = await pending;
    expect(err.name).toBe("AbortError");
    expect(isApiError(err)).toBe(false);
  });

  it("clears the timer once the response arrives", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.get("/api/fast", { timeoutMs: 10_000 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("honours a caller signal that is already aborted", async () => {
    fetchMock.mockImplementation((_url, init) => {
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
      }
      return Promise.resolve(jsonResponse({}));
    });
    const controller = new AbortController();
    controller.abort();
    const err = await rejection(api.get("/api/x", { signal: controller.signal }));
    expect(err.name).toBe("AbortError");
  });

  it("forwards a later abort from the caller signal", async () => {
    fetchMock.mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
    );
    const controller = new AbortController();
    const pending = rejection(api.get("/api/x", { signal: controller.signal }));
    controller.abort();
    const err = await pending;
    expect(err.name).toBe("AbortError");
  });

  it("passes no signal at all when neither a timeout nor a signal is given", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.get("/api/x");
    expect(lastInit().signal).toBeUndefined();
  });
});
