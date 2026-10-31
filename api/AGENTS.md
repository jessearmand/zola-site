# Serverless API

## Environment Variables (Vercel)

Set in the Vercel project, not in the repo:

- `OPENAI_IDENTITY_PROVIDER_ID` and `OPENAI_SERVICE_ACCOUNT_ID` - Workload identity for OpenAI. Not secrets. Preferred over the API key when both are set. See the README for the issuer, audience, and subject mapping.
- `OPENAI_OIDC_AUDIENCE` - Optional custom `aud` for `getVercelOidcToken()`
- `OPENAI_API_KEY` - Used only when the workload-identity vars are unset. Remove it from Vercel after workload identity works.
- `SEARCH_PROVIDER` - `openai_web_search` (default) or `openrouter_xai`
- `OPENROUTER_API_KEY` - Required if using OpenRouter provider
- `AI_GATEWAY_API_KEY` - Required for Jev classifier
