import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { globImpl } from "../glob.js";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "glob-"));
  await fs.mkdir(path.join(tmp, "src/nested"), { recursive: true });
  await fs.writeFile(path.join(tmp, "src/a.ts"), "// a");
  await fs.writeFile(path.join(tmp, "src/nested/b.ts"), "// b");
  await fs.writeFile(path.join(tmp, "src/c.js"), "// c");
  await fs.writeFile(path.join(tmp, "readme.md"), "# r");
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("glob", () => {
  it("happy: matches **/*.ts under cwd", async () => {
    const r = await globImpl({ pattern: "src/**/*.ts", cwd: tmp });
    expect(r.matches.sort()).toEqual(["src/a.ts", "src/nested/b.ts"].sort());
    expect(r.truncated).toBe(false);
  });

  it("no matches -> empty array", async () => {
    const r = await globImpl({ pattern: "**/*.coffee", cwd: tmp });
    expect(r.matches).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("maxResults truncates + reports total", async () => {
    const r = await globImpl({ pattern: "**/*", cwd: tmp, maxResults: 1 });
    expect(r.matches.length).toBe(1);
    expect(r.truncated).toBe(true);
    expect(r.total).toBeGreaterThan(1);
  });

  it("sorts by mtime descending (newest first)", async () => {
    // Touch b.ts to make it newest
    const bPath = path.join(tmp, "src/nested/b.ts");
    const now = Date.now() / 1000;
    await fs.utimes(bPath, now, now);
    await fs.utimes(path.join(tmp, "src/a.ts"), now - 60, now - 60);
    const r = await globImpl({ pattern: "src/**/*.ts", cwd: tmp });
    expect(r.matches[0]).toBe("src/nested/b.ts");
  });

  it("returns paths relative to cwd, not absolute", async () => {
    const r = await globImpl({ pattern: "src/*.ts", cwd: tmp });
    for (const m of r.matches) {
      expect(path.isAbsolute(m)).toBe(false);
    }
  });
});
