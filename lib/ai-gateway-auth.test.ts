import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAiGatewayCredential } from "./ai-gateway-auth.ts";

const PLATFORM_TOKEN = "platform.oidc-token.sig";
const HEADER_TOKEN = "header.oidc-token.sig";
const API_KEY = "vck_test-gateway-key";

const noPlatformToken = async (): Promise<string> => {
  throw new Error("no OIDC token in this process");
};

describe("resolveAiGatewayCredential", () => {
  it("prefers the platform OIDC token over the header and the key", async () => {
    const credential = await resolveAiGatewayCredential(HEADER_TOKEN, {
      env: { AI_GATEWAY_API_KEY: API_KEY },
      getVercelOidcToken: async () => ` ${PLATFORM_TOKEN} `,
    });
    assert.deepEqual(credential, { token: PLATFORM_TOKEN, source: "oidc" });
  });

  it("uses the request header when the helper has no token", async () => {
    const credential = await resolveAiGatewayCredential(HEADER_TOKEN, {
      env: { AI_GATEWAY_API_KEY: API_KEY },
      getVercelOidcToken: noPlatformToken,
    });
    assert.deepEqual(credential, { token: HEADER_TOKEN, source: "oidc" });
  });

  it("treats an empty helper result like a missing token", async () => {
    const credential = await resolveAiGatewayCredential(HEADER_TOKEN, {
      env: {},
      getVercelOidcToken: async () => "  ",
    });
    assert.deepEqual(credential, { token: HEADER_TOKEN, source: "oidc" });
  });

  it("falls back to the API key without any OIDC token", async () => {
    const credential = await resolveAiGatewayCredential(undefined, {
      env: { AI_GATEWAY_API_KEY: API_KEY },
      getVercelOidcToken: noPlatformToken,
    });
    assert.deepEqual(credential, { token: API_KEY, source: "api-key" });
  });

  it("returns null when nothing is configured", async () => {
    const credential = await resolveAiGatewayCredential("  ", {
      env: { AI_GATEWAY_API_KEY: " " },
      getVercelOidcToken: noPlatformToken,
    });
    assert.equal(credential, null);
  });
});
