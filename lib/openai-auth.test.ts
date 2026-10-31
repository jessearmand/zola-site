import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  OPENAI_TOKEN_ENDPOINT,
  REFRESH_MARGIN_MS,
  OpenAIAuthError,
  createOpenAIAuth,
  resolveVercelOidcToken,
  type OpenAIAuthDeps,
} from "./openai-auth.ts";

const SUBJECT = "header.subject-token-secret-value.sig";
const ACCESS = "access-token-secret-value";
const API_KEY = "sk-test-api-key";

const warnings: unknown[][] = [];
const originalWarn = console.warn;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tokenBody(nowMs: number, lifetimeSec = 3600) {
  return {
    access_token: ACCESS,
    token_type: "Bearer",
    expires_in: lifetimeSec,
    expires_at: Math.floor(nowMs / 1000) + lifetimeSec,
    scope: "api.model.request",
  };
}

function setup(overrides: Partial<OpenAIAuthDeps> & { nowMs?: number } = {}) {
  let nowMs = overrides.nowMs ?? 1_700_000_000_000;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const deps: OpenAIAuthDeps = {
    env: {
      OPENAI_IDENTITY_PROVIDER_ID: "idp_test",
      OPENAI_SERVICE_ACCOUNT_ID: "sa_test",
      OPENAI_API_KEY: API_KEY,
    },
    fetchImpl: async (input, init) => {
      calls.push({ url: String(input), init });
      return jsonResponse(tokenBody(nowMs));
    },
    now: () => nowMs,
    getOidcToken: async () => SUBJECT,
    ...overrides,
  };
  return {
    auth: createOpenAIAuth(deps),
    calls,
    setNow(ms: number) {
      nowMs = ms;
    },
    now: () => nowMs,
  };
}

describe("OpenAI workload identity", () => {
  afterEach(() => {
    console.warn = originalWarn;
    warnings.length = 0;
  });

  it("uses the API key when workload identity is not configured", async () => {
    const { auth, calls } = setup({
      env: { OPENAI_API_KEY: API_KEY },
    });

    assert.equal(await auth.getBearerToken(), API_KEY);
    assert.equal(calls.length, 0);
  });

  it("prefers workload identity when its env vars are set", async () => {
    const { auth, calls } = setup();
    const token = await auth.getBearerToken();

    assert.equal(token, ACCESS);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, OPENAI_TOKEN_ENDPOINT);
    const body = JSON.parse(String(calls[0]?.init?.body));
    assert.deepEqual(body, {
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      subject_token: SUBJECT,
      identity_provider_id: "idp_test",
      service_account_id: "sa_test",
    });
    const headers = new Headers(calls[0]?.init?.headers);
    assert.equal(headers.get("content-type"), "application/json");
    assert.equal(headers.get("authorization"), null);
  });

  it("reuses the cached access token until the refresh margin", async () => {
    const { auth, calls, setNow, now } = setup();
    assert.equal(await auth.getBearerToken(), ACCESS);

    setNow(now() + 3600 * 1000 - REFRESH_MARGIN_MS - 1);
    assert.equal(await auth.getBearerToken(), ACCESS);
    assert.equal(calls.length, 1);

    setNow(now() + 1);
    assert.equal(await auth.getBearerToken(), ACCESS);
    assert.equal(calls.length, 2);
  });

  it("honors expires_at when it is shorter than expires_in", async () => {
    let nowMs = 1_700_000_000_000;
    const calls: number[] = [];
    const auth = createOpenAIAuth({
      env: {
        OPENAI_IDENTITY_PROVIDER_ID: "idp_test",
        OPENAI_SERVICE_ACCOUNT_ID: "sa_test",
      },
      fetchImpl: async () => {
        calls.push(nowMs);
        return jsonResponse({
          access_token: ACCESS,
          expires_in: 3600,
          expires_at: Math.floor(nowMs / 1000) + 100,
          token_type: "Bearer",
        });
      },
      now: () => nowMs,
      getOidcToken: async () => SUBJECT,
    });

    await auth.getBearerToken();
    nowMs += 49_999;
    await auth.getBearerToken();
    assert.equal(calls.length, 1);

    nowMs += 1;
    await auth.getBearerToken();
    assert.equal(calls.length, 2);
  });

  it("shares one exchange across concurrent callers", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let fetches = 0;
    const { auth } = setup({
      fetchImpl: async () => {
        fetches += 1;
        await gate;
        return jsonResponse(tokenBody(1_700_000_000_000));
      },
    });

    const pending = Promise.all([
      auth.getBearerToken(),
      auth.getBearerToken(),
      auth.getBearerToken(),
    ]);
    await Promise.resolve();
    assert.equal(fetches, 1);
    release();
    const tokens = await pending;
    assert.deepEqual(tokens, [ACCESS, ACCESS, ACCESS]);
    assert.equal(fetches, 1);
  });

  it("keeps a still-valid token when refresh fails", async () => {
    let fail = false;
    const { auth, setNow, now } = setup({
      fetchImpl: async () => {
        if (fail) return jsonResponse({ error: SUBJECT }, 401);
        return jsonResponse(tokenBody(now()));
      },
    });
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };

    assert.equal(await auth.getBearerToken(), ACCESS);
    fail = true;
    setNow(now() + 3600 * 1000 - 30_000);
    assert.equal(await auth.getBearerToken(), ACCESS);

    setNow(now() + 30_000);
    await assert.rejects(auth.getBearerToken(), (error: unknown) => {
      assert.ok(error instanceof OpenAIAuthError);
      assert.equal(error.message, "OpenAI authentication failed.");
      assert.equal(error.message.includes(SUBJECT), false);
      assert.equal(error.message.includes(ACCESS), false);
      return true;
    });
    assert.equal(JSON.stringify(warnings).includes(SUBJECT), false);
    assert.equal(JSON.stringify(warnings).includes(ACCESS), false);
  });

  it("does not put tokens in errors when the OIDC lookup throws", async () => {
    const { auth } = setup({
      getOidcToken: async () => {
        throw new Error(`lookup failed for ${SUBJECT}`);
      },
    });

    await assert.rejects(auth.getBearerToken(), (error: unknown) => {
      assert.ok(error instanceof OpenAIAuthError);
      assert.equal(error.message, "Vercel OIDC token is unavailable.");
      assert.equal(error.message.includes(SUBJECT), false);
      return true;
    });
  });

  it("requires both workload identity ids", async () => {
    const { auth, calls } = setup({
      env: { OPENAI_IDENTITY_PROVIDER_ID: "idp_test", OPENAI_API_KEY: API_KEY },
    });

    await assert.rejects(
      auth.getBearerToken(),
      /Set both OPENAI_IDENTITY_PROVIDER_ID and OPENAI_SERVICE_ACCOUNT_ID/,
    );
    assert.equal(calls.length, 0);
  });

  it("passes the request token hint through to the OIDC lookup", async () => {
    let seen: string | undefined;
    const { auth } = setup({
      getOidcToken: async (hint) => {
        seen = hint;
        return SUBJECT;
      },
    });

    await auth.getBearerToken({ oidcToken: "request-header-token" });
    assert.equal(seen, "request-header-token");
  });
});

describe("resolveVercelOidcToken", () => {
  it("uses getVercelOidcToken ahead of the request header", async () => {
    const token = await resolveVercelOidcToken("header-token", {
      env: {},
      getVercelOidcToken: async () => "platform-token",
    });
    assert.equal(token, "platform-token");
  });

  it("uses the request header when the platform token is missing", async () => {
    const token = await resolveVercelOidcToken("header-token", {
      env: {},
      getVercelOidcToken: async () => {
        throw new Error("Vercel OIDC token not found");
      },
    });
    assert.equal(token, "header-token");
  });

  it("asks for a custom audience and does not fall back to the raw header", async () => {
    let audience: string | undefined;
    await assert.rejects(
      resolveVercelOidcToken("header-token", {
        env: { OPENAI_OIDC_AUDIENCE: "https://api.openai.com" },
        getVercelOidcToken: async (options) => {
          audience = options?.audience;
          throw new Error(`exchange failed ${SUBJECT}`);
        },
      }),
      (error: unknown) => {
        assert.ok(error instanceof OpenAIAuthError);
        assert.equal(error.message.includes(SUBJECT), false);
        assert.equal(error.message.includes("header-token"), false);
        return true;
      },
    );
    assert.equal(audience, "https://api.openai.com");
  });
});
