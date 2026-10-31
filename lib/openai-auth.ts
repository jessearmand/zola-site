import { getVercelOidcToken } from "@vercel/oidc";

/** OpenAI workload-identity token endpoint. There is no refresh token. */
export const OPENAI_TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";

/**
 * Renew this long before `expires_at`. Access tokens last at most an hour;
 * five minutes covers clock skew and the chat request that is about to use
 * the token. Shorter-lived tokens use half their lifetime instead, so a
 * brief token is still reused.
 */
export const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const TOKEN_EXCHANGE_TIMEOUT_MS = 10_000;

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
const SUBJECT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:jwt";

export class OpenAIAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIAuthError";
  }
}

export type OpenAIBearerOptions = {
  /**
   * `x-vercel-oidc-token` from the current request. Used only when
   * `getVercelOidcToken()` cannot see the request context. Never logged.
   */
  oidcToken?: string;
};

type AuthEnv = {
  OPENAI_IDENTITY_PROVIDER_ID?: string;
  OPENAI_SERVICE_ACCOUNT_ID?: string;
  OPENAI_API_KEY?: string;
  OPENAI_OIDC_AUDIENCE?: string;
};

type WifConfig = {
  identityProviderId: string;
  serviceAccountId: string;
};

type CacheEntry = {
  accessToken: string;
  expiresAtMs: number;
  refreshAtMs: number;
};

export type OpenAIAuthDeps = {
  env: AuthEnv;
  fetchImpl: typeof fetch;
  now: () => number;
  getOidcToken: (oidcTokenHint?: string) => Promise<string>;
};

type TokenPayload = {
  access_token?: unknown;
  expires_in?: unknown;
  expires_at?: unknown;
};

/**
 * True when the process has some OpenAI credential: workload identity, an
 * API key, or a partial workload-identity config that should surface as an
 * error rather than silently doing nothing.
 */
export function hasOpenAICredentials(env: AuthEnv): boolean {
  return Boolean(
    env.OPENAI_API_KEY?.trim() ||
    env.OPENAI_IDENTITY_PROVIDER_ID?.trim() ||
    env.OPENAI_SERVICE_ACCOUNT_ID?.trim(),
  );
}

/**
 * Resolves the Vercel OIDC JWT used as the workload-identity subject token.
 *
 * `getVercelOidcToken()` is the supported source: request header, then the
 * token file, then `VERCEL_OIDC_TOKEN`. The header hint covers Node functions
 * where that helper cannot see the request context. The hint is ignored when
 * a custom audience is configured, because the raw header still carries
 * Vercel's default audience.
 */
export async function resolveVercelOidcToken(
  hint: string | undefined,
  deps: {
    env: AuthEnv;
    getVercelOidcToken: (options?: { audience: string }) => Promise<string>;
  },
): Promise<string> {
  const audience = deps.env.OPENAI_OIDC_AUDIENCE?.trim();
  if (audience) {
    try {
      const token = (await deps.getVercelOidcToken({ audience })).trim();
      if (token) return token;
    } catch {
      // A custom audience cannot fall back to the default-audience header.
    }
    throw new OpenAIAuthError("Vercel OIDC token is unavailable.");
  }

  try {
    const token = (await deps.getVercelOidcToken()).trim();
    if (token) return token;
  } catch {
    // No platform token in this process. The request header may still have one.
  }

  const fromHint = hint?.trim();
  if (fromHint) return fromHint;
  throw new OpenAIAuthError("Vercel OIDC token is unavailable.");
}

/**
 * Bearer token for the OpenAI API. Workload identity wins when both of its
 * env vars are set; otherwise `OPENAI_API_KEY` is used unchanged.
 *
 * The exchanged access token is cached in memory. Concurrent callers share
 * one exchange. A failed refresh keeps using the previous token until
 * `expires_at`.
 */
export function createOpenAIAuth(deps: OpenAIAuthDeps) {
  let cached: CacheEntry | null = null;
  let pending: Promise<string> | null = null;

  async function getBearerToken(options?: OpenAIBearerOptions): Promise<string> {
    const wif = readWifConfig(deps.env);
    if (!wif) {
      const apiKey = deps.env.OPENAI_API_KEY?.trim() ?? "";
      if (!apiKey) {
        throw new OpenAIAuthError(
          "OpenAI credentials not configured. Set OPENAI_IDENTITY_PROVIDER_ID and OPENAI_SERVICE_ACCOUNT_ID, or OPENAI_API_KEY.",
        );
      }
      return apiKey;
    }

    const nowMs = deps.now();
    if (cached && nowMs < cached.refreshAtMs) {
      return cached.accessToken;
    }

    if (!pending) {
      const previous = cached;
      pending = exchange(wif, options?.oidcToken)
        .then((entry) => {
          cached = entry;
          return entry.accessToken;
        })
        .catch((error: unknown) => {
          if (previous && deps.now() < previous.expiresAtMs) {
            return previous.accessToken;
          }
          throw error;
        })
        .finally(() => {
          pending = null;
        });
    }

    return pending;
  }

  async function exchange(wif: WifConfig, hint: string | undefined): Promise<CacheEntry> {
    let subjectToken: string;
    try {
      subjectToken = (await deps.getOidcToken(hint)).trim();
    } catch (error) {
      if (error instanceof OpenAIAuthError) throw error;
      throw new OpenAIAuthError("Vercel OIDC token is unavailable.");
    }
    if (!subjectToken) {
      throw new OpenAIAuthError("Vercel OIDC token is unavailable.");
    }

    let response: Response;
    try {
      response = await deps.fetchImpl(OPENAI_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: GRANT_TYPE,
          subject_token_type: SUBJECT_TOKEN_TYPE,
          subject_token: subjectToken,
          identity_provider_id: wif.identityProviderId,
          service_account_id: wif.serviceAccountId,
        }),
        signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
      });
    } catch {
      throw new OpenAIAuthError("OpenAI authentication failed.");
    }

    if (!response.ok) {
      // Drain the body so the connection can be reused. Do not log it:
      // error payloads must not be allowed to echo a token into logs.
      await response.text().catch(() => "");
      console.warn(`OpenAI workload identity token exchange failed (${response.status}).`);
      throw new OpenAIAuthError("OpenAI authentication failed.");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new OpenAIAuthError("OpenAI authentication failed.");
    }

    return toCacheEntry(payload, deps.now());
  }

  return { getBearerToken };
}

const openaiAuth = createOpenAIAuth({
  env: process.env,
  fetchImpl: globalThis.fetch.bind(globalThis),
  now: () => Date.now(),
  getOidcToken: (hint) => resolveVercelOidcToken(hint, { env: process.env, getVercelOidcToken }),
});

export function getOpenAIBearerToken(options?: OpenAIBearerOptions): Promise<string> {
  return openaiAuth.getBearerToken(options);
}

function readWifConfig(env: AuthEnv): WifConfig | null {
  const identityProviderId = env.OPENAI_IDENTITY_PROVIDER_ID?.trim() ?? "";
  const serviceAccountId = env.OPENAI_SERVICE_ACCOUNT_ID?.trim() ?? "";
  if (!identityProviderId && !serviceAccountId) return null;
  if (!identityProviderId || !serviceAccountId) {
    throw new OpenAIAuthError(
      "Set both OPENAI_IDENTITY_PROVIDER_ID and OPENAI_SERVICE_ACCOUNT_ID.",
    );
  }
  return { identityProviderId, serviceAccountId };
}

function toCacheEntry(payload: unknown, nowMs: number): CacheEntry {
  if (!payload || typeof payload !== "object") {
    throw new OpenAIAuthError("OpenAI authentication failed.");
  }
  const body = payload as TokenPayload;
  if (typeof body.access_token !== "string" || body.access_token.length === 0) {
    throw new OpenAIAuthError("OpenAI authentication failed.");
  }

  const expiresAtMs = expiryMs(body, nowMs);
  if (expiresAtMs <= nowMs) {
    throw new OpenAIAuthError("OpenAI authentication failed.");
  }

  const lifetimeMs = expiresAtMs - nowMs;
  const marginMs = Math.min(REFRESH_MARGIN_MS, Math.floor(lifetimeMs / 2));
  return {
    accessToken: body.access_token,
    expiresAtMs,
    refreshAtMs: expiresAtMs - marginMs,
  };
}

/** Prefer absolute `expires_at`. `expires_in` is only the lifetime from issuance. */
function expiryMs(body: TokenPayload, nowMs: number): number {
  if (typeof body.expires_at === "number" && Number.isFinite(body.expires_at)) {
    return body.expires_at * 1000;
  }
  const expiresInSec =
    typeof body.expires_in === "number" && Number.isFinite(body.expires_in) && body.expires_in > 0
      ? body.expires_in
      : 3600;
  return nowMs + expiresInSec * 1000;
}
