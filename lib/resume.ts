import fs from "node:fs/promises";
import path from "node:path";

/**
 * The author's résumé from `content/pages/about.md`, without its front matter.
 * Context for the chat model and the classifier guardrail. The eval script
 * reads it the same way so its classifier baseline sees what production sees.
 */
export async function getResumeData(): Promise<string> {
  // summary.md is in the vector store, so file_search still reaches it; loading
  // it inline as well would change the context every request carries.
  const aboutPath = path.join(process.cwd(), "content", "pages", "about.md");
  const aboutRaw = await fs.readFile(aboutPath, "utf-8").catch(() => "");
  const about = aboutRaw.replace(/^\+\+\+[\s\S]*?\+\+\+\s*/, "").trim();
  return about || "Resume data unavailable.";
}
