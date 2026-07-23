import { readFile } from "node:fs/promises";

/**
 * Resolve a memory block path. Relative paths are resolved against the
 * parent agent's MEMORY_DIR if set, otherwise against the process cwd.
 * Absolute paths are used as-is.
 */
function resolveMemoryPath(filePath: string): string {
  if (filePath.startsWith("/")) {
    return filePath;
  }
  const base = process.env.MEMORY_DIR;
  if (base) {
    return `${base}/${filePath}`;
  }
  return filePath;
}

/**
 * Read memory block files and wrap their contents in a context block
 * to prepend to the subagent's prompt. Relative paths are resolved
 * against the parent agent's MEMORY_DIR.
 */
export async function buildMemoryContext(
  memoryBlocks: string[],
): Promise<string | null> {
  const files: Array<{ path: string; content: string }> = [];
  for (const filePath of memoryBlocks) {
    const resolved = resolveMemoryPath(filePath);
    try {
      const content = await readFile(resolved, "utf-8");
      files.push({ path: filePath, content });
    } catch {
      // Skip files that can't be read — don't fail the entire dispatch
    }
  }
  if (files.length === 0) {
    return null;
  }
  const sections = files
    .map((f) => `<file path="${f.path}">\n${f.content}\n</file>`)
    .join("\n");
  return `<memory_context>\n${sections}\n</memory_context>\n\n`;
}
