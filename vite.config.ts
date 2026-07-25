import { defineConfig } from "vite-plus";

/**
 * Vite+ is used here only as a lint/format toolchain (oxlint + oxfmt).
 *
 * This is not a Vite application: the site is built by Zola and the only
 * JavaScript is the Vercel function in `api/` and the browser modules in
 * `static/`. There is deliberately no `build` or `plugins` config — `npm run
 * build` still shells out to Zola, and Vercel's project settings still point at
 * that command with `public/` as the output directory.
 */
// Build output, the scratchpad and local tool directories are already covered
// by .gitignore, which both tools respect. These are the tracked paths that
// still need excluding.
const ignorePatterns = [
  // Tera templates: `{{ ... }}` inside attributes is not valid HTML, so oxfmt
  // fails to parse them and oxlint has nothing to say about them.
  "templates/**",
  // Theme submodule — not ours to reformat.
  "themes/**",
  // Blog posts are the product, not source. Reformatting them would also
  // change every file's SHA-256, which is what setup_file_search.py uses for
  // change detection — a whitespace pass would re-upload the whole corpus.
  "content/**",
  // Vendored provider documentation, kept verbatim for reference.
  "docs/**",
  // Written by setup_file_search.py; formatting here would fight the generator.
  "vector_store/*.json",
  // Python and secrets-manager config, owned by their own tooling.
  "**/*.toml",
  // Prose. Keeping markdown out of scope means a formatting run only ever
  // touches code, so `vp check` failures are never about a rewrapped README.
  "**/*.md",
  // Local agent settings.
  ".claude/**",
];

/**
 * Vite+ is used here only as a lint/format toolchain (oxlint + oxfmt).
 *
 * This is not a Vite application: the site is built by Zola and the only
 * JavaScript is the Vercel function in `api/` and the browser modules in
 * `static/`. There is deliberately no `build` or `plugins` config — `npm run
 * build` still shells out to Zola, and Vercel's project settings still point at
 * that command with `public/` as the output directory.
 */
export default defineConfig({
  lint: { ignorePatterns },
  fmt: { ignorePatterns },
});
