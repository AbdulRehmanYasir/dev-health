import JSZip from "jszip";
import { ProjectFile } from "./staticAnalyzer";

const IGNORED_FOLDERS = [
  "node_modules",
  ".git",
  "__pycache__",
  "dist",
  "build",
  ".venv",
  "venv",
  ".tox",
  ".pytest_cache",
  ".next",
  ".nuxt",
  ".turbo",
  "coverage",
];

export async function extractZipInBrowser(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<{ files: ProjectFile[]; projectName: string }> {
  onProgress?.(10, "Reading ZIP file...");
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  const files: ProjectFile[] = [];
  const entries = Object.values(loadedZip.files);
  const totalEntries = entries.length;

  let processed = 0;

  for (const entry of entries) {
    processed++;
    if (processed % 10 === 0) {
      onProgress?.(
        10 + Math.round((processed / totalEntries) * 40),
        `Extracting ${entry.name}...`
      );
    }

    if (entry.dir) continue;

    // Normalize path & skip directory traversal
    let normPath = entry.name.replace(/\\/g, "/");
    if (normPath.startsWith("/")) normPath = normPath.substring(1);
    if (normPath.includes("../")) continue;

    const parts = normPath.split("/");
    if (parts.some((p) => IGNORED_FOLDERS.includes(p))) continue;

    const ext = "." + normPath.split(".").pop()?.toLowerCase();
    const isText = [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".py",
      ".json",
      ".yaml",
      ".yml",
      ".toml",
      ".md",
      ".html",
      ".css",
      ".scss",
      ".sql",
      ".sh",
      ".env",
      ".dockerfile",
      ".txt",
      ".rst",
      ".ini",
    ].includes(ext) || normPath.endsWith("Dockerfile") || normPath.endsWith("Makefile");

    let content = "";
    if (isText) {
      try {
        content = await entry.async("text");
      } catch {
        content = "";
      }
    }

    // Use rough size from uncompressed or content length
    const size = content ? content.length : (entry as any)._data?.uncompressedSize || 1024;

    files.push({
      path: normPath,
      content,
      size,
    });
  }

  // Detect root prefix (e.g. if everything is in "my-repo-main/")
  let commonPrefix = "";
  if (files.length > 0) {
    const firstParts = files[0].path.split("/");
    if (firstParts.length > 1) {
      const candidate = firstParts[0] + "/";
      if (files.every((f) => f.path.startsWith(candidate))) {
        commonPrefix = candidate;
      }
    }
  }

  const cleanedFiles = commonPrefix
    ? files.map((f) => ({
        ...f,
        path: f.path.substring(commonPrefix.length),
      }))
    : files;

  const rawProjectName = file.name.replace(/\.zip$/i, "");
  const projectName = commonPrefix ? commonPrefix.replace(/\/$/, "") : rawProjectName;

  onProgress?.(60, "Files extracted safely.");
  return { files: cleanedFiles, projectName };
}
