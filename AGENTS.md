## Build and Development Commands

```bash
# Build the Zola static site (downloads Zola binary on Linux/CI)
bun run build

# Type-check TypeScript serverless functions
bun run type-check

# Unit tests for OpenAI workload-identity token exchange
bun run test

# Local development with Zola (requires zola installed)
zola serve

# Run Python file search test
cd file_search && python test_file_search.py

# Set up vector store for file search (uploads content to OpenAI)
cd file_search && python setup_file_search.py
```

## Architecture Overview

This is a Zola static site with an AI-powered chat feature deployed on Vercel.

### Core Components

**Static Site (Zola)**
- `config.toml` - Site configuration, theme settings, and feature flags
- `content/` - Markdown blog posts with TOML front matter (date-prefixed filenames)
- `templates/chat.html` - Custom template extending `index.html` for the chat page
- `templates/index.html`, `page.html`, `404.html`, `sass/style.scss` - Vendored from the lightspeed theme (MIT, `LICENSE-lightspeed.md`) and ported to Tera v2; upstream does not support Zola 0.23
- `templates/components.html` - Tera components (`youtube`, `post_in_list`). Zola 0.23 removed shortcodes and macros: call components from markdown as `{{ <youtube id="..." /> }}`
- Zola version is pinned in `scripts/build.sh` (0.23.6). It uses a `zola` on PATH only when the minor version matches, otherwise downloads the pinned release, because Vercel pre-installs the version named by the `ZOLA_VERSION` project env var. Content is templated by Tera, so wrap literal `{{ }}` / `{% %}` in posts with `{% raw %}...{% endraw %}`

**Serverless API (Vercel)**
- `api/chat-proxy.ts` - Vercel serverless function handling chat requests
  - Prefers OpenAI Responses with `web_search` + file search when OpenAI credentials are set
  - Falls back to Vercel AI Gateway Chat Completions (`deepseek/deepseek-v4.1-flash-1017`) when OpenAI is not configured
  - Streams SSE responses to the frontend
  - Reads resume context from `content/pages/about.md`
  - OpenAI auth is `lib/openai-auth.ts`: workload identity via the Vercel OIDC token when `OPENAI_IDENTITY_PROVIDER_ID` and `OPENAI_SERVICE_ACCOUNT_ID` are set, otherwise `OPENAI_API_KEY`
  - AI Gateway auth is `lib/ai-gateway-auth.ts`: Vercel OIDC first, `AI_GATEWAY_API_KEY` only as a local fallback

**Input Guardrails**
- `guardrails/jev.ts` - First gate: a Jev evaluation through Vercel AI Gateway (`/v1/evaluate`) that blocks prompt injection and requests for unrelated work; thresholds live in this file
- `guardrails/posts.ts` - Reads post titles and tags from `content/` as context for both gates (`vercel.json` bundles `content/**/*.md` into the function)
- The second gate is the model-based classifier in `api/chat-proxy.ts` (OpenAI when configured, otherwise AI Gateway DeepSeek), which also blocks questions on subjects the blog does not cover; both fail open

**Vector Store (OpenAI File Search)**
- `file_search/setup_file_search.py` - Uploads blog posts to OpenAI for RAG
- `vector_store/config.json` - Stores the vector store ID after setup
- `vector_store/vector-store-config.ts` - TypeScript module to read vector store config

### Data Flow

1. User submits question via `/chat` page
2. Frontend POSTs to `/api/chat-proxy`
3. API reads local resume markdown, calls OpenAI (or AI Gateway fallback) with streaming
4. SSE chunks stream back, frontend parses and renders incrementally
5. Citations (web URLs or file references) collected and displayed

### Environment Variables (Vercel)

- `OPENAI_IDENTITY_PROVIDER_ID` and `OPENAI_SERVICE_ACCOUNT_ID` - Workload identity for OpenAI on Vercel. Not secrets. See README.md for the provider and the `iss` / `aud` / `sub` mapping. Remove `OPENAI_API_KEY` from Vercel once this works.
- `OPENAI_OIDC_AUDIENCE` - Optional. Set only when the OpenAI provider expects a non-default `aud`.
- `OPENAI_API_KEY` - Fallback when the workload-identity vars are unset (local dev, and the `file_search/` scripts)
- `AI_GATEWAY_API_KEY` - Optional fallback for AI Gateway (Jev, model guardrail, and chat fallback). `lib/ai-gateway-auth.ts` sends the Vercel OIDC token first and uses this key only when no OIDC token is available (local runs). With neither, those AI Gateway paths are skipped / unavailable

Safe to remove after deploy if still present: `OPENROUTER_API_KEY`, `XAI_API_KEY`, `SEARCH_PROVIDER`.

## Code Style

**Content**
- Markdown with TOML front matter (`+++` delimiters)
- Files named with date prefix: `YYYY-MM-DD-title.md`
