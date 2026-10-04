import fs from "node:fs/promises";
import path from "node:path";

let cachedTitles: Promise<string[]> | null = null;

/** Reads the `title` out of a post's TOML front matter, or null if it has none. */
function parseTitle(markdown: string): string | null {
  const frontMatter = markdown.match(/^\+\+\+([\s\S]*?)\+\+\+/)?.[1];
  return frontMatter?.match(/^title\s*=\s*"(.*)"\s*$/m)?.[1] ?? null;
}

async function readPostTitles(): Promise<string[]> {
  const contentDir = path.join(process.cwd(), "content");
  const entries = await fs.readdir(contentDir, { withFileTypes: true });
  // Posts are the date-prefixed files; `_index.md` and `chat.md` are pages.
  const posts = entries.filter(
    (entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry.name),
  );

  const titles = await Promise.all(
    posts.map(async (post) =>
      parseTitle(await fs.readFile(path.join(contentDir, post.name), "utf-8")),
    ),
  );
  return titles.filter((title): title is string => title !== null);
}

/**
 * Titles of the published posts, read from `content/` so the list tracks the
 * blog without being maintained by hand.
 *
 * Cached for the life of the function instance: the posts only change with a
 * deploy. Resolves to an empty list if the directory cannot be read, so a
 * packaging problem degrades the guardrail's context instead of failing chat.
 */
export function getPostTitles(): Promise<string[]> {
  cachedTitles ??= readPostTitles().catch((error) => {
    console.warn("Could not read post titles for the guardrail:", error);
    return [];
  });
  return cachedTitles;
}
