## Build and Development Commands

```bash
bun run lint      # vp lint  (Vite+ / oxlint)
bun run format    # vp fmt   (oxfmt)
bun run check     # vp check
```

`bun run build` is not a local build: when `zola` is absent from `PATH` it downloads an
`x86_64-unknown-linux-gnu` Zola binary, so it only works in CI. Build locally with `zola build`.

## Code Style

**Content**
- Markdown with TOML front matter (`+++` delimiters)
- Files named with date prefix: `YYYY-MM-DD-title.md`
