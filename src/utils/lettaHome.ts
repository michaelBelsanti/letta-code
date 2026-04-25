/**
 * Resolves the Letta Code home directory.
 *
 * Resolution order:
 * 1. LETTA_HOME env var (explicit override)
 * 2. XDG_CONFIG_HOME/letta (if XDG_CONFIG_HOME is set)
 * 3. ~/.config/letta (if the directory exists and XDG_CONFIG_HOME is not set)
 * 4. ~/.letta (fallback — preserves existing behavior)
 *
 * No automatic migration is performed. Users who want to move to XDG paths
 * can move the directory and/or set XDG_CONFIG_HOME.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

let cachedHome: string | null = null;

/**
 * Get the Letta Code home directory.
 * Result is cached for the lifetime of the process.
 */
export function getLettaHome(): string {
  if (cachedHome) return cachedHome;

  // 1. Explicit override
  const envHome = process.env.LETTA_HOME?.trim();
  if (envHome) {
    cachedHome = envHome;
    return cachedHome;
  }

  const home = process.env.HOME || process.env.USERPROFILE || homedir();

  // 2. XDG_CONFIG_HOME is set
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    cachedHome = join(xdgConfigHome, "letta");
    return cachedHome;
  }

  // 3. ~/.config/letta exists (user migrated manually)
  const xdgDefault = join(home, ".config", "letta");
  if (existsSync(xdgDefault)) {
    cachedHome = xdgDefault;
    return cachedHome;
  }

  // 4. Fallback to ~/.letta
  cachedHome = join(home, ".letta");
  return cachedHome;
}

/**
 * Get a subdirectory within the Letta Code home directory.
 * Equivalent to join(getLettaHome(), ...segments).
 */
export function getLettaHomeSubdir(...segments: string[]): string {
  return join(getLettaHome(), ...segments);
}

/**
 * Reset the cached home directory. Useful for tests.
 */
export function resetLettaHomeCache(): void {
  cachedHome = null;
}
