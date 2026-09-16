import { ProjectFile } from "./staticAnalyzer";

export async function fetchGitHubRepo(
  urlOrShorthand: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<{ files: ProjectFile[]; projectName: string }> {
  onProgress?.(10, "Resolving repository identifier...");

  let clean = urlOrShorthand.trim();
  clean = clean.replace(/^https?:\/\/github\.com\//i, "");
  clean = clean.replace(/\.git$/i, "");
  const parts = clean.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Invalid GitHub format. Enter 'https://github.com/owner/repo' or 'owner/repo'.");
  }

  const owner = parts[0];
  const repo = parts[1];
  const projectName = repo;

  onProgress?.(25, `Connecting to github.com/${owner}/${repo}...`);

  // Check default branch
  let defaultBranch = "main";
  try {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (metaRes.status === 403) {
      throw new Error("GitHub API rate limit reached. Please upload a ZIP or try a sample project.");
    }
    if (metaRes.status === 404) {
      throw new Error(`Repository '${owner}/${repo}' not found or is private.`);
    }
    if (metaRes.ok) {
      const meta = await metaRes.json();
      defaultBranch = meta.default_branch || "main";
    }
  } catch (e: any) {
    if (e.message?.includes("rate limit") || e.message?.includes("not found")) {
      throw e;
    }
    // Fall back to main
    defaultBranch = "main";
  }

  onProgress?.(45, `Fetching repository tree (${defaultBranch})...`);

  // Fetch tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );

  if (!treeRes.ok) {
    if (treeRes.status === 403) {
      throw new Error("GitHub rate limit reached. Download the repo ZIP and drop it directly into DevHealth.");
    }
    throw new Error(`Failed to load repository tree: HTTP ${treeRes.status}`);
  }

  const treeData = await treeRes.json();
  const treeItems: any[] = treeData.tree || [];

  // Filter relevant text files (skip binaries and media)
  const targetFiles = treeItems
    .filter((item) => item.type === "blob")
    .filter((item) => {
      const p = item.path.toLowerCase();
      if (
        p.startsWith("node_modules/") ||
        p.startsWith(".git/") ||
        p.startsWith("dist/") ||
        p.startsWith("build/")
      )
        return false;
      return (
        p.endsWith(".js") ||
        p.endsWith(".ts") ||
        p.endsWith(".jsx") ||
        p.endsWith(".tsx") ||
        p.endsWith(".py") ||
        p.endsWith(".json") ||
        p.endsWith(".yaml") ||
        p.endsWith(".yml") ||
        p.endsWith(".toml") ||
        p.endsWith(".md") ||
        p.endsWith(".html") ||
        p.endsWith(".css") ||
        p.endsWith(".sh") ||
        p.endsWith(".env") ||
        p.includes("dockerfile") ||
        p.endsWith(".txt")
      );
    })
    .slice(0, 50); // Cap at 50 key files for browser fetch

  onProgress?.(60, `Reading ${targetFiles.length} source files...`);

  const files: ProjectFile[] = [];
  let loaded = 0;

  for (const item of targetFiles) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`;
      const rawRes = await fetch(rawUrl);
      if (rawRes.ok) {
        const text = await rawRes.text();
        files.push({
          path: item.path,
          content: text,
          size: item.size || text.length,
        });
      }
    } catch {}

    loaded++;
    if (loaded % 5 === 0) {
      onProgress?.(
        60 + Math.round((loaded / targetFiles.length) * 35),
        `Fetched ${loaded}/${targetFiles.length} files...`
      );
    }
  }

  if (files.length === 0) {
    throw new Error("Could not retrieve source files from the repository.");
  }

  onProgress?.(95, "Running static security and health audit...");
  return { files, projectName };
}
