import { getVercelOidcToken } from "@vercel/oidc";

/**
 * Where the AI Gateway bearer token came from. Logged on a failed call so a
 * 401 points at the right credential. The token itself is never logged.
 */
export type AiGatewayCredentialSource = "oidc" | "api-key";

export type AiGatewayCredential = {
  token: string;
  source: AiGatewayCredentialSource;
};

type GatewayAuthEnv = {
  AI_GATEWAY_API_KEY?: string;
};

export type AiGatewayAuthDeps = {
  env: GatewayAuthEnv;
  getVercelOidcToken: () => Promise<string>;
};

/**
 * Bearer credential for Vercel AI Gateway, or null when there is none.
 *
 * AI Gateway accepts the Vercel OIDC token as the bearer token directly, so
 * unlike OpenAI workload identity there is no exchange and nothing to cache.
 * The OIDC token is tried first because it needs no stored secret and is
 * present on every deployment, previews included:
 *
 * 1. `getVercelOidcToken()`: request context, token file, then `VERCEL_OIDC_TOKEN`.
 * 2. The `x-vercel-oidc-token` header, for Node functions where that helper
 *    cannot see the request context.
 * 3. `AI_GATEWAY_API_KEY`, for local runs without a fresh OIDC token.
 *
 * The gateway needs the default audience, so no custom audience is requested.
 */
export async function resolveAiGatewayCredential(
  oidcTokenHint: string | undefined,
  deps: AiGatewayAuthDeps,
): Promise<AiGatewayCredential | null> {
  try {
    const token = (await deps.getVercelOidcToken()).trim();
    if (token) return { token, source: "oidc" };
  } catch {
    // No platform token in this process. The header or the key may still work.
  }

  const fromHint = oidcTokenHint?.trim();
  if (fromHint) return { token: fromHint, source: "oidc" };

  const apiKey = deps.env.AI_GATEWAY_API_KEY?.trim();
  if (apiKey) return { token: apiKey, source: "api-key" };

  return null;
}

/** `resolveAiGatewayCredential` bound to this process's environment. */
export function getAiGatewayCredential(
  oidcTokenHint?: string,
): Promise<AiGatewayCredential | null> {
  return resolveAiGatewayCredential(oidcTokenHint, { env: process.env, getVercelOidcToken });
}
