# Serverless API

## Environment Variables (Vercel)

Set in the Vercel project, not in the repo:

- `OPENAI_IDENTITY_PROVIDER_ID` and `OPENAI_SERVICE_ACCOUNT_ID` - Workload identity for OpenAI. Not secrets. Preferred over the API key when both are set. See the README for the issuer, audience, and subject mapping.
- `OPENAI_OIDC_AUDIENCE` - Optional custom `aud` for `getVercelOidcToken()`
- `OPENAI_API_KEY` - Used only when the workload-identity vars are unset. Remove it from Vercel after workload identity works.
- `AI_GATEWAY_API_KEY` - Optional local fallback. Chat and the Jev / model guardrails authenticate to AI Gateway with the Vercel OIDC token first, and use this key only when no OIDC token is available (local runs). Remove it from Vercel after a deployment shows those calls succeeding.

After this change, remove these if still present: `OPENROUTER_API_KEY`, `XAI_API_KEY`, `SEARCH_PROVIDER`.
