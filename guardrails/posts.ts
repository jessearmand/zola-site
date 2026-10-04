import fs from "node:fs/promises";
import path from "node:path";

/** What the guardrails know about the blog: enough to tell what is on topic. */
export interface PostIndex {
  titles: string[];
  topics: string[];
}

const EMPTY_INDEX: PostIndex = { titles: [], topics: [] };

let cachedIndex: Promise<PostIndex> | null = null;

/** Returns a post's TOML front matter, or '' if it has none. */
function readFrontMatter(markdown: string): string {
  return markdown.match(/^\+\+\+([\s\S]*?)\+\+\+/)?.[1] ?? "";
}

function parseTitle(frontMatter: string): string | null {
  return frontMatter.match(/^title\s*=\s*"(.*)"\s*$/m)?.[1] ?? null;
}

/**
 * Reads the `tags` array. Older posts hold every tag in one comma-separated
 * string, so each entry is split again.
 */
function parseTags(frontMatter: string): string[] {
  const array = frontMatter.match(/^tags\s*=\s*\[(.*)\]\s*$/m)?.[1] ?? "";
  return [...array.matchAll(/"([^"]*)"/g)]
    .flatMap((entry) => entry[1].split(","))
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

async function readPostIndex(): Promise<PostIndex> {
  const contentDir = path.join(process.cwd(), "content");
  const entries = await fs.readdir(contentDir, { withFileTypes: true });
  // Posts are the date-prefixed files; `_index.md` and `chat.md` are pages.
  const posts = entries.filter(
    (entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry.name),
  );

  const frontMatters = await Promise.all(
    posts.map(async (post) =>
      readFrontMatter(await fs.readFile(path.join(contentDir, post.name), "utf-8")),
    ),
  );

  return {
    titles: frontMatters.map(parseTitle).filter((title): title is string => title !== null),
    topics: [...new Set(frontMatters.flatMap(parseTags))],
  };
}

/**
 * Titles and tags of the published posts, read from `content/` so the
 * guardrails track the blog without a hand-maintained topic list.
 *
 * Cached for the life of the function instance: the posts only change with a
 * deploy. Resolves to an empty index if the directory cannot be read, so a
 * packaging problem degrades the guardrails' context instead of failing chat.
 */
export function getPostIndex(): Promise<PostIndex> {
  cachedIndex ??= readPostIndex().catch((error) => {
    console.warn("Could not read the post index for the guardrails:", error);
    return EMPTY_INDEX;
  });
  return cachedIndex;
}
