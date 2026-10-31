# jessearmand.com

Zola site deployed on Vercel as project `zola-site` (team `jessearmand`). The `/chat` page calls the Node function `api/chat-proxy`, which sends the question to the OpenAI Responses API.

## OpenAI authentication

On Vercel the function authenticates with [workload identity federation](https://developers.openai.com/api/docs/guides/workload-identity-federation). It exchanges the Vercel OIDC token for a short-lived OpenAI access token and caches that token in memory until shortly before `expires_at`. No long-lived OpenAI API key is required once this is working.

Workload identity is used whenever both `OPENAI_IDENTITY_PROVIDER_ID` and `OPENAI_SERVICE_ACCOUNT_ID` are set. If neither is set, the function keeps using `OPENAI_API_KEY`, which is how local development works. If only one of the two is set, requests fail until both are present.

### Environment variables in Vercel

Set these on Production and Preview. They are resource ids, not secrets:

| Variable | Purpose |
| --- | --- |
| `OPENAI_IDENTITY_PROVIDER_ID` | Workload Identity Provider id from the OpenAI dashboard |
| `OPENAI_SERVICE_ACCOUNT_ID` | Service account id the mapping is allowed to mint tokens for |

Optional:

| Variable | Purpose |
| --- | --- |
| `OPENAI_OIDC_AUDIENCE` | Set only when the OpenAI provider expects an `aud` other than Vercel's default. Passed to `getVercelOidcToken({ audience })`. |
| `OPENAI_API_KEY` | Fallback for local development and for the file-search scripts. Remove it from Vercel after a deployment with the two ids above answers a chat request. |

Do not set `VERCEL_OIDC_TOKEN`. Vercel injects the OIDC token into the function as `x-vercel-oidc-token` and, during builds, as `VERCEL_OIDC_TOKEN`. `getVercelOidcToken()` from `@vercel/oidc` reads it.

### OpenAI provider and service account mapping

Vercel is not one of the identity providers OpenAI documents individually (AWS, Azure, Google Cloud, Oracle Cloud, GitHub Actions, Kubernetes, SPIFFE, Idira). The provider form still accepts any OIDC issuer. This project uses that. If token exchange rejects the issuer itself, OpenAI's guide says to contact OpenAI support for an unlisted provider.

The team issuer for this account is already published:

- Issuer: `https://oidc.vercel.com/jessearmand`
- Discovery: `https://oidc.vercel.com/jessearmand/.well-known/openid-configuration`
- Default audience: `https://vercel.com/jessearmand`

In [Organization Settings → Security → Workload Identity Provider](https://platform.openai.com/settings/organization/security/workload-identity-provider), create an OIDC provider with that issuer and audience. Leave custom discovery and uploaded JWKS off so OpenAI fetches the JWKS from discovery. Issuer comparison ignores a trailing slash.

Then add a service account mapping on that provider. Mapping keys are raw token claims. All of them have to match:

| Key | Value |
| --- | --- |
| `iss` | `https://oidc.vercel.com/jessearmand` |
| `aud` | `https://vercel.com/jessearmand` |
| `sub` | the subject for one environment, confirmed from a real token |

Vercel's documented subject shape is `owner:<team>:project:<project>:environment:<environment>`. For this project that should be:

- `owner:jessearmand:project:zola-site:environment:production`
- `owner:jessearmand:project:zola-site:environment:preview`

Decode a real Vercel OIDC token before saving the mapping. The `project` claim is the Vercel project name, which can differ from the Git repo name, and a project still on the global issuer (`https://oidc.vercel.com`) will not match the team issuer above. In a one-off function, read `getVercelOidcToken()` or the `x-vercel-oidc-token` header, base64url-decode only the payload (the middle JWT segment), and check `iss`, `aud`, and `sub`. Do not log the token.

Prefer one mapping per environment, each pointed at a service account that has only the access that environment needs. A trailing wildcard is allowed if one service account should cover every environment, for example `owner:jessearmand:project:zola-site:environment:*`. Copy the provider id and the service account id into the two Vercel env vars.

After a chat request succeeds with those vars set, delete `OPENAI_API_KEY` from the Vercel project. While the key is still present the function does not use it, so a broken exchange shows up as an error instead of quietly going back to the long-lived key.

### What still uses an API key

`file_search/setup_file_search.py` and `file_search/test_file_search.py` run on a developer machine. Vercel does not issue an OIDC token there, so those scripts still use `OPENAI_API_KEY` (fnox locally). Leave the workload-identity variables unset outside Vercel.

# Built with zola (né Gutenberg)

A fast static site generator in a single binary with everything built-in.

Documentation is available on [its site](https://www.getzola.org/documentation/getting-started/installation/) or
in the `docs/content` folder of the repository and the community can use [its forum](https://zola.discourse.group).

# List of features

- Single binary
- Syntax highlighting 
- Sass compilation
- Assets co-location
- (Basic currently) multilingual site suport
- Image processing
- Themes
- Shortcodes
- Internal links
- External link checker
- Table of contents automatic generation
- Automatic header anchors
- Aliases
- Pagination
- Custom taxonomies
- Search with no servers or any third parties involved
- Live reload
- Deploy on many platforms easily: Netlify, Vercel, Cloudflare
- Breadcrumbs
