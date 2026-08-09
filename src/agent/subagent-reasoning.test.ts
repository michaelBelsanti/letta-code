import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSubagents } from "@/agent/subagents";
import { buildSubagentArgs } from "@/agent/subagents/manager";

const REASONING_SUBAGENT = `---
name: reasoner
description: Agent that reasons hard
model: opencode-go/deepseek-v4-flash
reasoning_effort: high
tools: Read, Grep
---

Do deep analysis.
`;

describe("subagent reasoning_effort", () => {
  test("parses reasoning_effort from custom subagent frontmatter", async () => {
    const home = await mkdtemp(join(tmpdir(), "subagent-reasoning-"));
    const agentsDir = join(home, ".letta", "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(join(agentsDir, "reasoner.md"), REASONING_SUBAGENT);
    const originalHome = process.env.HOME;
    process.env.HOME = home;
    try {
      const { subagents } = await discoverSubagents();
      const reasoner = subagents.find((s) => s.name === "reasoner");
      expect(reasoner?.reasoningEffort).toBe("high");
      expect(reasoner?.recommendedModel).toBe("opencode-go/deepseek-v4-flash");
    } finally {
      process.env.HOME = originalHome;
      await rm(home, { recursive: true, force: true });
    }
  });

  test("bodyless overlay overrides reasoning_effort", async () => {
    const home = await mkdtemp(join(tmpdir(), "subagent-reasoning-"));
    const agentsDir = join(home, ".letta", "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, "reasoner.md"),
      `---\nname: reasoner\ndescription: Agent that reasons hard\nreasoning_effort: low\n---\n`,
    );
    const originalHome = process.env.HOME;
    process.env.HOME = home;
    try {
      // Bodyless overlay requires an inherited config with the same name.
      const inherited = {
        reasoner: {
          name: "reasoner",
          description: "Agent that reasons hard",
          systemPrompt: "do analysis",
          allowedTools: ["Read"],
          recommendedModel: "inherit",
          skills: [],
          fork: false,
          background: true,
          deployParent: false,
          launchProfile: "default" as const,
        },
      };
      const { subagents } = await discoverSubagents(home, inherited);
      const reasoner = subagents.find((s) => s.name === "reasoner");
      expect(reasoner?.reasoningEffort).toBe("low");
    } finally {
      process.env.HOME = originalHome;
      await rm(home, { recursive: true, force: true });
    }
  });

  test("buildSubagentArgs passes reasoning_effort via --model-settings", () => {
    const config = {
      name: "general-purpose",
      description: "desc",
      systemPrompt: "prompt",
      allowedTools: [] as string[],
      recommendedModel: "auto",
      skills: [],
      fork: false,
      background: true,
      deployParent: false,
      launchProfile: "default" as const,
    };
    const args = buildSubagentArgs(
      "general-purpose",
      config,
      "opencode-go/deepseek-v4-flash",
      "do the thing",
      undefined,
      undefined,
      undefined,
      { reasoningEffort: "high" },
    );
    expect(args).toContain("--model-settings");
    const idx = args.indexOf("--model-settings");
    expect(JSON.parse(args[idx + 1] as string)).toEqual({
      reasoning_effort: "high",
    });
  });
});
